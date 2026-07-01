/**
 * Validates the Knowledge Graph consistency and flags errors, warnings, and suggestions.
 *
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @returns {{errors: Array<object>, warnings: Array<object>, suggestions: Array<object>}} validationResults
 */
export function validateGraph(nodes, edges) {
  const errors = [];
  const warnings = [];
  const suggestions = [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const seenIds = new Set();
  const orphanSet = new Set(nodes.map(n => n.id));

  // 1. Duplicate IDs & Large Components
  nodes.forEach(node => {
    if (seenIds.has(node.id)) {
      errors.push({
        type: "DUPLICATE_ID",
        message: `Duplicate node ID detected: "${node.id}"`,
        file: node.file,
      });
    }
    seenIds.add(node.id);

    // Large Component Check (LOC > 250)
    if (node.kind === "component" && node.metadata && node.metadata.loc > 250) {
      warnings.push({
        type: "LARGE_COMPONENT",
        message: `Component "${node.name}" is large (${node.metadata.loc} lines). Consider modularizing it.`,
        file: node.file,
      });
      suggestions.push({
        type: "SPLIT_COMPONENT",
        message: `Split "${node.name}" component declaration into smaller sub-components.`,
        file: node.file,
      });
    }
  });

  // 2. Missing Targets & Orphan tagging
  edges.forEach(edge => {
    orphanSet.delete(edge.source);
    orphanSet.delete(edge.target);

    if (!nodeMap.has(edge.target)) {
      errors.push({
        type: "MISSING_TARGET",
        message: `Relationship "${edge.type}" references non-existent node "${edge.target}"`,
        source: edge.source,
        target: edge.target,
      });
    }
  });

  // 3. Orphan Nodes Warning
  orphanSet.forEach(orphanId => {
    const node = nodeMap.get(orphanId);
    if (node && node.kind !== "file") { // files are expected to sometimes be orphans
      warnings.push({
        type: "ORPHAN_NODE",
        message: `Node "${node.name}" (${node.kind}) is not connected to any other element.`,
        file: node.file,
      });
    }
  });

  // 4. Circular Reference Detection (DFS on RENDERS edges)
  const adj = new Map();
  edges.forEach(e => {
    if (e.type === "RENDERS") {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source).push(e.target);
    }
  });

  const visited = new Set();
  const recStack = new Set();
  const cycleList = [];

  function dfs(nodeId) {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adj.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        cycleList.push({ source: nodeId, target: neighbor });
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  cycleList.forEach(cycle => {
    const srcNode = nodeMap.get(cycle.source);
    const tgtNode = nodeMap.get(cycle.target);
    warnings.push({
      type: "CIRCULAR_REFERENCE",
      message: `Circular component rendering loop detected: "${srcNode?.name || cycle.source}" <-> "${tgtNode?.name || cycle.target}"`,
      file: srcNode?.file || "unknown",
    });
  });

  return {
    errors,
    warnings,
    suggestions,
  };
}
