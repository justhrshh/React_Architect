import { createAsyncThunk } from '@reduxjs/toolkit';
import { setFiles, setKnowledgeGraph } from '@/redux/slices/graphSlice';
import {
  setAnalysisStatus,
  setAnalysisPhase,
  setNeedsPermission,
  setAnalysisResults,
} from '@/redux/slices/analysisSlice';
import { getSourceProvider, SourceUnavailableError } from '@/services/sourceProviders';

/**
 * Shared async thunk that orchestrates the full project analysis pipeline.
 * Can be dispatched from Hub (on project select) or Workspace (fallback for direct nav).
 *
 * Source routing is handled entirely by SourceProviderFactory:
 *   - local  → LocalSourceProvider  (File System Access API + IndexedDB)
 *   - zip    → ZipSourceProvider    (File blob stored in IndexedDB)
 *   - git    → GitSourceProvider    (file array persisted in IndexedDB git_source_files)
 *   - demo   → DemoSourceProvider   (in-memory stubs — ONLY for showcase mode)
 *
 * Invariant: Real projects (local / zip / git) NEVER fall back to demo data.
 * If source files cannot be located, SourceUnavailableError is thrown and the
 * caller is responsible for surfacing a recovery prompt to the user.
 */
export const startProjectAnalysis = createAsyncThunk(
  'analysis/startProjectAnalysis',
  async ({ projectId, project }, { dispatch, rejectWithValue }) => {
    try {
      dispatch(setAnalysisStatus('analyzing'));

      const provider = getSourceProvider(project);

      // ── Local / Folder / ZIP branch ───────────────────────────────────────────
      // LocalSourceProvider and ZipSourceProvider return a { dirHandle, zipFile }
      // descriptor; the existing analyzeProject engine handles the actual traversal.
      // 'folder' and 'folder-git' are produced by detectFromDirectoryHandle().
      if (
        project.importMethod === 'local'      ||
        project.importMethod === 'folder'     ||
        project.importMethod === 'folder-git' ||
        project.importMethod === 'zip'
      ) {
        const descriptor = await provider.getFiles(project);

        // LocalSourceProvider signals permission issues via needsPermission flag
        if (descriptor?.needsPermission) {
          dispatch(setNeedsPermission(true));
          return rejectWithValue('permission-needed');
        }
        dispatch(setNeedsPermission(false));

        const { analyzeProject } = await import('@/engines/analyzer');
        const kg = await analyzeProject(
          project,
          descriptor.dirHandle,
          descriptor.zipFile,
          (phase) => dispatch(setAnalysisPhase(phase))
        );

        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(kg.analysis));

        // Auto-snapshot for local projects that have Git metadata
        if (project.importMethod === 'local' && project.latestCommitHash) {
          const { takeSnapshot } = await import('@/services/snapshotService');
          await takeSnapshot({
            projectId,
            branch:          project.activeBranch || project.defaultBranch || 'main',
            commitHash:      project.latestCommitHash || 'unknown',
            knowledgeGraph:  kg,
            analysisResults: kg.analysis,
            healthScore:     kg.analysis?.architectureHealth?.score ?? null,
            dispatch,
          });
        }

        return { success: true };
      }

      // ── Git branch ────────────────────────────────────────────────────────
      // GitSourceProvider.getFiles() restores the pre-downloaded file array from
      // IndexedDB (or the session-level window cache), so no network call is made.
      if (project.importMethod === 'git') {
        const gitFiles = await provider.getFiles(project);

        dispatch(setAnalysisPhase('building-graph'));
        await new Promise(r => setTimeout(r, 30));
        const { buildKnowledgeGraph } = await import('@/engines/graph/buildKnowledgeGraph');
        const kg = buildKnowledgeGraph(gitFiles, project);

        dispatch(setAnalysisPhase('resolving'));
        await new Promise(r => setTimeout(r, 30));
        const { layoutGraphNodes } = await import('@/engines/layout/layoutEngine');
        kg.nodes    = layoutGraphNodes(kg.nodes, kg.edges);
        kg.rawFiles = gitFiles;

        dispatch(setAnalysisPhase('analyzing'));
        await new Promise(r => setTimeout(r, 30));
        const { runAnalysis } = await import('@/engines/analysis');
        const analysisResults = runAnalysis(kg);
        kg.analysis = analysisResults;

        dispatch(setAnalysisPhase('complete'));
        await new Promise(r => setTimeout(r, 30));
        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(analysisResults));

        // Auto-snapshot for Git projects
        const { takeSnapshot } = await import('@/services/snapshotService');
        await takeSnapshot({
          projectId,
          branch:          project.activeBranch || project.defaultBranch || 'main',
          commitHash:      project.latestCommitHash || 'unknown',
          knowledgeGraph:  kg,
          analysisResults,
          healthScore:     analysisResults?.architectureHealth?.score ?? null,
          dispatch,
        });

        return { success: true };
      }

      // ── Demo branch ───────────────────────────────────────────────────────
      // DemoSourceProvider is the ONLY entry point for synthetic/mock data.
      if (project.importMethod === 'demo') {
        const demoFiles = await provider.getFiles(project);

        dispatch(setAnalysisPhase('scanning'));
        await new Promise(r => setTimeout(r, 30));

        dispatch(setAnalysisPhase('building-graph'));
        await new Promise(r => setTimeout(r, 30));
        const { buildKnowledgeGraph } = await import('@/engines/graph/buildKnowledgeGraph');
        const kg = buildKnowledgeGraph(demoFiles, project);

        dispatch(setAnalysisPhase('resolving'));
        await new Promise(r => setTimeout(r, 30));
        const { layoutGraphNodes } = await import('@/engines/layout/layoutEngine');
        kg.nodes    = layoutGraphNodes(kg.nodes, kg.edges);
        kg.rawFiles = demoFiles;

        dispatch(setAnalysisPhase('analyzing'));
        await new Promise(r => setTimeout(r, 30));
        const { runAnalysis } = await import('@/engines/analysis');
        const analysisResults = runAnalysis(kg);
        kg.analysis = analysisResults;

        dispatch(setAnalysisPhase('complete'));
        await new Promise(r => setTimeout(r, 30));
        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(analysisResults));

        return { success: true };
      }

      // ── Unknown importMethod ──────────────────────────────────────────────
      // getSourceProvider() already throws for unknown values, but defensively
      // handle the case where this branch is reached (e.g. legacy persisted records).
      return rejectWithValue(
        `Unknown importMethod "${project?.importMethod}". Cannot load project files.`
      );

    } catch (err) {
      if (err instanceof SourceUnavailableError) {
        console.error('[analysisService] Source unavailable:', err.message);
        dispatch(setAnalysisStatus('source-unavailable'));

        if (err.needsPermission) {
          dispatch(setNeedsPermission(true));
          return rejectWithValue('permission-needed');
        }

        return rejectWithValue(err.message);
      }

      console.error('[analysisService] Analysis pipeline failed:', err);
      dispatch(setAnalysisStatus('error'));
      return rejectWithValue(err.message);
    }
  }
);
