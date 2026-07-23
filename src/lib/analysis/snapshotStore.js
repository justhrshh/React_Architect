/**
 * snapshotStore.js
 *
 * IndexedDB persistence layer for architectural snapshots.
 * Lives alongside projectStore.js in src/lib/analysis/.
 *
 * Schema:
 *   DB: ReactArchitectDB (same as projectStore, bumped to version 2)
 *   Store: "architecture_snapshots"
 *   KeyPath: "id" (UUID)
 *   Indexes: "projectId", "branch", "projectId+branch" (compound)
 *
 * Each snapshot:
 * {
 *   id:              string (UUID)
 *   projectId:       string
 *   branch:          string
 *   commitHash:      string (short, 7-char)
 *   timestamp:       ISO string
 *   healthScore:     number
 *   knowledgeGraph:  object (full KG — can be large)
 *   analysisResults: object
 *   archDiff:        object | null (null for the baseline snapshot)
 *   aiSummary:       string | null
 * }
 */

const DB_NAME    = 'ReactArchitectDB';
const DB_VERSION = 2; // bumped from 1 to add snapshots store
const STORE_NAME = 'architecture_snapshots';
const HANDLES_STORE = 'project_handles'; // existing store from projectStore.js
const MAX_SNAPSHOTS_PER_BRANCH = 20;

// ── DB init ───────────────────────────────────────────────────────────────────

let _db = null;

function openSnapshotDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Preserve existing project_handles store
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE);
      }

      // Create snapshots store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_project', 'projectId', { unique: false });
        store.createIndex('by_branch',  'branch',    { unique: false });
        store.createIndex('by_project_branch', ['projectId', 'branch'], { unique: false });
      }
    };

    request.onsuccess  = (e) => { _db = e.target.result; resolve(_db); };
    request.onerror    = (e) => reject(e.target.error);
  });
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Save a snapshot. Automatically prunes old snapshots beyond MAX_SNAPSHOTS_PER_BRANCH.
 * @param {object} snapshot - full snapshot object
 */
export async function saveSnapshot(snapshot) {
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(snapshot);
    req.onsuccess = () => resolve(snapshot.id);
    req.onerror   = (e) => reject(e.target.error);
    tx.oncomplete = () => pruneSnapshots(snapshot.projectId, snapshot.branch);
  });
}

/**
 * Load all snapshots for a project+branch, sorted newest first.
 * @param {string} projectId
 * @param {string} branch
 * @returns {Promise<object[]>}
 */
export async function getSnapshots(projectId, branch) {
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_project_branch');
    const req = index.getAll([projectId, branch]);
    req.onsuccess = (e) => {
      const snapshots = (e.target.result || []).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      resolve(snapshots);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Load the baseline (oldest) snapshot for a branch.
 */
export async function getBaselineSnapshot(projectId, branch) {
  const snapshots = await getSnapshots(projectId, branch);
  return snapshots[snapshots.length - 1] || null;
}

/**
 * Load the most recent snapshot for a branch.
 */
export async function getLatestSnapshot(projectId, branch) {
  const snapshots = await getSnapshots(projectId, branch);
  return snapshots[0] || null;
}

/**
 * Get lightweight index (no graph data) for UI display.
 */
export async function getSnapshotIndex(projectId, branch) {
  const snapshots = await getSnapshots(projectId, branch);
  return snapshots.map(({ id, branch: b, commitHash, timestamp, healthScore, aiSummary }) => ({
    id, branch: b, commitHash, timestamp, healthScore, aiSummary: aiSummary || null
  }));
}

/**
 * Delete a specific snapshot by id.
 */
export async function deleteSnapshot(snapshotId) {
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(snapshotId);
    req.onsuccess = () => resolve();
    req.onerror   = (e) => reject(e.target.error);
  });
}

/**
 * Delete all snapshots for a project (used when project is deleted).
 */
export async function deleteAllSnapshots(projectId) {
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_project');
    const req = index.openCursor(IDBKeyRange.only(projectId));
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
      else resolve();
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// ── Prune ─────────────────────────────────────────────────────────────────────

async function pruneSnapshots(projectId, branch) {
  try {
    const snapshots = await getSnapshots(projectId, branch);
    if (snapshots.length > MAX_SNAPSHOTS_PER_BRANCH) {
      const toDelete = snapshots.slice(MAX_SNAPSHOTS_PER_BRANCH);
      for (const snap of toDelete) {
        await deleteSnapshot(snap.id);
      }
    }
  } catch (err) {
    console.warn('[snapshotStore] Prune failed:', err);
  }
}
