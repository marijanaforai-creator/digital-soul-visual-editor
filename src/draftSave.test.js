import test from "node:test";
import assert from "node:assert/strict";
import { openEditorDatabase, EDITOR_DB_VERSION } from "./editorDatabase.js";
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
