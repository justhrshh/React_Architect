import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // idle | analyzing | ready | error
  projectDNA: null,
  architectureHealth: null,
  dependencyHeatmap: null,
  deadCode: null,
  complexity: null,
  impactAnalysis: null,
  error: null,
};

const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setAnalysisStatus(state, action) {
      state.status = action.payload;
    },
    setAnalysisResults(state, action) {
      const { projectDNA, architectureHealth, dependencyHeatmap, deadCode, complexity } = action.payload;
      state.projectDNA = projectDNA;
      state.architectureHealth = architectureHealth;
      state.dependencyHeatmap = dependencyHeatmap;
      state.deadCode = deadCode;
      state.complexity = complexity;
      state.status = 'ready';
    },
    setAnalysisError(state, action) {
      state.error = action.payload;
      state.status = 'error';
    },
    resetAnalysis() {
      return initialState;
    },
  },
});

export const {
  setAnalysisStatus,
  setAnalysisResults,
  setAnalysisError,
  resetAnalysis,
} = analysisSlice.actions;

export default analysisSlice.reducer;
