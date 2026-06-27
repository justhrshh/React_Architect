import { configureStore } from '@reduxjs/toolkit';
import projectReducer from './slices/projectSlice.js';
import graphReducer from './slices/graphSlice.js';
import uiReducer from './slices/uiSlice.js';
import searchReducer from './slices/searchSlice.js';
import scannerReducer from './slices/scannerSlice.js';
import settingsReducer from './slices/settingsSlice.js';
import architectureReducer from './slices/architectureSlice.js';

export const store = configureStore({
  reducer: {
    project: projectReducer,
    graph: graphReducer,
    ui: uiReducer,
    search: searchReducer,
    scanner: scannerReducer,
    settings: settingsReducer,
    architecture: architectureReducer,
  },
});