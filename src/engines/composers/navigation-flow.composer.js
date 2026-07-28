/**
 * navigation-flow.composer.js
 *
 * Progressive Disclosure Navigation Sitemap & Render Chain Composer.
 * Composes the complete, un-truncated navigation and rendering tree:
 * Router → Route → Guard → Layout → Page Component → Child Components → Leaf Components.
 * Manages parent-child structural metadata, child counts, canonical vs. reference shared components,
 * and expansion visibility state (`expandedNodeIds`).
 */

import { buildAnnotation } from "./composerUtils.js";

/**
 * Composes an expandable navigation sitemap from the Knowledge Graph subgraph.
 *
 * @param {{ nodes: Array<object>, edges: Array<object>, queryMeta: object }} subgraph
 * @param {object} template
 * @param {object} queryMeta
 * @returns {{ nodes: Array<object>, edges: Array<object>, layoutHints: object, queryMeta: object }}
 */
export function composeNavigationFlow(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};
  const projectType = queryMeta.classification?.type || "frontend";

  // Project-type adaptation: disabled for backend or library projects
  if (projectType === "backend") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Navigation Flow is for frontend and full-stack projects. This project appears to be a backend service.",
      layoutHints: { style: "sitemap" },
      queryMeta: { ...queryMeta, composerName: "navigation-flow", projectType },
    };
  }

  if (projectType === "library") {
    return {
      nodes: [],
      edges: [],
      disabled: true,
      disabledReason: "Navigation Flow requires an application entry point with routing.",
      layoutHints: { style: "sitemap" },
      queryMeta: { ...queryMeta, composerName: "navigation-flow", projectType },
    };
  }

  // 1. Filter route nodes: frontend routes (react-router, nextjs, or unspecified)
  const routeNodes = nodes.filter((n) => {
    if (n.kind !== "route") return false;
    const source = n.metadata?.source || "";
    if (source === "express" || source === "nestjs" || source === "fastify" || source === "koa") return false;
    return true;
  });

  const routeNodeIds = new Set(routeNodes.map((n) => n.id));
  const compNodeMap = new Map(nodes.filter((n) => n.kind === "component").map((n) => [n.id, n]));

  // 2. Identify route-to-route parent edges
  const routeParentEdges = edges.filter(
    (e) => e && e.type === "ROUTE_PARENT" && routeNodeIds.has(e.source) && routeNodeIds.has(e.target)
  );

  const parentTargets = new Set(routeParentEdges.map((e) => e.target));
  const routerRoots = routeNodes.filter((n) => n.subtype === "router" || !parentTargets.has(n.id));

  // 3. Compute route depth via BFS over route hierarchy
  const routeDepthMap = new Map();
  routerRoots.forEach((root) => {
    routeDepthMap.set(root.id, 0);
    const queue = [{ id: root.id, depth: 0 }];
    while (queue.length > 0) {
      const { id: currId, depth: currDepth } = queue.shift();
      const outgoing = routeParentEdges.filter((e) => e.source === currId);
      for (const edge of outgoing) {
        if (!routeDepthMap.has(edge.target)) {
          const nextDepth = currDepth + 1;
          routeDepthMap.set(edge.target, nextDepth);
          queue.push({ id: edge.target, depth: nextDepth });
        }
      }
    }
  });

  const fullTreeNodes = [];
  const fullTreeEdges = [...routeParentEdges];
  const canonicalComponentIds = new Set();
  const componentParentCount = new Map();
  const childrenMap = new Map(); // parentId -> Array<childNodeId>
  const parentMap = new Map();   // childNodeId -> parentId

  function registerChild(parentId, childId) {
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    if (!childrenMap.get(parentId).includes(childId)) {
      childrenMap.get(parentId).push(childId);
    }
    parentMap.set(childId, parentId);
  }

  // 4. Build complete sitemap render tree recursively down to leaf components
  routeNodes.forEach((rNode) => {
    const rDepth = routeDepthMap.get(rNode.id) ?? 0;
    const pathStr = rNode.metadata?.path || rNode.name || "/";
    const isDynamic = /:[a-zA-Z0-9_]+|\[[a-zA-Z0-9_]+\]|\*/.test(pathStr);
    const isProtected = !!rNode.metadata?.protected || !!rNode.protected || !!rNode.metadata?.guardName;
    const guardName = rNode.metadata?.guardName || "ProtectedRoute";
    const isIndex = !!rNode.metadata?.index || !!rNode.index;

    // Route Node definition
    fullTreeNodes.push({
      ...rNode,
      nodeType: "route",
      depth: rDepth,
      metadata: {
        ...rNode.metadata,
        isDynamic,
        isProtected,
        isIndex,
        path: pathStr,
      },
      annotation: isProtected
        ? `Protected by ${guardName}`
        : isIndex
        ? "Index Route"
        : isDynamic
        ? "Dynamic Route Parameter"
        : buildAnnotation(rNode, queryMeta),
    });

    // Link child routes to parent routes in structure
    const pEdge = routeParentEdges.find((e) => e.target === rNode.id);
    if (pEdge) {
      registerChild(pEdge.source, rNode.id);
    }

    const rendersEdge = edges.find((e) => e.type === "ROUTE_RENDERS" && e.source === rNode.id);
    let targetComponentId = rendersEdge ? rendersEdge.target : null;
    let pageCompNode = targetComponentId ? compNodeMap.get(targetComponentId) : null;

    if (!pageCompNode && rNode.metadata?.componentName) {
      pageCompNode = Array.from(compNodeMap.values()).find(
        (n) => n.name === rNode.metadata.componentName
      );
    }

    let previousNodeId = rNode.id;
    let currentDepth = rDepth + 0.5;

    // Protected Guard Wrapper Node
    if (isProtected) {
      const guardNodeId = `guard:${rNode.id}`;
      fullTreeNodes.push({
        id: guardNodeId,
        kind: "guard",
        nodeType: "guard",
        name: guardName,
        depth: currentDepth,
        metadata: {
          isProtected: true,
          guardName,
          routeId: rNode.id,
          path: pathStr,
        },
        annotation: `Route Guard for ${pathStr}`,
      });

      fullTreeEdges.push({
        id: `e:route-guard:${rNode.id}`,
        source: rNode.id,
        target: guardNodeId,
        type: "ROUTE_PARENT",
        label: "guarded by",
      });

      registerChild(rNode.id, guardNodeId);
      previousNodeId = guardNodeId;
      currentDepth += 0.5;
    }

    // Attach Page Component Node and recursively attach child UI components
    if (pageCompNode) {
      const pageNodeId = pageCompNode.id;
      componentParentCount.set(pageNodeId, (componentParentCount.get(pageNodeId) || 0) + 1);

      fullTreeNodes.push({
        ...pageCompNode,
        nodeType: "page",
        depth: currentDepth,
        annotation: `Page Component for ${pathStr}`,
      });

      fullTreeEdges.push({
        id: `e:serves:${previousNodeId}->${pageNodeId}`,
        source: previousNodeId,
        target: pageNodeId,
        type: "ROUTE_RENDERS",
        label: "renders page",
      });

      registerChild(previousNodeId, pageNodeId);
      canonicalComponentIds.add(pageNodeId);

      // Recursive Component Render Chain Attachment
      attachChildComponentsRecursive(
        pageNodeId,
        pageCompNode.id,
        currentDepth + 1,
        fullTreeNodes,
        fullTreeEdges,
        compNodeMap,
        edges,
        canonicalComponentIds,
        componentParentCount,
        registerChild,
        new Set([pageCompNode.id])
      );
    }
  });

  // Recursive Helper to expand component render tree down to leaf nodes
  function attachChildComponentsRecursive(
    parentGraphNodeId,
    compOriginalId,
    depth,
    outNodes,
    outEdges,
    compMap,
    allEdges,
    canonicalSet,
    parentCountMap,
    registerChildFn,
    visitedInPath
  ) {
    const childRenderEdges = allEdges.filter((e) => e.type === "RENDERS" && e.source === compOriginalId);

    childRenderEdges.forEach((cEdge) => {
      const childComp = compMap.get(cEdge.target);
      if (!childComp || visitedInPath.has(childComp.id)) return;

      parentCountMap.set(childComp.id, (parentCountMap.get(childComp.id) || 0) + 1);

      const isFirstEncounter = !canonicalSet.has(childComp.id);

      if (isFirstEncounter) {
        canonicalSet.add(childComp.id);
        outNodes.push({
          ...childComp,
          nodeType: "component",
          isCanonical: true,
          depth,
          annotation: `Rendered by ${compMap.get(compOriginalId)?.name || "Parent"}`,
        });

        outEdges.push({
          id: `e:renders:${parentGraphNodeId}->${childComp.id}`,
          source: parentGraphNodeId,
          target: childComp.id,
          type: "RENDERS",
          label: "renders",
        });

        registerChildFn(parentGraphNodeId, childComp.id);

        const nextVisited = new Set(visitedInPath);
        nextVisited.add(childComp.id);

        attachChildComponentsRecursive(
          childComp.id,
          childComp.id,
          depth + 1,
          outNodes,
          outEdges,
          compMap,
          allEdges,
          canonicalSet,
          parentCountMap,
          registerChildFn,
          nextVisited
        );
      } else {
        // Shared component secondary encounter -> Connect directly from parent to canonical node
        const existingEdge = outEdges.find(
          (e) => e.source === parentGraphNodeId && e.target === childComp.id
        );
        if (!existingEdge) {
          outEdges.push({
            id: `e:renders-shared:${parentGraphNodeId}->${childComp.id}`,
            source: parentGraphNodeId,
            target: childComp.id,
            type: "RENDERS",
            label: "renders",
          });
        }
        registerChildFn(parentGraphNodeId, childComp.id);
      }
    });
  }

  // 5. Annotate `hasChildren`, `childCount`, and shared badges for every node
  fullTreeNodes.forEach((node) => {
    const children = childrenMap.get(node.id) || [];
    node.hasChildren = children.length > 0;
    node.childCount = children.length;
    node.childIds = children;
    node.parentId = parentMap.get(node.id) || null;

    if (node.nodeType === "component" || node.nodeType === "page") {
      const pCount = componentParentCount.get(node.canonicalId || node.id) || 0;
      if (pCount > 1) {
        node.sharedComponent = true;
        node.parentCount = pCount;
        node.annotation = `Shared across ${pCount} pages`;
      }
    }
  });

  // 6. Progressive Disclosure Visibility Filtering (`expandedNodeIds`)
  // Default expanded set: Root routers, top-level routes, and page component nodes
  const defaultExpanded = new Set();
  fullTreeNodes.forEach((n) => {
    if (n.nodeType === "route" || n.nodeType === "guard" || n.nodeType === "page" || n.subtype === "router") {
      defaultExpanded.add(n.id);
    }
  });

  const expandedNodeIds = queryMeta.expandedNodeIds
    ? new Set(queryMeta.expandedNodeIds)
    : defaultExpanded;

  // A node is visible if all of its ancestors are in expandedNodeIds
  const visibleNodes = fullTreeNodes.filter((node) => {
    let currParentId = parentMap.get(node.id);
    while (currParentId) {
      if (!expandedNodeIds.has(currParentId)) return false;
      currParentId = parentMap.get(currParentId);
    }
    return true;
  });

  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = fullTreeEdges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  const primaryRootId = routerRoots[0]?.id || routeNodes[0]?.id || null;

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    layoutHints: {
      style: "sitemap",
      orientation: "horizontal",
      rootId: primaryRootId,
      routerRoots: routerRoots.map((r) => r.id),
      fullTreeNodes,
      childrenMap: Object.fromEntries(childrenMap),
      parentMap: Object.fromEntries(parentMap),
    },
    queryMeta: {
      ...queryMeta,
      composerName: "navigation-flow",
      projectType,
      expandedNodeIds: Array.from(expandedNodeIds),
    },
  };
}
