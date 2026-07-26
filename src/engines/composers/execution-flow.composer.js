/**
 * execution-flow.composer.js
 *
 * Execution Flow Composer (replacement for former buildBlueprintGraph logic).
 */

import {
  classifyArchitecturalUnit,
  ARCHITECTURAL_NODE_KINDS,
  ARCHITECTURAL_EDGE_TYPES,
  bridgeExcludedNodes,
  buildAnnotation,
  groupNodesByCriteria,
} from "./composerUtils.js";

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

  // 1. Classify each node & attach laneId
  const classifiedNodes = nodes.map((node) => ({
    ...node,
    laneId: classifyArchitecturalUnit(node),
    sourceNodeId: node.id,
    annotation: buildAnnotation(node, queryMeta),
  }));

  // 2. Filter to architectural units
  const architecturalNodes = classifiedNodes.filter((node) => {
    if (node.kind === "file") return node.laneId === "entry";
    return ARCHITECTURAL_NODE_KINDS.has(node.kind);
  });

  const includedIds = new Set(architecturalNodes.map((n) => n.id));

  // 3. Curate direct architectural edges
  const curatedEdges = edges.filter(
    (e) =>
      e &&
      ARCHITECTURAL_EDGE_TYPES.has(e.type) &&
      includedIds.has(e.source) &&
      includedIds.has(e.target)
  );

  // 4. Bridge excluded nodes in execution chain
  const allNodeIds = new Set(nodes.map((n) => n.id));
  const existingPairs = new Set(curatedEdges.map((e) => `${e.source}->${e.target}`));

  const bridgeEdges = bridgeExcludedNodes(edges, includedIds, allNodeIds).filter(
    (e) => !existingPairs.has(`${e.source}->${e.target}`)
  );

  const finalEdges = [...curatedEdges, ...bridgeEdges];

  // 5. Apply grouping if requested
  const finalNodes = groupNodesByCriteria(
    architecturalNodes,
    template?.query?.composition?.grouping || {}
  );

  // 6. Active lanes
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
    },
  };
}
