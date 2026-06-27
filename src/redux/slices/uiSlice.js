import { createSlice } from '@reduxjs/toolkit';

// Workspace modes correspond to the immersive rooms in the workspace
const MODES = ['architecture', 'routes', 'state-flow', 'api-flow', 'documentation', 'project-brain'];

const initialState = {
  activeMode: 'architecture',
  isSidebarOpen: false,
  isInspectorOpen: false,
  isCommandPaletteOpen: false,
  isLoading: false,
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveMode(state, action) {
      if (MODES.includes(action.payload)) {
        state.activeMode = action.payload;
      }
    },
    toggleSidebar(state) {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    toggleInspector(state) {
      state.isInspectorOpen = !state.isInspectorOpen;
    },
    openCommandPalette(state) {
      state.isCommandPaletteOpen = true;
    },
    closeCommandPalette(state) {
      state.isCommandPaletteOpen = false;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
    },
    setNotification(state, action) {
      state.notification = action.payload;
    },
    clearNotification(state) {
      state.notification = null;
    },
  },
});

export const {
  setActiveMode,
  toggleSidebar,
  toggleInspector,
  openCommandPalette,
  closeCommandPalette,
  setLoading,
  setNotification,
  clearNotification,
} = uiSlice.actions;

export default uiSlice.reducer;