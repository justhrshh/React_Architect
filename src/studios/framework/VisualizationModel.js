import { LAYOUT_MODES } from "./types.js";

/**
 * Builds a standardized, renderer-agnostic VisualizationModel from graph nodes and edges.
 *
 * @param {object} params
 * @param {string} params.studioId
 * @param {Array<object>} params.nodes
 * @param {Array<object>} params.edges
 * @param {string} [params.layout=LAYOUT_MODES.LAYERED]
 * @param {object} [params.interactionState={}]
 * @returns {object} visualizationModel
 */
export function buildVisualizationModel({
  studioId = "default",
  nodes = [],
  edges = [],
  layout = LAYOUT_MODES.LAYERED,
  interactionState = {},
}) {
  const {
    selectedNodeId = null,
    focusedNodeId = null,
    highlightedNodeIds = [],
    highlightedEdgeIds = [],
  } = interactionState;

  const highlightedNodeSet = new Set(highlightedNodeIds);
  const highlightedEdgeSet = new Set(highlightedEdgeIds);

  const formattedNodes = nodes.map((n, idx) => {
    const isSelected = n.id === selectedNodeId;
    const isFocused = n.id === focusedNodeId;
    const isHighlighted = highlightedNodeSet.has(n.id);

    return {
      id: n.id,
      label: n.name || n.id,
      kind: n.kind,
      subtype: n.subtype,
      file: n.file,
      directory: n.directory,
      metadata: n.metadata || {},
      position: n.position || { x: (idx % 5) * 220, y: Math.floor(idx / 5) * 120 },
      style: deriveNodeStyle(n.kind, n.subtype),
      status: {
        isSelected,
        isFocused,
        isHighlighted,
        isDimmed: (selectedNodeId || highlightedNodeSet.size > 0) && !isSelected && !isFocused && !isHighlighted,
      },
    };
  });

  const formattedEdges = edges.map((e) => {
    const isHighlighted = highlightedEdgeSet.has(e.id);

    return {
      id: e.id || `edge:${e.type}:${e.source}->${e.target}`,
      type: e.type,
      source: e.source,
      target: e.target,
      metadata: e.metadata || {},
      style: deriveEdgeStyle(e.type),
      status: {
        isHighlighted,
        isDimmed: highlightedEdgeSet.size > 0 && !isHighlighted,
      },
    };
  });

  return {
    studioId,
    timestamp: Date.now(),
    layout,
    nodes: formattedNodes,
    edges: formattedEdges,
    summary: {
      totalNodes: formattedNodes.length,
      totalEdges: formattedEdges.length,
    },
    interactionState: {
      selectedNodeId,
      focusedNodeId,
      highlightedNodeIds,
      highlightedEdgeIds,
    },
  };
}

function deriveNodeStyle(kind, subtype) {
  const styleMap = {
    component: { color: "#3B82F6", shape: "rounded-rect", icon: "Box" },
    route: { color: "#10B981", shape: "pill", icon: "Route" },
    controller: { color: "#8B5CF6", shape: "hexagon", icon: "Cpu" },
    service: { color: "#F59E0B", shape: "diamond", icon: "Server" },
    model: { color: "#EC4899", shape: "cylinder", icon: "Database" },
    middleware: { color: "#EF4444", shape: "shield", icon: "Shield" },
    state: { color: "#06B6D4", shape: "circle", icon: "Layers" },
    api: { color: "#6366F1", shape: "cloud", icon: "Cloud" },
  };

  return styleMap[kind] || { color: "#6B7280", shape: "rect", icon: "Code" };
}

function deriveEdgeStyle(type) {
  const edgeMap = {
    HANDLED_BY: { color: "#8B5CF6", lineStyle: "solid", animated: true },
    USES: { color: "#F59E0B", lineStyle: "solid", animated: false },
    READS: { color: "#EC4899", lineStyle: "dashed", animated: false },
    WRITES: { color: "#EF4444", lineStyle: "dashed", animated: true },
    AUTHORIZES: { color: "#EF4444", lineStyle: "dotted", animated: true },
    RENDERS: { color: "#3B82F6", lineStyle: "solid", animated: false },
    FETCHES: { color: "#10B981", lineStyle: "solid", animated: true },
  };

  return edgeMap[type] || { color: "#9CA3AF", lineStyle: "solid", animated: false };
}
