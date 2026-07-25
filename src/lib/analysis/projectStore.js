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
const GIT_FILES_STORE = "git_source_files";
const DB_VERSION = 3;

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
      if (!db.objectStoreNames.contains(GIT_FILES_STORE)) {
        db.createObjectStore(GIT_FILES_STORE);
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

/**
 * Persists downloaded Git source files ({path, content}[]) to IndexedDB.
 * This makes Git-imported projects survive page refresh without a re-fetch.
 *
 * Lock files (package-lock.json, yarn.lock, etc.) are already excluded before
 * this call by isSourceFile() in gitConfig.js.
 *
 * @param {string} projectId
 * @param {Array<{path: string, content: string}>} files
 * @returns {Promise<void>}
 */
export async function saveGitSourceFiles(projectId, files) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(GIT_FILES_STORE, "readwrite");
    const store = transaction.objectStore(GIT_FILES_STORE);
    // Serialise as JSON string to ensure structured-clone compatibility
    const request = store.put(JSON.stringify(files), projectId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves persisted Git source files for a project.
 *
 * @param {string} projectId
 * @returns {Promise<Array<{path: string, content: string}>|null>}
 */
export async function getGitSourceFiles(projectId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(GIT_FILES_STORE, "readonly");
    const store = transaction.objectStore(GIT_FILES_STORE);
    const request = store.get(projectId);
    request.onsuccess = () => {
      try {
        resolve(request.result ? JSON.parse(request.result) : null);
      } catch {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes persisted Git source files for a project (called during cascade delete).
 *
 * @param {string} projectId
 * @returns {Promise<void>}
 */
export async function deleteGitSourceFiles(projectId) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(GIT_FILES_STORE, "readwrite");
    const store = transaction.objectStore(GIT_FILES_STORE);
    const request = store.delete(projectId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

