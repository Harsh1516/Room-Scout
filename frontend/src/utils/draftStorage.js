/**
 * Robust persistence for large uploaded property photos using browser IndexedDB.
 * While localStorage is limited to 5MB (which easily throws QuotaExceededError
 * with multiple base64 photos), IndexedDB allows storing hundreds of MBs seamlessly,
 * ensuring host photos are never lost across accidental page refreshes.
 */

const DB_NAME = 'RoomScout_Host_Draft_DB';
const DB_VERSION = 1;
const STORE_NAME = 'draft_images';
const KEY = 'current_upload_images';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      console.warn('IndexedDB open error:', e.target?.error);
      resolve(null);
    };
  });
}

export async function saveImagesToIndexedDB(images) {
  try {
    if (!Array.isArray(images)) return;
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (images.length === 0) {
      store.delete(KEY);
    } else {
      store.put(images, KEY);
    }
  } catch (err) {
    console.warn('IndexedDB save images error:', err);
  }
}

export async function loadImagesFromIndexedDB() {
  try {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearImagesFromIndexedDB() {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(KEY);
  } catch {
    /* ignore */
  }
}
