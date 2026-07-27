/**
 * execution-flow.composer.js
 *
 * Execution Flow Composer.
 * Composes a query-focused execution flow subgraph into a layout-ready composed graph.
 * Implements Section 5.7 of the Studio Re-Architecture Implementation Specification.
 */

import {
  classifyArchitecturalUnit,
  ARCHITECTURAL_NODE_KINDS,
  ARCHITECTURAL_EDGE_TYPES,
  bridgeExcludedNodes,
  buildAnnotation,
  groupNodesByCriteria,
} from "./composerUtils.js";

const APPLICABLE_LANES_BY_TYPE = {
  frontend: new Set(["entry", "routing", "pages", "components", "hooks_state", "api_clients"]),
  backend: new Set(["entry", "backend_routes", "business_logic", "models", "database"]),
  fullstack: new Set(["entry", "routing", "pages", "components", "hooks_state", "api_clients", "backend_routes", "business_logic", "models", "database"]),
  library: new Set(["components", "hooks_state"]),
  monorepo: new Set(["entry", "routing", "pages", "components", "hooks_state", "api_clients", "backend_routes", "business_logic", "models", "database"]),
  unknown: new Set(["entry", "routing", "pages", "components", "hooks_state", "api_clients", "backend_routes", "business_logic", "models", "database"]),
};

/**
 * Composes a query-focused execution flow subgraph into a layout-ready composed graph.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeExecutionFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";
  const allowedLanes = APPLICABLE_LANES_BY_TYPE[projectType] || APPLICABLE_LANES_BY_TYPE.unknown;

  // Step 1 & 2: Classify each node, attach laneId, filter by project type applicable lanes
  const classifiedNodes = nodes.map((node) => ({
    ...node,
    laneId: classifyArchitecturalUnit(node),
    sourceNodeId: node.id,
    annotation: buildAnnotation(node, queryMeta),
  }));

  const architecturalNodes = classifiedNodes.filter((node) => {
    if (node.kind === "file" && node.laneId !== "entry") return false;
    if (!ARCHITECTURAL_NODE_KINDS.has(node.kind) && node.kind !== "file") return false;

    // Filter by allowed lanes for this project type
    if (!allowedLanes.has(node.laneId)) return false;

    // Step 3: Route node filtering by metadata.source
    if (node.kind === "route") {
      const source = node.metadata?.source || "";
      if (projectType === "frontend" && source && source !== "react-router" && source !== "nextjs") {
        return false;
      }
      if (projectType === "backend" && source && source !== "express" && source !== "fastify" && source !== "nestjs" && source !== "koa") {
        return false;
      }
    }

    return true;
  });

  const includedIds = new Set(architecturalNodes.map((n) => n.id));

  // Curate direct architectural edges between included nodes
  const curatedEdges = edges.filter(
    (e) =>
      e &&
      ARCHITECTURAL_EDGE_TYPES.has(e.type) &&
      includedIds.has(e.source) &&
      includedIds.has(e.target)
  );

  // Step 4: Bridge excluded nodes in execution chain
  const allNodeIds = new Set(nodes.map((n) => n.id));
  const existingPairs = new Set(curatedEdges.map((e) => `${e.source}->${e.target}`));

  const bridgeEdges = bridgeExcludedNodes(edges, includedIds, allNodeIds).filter(
    (e) => !existingPairs.has(`${e.source}->${e.target}`)
  );

  const finalEdges = [...curatedEdges, ...bridgeEdges];

  // Step 5: Grouping / degree-based cap per lane if > 8 nodes
  const finalNodes = applyLaneGrouping(
    architecturalNodes,
    curatedEdges,
    template?.query?.composition?.grouping || {}
  );

  const activeLaneIds = Array.from(new Set(finalNodes.map((n) => n.laneId)));

  return {
    nodes: finalNodes,
    edges: finalEdges,
    layoutHints: {
      style: "lanes",
      activeLaneIds,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "execution-flow",
      projectType,
    },
  };
}

/**
 * Group nodes by lane if a lane has more than 8 nodes.
 * Keeps top 5 nodes by degree and collapses the rest into a group node.
 */
function applyLaneGrouping(nodes, edges, groupingConfig = {}) {
  const laneBuckets = new Map();
  nodes.forEach((n) => {
    if (!laneBuckets.has(n.laneId)) laneBuckets.set(n.laneId, []);
    laneBuckets.get(n.laneId).push(n);
  });

  // Degree lookup
  const degreeMap = new Map();
  nodes.forEach((n) => degreeMap.set(n.id, 0));
  edges.forEach((e) => {
    if (degreeMap.has(e.source)) degreeMap.set(e.source, degreeMap.get(e.source) + 1);
    if (degreeMap.has(e.target)) degreeMap.set(e.target, degreeMap.get(e.target) + 1);
  });

  const resultNodes = [];

  laneBuckets.forEach((laneNodes, laneId) => {
    if (laneNodes.length <= 8) {
      resultNodes.push(...laneNodes);
    } else {
      // Sort by degree descending
      const sorted = [...laneNodes].sort((a, b) => (degreeMap.get(b.id) || 0) - (degreeMap.get(a.id) || 0));
      const kept = sorted.slice(0, 5);
      const collapsed = sorted.slice(5);

      resultNodes.push(...kept);

      if (collapsed.length > 0) {
        resultNodes.push({
          id: `group:${laneId}:collapsed`,
          kind: "component",
          subtype: "group",
          name: `${collapsed.length} More Units`,
          laneId,
          metadata: {
            collapsedCount: collapsed.length,
            collapsedNodeIds: collapsed.map((n) => n.id),
          },
          annotation: `${collapsed.length} collapsed nodes`,
        });
      }
    }
  });

  return groupNodesByCriteria(resultNodes, groupingConfig);
}
