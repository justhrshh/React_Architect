/**
 * component-hierarchy.composer.js
 *
 * Component Hierarchy Tree Composer.
 */

import { buildAnnotation } from "./composerUtils.js";

export function composeComponentHierarchy(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};

  const componentNodes = nodes.filter((n) => n.kind === "component" || n.kind === "route");
  const componentNodeIds = new Set(componentNodes.map((n) => n.id));

  // Filter edges to tree edges
  const treeEdges = edges.filter(
    (e) =>
      e &&
      (e.type === "RENDERS" || e.type === "ROUTE_RENDERS" || e.type === "LAZY_LOADS") &&
      componentNodeIds.has(e.source) &&
      componentNodeIds.has(e.target)
  );

  // Find roots (nodes with no incoming tree edges)
  const targets = new Set(treeEdges.map((e) => e.target));
  const rootNodes = componentNodes.filter((n) => !targets.has(n.id));
  const rootId = rootNodes.length > 0 ? rootNodes[0].id : componentNodes[0]?.id || null;

  // BFS depth map
  const depthMap = new Map();
  if (rootId) {
    depthMap.set(rootId, 0);
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift();
      const currDepth = depthMap.get(curr);
      const outgoing = treeEdges.filter((e) => e.source === curr);
      for (const edge of outgoing) {
        if (!depthMap.has(edge.target)) {
          depthMap.set(edge.target, currDepth + 1);
          queue.push(edge.target);
        }
      }
    }
  }

  const annotatedNodes = componentNodes.map((node) => ({
    ...node,
    depth: depthMap.get(node.id) ?? 0,
    annotation: buildAnnotation(node, queryMeta),
  }));

  return {
    nodes: annotatedNodes,
    edges: treeEdges,
    layoutHints: {
      style: "tree",
      rootId,
      depthMap,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "component-hierarchy",
    },
  };
}
