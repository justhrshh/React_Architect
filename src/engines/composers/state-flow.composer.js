/**
 * state-flow.composer.js
 *
 * State Flow Bipartite Composer.
 */

import { buildAnnotation } from "./composerUtils.js";

export function composeStateFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};

  const stateNodeIds = new Set();
  const consumerNodeIds = new Set();

  nodes.forEach((node) => {
    if (
      node.kind === "state" ||
      node.subtype === "slice" ||
      node.subtype === "context" ||
      node.subtype === "provider"
    ) {
      stateNodeIds.add(node.id);
    } else if (node.kind === "component" || node.kind === "hook") {
      consumerNodeIds.add(node.id);
    }
  });

  const stateEdges = edges.filter(
    (e) =>
      e &&
      (stateNodeIds.has(e.source) || stateNodeIds.has(e.target)) &&
      (consumerNodeIds.has(e.source) || consumerNodeIds.has(e.target))
  );

  const activeNodes = nodes
    .filter((n) => stateNodeIds.has(n.id) || consumerNodeIds.has(n.id))
    .map((node) => ({
      ...node,
      group: stateNodeIds.has(node.id) ? "state" : "consumer",
      annotation: buildAnnotation(node, queryMeta),
    }));

  return {
    nodes: activeNodes,
    edges: stateEdges,
    layoutHints: {
      style: "bipartite",
      leftGroup: "state",
      rightGroup: "consumer",
      leftNodeIds: Array.from(stateNodeIds),
      rightNodeIds: Array.from(consumerNodeIds),
    },
    queryMeta: {
      ...queryMeta,
      composerName: "state-flow",
    },
  };
}
