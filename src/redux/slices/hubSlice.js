import { createSlice } from '@reduxjs/toolkit';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'react-architect:projects';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Seed default projects to showcase the dashboard beautifully on first run
    const defaultProjects = [
      {
        id: "portfolio-id",
        name: "Portfolio",
        framework: "React",
        buildTool: "Vite",
        reactVersion: "React 19",
        hasTypeScript: true,
        hasTailwind: true,
        hasRedux: true,
        hasRouter: true,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        lastOpenedAt: new Date().toISOString(),
        architectureScore: 94,
      },
      {
        id: "dashboard-id",
        name: "SaaS Dashboard",
        framework: "Next.js",
        buildTool: "Webpack",
        reactVersion: "React 19",
        hasTypeScript: true,
        hasTailwind: true,
        hasRedux: false,
        hasRouter: true,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        lastOpenedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        architectureScore: 88,
      },
      {
        id: "gsap-landing-id",
        name: "GSAP Creative Room",
        framework: "React",
        buildTool: "Vite",
        reactVersion: "React 18",
        hasTypeScript: false,
        hasTailwind: false,
        hasRedux: false,
        hasRouter: false,
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        lastOpenedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
        architectureScore: 91,
      },
      {
        id: "test-app-id",
        name: "Legacy App",
        framework: "React",
        buildTool: "Create React App",
        reactVersion: "React 17",
        hasTypeScript: false,
        hasTailwind: false,
        hasRedux: true,
        hasRouter: true,
        createdAt: new Date(Date.now() - 86400000 * 50).toISOString(),
        lastOpenedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
        architectureScore: 72,
      }
    ];
    saveToStorage(defaultProjects);
    return defaultProjects;
  } catch {
    return [];
  }
}

function saveToStorage(projects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // silently fail — storage quota or private mode
  }
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const initialState = {
  /** @type {Array<{id,name,framework,createdAt,lastOpenedAt,architectureScore,lastAnalysisDate}>} */
  projects: loadFromStorage(),
  /** @type {string|null} */
  selectedProjectId: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------
const hubSlice = createSlice({
  name: 'hub',
  initialState,
  reducers: {
    /**
     * Add a project created from an imported directory or ZIP.
     * payload: DetectedProject (from projectDetector.js)
     */
    addProject(state, action) {
      const {
        id             = crypto.randomUUID(), // wizard pre-generates; importer leaves blank
        name,
        packageName    = null,
        description    = null,
        packageVersion = null,
        framework      = "React",
        buildTool      = null,
        reactVersion   = null,
        hasTypeScript  = false,
        hasTailwind    = false,
        hasRedux       = false,
        hasRouter      = false,
        importMethod   = "folder",
        folderName     = null,
        // Wizard-specific (undefined for imported projects)
        language           = null,
        styling            = null,
        stateManagement    = null,
        routing            = null,
        optionalPackages   = [],
        folderStructure    = null,
      } = action.payload;

      const project = {
        id,
        name,
        packageName,
        description,
        packageVersion,
        framework,
        buildTool,
        reactVersion,
        hasTypeScript,
        hasTailwind,
        hasRedux,
        hasRouter,
        importMethod,
        folderName,
        language,
        styling,
        stateManagement,
        routing,
        optionalPackages,
        folderStructure,
        createdAt:         new Date().toISOString(),
        lastOpenedAt:      new Date().toISOString(),
        architectureScore: null,
        lastAnalysisDate:  null,
      };

      state.projects.push(project);
      saveToStorage(state.projects);
    },

    /**
     * Delete a project by id.
     * payload: string (id)
     */
    deleteProject(state, action) {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
      if (state.selectedProjectId === action.payload) {
        state.selectedProjectId = null;
      }
      saveToStorage(state.projects);
    },

    /**
     * Rename a project.
     * payload: { id: string, name: string }
     */
    renameProject(state, action) {
      const { id, name } = action.payload;
      const project = state.projects.find((p) => p.id === id);
      if (project) {
        project.name = name.trim();
        saveToStorage(state.projects);
      }
    },

    /**
     * Set the active project by id.
     * payload: string (id)
     */
    selectProject(state, action) {
      state.selectedProjectId = action.payload;
    },

    /**
     * Clear the active project (return to hub).
     */
    clearSelectedProject(state) {
      state.selectedProjectId = null;
    },

    /**
     * Update lastOpenedAt timestamp for a project.
     * payload: string (id)
     */
    updateLastOpened(state, action) {
      const project = state.projects.find((p) => p.id === action.payload);
      if (project) {
        project.lastOpenedAt = new Date().toISOString();
        saveToStorage(state.projects);
      }
    },
  },
});

export const {
  addProject,
  deleteProject,
  renameProject,
  selectProject,
  clearSelectedProject,
  updateLastOpened,
} = hubSlice.actions;

export default hubSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectAllProjects = (state) => state.hub.projects;
export const selectSelectedProjectId = (state) => state.hub.selectedProjectId;
export const selectSelectedProject = (state) =>
  state.hub.projects.find((p) => p.id === state.hub.selectedProjectId) ?? null;
