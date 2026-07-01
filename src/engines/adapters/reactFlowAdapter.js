/**
 * React Flow Adapter
 * Converts layouted Knowledge Graph nodes and edges into @xyflow/react rendering schemas.
 *
 * @param {Array<object>} nodes - layouted Knowledge Graph nodes
 * @param {Array<object>} edges - Knowledge Graph edges
 * @param {string|null} selectedId - currently selected node ID
 * @param {string} [activeThemeColor] - glow color for active elements
 * @returns {{rfNodes: Array, rfEdges: Array}}
 */
export function toReactFlow(nodes, edges, selectedId, activeThemeColor = "rgba(59, 130, 246, 0.7)") {
  const connectedKeys = new Set();
  
  if (selectedId) {
    edges.forEach(e => {
      if (e.source === selectedId || e.target === selectedId) {
        connectedKeys.add(`${e.source}|${e.target}`);
        connectedKeys.add(e.source);
        connectedKeys.add(e.target);
      }
    });
  }

  const rfNodes = nodes.map(node => {
    const isSelected = selectedId === node.id;
    const isConnected = connectedKeys.has(node.id);
    
    // Fallback to coordinates
    const x = node.metadata.x !== undefined ? node.metadata.x : 100;
    const y = node.metadata.y !== undefined ? node.metadata.y : 100;

    return {
      id: node.id,
      type: node.kind === "route" ? "customRoute" : node.kind === "state" ? "customState" : node.kind === "api" ? "customApi" : "customNode",
      position: { x, y },
      data: {
        node,
        isSelected,
        isConnected,
      },
      width: 250,
      height: 120,
    };
  });

  const rfEdges = edges.map(e => {
    const active = connectedKeys.has(`${e.source}|${e.target}`);
    return {
      id: `edge-${e.id}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      animated: active,
      style: {
        stroke: active ? activeThemeColor : "rgba(224, 227, 232, 0.5)",
        strokeWidth: active ? 2 : 1,
      },
    };
  });

  return { rfNodes, rfEdges };
}
