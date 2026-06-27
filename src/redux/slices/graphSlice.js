import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    setNodes(state, action) {
      state.nodes = action.payload;
    },
    setEdges(state, action) {
      state.edges = action.payload;
    },
    selectNode(state, action) {
      state.selectedNode = action.payload;
    },
    clearSelection(state) {
      state.selectedNode = null;
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
  setNodes,
  setEdges,
  selectNode,
  clearSelection,
  setViewport,
  resetGraph,
} = graphSlice.actions;

export default graphSlice.reducer;