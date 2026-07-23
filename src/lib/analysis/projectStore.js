/**
 * projectStore.js
 *
 * Persists FileSystemDirectoryHandle and File objects in IndexedDB.
 * This allows React Architect to retain access to imported local directories and
 * zip files across page refreshes and hot reloads.
 */

const DB_NAME = "ReactArchitectDB";
const STORE_NAME = "project_handles";
const SNAPSHOTS_STORE = "architecture_snapshots";
const DB_VERSION = 2;

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        store.createIndex('by_project', 'projectId', { unique: false });
        store.createIndex('by_branch',  'branch',    { unique: false });
        store.createIndex('by_project_branch', ['projectId', 'branch'], { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Saves a handle (FileSystemDirectoryHandle or File) associated with a project ID.
 *
 * @param {string} projectId
 * @param {FileSystemDirectoryHandle|File} handle
 * @returns {Promise<void>}
 */
export async function saveProjectHandle(projectId, handle) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, projectId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves a persisted handle (FileSystemDirectoryHandle or File) for a project ID.
 *
 * @param {string} projectId
 * @returns {Promise<FileSystemDirectoryHandle|File|null>}
 */
export async function getProjectHandle(projectId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes a handle from the database.
 *
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function deleteProjectHandle(projectId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(projectId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
