import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  score: null,         // 0–100
  grade: null,         // A | B | C | D | F
  insights: [],
  suggestions: [],
  heatmap: [],
  dependencyMap: {},
  status: 'idle',      // idle | analyzing | ready | error
  error: null,
};

const architectureSlice = createSlice({
  name: 'architecture',
  initialState,
  reducers: {
    setScore(state, action) {
      const { score, grade } = action.payload;
      state.score = score;
      state.grade = grade;
    },
    setInsights(state, action) {
      state.insights = action.payload;
    },
    setSuggestions(state, action) {
      state.suggestions = action.payload;
    },
    setHeatmap(state, action) {
      state.heatmap = action.payload;
    },
    setDependencyMap(state, action) {
      state.dependencyMap = action.payload;
    },
    setStatus(state, action) {
      state.status = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = 'error';
    },
    resetArchitecture() {
      return initialState;
    },
  },
});

export const {
  setScore,
  setInsights,
  setSuggestions,
  setHeatmap,
  setDependencyMap,
  setStatus,
  setError,
  resetArchitecture,
} = architectureSlice.actions;

export default architectureSlice.reducer;