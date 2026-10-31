export const EDITOR_DB_NAME = "digital-soul-editor-storage";
export const EDITOR_DB_VERSION = 2;

export function openEditorDatabase(indexedDBApi = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!indexedDBApi) {
      reject(new Error("IndexedDB nije dostupan u ovom pregledaču."));
      return;
    }

    const request = indexedDBApi.open(EDITOR_DB_NAME, EDITOR_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts");
      if (!db.objectStoreNames.contains("builder-media")) db.createObjectStore("builder-media");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Baza lokalnih nacrta nije mogla da se otvori."));
  });
}

export async function writeProjectAndMediaAtomically({ project, media, projectKey }, indexedDBApi = globalThis.indexedDB) {
  const db = await openEditorDatabase(indexedDBApi);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      db.close();
      callback(value);
    };

    let transaction;
    try {
      transaction = db.transaction(["drafts", "builder-media"], "readwrite");
      transaction.oncomplete = () => finish(resolve);
      transaction.onabort = () => finish(reject, transaction.error || new Error("Uvoz nije sačuvan."));
      transaction.onerror = () => finish(reject, transaction.error || new Error("Uvoz nije sačuvan."));

      transaction.objectStore("drafts").put(project, projectKey);
      for (const { id, blob } of media) transaction.objectStore("builder-media").put(blob, id);
    } catch (error) {
      try { transaction?.abort(); } catch { /* The transaction may already be inactive. */ }
      finish(reject, error);
    }
  });
}
