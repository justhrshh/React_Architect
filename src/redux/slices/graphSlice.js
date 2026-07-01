import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  nodes: [],
  edges: [],
  files: [],
  routeNodes: [],
  routeEdges: [],
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
    setFiles(state, action) {
      state.files = action.payload;
    },
    setRouteNodes(state, action) {
      state.routeNodes = action.payload;
    },
    setRouteEdges(state, action) {
      state.routeEdges = action.payload;
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
  setFiles,
  setRouteNodes,
  setRouteEdges,
  selectNode,
  clearSelection,
  setViewport,
  resetGraph,
} = graphSlice.actions;

export default graphSlice.reducer;