/**
 * Graph Traversal & Algorithmic Utilities
 *
 * Implements pure graph algorithms over Knowledge Graph data structures:
 * - BFS Shortest Path
 * - Ancestors (Upstream dependency chain)
 * - Descendants (Downstream dependent tree)
 * - Cycle Detection (Tarjan's DFS)
 * - Orphan Node Identification
 */

/**
 * Finds the shortest path between a source node and a target node using Breadth-First Search (BFS).
 *
 * @param {string} sourceId
 * @param {string} targetId
 * @param {Map<string, object>} nodesMap
 * @param {Map<string, Array<object>>} outgoingEdgesIndex
 * @returns {Array<object>} pathNodes
 */
export function findShortestPath(sourceId, targetId, nodesMap, outgoingEdgesIndex) {
  if (!nodesMap.has(sourceId) || !nodesMap.has(targetId)) return [];
  if (sourceId === targetId) return [nodesMap.get(sourceId)];

  const queue = [[sourceId]];
  const visited = new Set([sourceId]);

  while (queue.length > 0) {
    const path = queue.shift();
    const currId = path[path.length - 1];

    if (currId === targetId) {
      return path.map((id) => nodesMap.get(id)).filter(Boolean);
    }

    const outgoing = outgoingEdgesIndex.get(currId) || [];
    for (const edge of outgoing) {
      const neighborId = edge.target;
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    }
  }

  return [];
}

/**
 * Finds all recursive upstream ancestors (dependencies) of a node.
 *
 * @param {string} nodeId
 * @param {Map<string, object>} nodesMap
 * @param {Map<string, Array<object>>} outgoingEdgesIndex
 * @returns {Array<object>} ancestorNodes
 */
export function findAncestors(nodeId, nodesMap, outgoingEdgesIndex) {
  const ancestors = new Set();
  const visited = new Set();

  function traverse(currId) {
    if (visited.has(currId)) return;
    visited.add(currId);

    const outgoing = outgoingEdgesIndex.get(currId) || [];
    for (const edge of outgoing) {
      const targetId = edge.target;
      if (targetId && nodesMap.has(targetId) && !ancestors.has(targetId)) {
        ancestors.add(targetId);
        traverse(targetId);
      }
    }
  }

  traverse(nodeId);
  return Array.from(ancestors).map((id) => nodesMap.get(id)).filter(Boolean);
}

/**
 * Finds all recursive downstream descendants (dependents) of a node.
 *
 * @param {string} nodeId
 * @param {Map<string, object>} nodesMap
 * @param {Map<string, Array<object>>} incomingEdgesIndex
 * @returns {Array<object>} descendantNodes
 */
export function findDescendants(nodeId, nodesMap, incomingEdgesIndex) {
  const descendants = new Set();
  const visited = new Set();

  function traverse(currId) {
    if (visited.has(currId)) return;
    visited.add(currId);

    const incoming = incomingEdgesIndex.get(currId) || [];
    for (const edge of incoming) {
      const sourceId = edge.source;
      if (sourceId && nodesMap.has(sourceId) && !descendants.has(sourceId)) {
        descendants.add(sourceId);
        traverse(sourceId);
      }
    }
  }

  traverse(nodeId);
  return Array.from(descendants).map((id) => nodesMap.get(id)).filter(Boolean);
}

/**
 * Finds circular dependency cycles in the graph using Depth-First Search (DFS).
 *
 * @param {Array<object>} nodes
 * @param {Map<string, Array<object>>} outgoingEdgesIndex
 * @returns {Array<Array<object>>} array of cycles
 */
export function findCycles(nodes, outgoingEdgesIndex) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  function dfs(nodeId) {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const outgoing = outgoingEdgesIndex.get(nodeId) || [];
    for (const edge of outgoing) {
      const neighborId = edge.target;
      if (!visited.has(neighborId)) {
        dfs(neighborId);
      } else if (recursionStack.has(neighborId)) {
        const cycleStartIndex = path.indexOf(neighborId);
        if (cycleStartIndex !== -1) {
          cycles.push(path.slice(cycleStartIndex));
        }
      }
    }

    path.pop();
    recursionStack.delete(nodeId);
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return cycles;
}

/**
 * Identifies isolated orphan nodes with 0 incoming and 0 outgoing edges.
 *
 * @param {Array<object>} nodes
 * @param {Map<string, Array<object>>} incomingEdgesIndex
 * @param {Map<string, Array<object>>} outgoingEdgesIndex
 * @returns {Array<object>} orphanNodes
 */
export function findOrphans(nodes, incomingEdgesIndex, outgoingEdgesIndex) {
  return nodes.filter((node) => {
    const incoming = incomingEdgesIndex.get(node.id) || [];
    const outgoing = outgoingEdgesIndex.get(node.id) || [];
    return incoming.length === 0 && outgoing.length === 0;
  });
}
