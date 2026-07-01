/**
 * Performs a simple hierarchical layout on a normalized node/edge graph.
 * Assigns x and y coordinates to nodes to form a clean, readable component tree.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {{nodes: Array, edges: Array}}
 */
export function layoutGraph(nodes, edges) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Calculate incoming edges
  const inDegree = {};
  nodes.forEach(n => inDegree[n.id] = 0);
  edges.forEach(e => {
    if (inDegree[e.to] !== undefined) {
      inDegree[e.to]++;
    }
  });

  // Discover root components (no parents)
  const roots = nodes.filter(n => inDegree[n.id] === 0);
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(nodes[0]); // fallback if cyclic
  }

  const layers = {};
  const visited = new Set();
  
  function assignLayer(nodeId, depth) {
    // If we've seen this node at a shallower depth, push it deeper if needed
    if (visited.has(nodeId)) {
      // Find current layer of node and remove it
      for (const d in layers) {
        layers[d] = layers[d].filter(id => id !== nodeId);
      }
    }
    visited.add(nodeId);

    if (!layers[depth]) layers[depth] = [];
    if (!layers[depth].includes(nodeId)) {
      layers[depth].push(nodeId);
    }

    const childEdges = edges.filter(e => e.from === nodeId);
    childEdges.forEach(e => {
      assignLayer(e.to, depth + 1);
    });
  }

  roots.forEach(root => assignLayer(root.id, 0));

  // Capture isolated nodes
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      assignLayer(n.id, 0);
    }
  });

  // Define layout constants matching custom studio blueprints
  const levelHeight = 180; // vertical step
  const nodeWidth = 280;   // horizontal separation
  const canvasWidth = 2100;

  Object.entries(layers).forEach(([depthStr, nodeIds]) => {
    const depth = parseInt(depthStr, 10);
    const rowCount = nodeIds.length;
    const y = 80 + depth * levelHeight;

    nodeIds.forEach((id, idx) => {
      const node = nodeMap.get(id);
      if (node) {
        // Center the elements in this layer row
        const rowWidth = rowCount * nodeWidth;
        const startX = (canvasWidth - rowWidth) / 2;
        node.x = startX + idx * nodeWidth + 28; // slight offset for visual appeal
        node.y = y;
      }
    });
  });

  return { nodes, edges };
}

/**
 * Adapts normalized nodes/edges into React Flow node/edge configurations.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string|null} selectedId
 * @returns {{rfNodes: Array, rfEdges: Array}}
 */
export function toReactFlow(nodes, edges, selectedId) {
  // Pre-calculate connected nodes for style updates
  const connectedKeys = new Set();
  if (selectedId) {
    edges.forEach(e => {
      if (e.from === selectedId || e.to === selectedId) {
        connectedKeys.add(`${e.from}|${e.to}`);
        connectedKeys.add(e.from);
        connectedKeys.add(e.to);
      }
    });
  }

  const rfNodes = nodes.map(n => {
    const isSelected = selectedId === n.id;
    const isConnected = connectedKeys.has(n.id);
    
    return {
      id: n.id,
      type: "custom", // maps to our custom node component
      position: { x: n.x, y: n.y },
      data: {
        node: n,
        isSelected,
        isConnected,
      },
      width: 224,
      height: 110,
    };
  });

  const rfEdges = edges.map(e => {
    const active = connectedKeys.has(`${e.from}|${e.to}`);
    return {
      id: `edge-${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      animated: active,
      style: {
        stroke: active ? "rgba(59,130,246,0.65)" : "rgba(59,130,246,0.18)",
        strokeWidth: active ? 2 : 1,
      },
    };
  });

  return { rfNodes, rfEdges };
}
