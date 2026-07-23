import { createSlice } from '@reduxjs/toolkit';

/**
 * gitSlice — manages all transient Git state for the current import session
 * and active project git metadata (branches, sync status, snapshots index).
 *
 * Persistent data (snapshots) lives in IndexedDB via snapshotStore.js.
 * This slice holds the in-memory working state only.
 */

const initialState = {
  // ── Import session state ─────────────────────────────────────────────────
  /** 'idle' | 'connecting' | 'fetching_branches' | 'ready' | 'importing' | 'error' */
  importPhase: 'idle',
  importError: null,

  /** Detected provider: 'github' | 'gitlab' | 'bitbucket' | 'generic' | null */
  detectedProvider: null,

  /** Parsed from URL: { owner, repo, repoUrl } */
  parsedRepo: null,

  /** List of branch objects fetched from provider: [{ name, isDefault }] */
  branches: [],

  /** Currently selected branch in import wizard */
  selectedBranch: null,

  /** Import progress: 0–100 */
  importProgress: 0,

  /** Current progress label shown to user */
  importProgressLabel: '',

  // ── Active project git state ──────────────────────────────────────────────
  /** Snapshot index for active project (lightweight, no graph data) */
  snapshotIndex: [], // [{ id, branch, commitHash, timestamp, healthScore }]

  /** Whether a remote update check is in progress */
  checkingUpdates: false,

  /** Sync error for active project */
  syncError: null,
};

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    // ── Import flow ───────────────────────────────────────────────────────
    setImportPhase(state, action) {
      state.importPhase = action.payload;
      if (action.payload === 'idle') {
        state.importError = null;
        state.importProgress = 0;
        state.importProgressLabel = '';
      }
    },

    setImportError(state, action) {
      state.importError = action.payload;
      state.importPhase = 'error';
    },

    setDetectedProvider(state, action) {
      state.detectedProvider = action.payload;
    },

    setParsedRepo(state, action) {
      state.parsedRepo = action.payload;
    },

    setBranches(state, action) {
      state.branches = action.payload;
    },

    setSelectedBranch(state, action) {
      state.selectedBranch = action.payload;
    },

    setImportProgress(state, action) {
      const { progress, label } = action.payload;
      state.importProgress = progress;
      if (label !== undefined) state.importProgressLabel = label;
    },

    resetImport(state) {
      state.importPhase = 'idle';
      state.importError = null;
      state.detectedProvider = null;
      state.parsedRepo = null;
      state.branches = [];
      state.selectedBranch = null;
      state.importProgress = 0;
      state.importProgressLabel = '';
    },

    // ── Snapshot index ────────────────────────────────────────────────────
    setSnapshotIndex(state, action) {
      state.snapshotIndex = action.payload;
    },

    addSnapshotToIndex(state, action) {
      // Prepend new snapshot; keep max 20
      state.snapshotIndex = [action.payload, ...state.snapshotIndex].slice(0, 20);
    },

    // ── Sync ─────────────────────────────────────────────────────────────
    setCheckingUpdates(state, action) {
      state.checkingUpdates = action.payload;
    },

    setSyncError(state, action) {
      state.syncError = action.payload;
    },

    resetGitState() {
      return initialState;
    },
  },
});

export const {
  setImportPhase,
  setImportError,
  setDetectedProvider,
  setParsedRepo,
  setBranches,
  setSelectedBranch,
  setImportProgress,
  resetImport,
  setSnapshotIndex,
  addSnapshotToIndex,
  setCheckingUpdates,
  setSyncError,
  resetGitState,
} = gitSlice.actions;

export default gitSlice.reducer;

// Selectors
export const selectImportPhase    = (state) => state.git.importPhase;
export const selectImportError    = (state) => state.git.importError;
export const selectDetectedProvider = (state) => state.git.detectedProvider;
export const selectBranches       = (state) => state.git.branches;
export const selectSelectedBranch = (state) => state.git.selectedBranch;
export const selectImportProgress = (state) => state.git.importProgress;
export const selectImportProgressLabel = (state) => state.git.importProgressLabel;
export const selectSnapshotIndex  = (state) => state.git.snapshotIndex;
export const selectCheckingUpdates = (state) => state.git.checkingUpdates;
