import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  name: null,
  path: null,
  files: [],
  components: [],
  status: 'idle', // idle | loading | ready | error
  error: null,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProject(state, action) {
      const { name, path } = action.payload;
      state.name = name;
      state.path = path;
    },
    setFiles(state, action) {
      state.files = action.payload;
    },
    setComponents(state, action) {
      state.components = action.payload;
    },
    setStatus(state, action) {
      state.status = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.status = 'error';
    },
    resetProject() {
      return initialState;
    },
  },
});

export const {
  setProject,
  setFiles,
  setComponents,
  setStatus,
  setError,
  resetProject,
} = projectSlice.actions;

export default projectSlice.reducer;