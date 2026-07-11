/**
 * architectureAdapter.js
 *
 * Transforms the raw Knowledge Graph (nodes, edges) into a structured,
 * hierarchical Architecture Model. Decouples the UI (Explorer) from raw graph traversals.
 *
 * Root nodes are automatically detected, children are traversed recursively using DFS,
 * circular cycles are prevented and flagged, and relationships are grouped semantically
 * into categories based on metadata.
 */

/**
 * Transforms the Knowledge Graph into a hierarchical Architecture Model forest.
 *
 * @param {object} knowledgeGraph - the central source of truth
 * @returns {Array<object>} architectureModel - forest of hierarchical nodes
 */
export function buildArchitectureModel(knowledgeGraph) {
  if (!knowledgeGraph || !Array.isArray(knowledgeGraph.nodes) || !Array.isArray(knowledgeGraph.edges)) {
    return [];
  }

  const nodes = knowledgeGraph.nodes;
  const edges = knowledgeGraph.edges;

  // 1. Separate components and routes
  const componentNodes = nodes.filter(n => n.kind === "component");
  const componentMap = new Map(componentNodes.map(n => [n.id, n]));

  const routeNodes = nodes.filter(n => n.kind === "route");
  const routeMap = new Map(routeNodes.map(n => [n.id, n]));

  // Map lazy load placeholders to their target components
  const lazyTargetMap = new Map();
  edges.forEach(e => {
    if (e.type === "LAZY_LOADS") {
      lazyTargetMap.set(e.source, e.target);
    }
  });

  // Adjacency for routes
  const routeAdjacency = new Map();
  routeNodes.forEach(r => routeAdjacency.set(r.id, []));

  edges.forEach(e => {
    if (e.type === "ROUTE_PARENT" && routeAdjacency.has(e.source)) {
      routeAdjacency.get(e.source).push(e.target);
    }
  });

  // Adjacency for components
  const rendersAdjacency = new Map();
  const rendersIncoming = new Map();
  componentNodes.forEach(c => {
    rendersAdjacency.set(c.id, []);
    rendersIncoming.set(c.id, []);
  });

  edges.forEach(e => {
    if (e.type === "RENDERS") {
      let source = e.source;
      let target = e.target;

      // Resolve lazy wrapper placeholders to their real component targets
      if (lazyTargetMap.has(source)) source = lazyTargetMap.get(source);
      if (lazyTargetMap.has(target)) target = lazyTargetMap.get(target);

      if (rendersAdjacency.has(source) && rendersAdjacency.has(target)) {
        rendersAdjacency.get(source).push(target);
        rendersIncoming.get(target).push(source);
      }
    }
  });

  const inDegree = {};
  componentNodes.forEach(c => {
    inDegree[c.id] = rendersIncoming.get(c.id)?.length || 0;
  });

  // Keep a global set of component/route nodes that have been added somewhere in the tree.
  const allTouchedInTree = new Set();

  // Helper to match a route endpoint to a component
  function matchRouteToComponent(routeNode) {
    const targetName = routeNode.metadata?.componentName;
    if (targetName) {
      const matchByName = componentNodes.find(c => c.subtype !== "lazy" && c.name === targetName);
      if (matchByName) return matchByName;
    }
    
    // File-path fallback for file-based routing
    if (routeNode.file) {
      const matchByFile = componentNodes.find(c => {
        return c.subtype !== "lazy" && c.file && (c.file === routeNode.file || c.file.endsWith("/" + routeNode.file));
      });
      if (matchByFile) return matchByFile;
    }
    
    return null;
  }

  // Component DFS
  function buildSubtree(nodeId, visited = new Set(), entryRoute = null, routerType = null) {
    const compNode = componentMap.get(nodeId);
    if (!compNode) return null;

    if (visited.has(nodeId)) {
      return {
        id: `${nodeId}-loop`,
        name: `${compNode.name} (Loop)`,
        kind: "component",
        subtype: compNode.subtype,
        file: compNode.file,
        metadata: compNode.metadata,
        isLoop: true,
        children: []
      };
    }

    const newVisited = new Set(visited);
    newVisited.add(nodeId);
    allTouchedInTree.add(nodeId);

    const categoryChildren = [];
    const layoutTargets = [];
    const componentTargets = [];
    const providerTargets = [];
    const stateTargets = [];
    const apiTargets = [];

    const childIds = rendersAdjacency.get(nodeId) || [];
    childIds.sort((a, b) => (componentMap.get(a)?.name || "").localeCompare(componentMap.get(b)?.name || ""));

    childIds.forEach(cId => {
      const childComp = componentMap.get(cId);
      if (!childComp) return;
      if (childComp.subtype === "layout") layoutTargets.push(cId);
      else if (childComp.subtype === "provider" || childComp.subtype === "context") providerTargets.push(cId);
      else componentTargets.push(cId);
    });

    edges.forEach(e => {
      if (e.type === "STATE_CONSUMER" && e.target === nodeId) {
        const stateNode = nodes.find(n => n.id === e.source && n.kind === "state");
        if (stateNode && !stateTargets.some(t => t.id === stateNode.id)) stateTargets.push(stateNode);
      }
      if (e.type === "USES_API" && e.source === nodeId) {
        const apiNode = nodes.find(n => n.id === e.target && n.kind === "api");
        if (apiNode && !apiTargets.some(t => t.id === apiNode.id)) apiTargets.push(apiNode);
      }
    });

    stateTargets.sort((a, b) => a.name.localeCompare(b.name));
    apiTargets.sort((a, b) => a.name.localeCompare(b.name));

    const addCategory = (categoryName, items, mapFn) => {
      if (items.length > 0) {
        categoryChildren.push({
          id: `${nodeId}-category-${categoryName.toLowerCase()}`,
          name: categoryName,
          kind: "category",
          children: items.map(mapFn).filter(Boolean)
        });
      }
    };

    addCategory("Layout", layoutTargets, (cId) => buildSubtree(cId, newVisited));
    addCategory("Components", componentTargets, (cId) => buildSubtree(cId, newVisited));
    addCategory("Providers", providerTargets, (cId) => buildSubtree(cId, newVisited));
    
    addCategory("State", stateTargets, (stateNode) => ({
      ...stateNode, children: []
    }));
    
    addCategory("Services", apiTargets, (apiNode) => ({
      ...apiNode, children: []
    }));

    // If this component is the Router component, append the route hierarchy under it!
    if (compNode.name === "Router" || compNode.id.includes("Router")) {
      const routers = routeNodes.filter(r => r.subtype === "router");
      routers.forEach(router => {
        const routerSubtree = buildRouteSubtree(router.id, newVisited, router.name);
        if (routerSubtree) {
          categoryChildren.push(routerSubtree);
          allTouchedInTree.add(router.id);
        }
      });
    }

    return {
      id: compNode.id,
      name: compNode.name,
      kind: "component",
      subtype: compNode.subtype,
      file: compNode.file,
      metadata: {
        ...compNode.metadata,
        entryRoute: entryRoute,
        routerType: routerType
      },
      children: categoryChildren
    };
  }

  // Route DFS
  function buildRouteSubtree(routeId, visited = new Set(), routerType = null) {
    const routeNode = routeMap.get(routeId);
    if (!routeNode) return null;

    if (visited.has(routeId)) return null;
    const newVisited = new Set(visited);
    newVisited.add(routeId);

    const children = [];
    const childRouteIds = routeAdjacency.get(routeId) || [];
    
    // Sort child routes
    childRouteIds.sort((a, b) => (routeMap.get(a)?.name || "").localeCompare(routeMap.get(b)?.name || ""));
    
    childRouteIds.forEach(cId => {
      const childSubtree = buildRouteSubtree(cId, newVisited, routerType || routeNode.name);
      if (childSubtree) children.push(childSubtree);
    });

    // If it's an endpoint, map to a component
    if (routeNode.subtype === "endpoint") {
      const targetComponent = matchRouteToComponent(routeNode);
      if (targetComponent) {
        const compSubtree = buildSubtree(targetComponent.id, newVisited, routeNode.name, routerType);
        if (compSubtree) children.push(compSubtree);
      }
    }

    return {
      id: routeNode.id,
      name: routeNode.name,
      kind: "route",
      subtype: routeNode.subtype,
      file: routeNode.file,
      metadata: routeNode.metadata,
      children: children
    };
  }

  // 2. Roots Detection
  const forest = [];

  // Add all router nodes as primary roots ONLY if they haven't been nested inside components (like Router component)
  const routers = routeNodes.filter(r => r.subtype === "router" && !allTouchedInTree.has(r.id));
  routers.sort((a, b) => a.name.localeCompare(b.name));
  
  routers.forEach(router => {
    const routerSubtree = buildRouteSubtree(router.id, new Set(), router.name);
    if (routerSubtree) forest.push(routerSubtree);
  });

  // Next, find component roots that were NOT reached by routing and are not lazy placeholders
  let compRoots = componentNodes.filter(c => c.subtype !== "lazy" && inDegree[c.id] === 0 && !allTouchedInTree.has(c.id));

  // If no isolated unreached roots are found but we still have untouched components, 
  // try heuristics (like App, main, index)
  if (compRoots.length === 0 && componentNodes.length > 0) {
    const untouchedComps = componentNodes.filter(c => c.subtype !== "lazy" && !allTouchedInTree.has(c.id));
    if (untouchedComps.length > 0) {
      const appOrPage = untouchedComps.filter(c => 
        /app|layout|page|main|index/i.test(c.name) || /app|layout|page|main|index/i.test(c.file)
      );
      if (appOrPage.length > 0) {
        compRoots = appOrPage;
      } else {
        let maxOut = -1;
        let bestNode = untouchedComps[0];
        untouchedComps.forEach(c => {
          const outCount = rendersAdjacency.get(c.id)?.length || 0;
          if (outCount > maxOut) {
            maxOut = outCount;
            bestNode = c;
          }
        });
        compRoots = [bestNode];
      }
    }
  }

  compRoots.sort((a, b) => {
    const aApp = /app/i.test(a.name);
    const bApp = /app/i.test(b.name);
    if (aApp && !bApp) return -1;
    if (!aApp && bApp) return 1;
    return a.name.localeCompare(b.name);
  });

  compRoots.forEach(c => {
    if (!allTouchedInTree.has(c.id)) {
      const subtree = buildSubtree(c.id);
      if (subtree) forest.push(subtree);
    }
  });

  // Finally, catch any remaining isolated components (excluding lazy placeholders)
  const unreachedComponents = componentNodes.filter(c => c.subtype !== "lazy" && !allTouchedInTree.has(c.id));
  if (unreachedComponents.length > 0) {
    unreachedComponents.sort((a, b) => a.name.localeCompare(b.name));
    unreachedComponents.forEach(c => {
      const subtree = buildSubtree(c.id);
      if (subtree) forest.push(subtree);
    });
  }

  return forest;
}
