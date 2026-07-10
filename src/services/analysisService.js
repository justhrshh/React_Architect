import { createAsyncThunk } from '@reduxjs/toolkit';
import { getProjectHandle } from '@/lib/analysis/projectStore';
import { setFiles, setKnowledgeGraph } from '@/redux/slices/graphSlice';
import {
  setAnalysisStatus,
  setAnalysisPhase,
  setNeedsPermission,
  setAnalysisResults,
} from '@/redux/slices/analysisSlice';

/**
 * Shared async thunk that orchestrates the full project analysis pipeline.
 * Can be dispatched from Hub (on project select) or Workspace (fallback for direct nav).
 *
 * Handles:
 * - File handle / ZIP recovery from IndexedDB
 * - Permission checking
 * - Full analysis pipeline with progress dispatch
 * - Mock data fallback when no file handle exists
 */
export const startProjectAnalysis = createAsyncThunk(
  'analysis/startProjectAnalysis',
  async ({ projectId, project }, { dispatch, rejectWithValue }) => {
    try {
      // 1. Recover file handle from memory or IndexedDB
      let dirHandle = window.projectHandles?.[projectId];
      let zipFile = window.projectZipFiles?.[projectId];

      if (!dirHandle && !zipFile) {
        const persisted = await getProjectHandle(projectId);
        if (persisted) {
          if (persisted instanceof File) {
            zipFile = persisted;
            if (!window.projectZipFiles) window.projectZipFiles = {};
            window.projectZipFiles[projectId] = zipFile;
          } else {
            dirHandle = persisted;
            if (!window.projectHandles) window.projectHandles = {};
            window.projectHandles[projectId] = dirHandle;
          }
        }
      }

      // 2. Check permissions for directory handle
      if (dirHandle) {
        const permission = await dirHandle.queryPermission({ mode: 'read' });
        if (permission !== 'granted') {
          dispatch(setNeedsPermission(true));
          return rejectWithValue('permission-needed');
        }
        dispatch(setNeedsPermission(false));
      }

      // 3. Run analysis pipeline with progress callbacks
      dispatch(setAnalysisStatus('analyzing'));

      if (dirHandle || zipFile) {
        const { analyzeProject } = await import('@/engines/analyzer');
        const kg = await analyzeProject(project, dirHandle, zipFile, (phase) => {
          dispatch(setAnalysisPhase(phase));
        });

        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(kg.analysis));
        return { success: true };
      } else {
        // Mock data fallback (no file handle available)
        dispatch(setAnalysisPhase('scanning'));
        const { getGraphDataForProject } = await import('@/lib/analysis/mockDataGenerator');
        const { files } = getGraphDataForProject(project);

        dispatch(setAnalysisPhase('building-graph'));
        const { buildKnowledgeGraph } = await import('@/engines/graph/buildKnowledgeGraph');

        const mockFiles = files.map(f => ({
          path: f,
          content: generateMockContent(f),
        }));
        const kg = buildKnowledgeGraph(mockFiles, project);

        dispatch(setAnalysisPhase('resolving'));
        const { layoutGraphNodes } = await import('@/engines/layout/layoutEngine');
        kg.nodes = layoutGraphNodes(kg.nodes, kg.edges);
        kg.rawFiles = mockFiles;

        dispatch(setAnalysisPhase('analyzing'));
        const { runAnalysis } = await import('@/engines/analysis');
        const analysisResults = runAnalysis(kg);
        kg.analysis = analysisResults;

        dispatch(setAnalysisPhase('complete'));
        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(analysisResults));
        return { success: true };
      }
    } catch (err) {
      if (err === 'permission-needed') throw err;
      console.error('Analysis pipeline failed:', err);
      dispatch(setAnalysisStatus('error'));
      return rejectWithValue(err.message);
    }
  }
);

// ── Mock content generator (used when no real file handle is available) ──────

const MOCK_FILES_CONTENT = {
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

function generateMockContent(filePath) {
  const cleanPath = filePath.replace(/\\/g, "/");
  if (MOCK_FILES_CONTENT[cleanPath]) {
    return MOCK_FILES_CONTENT[cleanPath];
  }
  const parts = cleanPath.split("/");
  const fileName = parts.pop();
  const name = fileName.split(".")[0];

  if (cleanPath.endsWith(".md")) {
    return `# ${name}\nMock document contents for ${cleanPath}.`;
  }

  if (cleanPath.includes("/components/") || cleanPath.includes("/pages/") || cleanPath.includes("page.jsx") || cleanPath.includes("layout.jsx") || cleanPath.includes("providers")) {
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);
    return `import React from 'react';\nexport default function ${componentName}() {\n  return <div>${componentName} content</div>;\n}`;
  }

  return "";
}
