/**
 * snapshotService.js
 *
 * High-level orchestrator for snapshot lifecycle:
 * - Takes a snapshot after every analysis
 * - Loads snapshot history
 * - Computes diffs between snapshots
 * - Generates AI-style summary for each snapshot
 *
 * Dispatches to Redux (gitSlice) to keep the snapshot index in sync.
 */

import { saveSnapshot, getSnapshots, getLatestSnapshot, getSnapshotIndex } from '@/lib/analysis/snapshotStore';
import { computeArchDiff } from '@/engines/diff/archDiffEngine';
import { addSnapshotToIndex, setSnapshotIndex } from '@/redux/slices/gitSlice';
import { updateGitMeta } from '@/redux/slices/hubSlice';

/**
 * Take an architectural snapshot after a successful analysis.
 * Automatically computes diff against the previous snapshot.
 *
 * @param {object} params
 * @param {string}   params.projectId
 * @param {string}   params.branch
 * @param {string}   params.commitHash
 * @param {object}   params.knowledgeGraph
 * @param {object}   params.analysisResults
 * @param {number}   params.healthScore
 * @param {Function} params.dispatch   - Redux dispatch
 * @returns {Promise<object>} the saved snapshot
 */
export async function takeSnapshot({
  projectId,
  branch,
  commitHash,
  knowledgeGraph,
  analysisResults,
  healthScore,
  dispatch,
}) {
  try {
    // 1. Load previous snapshot to compute diff
    const prevSnapshot = await getLatestSnapshot(projectId, branch);

    // 2. Compute diff vs previous
    let archDiff = null;
    if (prevSnapshot?.knowledgeGraph) {
      archDiff = computeArchDiff(
        prevSnapshot.knowledgeGraph,
        knowledgeGraph,
        prevSnapshot.healthScore,
        healthScore
      );
    }

    // 3. Generate AI summary
    const aiSummary = archDiff?.summary
      || generateBaselineSummary(knowledgeGraph, healthScore);

    // 4. Build snapshot record (strip heavy data for baseline to avoid double-storing)
    const snapshot = {
      id:              crypto.randomUUID(),
      projectId,
      branch,
      commitHash:      commitHash || 'unknown',
      timestamp:       new Date().toISOString(),
      healthScore:     healthScore || 0,
      knowledgeGraph,  // Full KG stored for future diffs
      analysisResults: analysisResults || null,
      archDiff,
      aiSummary,
    };

    // 5. Persist to IndexedDB
    await saveSnapshot(snapshot);

    // 6. Update Redux snapshot index (lightweight, no graph)
    const indexEntry = {
      id:          snapshot.id,
      branch:      snapshot.branch,
      commitHash:  snapshot.commitHash,
      timestamp:   snapshot.timestamp,
      healthScore: snapshot.healthScore,
      aiSummary:   snapshot.aiSummary,
      archDiff:    archDiff ? {
        totalAdded:      archDiff.totalAdded,
        totalRemoved:    archDiff.totalRemoved,
        totalChanged:    archDiff.totalChanged,
        healthDelta:     archDiff.healthDelta,
        circularsAdded:  archDiff.circularsAdded?.length || 0,
        circularsRemoved:archDiff.circularsRemoved?.length || 0,
        summary:         archDiff.summary,
      } : null,
    };

    if (dispatch) {
      dispatch(addSnapshotToIndex(indexEntry));
      // Update lastSyncedAt and commitHash on the project
      dispatch(updateGitMeta({
        id:              projectId,
        latestCommitHash: commitHash,
        lastSyncedAt:    snapshot.timestamp,
        remoteAheadBy:   0,
        architectureScore: healthScore,
      }));
    }

    return snapshot;
  } catch (err) {
    console.error('[snapshotService] Failed to take snapshot:', err);
    return null;
  }
}

/**
 * Load all snapshot index entries for a project+branch and populate Redux.
 *
 * @param {string}   projectId
 * @param {string}   branch
 * @param {Function} dispatch
 */
export async function loadSnapshotIndex(projectId, branch, dispatch) {
  try {
    const index = await getSnapshotIndex(projectId, branch);
    if (dispatch) {
      dispatch(setSnapshotIndex(index));
    }
    return index;
  } catch (err) {
    console.error('[snapshotService] Failed to load snapshot index:', err);
    return [];
  }
}

/**
 * Load two snapshots and compute their diff.
 * Useful for comparing any two arbitrary points in history.
 *
 * @param {string} snapshotIdA - older
 * @param {string} snapshotIdB - newer
 * @returns {Promise<ArchDiff|null>}
 */
export async function compareSnapshots(projectId, branch, snapshotIdA, snapshotIdB) {
  try {
    const snapshots = await getSnapshots(projectId, branch);
    const a = snapshots.find((s) => s.id === snapshotIdA);
    const b = snapshots.find((s) => s.id === snapshotIdB);
    if (!a || !b) return null;
    return computeArchDiff(a.knowledgeGraph, b.knowledgeGraph, a.healthScore, b.healthScore);
  } catch (err) {
    console.error('[snapshotService] Failed to compare snapshots:', err);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateBaselineSummary(kg, healthScore) {
  const nodeCount = kg?.nodes?.length || 0;
  const edgeCount = kg?.edges?.length || 0;
  const score = healthScore || 0;

  return `Baseline snapshot. ${nodeCount} architectural entities and ${edgeCount} dependencies mapped. Architecture health score: ${score}.`;
}
