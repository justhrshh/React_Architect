/**
 * navigation-flow.composer.js
 *
 * Navigation Flow Router Tree Composer.
 */

import { buildAnnotation } from "./composerUtils.js";

export function composeNavigationFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};

  const routeNodes = nodes.filter((n) => n.kind === "route" || n.kind === "component");
  const routeNodeIds = new Set(routeNodes.map((n) => n.id));

  const navEdges = edges.filter(
    (e) =>
      e &&
      (e.type === "ROUTE_PARENT" || e.type === "ROUTE_RENDERS" || e.type === "RENDERS") &&
      routeNodeIds.has(e.source) &&
      routeNodeIds.has(e.target)
  );

  const targets = new Set(navEdges.map((e) => e.target));
  const routerRoots = routeNodes.filter(
    (n) =>
      n.kind === "route" &&
      (!targets.has(n.id) || n.subtype === "router" || (n.name && n.name.includes("Router")))
  );

  const rootId = routerRoots.length > 0 ? routerRoots[0].id : routeNodes[0]?.id || null;

  const depthMap = new Map();
  if (rootId) {
    depthMap.set(rootId, 0);
    const queue = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift();
      const currDepth = depthMap.get(curr);
      const outgoing = navEdges.filter((e) => e.source === curr);
      for (const edge of outgoing) {
        if (!depthMap.has(edge.target)) {
          depthMap.set(edge.target, currDepth + 1);
          queue.push(edge.target);
        }
      }
    }
  }

  const annotatedNodes = routeNodes.map((node) => ({
    ...node,
    depth: depthMap.get(node.id) ?? 0,
    annotation: buildAnnotation(node, queryMeta),
  }));

  return {
    nodes: annotatedNodes,
    edges: navEdges,
    layoutHints: {
      style: "tree",
      rootId,
      depthMap,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "navigation-flow",
    },
  };
}
