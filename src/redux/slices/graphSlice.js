import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  knowledgeGraph: null, // Central Knowledge Graph: { version, project, nodes, edges, validation, rawFiles }
  files: [],            // Scanned path strings
  selectedNodeId: "",   // Selected node identifier
  viewport: { x: 0, y: 0, zoom: 1 },
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setKnowledgeGraph(state, action) {
      state.knowledgeGraph = action.payload;
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
  setFiles,
  selectNodeId,
  clearSelection,
  setViewport,
  resetGraph,
} = graphSlice.actions;

export default graphSlice.reducer;