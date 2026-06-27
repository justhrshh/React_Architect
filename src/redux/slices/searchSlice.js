import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  query: '',
  results: [],
  isSearching: false,
  filters: {
    components: true,
    routes: true,
    hooks: true,
    apis: true,
  },
};

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    setQuery(state, action) {
      state.query = action.payload;
    },
    setResults(state, action) {
      state.results = action.payload;
    },
    setIsSearching(state, action) {
      state.isSearching = action.payload;
    },
    toggleFilter(state, action) {
      const filter = action.payload;
      if (filter in state.filters) {
        state.filters[filter] = !state.filters[filter];
      }
    },
    clearSearch(state) {
      state.query = '';
      state.results = [];
      state.isSearching = false;
    },
  },
});

export const {
  setQuery,
  setResults,
  setIsSearching,
  toggleFilter,
  clearSearch,
} = searchSlice.actions;

export default searchSlice.reducer;