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
  // States merged from clone project
  bootActive: false,
  bootStep: 0,
  activeRoom: 'project-brain',
  cursorActive: false,
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
    // Reducers merged from clone project
    startBoot(state) {
      state.bootActive = true;
      state.bootStep = 0;
    },
    setBootStep(state, action) {
      state.bootStep = action.payload;
    },
    endBoot(state) {
      state.bootActive = false;
    },
    setActiveRoom(state, action) {
      state.activeRoom = action.payload;
    },
    setCursorActive(state, action) {
      state.cursorActive = action.payload;
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
  // Merged exports
  startBoot,
  setBootStep,
  endBoot,
  setActiveRoom,
  setCursorActive,
} = uiSlice.actions;

export default uiSlice.reducer;