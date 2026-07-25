/**
 * sourceProviders.js
 *
 * Unified source file abstraction layer for the analysis pipeline.
 *
 * Architecture:
 *   SourceProviderFactory.getProvider(project)
 *     ├── LocalSourceProvider   → reads via File System Access API dirHandle
 *     ├── ZipSourceProvider     → unzips a persisted File object from IndexedDB
 *     ├── GitSourceProvider     → restores files from IndexedDB git_source_files store
 *     └── DemoSourceProvider    → generates in-memory stub files for the showcase
 *
 * Contract:
 *   provider.getFiles(project) → Promise<{ path: string, content: string }[]>
 *
 * Invariant:
 *   Mock/demo data is ONLY reachable through DemoSourceProvider.
 *   LocalSourceProvider, ZipSourceProvider, and GitSourceProvider throw
 *   SourceUnavailableError on failure instead of silently falling back.
 */

import { getProjectHandle, getGitSourceFiles } from '@/lib/analysis/projectStore';

// ── Error types ───────────────────────────────────────────────────────────────

/**
 * Thrown when a real project's source files cannot be loaded.
 * The caller must surface a recovery prompt to the user; never fabricate data.
 */
export class SourceUnavailableError extends Error {
  /**
   * @param {string} importMethod - The project's import method
   * @param {string} [detail]     - Optional human-readable detail
   */
  constructor(importMethod, detail = '') {
    const messages = {
      local: 'Local folder access was lost. Please grant permission or re-import the project.',
      zip:   'ZIP archive was removed from storage. Please re-import the project.',
      git:   'Repository cache was cleared (page refresh). Please re-sync to refetch the latest files.',
    };
    super(messages[importMethod] || `Source files unavailable for import method: ${importMethod}. ${detail}`);
    this.name = 'SourceUnavailableError';
    this.importMethod = importMethod;
    this.recoverable = importMethod === 'git'; // Git projects can be re-synced without a full re-import
  }
}

// ── LocalSourceProvider ───────────────────────────────────────────────────────

/**
 * Reads source files from a local directory via the File System Access API.
 * Requires a persisted FileSystemDirectoryHandle in IndexedDB or the window cache.
 */
export class LocalSourceProvider {
  /**
   * @param {string} projectId
   * @returns {Promise<{ path: string, content: string }[]>}
   * @throws {SourceUnavailableError}
   */
  async getFiles(project) {
    const { id: projectId } = project;

    // 1. Try window cache (hot path — same session)
    let dirHandle = window.projectHandles?.[projectId];

    // 2. Recover from IndexedDB (page refresh path)
    if (!dirHandle) {
      const persisted = await getProjectHandle(projectId).catch(() => null);
      if (persisted && !(persisted instanceof File)) {
        dirHandle = persisted;
        if (!window.projectHandles) window.projectHandles = {};
        window.projectHandles[projectId] = dirHandle;
      }
    }

    if (!dirHandle) {
      throw new SourceUnavailableError('local');
    }

    // 3. Permission check
    const permission = await dirHandle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') {
      // Signal to the caller that a permission prompt is required
      const err = new SourceUnavailableError('local', 'File system permission was revoked.');
      err.needsPermission = true;
      err.dirHandle = dirHandle;
      throw err;
    }

    // 4. Delegate actual file reading to the existing analyzeProject engine
    //    (which already handles recursive directory traversal + ZIP unzipping)
    return { dirHandle, zipFile: null }; // analysisService handles engine delegation
  }
}

// ── ZipSourceProvider ─────────────────────────────────────────────────────────

/**
 * Reads source files from a ZIP archive persisted in IndexedDB.
 */
export class ZipSourceProvider {
  /**
   * @param {object} project
   * @returns {Promise<{ zipFile: File }>}
   * @throws {SourceUnavailableError}
   */
  async getFiles(project) {
    const { id: projectId } = project;

    // 1. Try window cache
    let zipFile = window.projectZipFiles?.[projectId];

    // 2. Recover from IndexedDB
    if (!zipFile) {
      const persisted = await getProjectHandle(projectId).catch(() => null);
      if (persisted instanceof File) {
        zipFile = persisted;
        if (!window.projectZipFiles) window.projectZipFiles = {};
        window.projectZipFiles[projectId] = zipFile;
      }
    }

    if (!zipFile) {
      throw new SourceUnavailableError('zip');
    }

    return { dirHandle: null, zipFile };
  }
}

// ── GitSourceProvider ─────────────────────────────────────────────────────────

/**
 * Restores downloaded Git source files from IndexedDB.
 *
 * Files are persisted after every successful Git import or commit checkout
 * via saveGitSourceFiles(), so they survive page refresh without a network call.
 */
export class GitSourceProvider {
  /**
   * Retrieves persisted Git source files for a project.
   * Falls back to window.projectGitFiles for backwards compatibility with the
   * session-level hot cache populated during the current import flow.
   *
   * @param {object} project
   * @returns {Promise<{ path: string, content: string }[]>}
   * @throws {SourceUnavailableError}
   */
  async getFiles(project) {
    const { id: projectId } = project;

    // 1. Try window cache (populated during same-session import)
    if (window.projectGitFiles?.[projectId]?.length) {
      return window.projectGitFiles[projectId];
    }

    // 2. Restore from IndexedDB (survives page refresh)
    const persisted = await getGitSourceFiles(projectId).catch(() => null);
    if (persisted?.length) {
      // Warm the window cache for any subsequent same-session access
      if (!window.projectGitFiles) window.projectGitFiles = {};
      window.projectGitFiles[projectId] = persisted;
      return persisted;
    }

    throw new SourceUnavailableError('git');
  }
}

// ── DemoSourceProvider ────────────────────────────────────────────────────────

/**
 * Generates in-memory stub files for the demo/showcase mode.
 *
 * This is the ONLY provider that produces synthetic data.
 * It is ONLY reachable when project.importMethod === 'demo'.
 */
export class DemoSourceProvider {
  /**
   * @param {object} project
   * @returns {Promise<{ path: string, content: string }[]>}
   */
  async getFiles(project) {
    const { getGraphDataForProject } = await import('@/lib/analysis/mockDataGenerator');
    const { files } = getGraphDataForProject(project);
    return files.map(f => ({ path: f, content: generateDemoContent(f) }));
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Returns the correct SourceProvider for a project based on importMethod.
 *
 * @param {object} project
 * @returns {LocalSourceProvider|ZipSourceProvider|GitSourceProvider|DemoSourceProvider}
 * @throws {Error} for unknown importMethod values
 */
export function getSourceProvider(project) {
  switch (project?.importMethod) {
    case 'local':
    case 'folder':       // local folder without .git
    case 'folder-git':   // local folder detected as a git repository
      return new LocalSourceProvider();
    case 'zip':
      return new ZipSourceProvider();
    case 'git':
      return new GitSourceProvider();
    case 'demo':
      return new DemoSourceProvider();
    default:
      throw new Error(
        `[sourceProviders] Unknown importMethod: "${project?.importMethod}". ` +
        `Expected one of: local, folder, folder-git, zip, git, demo. Cannot load project files.`
      );
  }
}

// ── Demo content generator ────────────────────────────────────────────────────
// Isolated here so it can NEVER be called from real import code paths.

const DEMO_FILE_CONTENT = {
  "README.md": `# Project Guide\nWelcome to the React Architect workspace documentation.\n\n## Getting Started\nTo view your project structure in real time:\n- Enter the **Architecture Studio** to see components.\n- Enter the **Route Studio** to examine endpoint mapping trees.\n- Browse slices in the **State Studio**.\n\n---\n*Generated dynamically by the React Architect scanner engine.*`,
  "docs/CHANGELOG.md": `# Changelog\nAll notable changes to this project will be documented in this file.\n\n## [3.0.0] - Centralized Knowledge Graph Engine\n- Integrated unified AST parsing extractor.\n- Decoupled visual layout calculation coordinates.`,
  "src/App.jsx": `import React from 'react';\nimport Router from './app/router';\nexport default function App() {\n  return <Router />;\n}`,
  "src/app/router.jsx": `import React from 'react';\nimport { createBrowserRouter, RouterProvider } from 'react-router-dom';\nimport App from '../App';\nimport Login from '../pages/Login';\nimport Dashboard from '../pages/Dashboard';\n\nconst router = createBrowserRouter([\n  { path: '/', element: <App /> },\n  { path: '/login', element: <Login /> },\n  { path: '/dashboard', element: <Dashboard /> }\n]);\n\nexport default function Router() {\n  return <RouterProvider router={router} />;\n}`,
  "src/pages/Login.jsx": `import React, { useState } from 'react';\nimport { useDispatch } from 'react-redux';\nimport FormInput from '../components/FormInput';\nimport api from '../services/api';\n\nexport default function Login() {\n  const dispatch = useDispatch();\n  const [email, setEmail] = useState('');\n  \n  const handleLogin = () => {\n    api.post('/auth/login', { email });\n  };\n\n  return <FormInput value={email} onChange={setEmail} onSubmit={handleLogin} />;\n}`,
  "src/pages/Dashboard.jsx": `import React from 'react';\nimport Sidebar from '../components/Sidebar';\n\nexport default function Dashboard() {\n  return (\n    <div>\n      <Sidebar />\n      <h1>Welcome to Dashboard</h1>\n    </div>\n  );\n}`,
  "src/components/Sidebar.jsx": `import React from 'react';\nexport default function Sidebar() {\n  return <aside>Navigation links</aside>;\n}`,
  "src/components/FormInput.jsx": `import React from 'react';\nexport default function FormInput({ value, onChange, onSubmit }) {\n  return (\n    <form onSubmit={onSubmit}>\n      <input value={value} onChange={e => onChange(e.target.value)} />\n    </form>\n  );\n}`,
  "src/redux/store.js": `import { configureStore } from '@reduxjs/toolkit';\nimport authReducer from './authSlice';\nimport uiReducer from './uiSlice';\n\nexport const store = configureStore({\n  reducer: {\n    auth: authReducer,\n    ui: uiReducer\n  }\n});`,
  "src/redux/authSlice.js": `import { createSlice } from '@reduxjs/toolkit';\nexport const authSlice = createSlice({\n  name: 'auth',\n  initialState: {\n    currentUser: null,\n    users: []\n  },\n  reducers: {}\n});\nexport default authSlice.reducer;`,
  "src/redux/uiSlice.js": `import { createSlice } from '@reduxjs/toolkit';\nexport const uiSlice = createSlice({\n  name: 'ui',\n  initialState: {\n    appMode: 'dark',\n    sidebarOpen: true\n  },\n  reducers: {}\n});\nexport default uiSlice.reducer;`,
  "src/services/api.js": `import axios from 'axios';\nexport const api = axios.create({\n  baseURL: 'api.domain.com'\n});`,
  "src/services/endpoints.js": `import { api } from './api';\nexport const login = (data) => api.post('/auth/login', data);\nexport const signup = (data) => api.post('/auth/signup', data);\nexport const getProjects = () => api.get('/projects');`
};

function generateDemoContent(filePath) {
  const cleanPath = filePath.replace(/\\/g, "/");
  if (DEMO_FILE_CONTENT[cleanPath]) return DEMO_FILE_CONTENT[cleanPath];

  const parts  = cleanPath.split("/");
  const name   = parts.pop().split(".")[0];

  if (cleanPath.endsWith(".md")) {
    return `# ${name}\nDemo document contents for ${cleanPath}.`;
  }
  if (cleanPath.includes("/components/") || cleanPath.includes("/pages/") || cleanPath.includes("page.jsx") || cleanPath.includes("layout.jsx")) {
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);
    return `import React from 'react';\nexport default function ${componentName}() {\n  return <div>${componentName} content</div>;\n}`;
  }
  return "";
}
