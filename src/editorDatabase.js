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
