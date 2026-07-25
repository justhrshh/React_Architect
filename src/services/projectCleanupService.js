import { deleteProject } from '@/redux/slices/hubSlice';
import { resetGraph } from '@/redux/slices/graphSlice';
import { resetAnalysis } from '@/redux/slices/analysisSlice';
import { resetProject } from '@/redux/slices/projectSlice';
import { resetGitState } from '@/redux/slices/gitSlice';
import { setAppMode } from '@/redux/slices/uiSlice';

import { deleteProjectHandle, deleteGitSourceFiles } from '@/lib/analysis/projectStore';
import { deleteAllSnapshots } from '@/lib/analysis/snapshotStore';

/**
 * Cascade Delete for a project.
 * Performs a complete cleanup of all associated data across storage and memory:
 * 1. Project record (hubSlice & localStorage)
 * 2. Repository metadata & file handles (IndexedDB project_handles)
 * 3. Architecture snapshots (IndexedDB architecture_snapshots)
 * 4. In-memory window caches (projectHandles, projectZipFiles, projectGitFiles, projectFiles)
 * 5. In-memory Redux states (graphSlice, analysisSlice, projectSlice, gitSlice)
 * 6. Safe redirect to Hub if the deleted project was currently open
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {Function} params.dispatch - Redux dispatch function
 * @param {Function} [params.navigate] - React Router navigate function
 * @param {string} [params.currentSelectedId] - currently selected project ID
 */
export async function purgeProjectData({ projectId, dispatch, navigate = null, currentSelectedId = null }) {
  if (!projectId || !dispatch) return;

  try {
    // 1. Delete Project Record from Redux state & localStorage
    dispatch(deleteProject(projectId));

    // 2. Delete Repository File Handles / ZIPs from IndexedDB
    await deleteProjectHandle(projectId).catch((err) =>
      console.warn('[projectCleanup] Failed to delete IDB project handle:', err)
    );

    // 3. Delete persisted Git source files from IndexedDB
    await deleteGitSourceFiles(projectId).catch((err) =>
      console.warn('[projectCleanup] Failed to delete IDB git source files:', err)
    );

    // 4. Delete All Architecture Snapshots from IndexedDB
    await deleteAllSnapshots(projectId).catch((err) =>
      console.warn('[projectCleanup] Failed to delete IDB snapshots:', err)
    );

    // 5. Clear In-Memory Session Caches (window object)
    if (window.projectHandles?.[projectId])  delete window.projectHandles[projectId];
    if (window.projectZipFiles?.[projectId]) delete window.projectZipFiles[projectId];
    if (window.projectGitFiles?.[projectId]) delete window.projectGitFiles[projectId]; // session cache

    // 6. If the deleted project was currently active, reset Redux states & redirect safely
    const isActiveProject = currentSelectedId === projectId;

    if (isActiveProject) {
      window.projectFiles = null;

      dispatch(resetGraph());
      dispatch(resetAnalysis());
      dispatch(resetProject());
      dispatch(resetGitState());
      dispatch(setAppMode('hub'));

      if (navigate) {
        navigate('/hub', { replace: true });
      }
    }
  } catch (err) {
    console.error('[projectCleanup] Cascade delete failed:', err);
  }
}
