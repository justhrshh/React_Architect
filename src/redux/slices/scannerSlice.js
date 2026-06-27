import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // idle | scanning | complete | error
  progress: 0,    // 0–100
  phase: null,    // 'files' | 'components' | 'hooks' | 'routes' | 'apis' | 'graph'
  scannedFiles: 0,
  totalFiles: 0,
  ast: null,
  error: null,
};

const scannerSlice = createSlice({
  name: 'scanner',
  initialState,
  reducers: {
    startScan(state) {
      state.status = 'scanning';
      state.progress = 0;
      state.phase = 'files';
      state.error = null;
    },
    setPhase(state, action) {
      state.phase = action.payload;
    },
    setProgress(state, action) {
      state.progress = action.payload;
    },
    setFileCounts(state, action) {
      const { scanned, total } = action.payload;
      state.scannedFiles = scanned;
      state.totalFiles = total;
    },
    setAst(state, action) {
      state.ast = action.payload;
    },
    completeScan(state) {
      state.status = 'complete';
      state.progress = 100;
      state.phase = null;
    },
    setScanError(state, action) {
      state.status = 'error';
      state.error = action.payload;
    },
    resetScanner() {
      return initialState;
    },
  },
});

export const {
  startScan,
  setPhase,
  setProgress,
  setFileCounts,
  setAst,
  completeScan,
  setScanError,
  resetScanner,
} = scannerSlice.actions;

export default scannerSlice.reducer;