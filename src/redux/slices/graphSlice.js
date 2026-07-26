import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  knowledgeGraph: null, // Central Knowledge Graph: { version, project, nodes, edges, validation, rawFiles }
  files: [],            // Scanned path strings
  selectedNodeId: "",   // Selected node identifier
  viewport: { x: 0, y: 0, zoom: 1 },
  queryEngine: null,    // GraphQueryEngine singleton
  queryHistory: {},     // { [projectKey: string]: Array<QueryHistoryEntry> }
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setKnowledgeGraph(state, action) {
      state.knowledgeGraph = action.payload;
    },
    setQueryEngine(state, action) {
      state.queryEngine = action.payload;
    },
    addQueryHistoryEntry(state, action) {
      const { projectKey, entry } = action.payload || {};
      if (!projectKey || !entry) return;
      if (!state.queryHistory[projectKey]) {
        state.queryHistory[projectKey] = [];
      }
      // Prepend and limit to 10
      state.queryHistory[projectKey] = [
        entry,
        ...state.queryHistory[projectKey].filter((item) => item.id !== entry.id),
      ].slice(0, 10);
    },
    setFiles(state, action) {
      state.files = action.payload;
    },
    selectNodeId(state, action) {
      state.selectedNodeId = action.payload;
    },
    clearSelection(state) {
      state.selectedNodeId = "";
    },
    setViewport(state, action) {
      state.viewport = action.payload;
    },
    resetGraph() {
      return initialState;
    },
  },
});

export const {
  setKnowledgeGraph,
  setQueryEngine,
  addQueryHistoryEntry,
  setFiles,
  selectNodeId,
  clearSelection,
  setViewport,
  resetGraph,
} = graphSlice.actions;

const EMPTY_ARRAY = [];

export const selectQueryEngine = (state) => state.graph?.queryEngine || null;
export const selectQueryHistory = (state, projectKey) =>
  (projectKey && state.graph?.queryHistory?.[projectKey]) || EMPTY_ARRAY;

export default graphSlice.reducer;