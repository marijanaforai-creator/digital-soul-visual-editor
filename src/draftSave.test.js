import test from "node:test";
import assert from "node:assert/strict";
import { openEditorDatabase, writeProjectAndMediaAtomically, EDITOR_DB_VERSION } from "./editorDatabase.js";
import { createDraftSaveController } from "./draftSave.js";

function indexedDBStartingAt(version, existingStores) {
  const stores = new Set(existingStores);
  const db = {
    objectStoreNames: { contains: name => stores.has(name) },
    createObjectStore(name) { stores.add(name); return {}; }
  };
  const api = {
    requestedVersion: null,
    open(name, requestedVersion) {
      const request = { result: db, error: null };
      api.requestedVersion = requestedVersion;
      queueMicrotask(() => {
        if (requestedVersion > version) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  };
  api.stores = stores;
  return api;
}

test("shared database upgrades old editor schema and preserves drafts", async () => {
  const api = indexedDBStartingAt(1, ["drafts"]);
  const db = await openEditorDatabase(api);
  assert.equal(api.requestedVersion, EDITOR_DB_VERSION);
  assert.equal(api.stores.has("drafts"), true);
  assert.equal(api.stores.has("builder-media"), true);
  assert.equal(db, await openEditorDatabase(api));
});

test("draft save reports success only after write completes and keeps snapshot", async () => {
  let finishWrite;
  let written;
  const controller = createDraftSaveController(value => {
    written = value;
    return new Promise(resolve => { finishWrite = resolve; });
  });
  const snapshot = { title: "Saved" };
  const pending = controller.save(snapshot);
  assert.equal(controller.pending, true);
  assert.equal(written, snapshot);
  assert.deepEqual(await controller.save({ title: "later" }), { status: "busy" });
  finishWrite();
  assert.deepEqual(await pending, { status: "saved", snapshot });
  assert.equal(controller.pending, false);
});

test("draft save surfaces write failures and unlocks for retry", async () => {
  const controller = createDraftSaveController(async () => { throw new Error("quota"); });
  const result = await controller.save({ title: "Draft" });
  assert.equal(result.status, "error");
  assert.equal(result.error.message, "quota");
  assert.equal(controller.pending, false);
});

function transactionalDatabase({ failMediaPutAt = -1 } = {}) {
  const stores = new Map([["drafts", new Map()], ["builder-media", new Map()]]);
  const db = {
    closed: false,
    close() { this.closed = true; },
    transaction(storeNames, mode) {
      assert.deepEqual(storeNames, ["drafts", "builder-media"]);
      assert.equal(mode, "readwrite");
      const writes = [];
      let mediaPutCount = 0;
      const tx = {
        error: null,
        objectStore(name) {
          assert.ok(storeNames.includes(name));
          return {
            put(value, key) {
              if (name === "builder-media" && ++mediaPutCount === failMediaPutAt) {
                tx.error = new Error("Injected media write failure");
                queueMicrotask(() => tx.onabort?.());
                return;
              }
              writes.push([name, key, value]);
            }
          };
        },
        abort() { queueMicrotask(() => tx.onabort?.()); }
      };
      queueMicrotask(() => {
        if (!tx.error) {
          for (const [name, key, value] of writes) stores.get(name).set(key, value);
          tx.oncomplete?.();
        }
      });
      return tx;
    }
  };
  const indexedDBApi = { openEditorDatabase: undefined };
  // openEditorDatabase only needs the standard open request protocol.
  indexedDBApi.open = () => {
    const request = { result: db };
    queueMicrotask(() => request.onsuccess?.());
    return request;
  };
  return { db, stores, indexedDBApi };
}

test("atomic project import commits project and media together, including project-only imports", async () => {
  const { db, stores, indexedDBApi } = transactionalDatabase();
  const project = { schemaVersion: 1, pages: Array.from({ length: 10 }, (_, index) => ({ id: `page-${index}`, blocks: index === 0 ? Array.from({ length: 11 }, (_, block) => ({ id: `block-${block}` })) : [] })), activePageId: "page-9", media: [{ id: "image-1" }, { id: "image-2" }] };
  const media = [{ id: "image-1", blob: { testBlob: 1 } }, { id: "image-2", blob: { testBlob: 2 } }];

  await writeProjectAndMediaAtomically({ project, projectKey: "project", media }, indexedDBApi);
  assert.deepEqual(stores.get("drafts").get("project"), project);
  assert.deepEqual([...stores.get("builder-media").keys()], ["image-1", "image-2"]);
  assert.equal(stores.get("drafts").get("project").pages.length, 10);
  assert.equal(stores.get("drafts").get("project").pages[0].blocks.length, 11);
  assert.equal(stores.get("drafts").get("project").activePageId, "page-9");
  assert.equal(db.closed, true);

  const noMedia = transactionalDatabase();
  const projectWithoutMedia = { ...project, media: [] };
  await writeProjectAndMediaAtomically({ project: projectWithoutMedia, projectKey: "project", media: [] }, noMedia.indexedDBApi);
  assert.deepEqual(noMedia.stores.get("drafts").get("project"), projectWithoutMedia);
  assert.equal(noMedia.stores.get("builder-media").size, 0);
});

test("failed second media write aborts all imported writes and preserves the existing project", async () => {
  const { stores, indexedDBApi } = transactionalDatabase({ failMediaPutAt: 2 });
  const existing = { title: "Existing draft" };
  stores.get("drafts").set("project", existing);
  stores.get("builder-media").set("existing-image", { testBlob: "kept" });

  await assert.rejects(writeProjectAndMediaAtomically({
    project: { title: "Imported draft" },
    projectKey: "project",
    media: [{ id: "new-image-1", blob: {} }, { id: "new-image-2", blob: {} }]
  }, indexedDBApi), /Injected media write failure/);

  assert.deepEqual(stores.get("drafts").get("project"), existing);
  assert.deepEqual([...stores.get("builder-media").keys()], ["existing-image"]);
});
