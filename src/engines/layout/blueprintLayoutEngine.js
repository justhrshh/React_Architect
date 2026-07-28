/**
 * blueprintLayoutEngine.js
 *
 * React Architect — Dynamic Architectural Blueprint Layout Engine
 * =================================================================
 * Generates a deterministic, column/lane-based architectural blueprint layout.
 *
 * This file is layout-only: `computeBlueprintLayout` expects nodes that already carry a
 * `laneId` and a curated edge list, both produced upstream by
 * `engines/graph/blueprintGraphBuilder.js#buildBlueprintGraph`. It performs column
 * assignment from that pre-known lane, barycenter-based row ordering, and x/y/w/h
 * computation — no architectural classification or filtering happens here.
 *
 * Pipeline: Knowledge Graph → blueprintGraphBuilder.js (classify + filter + curate edges)
 *           → blueprintLayoutEngine.js (this file — geometry only)
 *           → FlowDiagram.jsx (presentation + reachability highlighting via graphTraversal.js)
 *
 * Lane *definitions* (`LANE_CONFIG`: id/label/color/bg) live in ./blueprintLaneConfig.js, a
 * shared, ownership-neutral module — imported here, by the builder, and by the renderer.
 *
 * See TASK.md for the full refactor history and rationale (all 5 phases complete).
 */

import { LANE_CONFIG } from "../graph/blueprintLaneConfig.js";
import { classifyArchitecturalUnit } from "../graph/blueprintGraphBuilder.js";

// Deprecated: re-exported here only for backward compatibility with any existing
// `import { LANE_CONFIG } from ".../blueprintLayoutEngine"` call sites elsewhere in the real
// repository that this refactor could not verify (this working copy only contains the files
// originally supplied for review — see TASK.md's Environment Note). Safe to remove once a
// full-repo grep against the real repository confirms no remaining importers.
export { LANE_CONFIG };

// Deprecated: `classifyNodeLane` moved to blueprintGraphBuilder.js as
// `classifyArchitecturalUnit`. Re-exported under its old name for the same backward-
// compatibility reason as LANE_CONFIG above. Wrapped (rather than a bare alias) so it logs a
// one-time console warning when actually invoked — since this environment can't grep the
// real repository for remaining callers, this gives whoever ports this refactor into the
// real repo a runtime signal (in dev/test runs) of exactly which call sites still need
// migrating, rather than relying on grep alone.
let _classifyNodeLaneWarned = false;
export function classifyNodeLane(node) {
  if (!_classifyNodeLaneWarned && typeof console !== "undefined") {
    console.warn(
      "[deprecated] classifyNodeLane() from blueprintLayoutEngine.js has moved to " +
      "classifyArchitecturalUnit() in engines/graph/blueprintGraphBuilder.js. " +
      "Update this call site, then remove this re-export (TASK.md, Phase 5)."
    );
    _classifyNodeLaneWarned = true;
  }
  return classifyArchitecturalUnit(node);
}

/**
 * Computes a dynamic, column/lane-based architectural blueprint layout.
 *
 * Expects `nodes` to already carry a `laneId` (assigned by
 * `engines/graph/blueprintGraphBuilder.js#buildBlueprintGraph`). Nodes without a
 * recognized `laneId` are grouped under the fallback bucket "components" so that
 * pre-Phase-2 callers (raw KG nodes with no `laneId` at all) continue to render sensibly
 * during the migration window, rather than silently disappearing.
 *
 * Phase 9 (see TASK.md) additions, both purely about geometry — no classification/filtering:
 *   - Density-aware spacing: row and lane gaps scale with how connected the graph is
 *     (`edges.length / nodes.length`) and with how crowded individual lanes are, instead of
 *     using the same fixed gap for a 10-node graph and a 300-node graph.
 *   - Multi-pass barycenter row ordering: alternates forward sweeps (order each lane by its
 *     nodes' upstream/predecessor positions) and backward sweeps (order by downstream/
 *     successor positions) for several iterations, instead of a single left-to-right,
 *     incoming-edges-only pass. This is the standard Sugiyama-style layered-graph-drawing
 *     heuristic — it doesn't guarantee a crossing-minimal layout (that's NP-hard in general),
 *     but it lets each lane's order respond to both directions of the graph instead of only
 *     what's upstream of it.
 *
 * @param {Array<object>} nodes - blueprint nodes, each with a pre-assigned `laneId`
 * @param {Array<object>} edges - blueprint edges
 * @param {object} [options]
 * @param {number} [options.barycenterPasses=4] - number of forward+backward sweep iterations
 * @returns {{ layoutedNodes: Array<object>, activeLanes: Array<object> }}
 */
/**
 * Primary layout entry point dispatching to graph-type geometry engines based on layoutHints.style.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, layoutHints: object }} composedGraph
 * @param {object} options
 * @returns {{ layoutedNodes: Array<object>, activeLanes?: Array<object>, activePipelineStages?: Array<object> }}
 */
export function computeLayout(composedGraph, options = {}) {
  const style = composedGraph?.layoutHints?.style || "lanes";
  switch (style) {
    case "lanes":
      return computeBlueprintLayout(composedGraph?.nodes || [], composedGraph?.edges || [], options);
    case "tree":
      return computeTreeLayout(composedGraph, options);
    case "bipartite":
      return computeBipartiteLayout(composedGraph, options);
    case "tripartite":
      return computeTripartiteLayout(composedGraph, options);
    case "pipeline":
      return computePipelineLayout(composedGraph, options);
    default:
      return computeBlueprintLayout(composedGraph?.nodes || [], composedGraph?.edges || [], options);
  }
}

/**
 * Top-down tree layout for component hierarchy and navigation flow.
 */
export function computeTreeLayout(composedGraph, options = {}) {
  const { nodes = [] } = composedGraph || {};
  const CARD_W = options.cardWidth || 220;
  const CARD_H = options.cardHeight || 80;
  const TOP_PADDING = options.topPadding || 80;
  const ROW_HEIGHT = options.rowHeight || 140;

  const depthMap = new Map();
  nodes.forEach((n) => depthMap.set(n.id, n.depth ?? 0));

  const maxDepth = Math.max(0, ...Array.from(depthMap.values()));
  const depthBuckets = new Map();
  for (let d = 0; d <= maxDepth; d++) depthBuckets.set(d, []);

  nodes.forEach((n) => {
    const d = depthMap.get(n.id) ?? 0;
    depthBuckets.get(d).push(n);
  });

  const layoutedNodes = [];
  depthBuckets.forEach((bucketNodes, depth) => {
    const totalCount = bucketNodes.length;
    const spacing = 260;
    const startX = 100;

    bucketNodes.forEach((node, idx) => {
      layoutedNodes.push({
        ...node,
        metadata: {
          ...node.metadata,
          x: startX + idx * spacing,
          y: TOP_PADDING + depth * ROW_HEIGHT,
          w: CARD_W,
          h: CARD_H,
        },
      });
    });
  });

  return { layoutedNodes };
}

/**
 * Horizontal sitemap layout for Navigation Flow Studio.
 * Computes non-overlapping vertical spans for every subtree branch,
 * guaranteeing zero node collision and centering parents over their expanded children.
 */
export function computeSitemapLayout(composedGraph, options = {}) {
  const { nodes = [], edges = [] } = composedGraph || {};
  if (nodes.length === 0) return { layoutedNodes: [] };

  const CARD_W = options.cardWidth || 185;
  const CARD_H = options.cardHeight || 72;
  const LEFT_PADDING = options.leftPadding || 80;
  const TOP_PADDING = options.topPadding || 80;
  const COLUMN_WIDTH = options.columnWidth || 240;
  const ROW_GAP = options.rowGap || 32;

  const childrenMap = new Map();
  const parentMap = new Map();
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));

  nodes.forEach((n) => childrenMap.set(n.id, []));

  const edgePriority = {
    ROUTE_PARENT: 1,
    ROUTE_RENDERS: 2,
    RENDERS: 3,
  };

  const sortedEdges = [...edges].sort((a, b) => {
    const pA = edgePriority[a?.type] || 4;
    const pB = edgePriority[b?.type] || 4;
    return pA - pB;
  });

  sortedEdges.forEach((e) => {
    if (e && nodeMap.has(e.source) && nodeMap.has(e.target)) {
      if (!parentMap.has(e.target)) {
        parentMap.set(e.target, e.source);
        if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
        childrenMap.get(e.source).push(e.target);
      }
    }
  });

  const roots = nodes.filter((n) => !parentMap.has(n.id));
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const subtreeHeightMap = new Map();

  function calcSubtreeHeight(nodeId, visited = new Set()) {
    if (visited.has(nodeId)) return CARD_H + ROW_GAP;
    visited.add(nodeId);

    const children = childrenMap.get(nodeId) || [];
    if (children.length === 0) {
      const h = CARD_H + ROW_GAP;
      subtreeHeightMap.set(nodeId, h);
      return h;
    }

    let totalH = 0;
    children.forEach((cid) => {
      totalH += calcSubtreeHeight(cid, visited);
    });

    const h = Math.max(CARD_H + ROW_GAP, totalH);
    subtreeHeightMap.set(nodeId, h);
    return h;
  }

  roots.forEach((r) => calcSubtreeHeight(r.id));

  let currentY = TOP_PADDING;

  function positionSubtree(nodeId, depth, yStart, visited = new Set()) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const targetNode = nodeMap.get(nodeId);
    if (!targetNode) return;

    const children = childrenMap.get(nodeId) || [];
    const x = LEFT_PADDING + depth * COLUMN_WIDTH;

    if (children.length === 0) {
      const y = yStart + (CARD_H + ROW_GAP) / 2 - CARD_H / 2;
      targetNode.metadata = { ...targetNode.metadata, x, y, w: CARD_W, h: CARD_H };
      return;
    }

    let childYCursor = yStart;
    const childCenterYs = [];

    children.forEach((cid) => {
      const childHeight = subtreeHeightMap.get(cid) || (CARD_H + ROW_GAP);
      positionSubtree(cid, depth + 1, childYCursor, visited);

      const childNode = nodeMap.get(cid);
      if (childNode?.metadata?.y !== undefined) {
        childCenterYs.push(childNode.metadata.y);
      }
      childYCursor += childHeight;
    });

    let y = yStart + (childYCursor - yStart) / 2 - CARD_H / 2;
    if (childCenterYs.length > 0) {
      const minY = Math.min(...childCenterYs);
      const maxY = Math.max(...childCenterYs);
      y = (minY + maxY) / 2;
    }

    targetNode.metadata = { ...targetNode.metadata, x, y, w: CARD_W, h: CARD_H };
  }

  roots.forEach((r) => {
    const rootHeight = subtreeHeightMap.get(r.id) || (CARD_H + ROW_GAP);
    positionSubtree(r.id, r.depth ?? 0, currentY);
    currentY += rootHeight + ROW_GAP;
  });

  const layoutedNodes = Array.from(nodeMap.values());
  return { layoutedNodes };
}

/**
 * Bipartite 2-column layout for state flow.
 */
export function computeBipartiteLayout(composedGraph, options = {}) {
  const { nodes = [] } = composedGraph || {};
  const CARD_W = options.cardWidth || 220;
  const CARD_H = options.cardHeight || 80;
  const TOP_PADDING = options.topPadding || 80;
  const LEFT_PADDING = options.leftPadding || 60;
  const COLUMN_GAP = options.columnGap || 600;
  const ROW_GAP = options.rowGap || 28;

  const leftNodes = nodes.filter((n) => n.group === "state" || n.kind === "state");
  const rightNodes = nodes.filter((n) => n.group !== "state" && n.kind !== "state");

  const layoutedNodes = [];

  leftNodes.forEach((node, idx) => {
    layoutedNodes.push({
      ...node,
      metadata: {
        ...node.metadata,
        x: LEFT_PADDING,
        y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
        w: CARD_W,
        h: CARD_H,
      },
    });
  });

  rightNodes.forEach((node, idx) => {
    layoutedNodes.push({
      ...node,
      metadata: {
        ...node.metadata,
        x: LEFT_PADDING + COLUMN_GAP,
        y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
        w: CARD_W,
        h: CARD_H,
      },
    });
  });

  return { layoutedNodes };
}

/**
 * Tripartite 3-column / 4-column layout for state flow (Section 8.9).
 */
export function computeTripartiteLayout(composedGraph, options = {}) {
  const { nodes = [] } = composedGraph || {};
  const CARD_W = options.cardWidth || 220;
  const CARD_H = options.cardHeight || 80;
  const TOP_PADDING = options.topPadding || 80;
  const LEFT_PADDING = options.leftPadding || 60;
  const COLUMN_GAP = options.columnGap || 320;
  const ROW_GAP = options.rowGap || 28;

  const stateNodes = nodes.filter((n) => n.group === "state" || n.kind === "state");
  const hookNodes = nodes.filter((n) => n.group === "hook" || n.kind === "hook");
  const compNodes = nodes.filter((n) => n.kind === "component" || (n.group !== "state" && n.group !== "hook" && n.group !== "api" && n.kind !== "state" && n.kind !== "hook" && n.kind !== "api"));
  const apiNodes = nodes.filter((n) => n.group === "api" || n.kind === "api");

  const layoutedNodes = [];

  // Column 0: State
  stateNodes.forEach((node, idx) => {
    layoutedNodes.push({
      ...node,
      metadata: {
        ...node.metadata,
        x: LEFT_PADDING,
        y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
        w: CARD_W,
        h: CARD_H,
      },
    });
  });

  // Column 1: Hooks (or skip if empty)
  const hookColX = hookNodes.length > 0 ? LEFT_PADDING + COLUMN_GAP : LEFT_PADDING;
  if (hookNodes.length > 0) {
    hookNodes.forEach((node, idx) => {
      layoutedNodes.push({
        ...node,
        metadata: {
          ...node.metadata,
          x: hookColX,
          y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
          w: CARD_W,
          h: CARD_H,
        },
      });
    });
  }

  // Column 2: Components
  const compColX = hookNodes.length > 0 ? LEFT_PADDING + COLUMN_GAP * 2 : LEFT_PADDING + COLUMN_GAP;
  compNodes.forEach((node, idx) => {
    layoutedNodes.push({
      ...node,
      metadata: {
        ...node.metadata,
        x: compColX,
        y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
        w: CARD_W,
        h: CARD_H,
      },
    });
  });

  // Column 3: API Endpoints (if fullstack)
  if (apiNodes.length > 0) {
    const apiColX = hookNodes.length > 0 ? LEFT_PADDING + COLUMN_GAP * 3 : LEFT_PADDING + COLUMN_GAP * 2;
    apiNodes.forEach((node, idx) => {
      layoutedNodes.push({
        ...node,
        metadata: {
          ...node.metadata,
          x: apiColX,
          y: TOP_PADDING + idx * (CARD_H + ROW_GAP),
          w: CARD_W,
          h: CARD_H,
        },
      });
    });
  }

  return { layoutedNodes };
}

/**
 * Multi-stage horizontal pipeline layout for request lifecycle.
 */
export function computePipelineLayout(composedGraph, options = {}) {
  const { nodes = [], layoutHints = {} } = composedGraph || {};
  const stages = layoutHints.stages || ["frontend", "api", "backend", "logic", "data"];

  const CARD_W = options.cardWidth || 220;
  const CARD_H = options.cardHeight || 80;
  const TOP_PADDING = options.topPadding || 80;
  const LEFT_PADDING = options.leftPadding || 60;
  const STAGE_GAP = options.stageGap || 280;
  const ROW_GAP = options.rowGap || 28;

  const stageBuckets = new Map(stages.map((s) => [s, []]));
  nodes.forEach((n) => {
    const stage = n.stage || "frontend";
    if (stageBuckets.has(stage)) {
      stageBuckets.get(stage).push(n);
    }
  });

  const layoutedNodes = [];
  const activePipelineStages = [];

  stages.forEach((stageId, stageIdx) => {
    const stageNodes = stageBuckets.get(stageId) || [];
    const colX = LEFT_PADDING + stageIdx * STAGE_GAP;

    activePipelineStages.push({
      id: stageId,
      x: colX,
      width: CARD_W,
      nodeCount: stageNodes.length,
    });

    stageNodes.forEach((node, rowIdx) => {
      layoutedNodes.push({
        ...node,
        metadata: {
          ...node.metadata,
          x: colX,
          y: TOP_PADDING + rowIdx * (CARD_H + ROW_GAP),
          w: CARD_W,
          h: CARD_H,
        },
      });
    });
  });

  return { layoutedNodes, activePipelineStages };
}

export function computeBlueprintLayout(nodes = [], edges = [], options = {}) {
  const CARD_W = options.cardWidth || 220;
  const CARD_H = options.cardHeight || 80;
  const TOP_PADDING = options.topPadding || 80;
  const LEFT_PADDING = options.leftPadding || 60;
  const BARYCENTER_PASSES = options.barycenterPasses ?? 4;

  const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));

  // Group nodes by lane. `laneId` is expected to already be set (by the Blueprint Graph
  // Builder); nodes missing it fall back to "components" rather than being dropped, to
  // stay safe for any caller not yet migrated to the builder.
  const laneBuckets = new Map();
  LANE_CONFIG.forEach(lane => laneBuckets.set(lane.id, []));

  nodes.forEach(node => {
    const laneId = node.laneId && laneBuckets.has(node.laneId) ? node.laneId : "components";
    if (!laneBuckets.has(laneId)) laneBuckets.set(laneId, []);
    laneBuckets.get(laneId).push(node.id);
  });

  // Filter active lanes that actually contain nodes
  const activeLanes = LANE_CONFIG.filter(lane => (laneBuckets.get(lane.id) || []).length > 0);

  // ── Density-aware spacing ──────────────────────────────────────────────────────────────
  const avgEdgesPerNode = nodes.length > 0 ? edges.length / nodes.length : 0;
  const densityFactor = Math.min(avgEdgesPerNode / 4, 1); // 0 (sparse) .. 1 (dense, capped)
  const maxLaneNodeCount = Math.max(1, ...activeLanes.map(lane => (laneBuckets.get(lane.id) || []).length));

  const baseRowGap = options.rowGap || 28;
  // Denser graphs (more edges per node, meaning more edges likely passing near/through each
  // row) get progressively more vertical breathing room, capped at +60% of the base gap.
  const ROW_GAP = Math.round(baseRowGap * (1 + densityFactor * 0.6));

  const baseLaneGap = options.laneGap || 320;
  // Lanes with many nodes need more horizontal room for the bezier bundles converging on/
  // leaving them; capped at +60px so this doesn't run away on very large graphs.
  const laneDensityBoost = Math.min(maxLaneNodeCount / 40, 1) * 60;
  const LANE_GAP = Math.round(baseLaneGap + laneDensityBoost + densityFactor * 40);

  // Map active lane ID to column X position
  const laneXMap = new Map();
  activeLanes.forEach((lane, colIndex) => {
    laneXMap.set(lane.id, LEFT_PADDING + colIndex * LANE_GAP);
  });

  // ── Multi-pass barycenter row ordering ─────────────────────────────────────────────────
  const forwardAdj = new Map(); // source -> [target, ...]
  const reverseAdj = new Map(); // target -> [source, ...]
  edges.forEach(e => {
    if (!e || !e.source || !e.target) return;
    if (!forwardAdj.has(e.source)) forwardAdj.set(e.source, []);
    forwardAdj.get(e.source).push(e.target);
    if (!reverseAdj.has(e.target)) reverseAdj.set(e.target, []);
    reverseAdj.get(e.target).push(e.source);
  });

  // Current row index per node, seeded with each lane's initial (stable, insertion) order.
  const rowPos = new Map();
  activeLanes.forEach(lane => {
    (laneBuckets.get(lane.id) || []).forEach((nodeId, i) => rowPos.set(nodeId, i));
  });

  function sweepLane(laneNodeIds, neighborMap) {
    const withBarycenter = laneNodeIds.map(nodeId => {
      const neighbors = neighborMap.get(nodeId) || [];
      const knownPositions = neighbors
        .map(nId => rowPos.get(nId))
        .filter(pos => pos !== undefined);
      // No positioned neighbors in this direction (e.g. a leftmost lane has no predecessors) —
      // keep the node's current position rather than collapsing it to 0, so it doesn't get
      // yanked to the top on every forward sweep.
      const barycenter = knownPositions.length > 0
        ? knownPositions.reduce((a, b) => a + b, 0) / knownPositions.length
        : rowPos.get(nodeId);
      return { nodeId, barycenter };
    });
    // Stable sort: ties keep their prior relative order, which is what lets repeated sweeps
    // converge to a fixed point instead of oscillating indefinitely.
    withBarycenter.sort((a, b) => a.barycenter - b.barycenter);
    withBarycenter.forEach((entry, i) => rowPos.set(entry.nodeId, i));
  }

  for (let pass = 0; pass < BARYCENTER_PASSES; pass++) {
    const forward = pass % 2 === 0;
    const laneOrder = forward ? activeLanes : [...activeLanes].reverse();
    laneOrder.forEach(lane => {
      const laneNodeIds = laneBuckets.get(lane.id) || [];
      // Forward sweep (left→right): order each lane by its nodes' predecessor positions
      // (reverseAdj). Backward sweep (right→left): order by successor positions (forwardAdj).
      sweepLane(laneNodeIds, forward ? reverseAdj : forwardAdj);
    });
  }

  // Position nodes within each active lane using the final row order from the sweeps above.
  const layoutedNodes = [];

  activeLanes.forEach((lane) => {
    const laneNodeIds = [...(laneBuckets.get(lane.id) || [])].sort(
      (a, b) => (rowPos.get(a) ?? 0) - (rowPos.get(b) ?? 0)
    );
    const colX = laneXMap.get(lane.id);

    laneNodeIds.forEach((nodeId, rowIndex) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const y = TOP_PADDING + rowIndex * (CARD_H + ROW_GAP);

      const layoutedNode = {
        ...node,
        laneId: lane.id,
        metadata: {
          ...node.metadata,
          x: colX,
          y: y,
          w: CARD_W,
          h: CARD_H,
        },
      };

      nodeMap.set(nodeId, layoutedNode);
      layoutedNodes.push(layoutedNode);
    });
  });

  return {
    layoutedNodes,
    activeLanes: activeLanes.map(lane => ({
      ...lane,
      x: laneXMap.get(lane.id),
      width: CARD_W,
      nodeCount: (laneBuckets.get(lane.id) || []).length,
    })),
  };
}