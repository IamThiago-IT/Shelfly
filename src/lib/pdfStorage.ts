const DB_NAME = "shelfly-db";
const DB_VERSION = 1;
const PDF_STORE = "pdf-files";
const METADATA_STORE = "pdf-metadata";

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(PDF_STORE)) {
        database.createObjectStore(PDF_STORE);
      }
      if (!database.objectStoreNames.contains(METADATA_STORE)) {
        database.createObjectStore(METADATA_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function savePDF(id: string, data: ArrayBuffer): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PDF_STORE, "readwrite");
    const store = tx.objectStore(PDF_STORE);
    const request = store.put(data, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPDF(id: string): Promise<ArrayBuffer | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PDF_STORE, "readonly");
    const store = tx.objectStore(PDF_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePDF(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PDF_STORE, "readwrite");
    const store = tx.objectStore(PDF_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function hasPDF(id: string): Promise<boolean> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PDF_STORE, "readonly");
    const store = tx.objectStore(PDF_STORE);
    const request = store.getKey(IDBKeyRange.only(id));
    request.onsuccess = () => resolve(request.result !== undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate()
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 }
  }
  return null
}

export async function getTotalOfflineSize(): Promise<number> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const tx = database.transaction(PDF_STORE, "readonly")
    const store = tx.objectStore(PDF_STORE)
    const request = store.getAll()
    request.onsuccess = () => {
      const total = (request.result as ArrayBuffer[]).reduce((acc, buf) => acc + (buf?.byteLength ?? 0), 0)
      resolve(total)
    }
    request.onerror = () => reject(request.error)
  })
}

export interface PDFMetadata {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  coverThumbnail?: string;
  savedAt: string;
}

export async function saveMetadata(meta: PDFMetadata): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(METADATA_STORE, "readwrite");
    const store = tx.objectStore(METADATA_STORE);
    const request = store.put(meta);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getMetadata(id: string): Promise<PDFMetadata | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(METADATA_STORE, "readonly");
    const store = tx.objectStore(METADATA_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMetadata(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(METADATA_STORE, "readwrite");
    const store = tx.objectStore(METADATA_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllOfflineBooks(): Promise<PDFMetadata[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(METADATA_STORE, "readonly");
    const store = tx.objectStore(METADATA_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}