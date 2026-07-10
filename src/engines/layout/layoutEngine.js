/**
 * Layout Engine
 * Computes coordinate systems (x, y) for nodes in a generic, framework-agnostic way.
 * This separates visual layering calculations from both React Flow and raw parsers.
 *
 * @param {Array<object>} nodes - Knowledge Graph nodes
 * @param {Array<object>} edges - Knowledge Graph edges
 * @returns {Array<object>} layoutedNodes - nodes with x, y coordinate metadata injected
 */
export function layoutGraphNodes(nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, { ...n }]));
  
  // Calculate incoming degrees
  const inDegree = {};
  nodes.forEach(n => inDegree[n.id] = 0);
  edges.forEach(e => {
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target]++;
    }
  });

  // Identify roots (nodes with no incoming dependencies)
  const roots = nodes.filter(n => inDegree[n.id] === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]);
  }

  const layers = {};
  const visited = new Set();

  function assignLayer(nodeId, depth, path = new Set()) {
    if (path.has(nodeId)) {
      // Loop cycle detected, return early
      return;
    }

    if (visited.has(nodeId)) {
      // Find current layer and remove to push deeper if needed
      for (const d in layers) {
        layers[d] = layers[d].filter(id => id !== nodeId);
      }
    }
    visited.add(nodeId);

    if (!layers[depth]) layers[depth] = [];
    if (!layers[depth].includes(nodeId)) {
      layers[depth].push(nodeId);
    }

    const nextPath = new Set(path);
    nextPath.add(nodeId);

    const outgoingEdges = edges.filter(e => e.source === nodeId);
    outgoingEdges.forEach(e => {
      assignLayer(e.target, depth + 1, nextPath);
    });
  }

  roots.forEach(root => assignLayer(root.id, 0));

  // Catch any orphan or isolated nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      assignLayer(n.id, 0);
    }
  });

  const levelHeight = 190;
  const nodeWidth = 290;
  const canvasWidth = 2100;

  Object.entries(layers).forEach(([depthStr, nodeIds]) => {
    const depth = parseInt(depthStr, 10);
    const rowCount = nodeIds.length;
    const y = 80 + depth * levelHeight;

    nodeIds.forEach((id, idx) => {
      const layoutedNode = nodeMap.get(id);
      if (layoutedNode) {
        const rowWidth = rowCount * nodeWidth;
        const startX = (canvasWidth - rowWidth) / 2;
        
        layoutedNode.metadata = {
          ...layoutedNode.metadata,
          x: startX + idx * nodeWidth + 30,
          y,
        };
      }
    });
  });

  return Array.from(nodeMap.values());
}
