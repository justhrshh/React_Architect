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

  // 1. Filter out only component nodes
  const componentNodes = nodes.filter(n => n.kind === "component");
  const componentMap = new Map(componentNodes.map(n => [n.id, n]));

  // Build adjacency mappings for components
  const rendersAdjacency = new Map(); // parent -> array of targets
  const rendersIncoming = new Map(); // target -> array of parents

  componentNodes.forEach(c => {
    rendersAdjacency.set(c.id, []);
    rendersIncoming.set(c.id, []);
  });

  edges.forEach(e => {
    if (e.type === "RENDERS") {
      if (rendersAdjacency.has(e.source) && rendersAdjacency.has(e.target)) {
        rendersAdjacency.get(e.source).push(e.target);
        rendersIncoming.get(e.target).push(e.source);
      }
    }
  });

  // Calculate in-degree for all component nodes
  const inDegree = {};
  componentNodes.forEach(c => {
    inDegree[c.id] = rendersIncoming.get(c.id).length;
  });

  // 2. Root Detection
  // Find nodes with in-degree = 0
  let roots = componentNodes.filter(c => inDegree[c.id] === 0);

  // If there are no nodes with in-degree = 0 (e.g. because of rendering cycles),
  // default to looking for App, Router, layout, page, main, index components
  if (roots.length === 0 && componentNodes.length > 0) {
    const appOrPage = componentNodes.filter(c => 
      /app|router|layout|page|main|index/i.test(c.name) || /app|router|layout|page|main|index/i.test(c.file)
    );
    if (appOrPage.length > 0) {
      roots = appOrPage;
    } else {
      // Pick the component with the highest out-degree (renders the most children)
      let maxOut = -1;
      let bestNode = componentNodes[0];
      componentNodes.forEach(c => {
        const outCount = rendersAdjacency.get(c.id).length;
        if (outCount > maxOut) {
          maxOut = outCount;
          bestNode = c;
        }
      });
      roots = [bestNode];
    }
  }

  // Sort roots deterministically (App first, then layouts, then pages, then alphabetical)
  roots.sort((a, b) => {
    const aApp = /app/i.test(a.name);
    const bApp = /app/i.test(b.name);
    if (aApp && !bApp) return -1;
    if (!aApp && bApp) return 1;

    const aLayout = a.subtype === "layout";
    const bLayout = b.subtype === "layout";
    if (aLayout && !bLayout) return -1;
    if (!aLayout && bLayout) return 1;

    const aPage = a.subtype === "page";
    const bPage = b.subtype === "page";
    if (aPage && !bPage) return -1;
    if (!aPage && bPage) return 1;

    return a.name.localeCompare(b.name);
  });

  // Keep a global set of nodes that have been added somewhere in the tree.
  // This is used to capture isolated/unreached components.
  const allTouchedInTree = new Set();

  // DFS function to build subtree
  function buildSubtree(nodeId, visited = new Set()) {
    const compNode = componentMap.get(nodeId);
    if (!compNode) return null;

    // Check for circular dependency loops
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

    // Build categories for children and dependencies
    const categoryChildren = []; // categories containing children

    // Group 1: Layouts rendered
    const layoutTargets = [];
    // Group 2: Sub-components rendered
    const componentTargets = [];
    // Group 3: Contexts / Providers rendered or associated
    const providerTargets = [];
    // Group 4: Redux slices or states consumed
    const stateTargets = [];
    // Group 5: API endpoints consumed (uses USES_API edges)
    const apiTargets = [];

    // Find rendered children
    const childIds = rendersAdjacency.get(nodeId) || [];
    // Sort childIds deterministically by component name
    childIds.sort((a, b) => {
      const aNode = componentMap.get(a);
      const bNode = componentMap.get(b);
      return (aNode?.name || "").localeCompare(bNode?.name || "");
    });

    childIds.forEach(cId => {
      const childComp = componentMap.get(cId);
      if (!childComp) return;

      if (childComp.subtype === "layout") {
        layoutTargets.push(cId);
      } else if (childComp.subtype === "provider" || childComp.subtype === "context") {
        providerTargets.push(cId);
      } else {
        componentTargets.push(cId);
      }
    });

    // Find associated State Consumers (incoming STATE_CONSUMER edges)
    edges.forEach(e => {
      if (e.type === "STATE_CONSUMER" && e.target === nodeId) {
        const stateNode = nodes.find(n => n.id === e.source && n.kind === "state");
        if (stateNode && !stateTargets.some(t => t.id === stateNode.id)) {
          stateTargets.push(stateNode);
        }
      }
    });
    // Sort stateTargets deterministically
    stateTargets.sort((a, b) => a.name.localeCompare(b.name));

    // Find associated API endpoint usages (outgoing USES_API edges)
    edges.forEach(e => {
      if (e.type === "USES_API" && e.source === nodeId) {
        const apiNode = nodes.find(n => n.id === e.target && n.kind === "api");
        if (apiNode && !apiTargets.some(t => t.id === apiNode.id)) {
          apiTargets.push(apiNode);
        }
      }
    });
    // Sort apiTargets deterministically
    apiTargets.sort((a, b) => a.name.localeCompare(b.name));

    // Helper to push category if it has items
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

    // 1. Add Layouts
    addCategory("Layout", layoutTargets, (cId) => buildSubtree(cId, newVisited));

    // 2. Add Components
    addCategory("Components", componentTargets, (cId) => buildSubtree(cId, newVisited));

    // 3. Add Providers
    addCategory("Providers", providerTargets, (cId) => buildSubtree(cId, newVisited));

    // 4. Add State Slices
    addCategory("State", stateTargets, (stateNode) => ({
      id: stateNode.id,
      name: stateNode.name,
      kind: "state",
      subtype: stateNode.subtype,
      file: stateNode.file,
      metadata: stateNode.metadata,
      children: []
    }));

    // 5. Add Services / API Calls
    addCategory("Services", apiTargets, (apiNode) => ({
      id: apiNode.id,
      name: apiNode.name,
      kind: "api",
      subtype: apiNode.subtype,
      file: apiNode.file,
      metadata: apiNode.metadata,
      children: []
    }));

    return {
      id: compNode.id,
      name: compNode.name,
      kind: "component",
      subtype: compNode.subtype,
      file: compNode.file,
      metadata: compNode.metadata,
      children: categoryChildren
    };
  }

  // Build subtrees for all roots
  const forest = roots.map(r => buildSubtree(r.id)).filter(Boolean);

  // If there are components that were NEVER reached by the root DFS (isolated components),
  // add them as individual roots.
  const unreachedComponents = componentNodes.filter(c => !allTouchedInTree.has(c.id));
  if (unreachedComponents.length > 0) {
    unreachedComponents.sort((a, b) => a.name.localeCompare(b.name));
    unreachedComponents.forEach(c => {
      const subtree = buildSubtree(c.id);
      if (subtree) {
        forest.push(subtree);
      }
    });
  }

  return forest;
}
