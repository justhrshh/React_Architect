/**
 * navigation-flow.composer.js
 *
 * Navigation Flow Router Tree Composer.
 * Implements Section 6 of the Studio Re-Architecture Implementation Specification.
 */

import { buildAnnotation } from "./composerUtils.js";

/**
 * Composes a navigation flow route tree from the Knowledge Graph subgraph.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeNavigationFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";

  // Section 6.11 — Project-type adaptation: disabled for backend or library projects
  if (projectType === "backend") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Navigation Flow is for frontend and full-stack projects. This project appears to be a backend service.",
      layoutHints: { style: "tree" },
      queryMeta: { ...queryMeta, composerName: "navigation-flow", projectType },
    };
  }

  if (projectType === "library") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Navigation Flow requires an application entry point.",
      layoutHints: { style: "tree" },
      queryMeta: { ...queryMeta, composerName: "navigation-flow", projectType },
    };
  }

  // 1. Filter route nodes: only frontend routes (react-router, nextjs, or unspecified)
  const routeNodes = nodes.filter((n) => {
    if (n.kind !== "route") return false;
    const source = n.metadata?.source || "";
    if (source === "express" || source === "nestjs" || source === "fastify" || source === "koa") return false;
    return true;
  });

  const routeNodeIds = new Set(routeNodes.map((n) => n.id));

  // 2. Filter edges to ROUTE_PARENT and ROUTE_RENDERS only (Correction 1: no RENDERS edges)
  const navEdges = edges.filter(
    (e) =>
      e &&
      (e.type === "ROUTE_PARENT" || e.type === "ROUTE_RENDERS") &&
      routeNodeIds.has(e.source)
  );

  // 3. Multi-router root detection
  const parentTargets = new Set(navEdges.filter((e) => e.type === "ROUTE_PARENT").map((e) => e.target));
  const routerRoots = routeNodes.filter(
    (n) => n.subtype === "router" || !parentTargets.has(n.id)
  );

  // 4. Build depth map from router root(s) using ROUTE_PARENT edges
  const depthMap = new Map();
  const parentEdgesOnly = navEdges.filter((e) => e.type === "ROUTE_PARENT");

  routerRoots.forEach((root, groupIdx) => {
    depthMap.set(root.id, 0);
    const queue = [{ id: root.id, depth: 0 }];
    while (queue.length > 0) {
      const { id: currId, depth: currDepth } = queue.shift();
      const outgoing = parentEdgesOnly.filter((e) => e.source === currId);
      for (const edge of outgoing) {
        if (!depthMap.has(edge.target)) {
          const nextDepth = currDepth + 1;
          depthMap.set(edge.target, nextDepth);
          queue.push({ id: edge.target, depth: nextDepth });
        }
      }
    }
  });

  // 5. Post-BFS Component Node Attachment (Correction 2)
  // For each route node carrying ROUTE_RENDERS, attach the rendered component at routeDepth + 0.5
  const attachedComponents = [];
  const attachedEdges = [];

  routeNodes.forEach((rNode) => {
    const rendersEdge = edges.find((e) => e.type === "ROUTE_RENDERS" && e.source === rNode.id);
    if (rendersEdge) {
      const compNode = nodes.find((n) => n.id === rendersEdge.target && n.kind === "component");
      if (compNode) {
        const routeDepth = depthMap.get(rNode.id) ?? 0;
        attachedComponents.push({
          ...compNode,
          depth: routeDepth + 0.5,
          annotation: `Served at ${rNode.name || rNode.metadata?.path || "route"}`,
        });
        attachedEdges.push(rendersEdge);
      }
    }
  });

  // 6. Route Metadata Annotations
  const annotatedRouteNodes = routeNodes.map((node) => {
    const path = node.metadata?.path || node.name || "";
    const isDynamic = /:[a-zA-Z0-9_]+|\[[a-zA-Z0-9_]+\]|\*/.test(path);
    const isProtected = !!node.metadata?.protected;
    const isIndex = !!node.metadata?.index;

    return {
      ...node,
      depth: depthMap.get(node.id) ?? 0,
      metadata: {
        ...node.metadata,
        isDynamic,
        isProtected,
        isIndex,
      },
      annotation: isProtected
        ? `Protected by ${node.metadata.guardName || "Auth Guard"}`
        : isIndex
        ? "Index Route"
        : isDynamic
        ? "Dynamic Path Parameter"
        : buildAnnotation(node, queryMeta),
    };
  });

  const finalNodes = [...annotatedRouteNodes, ...attachedComponents];
  const finalEdges = [...navEdges.filter((e) => e.type === "ROUTE_PARENT"), ...attachedEdges];
  const primaryRootId = routerRoots[0]?.id || routeNodes[0]?.id || null;

  return {
    nodes: finalNodes,
    edges: finalEdges,
    layoutHints: {
      style: "tree",
      rootId: primaryRootId,
      routerRoots: routerRoots.map((r) => r.id),
      depthMap,
    },
    queryMeta: {
      ...queryMeta,
      composerName: "navigation-flow",
      projectType,
    },
  };
}
