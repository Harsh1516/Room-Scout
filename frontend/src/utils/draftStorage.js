/**
 * Robust persistence for large uploaded property photos using browser IndexedDB.
 * While localStorage is limited to 5MB (which easily throws QuotaExceededError
 * with multiple base64 photos), IndexedDB allows storing hundreds of MBs seamlessly,
 * ensuring host photos are never lost across accidental page refreshes.
 *
 * Strict Multi-Tenant Isolation:
 * Images are scoped strictly to the host user's identifier (email or user ID).
 * Another host will never load or see another tenant's draft photos.
 */

const DB_NAME = 'StayIn_Host_Draft_DB';
const DB_VERSION = 1;
const STORE_NAME = 'draft_images';

const getStoreKey = (userKey) => {
  const clean = userKey ? String(userKey).trim().toLowerCase() : '';
  return clean ? `draft_images_${clean}` : 'draft_images_guest';
};

function openDB() {
  return new Promise((resolve) => {
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

export async function saveImagesToIndexedDB(images, userKey) {
  try {
    if (!Array.isArray(images)) return;
    const db = await openDB();
    if (!db) return;
    const key = getStoreKey(userKey);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (images.length === 0) {
      store.delete(key);
    } else {
      store.put(images, key);
    }
  } catch (err) {
    console.warn('IndexedDB save images error:', err);
  }
}

export async function loadImagesFromIndexedDB(userKey) {
  try {
    const db = await openDB();
    if (!db) return [];
    const key = getStoreKey(userKey);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function clearImagesFromIndexedDB(userKey) {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    if (userKey) {
      const key = getStoreKey(userKey);
      store.delete(key);
      store.delete('current_upload_images'); // delete legacy key
    } else {
      // Clear entire object store when logging out
      store.clear();
    }
  } catch {
    /* ignore */
  }
}
