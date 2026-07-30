import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn, ZoomOut, Maximize2, GitBranch,
  FileCode, Layers, Box, Cpu, Radio, Shield, Server, Database, Key
} from "lucide-react";
import { INTER, MONO } from "./constants";
import { computeBlueprintLayout, computeSitemapLayout } from "@/engines/layout/blueprintLayoutEngine";
import { getExecutionNeighborhood } from "@/engines/graph/graphTraversal";
import { LANE_CONFIG } from "@/engines/graph/blueprintLaneConfig";
import { buildBlueprintGraph } from "@/engines/graph/blueprintGraphBuilder";
import { ComposedArchitectureCard } from "./ComposedArchitectureCard";

// ─── Edge Type Visual Identity Config ───────────────────────────────────────
const EDGE_STYLE_CFG = {
  IMPORTS:           { color: "#60A5FA", width: 1.5, dash: undefined, label: "imports" },
  ROUTE_PARENT:      { color: "#10B981", width: 2.0, dash: undefined, label: "routes" },
  ROUTE_RENDERS:     { color: "#10B981", width: 2.2, dash: undefined, label: "renders page" },
  ROUTES_TO:         { color: "#10B981", width: 2.0, dash: undefined, label: "routes" },
  RENDERS:           { color: "#A855F7", width: 2.0, dash: undefined, label: "renders" },
  USES_HOOK:         { color: "#F97316", width: 2.0, dash: undefined, label: "hook" },
  USES_API:          { color: "#EF4444", width: 2.0, dash: undefined, label: "api call" },
  CALLS_API:         { color: "#EF4444", width: 2.0, dash: undefined, label: "api call" },
  USES_CONTEXT:      { color: "#3B82F6", width: 1.8, dash: "4 4",     label: "context" },
  STATE_CONSUMER:    { color: "#3B82F6", width: 1.8, dash: "4 4",     label: "state" },
  LAZY_LOADS:        { color: "#9CA3AF", width: 1.5, dash: "4 4",     label: "lazy" },
  DYNAMIC_IMPORT:    { color: "#9CA3AF", width: 1.5, dash: "4 4",     label: "dynamic" },
  TARGETS_ROUTE:     { color: "#059669", width: 2.2, dash: undefined, label: "targets" },
  HANDLED_BY:        { color: "#7C3AED", width: 2.2, dash: undefined, label: "handler" },
  AUTHORIZES:        { color: "#0284C7", width: 2.0, dash: undefined, label: "auth" },
  VALIDATES:         { color: "#0284C7", width: 2.0, dash: undefined, label: "validates" },
  USES:              { color: "#6366F1", width: 1.8, dash: undefined, label: "uses" },
  CALLS_SERVICE:     { color: "#DB2777", width: 2.2, dash: undefined, label: "service" },
  USES_MODEL:        { color: "#EA580C", width: 2.2, dash: undefined, label: "model" },
  ACCESSES_DB:       { color: "#10B981", width: 2.4, dash: undefined, label: "database" },
  // Synthesized by blueprintGraphBuilder.js's bridging pass (Phase 7) when filtering would
  // otherwise disconnect two architectural nodes — dashed + muted to visually distinguish a
  // bridged/inferred connection from a direct, literal Knowledge Graph edge.
  EXECUTION_FLOW:    { color: "#94A3B8", width: 1.8, dash: "6 3",     label: "bridged" },
};

function getEdgeStyle(type) {
  return EDGE_STYLE_CFG[type] || { color: "#CBD5E1", width: 1.5, dash: undefined, label: "" };
}

// ─── Bounding Box Closest Anchor Point Intersection Calculator ───────────────
function getNodeAnchorPoint(node, targetCx, targetCy) {
  const meta = node?.metadata || {};
  const w = meta.w ?? node?.w ?? (node?.isCenterNode ? 230 : node?.isCategoryNode ? 160 : 130);
  const h = meta.h ?? node?.h ?? (node?.isCenterNode ? 110 : node?.isCategoryNode ? 44 : 34);
  const x = meta.x ?? node?.x ?? 0;
  const y = meta.y ?? node?.y ?? 0;

  const cx = x + w / 2;
  const cy = y + h / 2;

  const dx = targetCx - cx;
  const dy = targetCy - cy;

  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
    return { x: cx, y: cy, cx, cy, side: "center" };
  }

  const theta = Math.atan2(dy, dx);
  const halfW = w / 2;
  const halfH = h / 2;

  let anchorX = cx;
  let anchorY = cy;
  let side = "right";

  if (Math.abs(Math.cos(theta)) * halfH > Math.abs(Math.sin(theta)) * halfW) {
    if (dx > 0) {
      anchorX = x + w;
      anchorY = cy + halfW * Math.tan(theta);
      side = "right";
    } else {
      anchorX = x;
      anchorY = cy - halfW * Math.tan(theta);
      side = "left";
    }
  } else {
    const tanVal = Math.tan(theta) || 0.0001;
    if (dy > 0) {
      anchorX = cx + (halfH / tanVal);
      anchorY = y + h;
      side = "bottom";
    } else {
      anchorX = cx - (halfH / tanVal);
      anchorY = y;
      side = "top";
    }
  }

  return { x: anchorX, y: anchorY, cx, cy, side };
}

// ─── Top-Down Tree Wavy S-Curve Path & Anchor Resolver ───────────────────────
function getRadialSPath(srcNode, tgtNode) {
  const srcW = srcNode.metadata?.w ?? srcNode.w ?? (srcNode.isCenterNode ? 230 : srcNode.isCategoryNode ? 160 : 130);
  const srcH = srcNode.metadata?.h ?? srcNode.h ?? (srcNode.isCenterNode ? 110 : srcNode.isCategoryNode ? 44 : 34);
  const srcX = srcNode.metadata?.x ?? srcNode.x ?? 0;
  const srcY = srcNode.metadata?.y ?? srcNode.y ?? 0;
  const srcCx = srcX + srcW / 2;
  const srcCy = srcY + srcH / 2;

  const tgtW = tgtNode.metadata?.w ?? tgtNode.w ?? (tgtNode.isCenterNode ? 230 : tgtNode.isCategoryNode ? 160 : 130);
  const tgtH = tgtNode.metadata?.h ?? tgtNode.h ?? (tgtNode.isCenterNode ? 110 : tgtNode.isCategoryNode ? 44 : 34);
  const tgtX = tgtNode.metadata?.x ?? tgtNode.x ?? 0;
  const tgtY = tgtNode.metadata?.y ?? tgtNode.y ?? 0;
  const tgtCx = tgtX + tgtW / 2;
  const tgtCy = tgtY + tgtH / 2;

  // Determine top-down hierarchy: higher Y is target child, lower Y is source parent
  let parentNode = srcNode;
  let childNode = tgtNode;
  let isFlipped = false;

  if (srcY > tgtY) {
    parentNode = tgtNode;
    childNode = srcNode;
    isFlipped = true;
  }

  const pW = parentNode.metadata?.w ?? parentNode.w ?? 160;
  const pH = parentNode.metadata?.h ?? parentNode.h ?? 44;
  const pX = parentNode.metadata?.x ?? parentNode.x ?? 0;
  const pY = parentNode.metadata?.y ?? parentNode.y ?? 0;
  const pCx = pX + pW / 2;

  const cW = childNode.metadata?.w ?? childNode.w ?? 130;
  const cH = childNode.metadata?.h ?? childNode.h ?? 34;
  const cX = childNode.metadata?.x ?? childNode.x ?? 0;
  const cY = childNode.metadata?.y ?? childNode.y ?? 0;
  const cCx = cX + cW / 2;

  // Exit from bottom border of parent node
  const parentAnchor = {
    x: Math.max(pX + 16, Math.min(pX + pW - 16, cCx)),
    y: pY + pH,
  };

  // Enter into top border of child node
  const childAnchor = {
    x: Math.max(cX + 16, Math.min(cX + cW - 16, pCx)),
    y: cY,
  };

  const dy = Math.abs(childAnchor.y - parentAnchor.y);
  const dx = childAnchor.x - parentAnchor.x;

  // Add gentle curvature offset so lines have a soft bracket curve
  const curveXOffset = Math.abs(dx) < 10 ? (cCx < 0 ? -25 : 25) : 0;

  const cp1 = { x: parentAnchor.x + curveXOffset, y: parentAnchor.y + dy * 0.5 };
  const cp2 = { x: childAnchor.x + curveXOffset, y: childAnchor.y - dy * 0.5 };

  const srcP = isFlipped ? childAnchor : parentAnchor;
  const tgtP = isFlipped ? parentAnchor : childAnchor;
  const control1 = isFlipped ? cp2 : cp1;
  const control2 = isFlipped ? cp1 : cp2;

  return {
    srcP,
    tgtP,
    pathD: `M ${srcP.x} ${srcP.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${tgtP.x} ${tgtP.y}`,
  };
}

// ─── Subtype / Kind Visual Identity Resolver ─────────────────────────────────
function getNodeVisualIdentity(node) {
  const nodeType = node?.nodeType || node?.kind;
  const kind = node?.kind;
  const subtype = node?.subtype;

  if (nodeType === "route" || kind === "route") {
    return {
      icon: GitBranch,
      color: "#0891B2",
      bg: "#E0F2FE",
      text: "#0E7490",
      badge: node?.metadata?.isIndex ? "Index" : node?.metadata?.isDynamic ? "Dynamic" : "Route",
    };
  }

  if (nodeType === "guard" || kind === "guard" || node?.metadata?.isProtected) {
    return {
      icon: Shield,
      color: "#D97706",
      bg: "#FEF3C7",
      text: "#B45309",
      badge: "Guard",
    };
  }

  if (nodeType === "page" || subtype === "page") {
    return {
      icon: Box,
      color: "#E11D48",
      bg: "#FFE4E6",
      text: "#BE123C",
      badge: "Page",
    };
  }

  if (nodeType === "reference" || node?.isReference) {
    return {
      icon: Radio,
      color: "#64748B",
      bg: "#F1F5F9",
      text: "#475569",
      badge: "Ref",
    };
  }

  if (kind === "database") return { icon: Database, color: "#059669", bg: "#DCFCE7", text: "#047857", badge: "DB" };
  if (kind === "model") return { icon: Layers, color: "#EA580C", bg: "#FFEDD5", text: "#C2410C", badge: "Model" };
  if (kind === "service") return { icon: Server, color: "#7C3AED", bg: "#F3E8FF", text: "#6D28D9", badge: "Service" };
  if (kind === "controller") return { icon: Cpu, color: "#7C3AED", bg: "#F3E8FF", text: "#6D28D9", badge: "Controller" };
  if (kind === "middleware") return { icon: Shield, color: "#D97706", bg: "#FEF3C7", text: "#B45309", badge: "Middleware" };
  if (kind === "api") return { icon: Radio, color: "#E11D48", bg: "#FFE4E6", text: "#BE123C", badge: "API" };
  if (kind === "hook" || kind === "state") return { icon: Key, color: "#D97706", bg: "#FEF3C7", text: "#B45309", badge: "Slice" };

  return {
    icon: Layers,
    color: "#6D28D9",
    bg: "#F3E8FF",
    text: "#5B21B6",
    badge: subtype || kind || "Component",
  };
}

// ─── Node Card Component ────────────────────────────────────────────────────
const DIRECTION_COLORS = {
  upstream: "#D97706",   // amber — "what ran before"
  downstream: "#0284C7", // blue — "what runs next"
};

function BlueprintNodeCard({ node, isSelected, isConnected, isDimmed, isExpanded, direction, onSelect, onToggleExpand, onHover, onHoverEnd }) {
  const visual = getNodeVisualIdentity(node);
  const IconComponent = visual.icon;

  const meta = node.metadata || {};
  const x = meta.x || 0;
  const y = meta.y || 0;
  const w = meta.w || 210;
  const h = meta.h || 82;

  const accentColor = visual.color;

  const handleCardClick = (e) => {
    e.stopPropagation();
    if (node.isReference && node.canonicalId) {
      onSelect(node.canonicalId);
    } else {
      onSelect(node.id);
    }
  };

  const footerTag = (visual.badge || node.subtype || node.kind || "COMPONENT").toUpperCase();

  const outerBg = isSelected ? "#7C3AED" : visual.bg;
  const footerTextColor = isSelected ? "#FFFFFF" : visual.text || accentColor;

  return (
    <motion.div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: outerBg,
        borderRadius: 22,
        border: "none",
        boxShadow: isSelected
          ? `0 12px 32px rgba(124, 58, 237, 0.35)`
          : `0 6px 20px rgba(15, 23, 42, 0.06)`,
        cursor: "pointer",
        opacity: isDimmed ? 0.25 : 1,
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        zIndex: isSelected ? 30 : isConnected ? 20 : 10,
        boxSizing: "border-box",
        padding: "4px 4px 0 4px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
      onClick={handleCardClick}
      onMouseEnter={() => onHover && onHover(node.id)}
      onMouseLeave={() => onHoverEnd && onHoverEnd()}
      whileHover={{ scale: isDimmed ? 1 : 1.03, y: isDimmed ? 0 : -3 }}
    >
      {/* Floating White Front Card — Pronounced 3D Shadow */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: 18,
        padding: "8px 11px",
        boxShadow: "0 10px 22px -3px rgba(15, 23, 42, 0.16), 0 3px 6px -1px rgba(15, 23, 42, 0.08)",
        border: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 6,
        height: 52,
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 9,
            background: visual.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <IconComponent size={14} color={accentColor} />
          </div>
          <span style={{
            fontSize: 12.5,
            fontWeight: 800,
            color: "#0F172A",
            fontFamily: INTER,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.015em",
          }}>
            {node.name}
          </span>
        </div>

        {node.hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleExpand) onToggleExpand(node.id);
            }}
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: isExpanded ? "#FFFFFF" : accentColor,
              background: isExpanded ? accentColor : visual.bg,
              border: "none",
              padding: "3px 8px",
              borderRadius: 9999,
              cursor: "pointer",
              fontFamily: MONO,
              lineHeight: 1,
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            title={isExpanded ? "Collapse branch" : `Expand ${node.childCount} children`}
          >
            {isExpanded ? "−" : `+${node.childCount}`}
          </button>
        )}
      </div>

      {/* Exposed Bottom Lip — Soft Colored Base */}
      <div style={{
        padding: "4px 12px 6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 8.5,
          fontWeight: 800,
          color: footerTextColor,
          fontFamily: MONO,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          opacity: 0.95,
        }}>
          {footerTag}
        </span>

        {node.annotation && (
          <span style={{
            fontSize: 8,
            fontWeight: 600,
            color: isSelected ? "#EDE9FE" : `${footerTextColor}CC`,
            fontFamily: MONO,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 100,
          }}>
            {node.annotation}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Classifies an edge into a semantic data-flow relationship according to RFC Addendum:
 * - READS / CONSUMES: Green dashed animation TOWARD focused node (#10B981)
 * - WRITES / MUTATES: Red dashed animation AWAY FROM focused node (#EF4444)
 * - READS_AND_WRITES: Dual independent animated edges in opposite directions (#8B5CF6)
 * - CALLS_API: Amber/Pink request-response flow (#F59E0B)
 * - STRUCTURAL: Neutral gray line for renders, imports, dependencies (#94A3B8)
 */
export function classifyEdgeSemantic(edge, srcNode, tgtNode) {
  if (!edge) return { category: "STRUCTURAL", color: "#94A3B8", markerId: "arrow-structural", animDirection: "forward", dashArray: "4 4", label: "structural" };

  const type = (edge.type || edge.edgeType || "").toUpperCase();
  const semantics = (edge.semantics || edge.dataFlow || "").toUpperCase();

  const srcKind = (srcNode?.kind || "").toLowerCase();
  const tgtKind = (tgtNode?.kind || "").toLowerCase();
  const srcSubtype = (srcNode?.subtype || "").toLowerCase();
  const tgtSubtype = (tgtNode?.subtype || "").toLowerCase();

  // 1. READS_AND_WRITES (Dual Bidirectional Edge)
  if (
    type === "READS_AND_WRITES" ||
    type === "BIDIRECTIONAL" ||
    semantics === "READS_AND_WRITES" ||
    semantics === "MUTUAL" ||
    edge.isBidirectional === true
  ) {
    return {
      category: "READS_AND_WRITES",
      color: "#8B5CF6",
      accentColor: "#7C3AED",
      markerId: "arrow-bidirectional",
      animDirection: "bidirectional",
      dashArray: "5 5",
      label: "reads & writes",
    };
  }

  // 2. READS / CONSUMES (Data flows from Provider/Hook/Store TOWARDS Component)
  if (
    type === "READS" ||
    type === "CONSUMES" ||
    type === "STATE_CONSUMER" ||
    type === "USES_HOOK" ||
    type === "USES_CONTEXT" ||
    type === "SUBSCRIBES_TO" ||
    type === "HOOK_CALLS_HOOK" ||
    semantics === "READS" ||
    semantics === "CONSUMES" ||
    (tgtKind === "component" && (srcKind === "hook" || srcKind === "state" || srcSubtype === "context" || srcSubtype === "slice" || srcSubtype === "provider"))
  ) {
    return {
      category: "READS",
      color: "#10B981",
      accentColor: "#059669",
      markerId: "arrow-read",
      animDirection: "forward",
      dashArray: "6 4",
      label: "reads state",
    };
  }

  // 3. WRITES / MUTATES (Data/Control flows from Component TOWARDS Store/Service)
  if (
    type === "WRITES" ||
    type === "MUTATES" ||
    type === "DISPATCHES_ACTION" ||
    type === "ASYNC_THUNK" ||
    type === "SET_STATE" ||
    semantics === "WRITES" ||
    semantics === "MUTATES" ||
    (srcKind === "component" && (tgtKind === "store" || tgtSubtype === "slice" || tgtKind === "controller"))
  ) {
    return {
      category: "WRITES",
      color: "#EF4444",
      accentColor: "#DC2626",
      markerId: "arrow-write",
      animDirection: "forward",
      dashArray: "6 4",
      label: "dispatches / writes",
    };
  }

  // 4. CALLS_API / REQUEST_RESPONSE
  if (
    type === "CALLS_API" ||
    type === "USES_API" ||
    type === "HTTP_REQUEST" ||
    srcKind === "api" ||
    tgtKind === "api"
  ) {
    return {
      category: "CALLS_API",
      color: "#F59E0B",
      accentColor: "#D97706",
      markerId: "arrow-api",
      animDirection: "forward",
      dashArray: "7 4",
      label: "api request",
    };
  }

  // 5. EDGE_STYLE_CFG Fallback for Specific Pipeline Edge Types
  const cfg = EDGE_STYLE_CFG[type];
  if (cfg) {
    return {
      category: type,
      color: cfg.color,
      accentColor: cfg.color,
      markerId: "arrow-structural",
      animDirection: "forward",
      dashArray: cfg.dash || "4 4",
      label: cfg.label || type.toLowerCase(),
    };
  }

  // 6. Generic STRUCTURAL Fallback
  return {
    category: "STRUCTURAL",
    color: "#94A3B8",
    accentColor: "#64748B",
    markerId: "arrow-structural",
    animDirection: "forward",
    dashArray: "4 4",
    label: "depends on",
  };
}

// ─── Main FlowDiagram Component ─────────────────────────────────────────────
const FlowDiagram = forwardRef((props, ref) => {
  const {
    architectureModel = [],
    knowledgeGraph = null,
    selectedId = "",
    onSelectNode,
    highlightedIds,
    onDrillDown,
  } = props;

  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]           = useState(0.70);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart]   = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());

  const containerRef = useRef(null);

  // Extract nodes and edges from Knowledge Graph or Fallback
  const rawNodes = useMemo(() => {
    if (knowledgeGraph && Array.isArray(knowledgeGraph.nodes)) {
      return knowledgeGraph.nodes;
    }
    return Array.isArray(architectureModel) ? architectureModel : [];
  }, [knowledgeGraph, architectureModel]);

  const rawEdges = useMemo(() => {
    if (knowledgeGraph && Array.isArray(knowledgeGraph.edges)) {
      return knowledgeGraph.edges;
    }
    return [];
  }, [knowledgeGraph]);

  // Build the Blueprint Graph (classification + source traceability) from raw Knowledge
  // Graph nodes/edges, then lay it out. See engines/graph/blueprintGraphBuilder.js —
  // Phase 2 of the Blueprint Flow refactor (TASK.md). As of Phase 2 this is still
  // node-for-node/edge-for-edge equivalent to the raw KG (filtering lands in Phase 3);
  // this call boundary is what makes that filtering a local change later, not a rewrite.
  const { blueprintNodes, blueprintEdges } = useMemo(() => {
    if (props.blueprintEdges) {
      return { blueprintNodes: props.layoutedNodes || [], blueprintEdges: props.blueprintEdges };
    }
    return buildBlueprintGraph(rawNodes, rawEdges);
  }, [rawNodes, rawEdges, props.layoutedNodes, props.blueprintEdges]);

  // Populate default expandedNodeIds when props.layoutedNodes changes
  useEffect(() => {
    if (Array.isArray(props.layoutedNodes) && props.layoutedNodes.length > 0) {
      const initial = new Set();
      props.layoutedNodes.forEach(n => {
        if (n.nodeType === "route" || n.nodeType === "guard" || n.nodeType === "page" || n.subtype === "router") {
          initial.add(n.id);
        }
      });
      setExpandedNodeIds(initial);
    }
  }, [props.layoutedNodes]);

  const { layoutedNodes, activeLanes } = useMemo(() => {
    const allNodes = Array.isArray(props.layoutedNodes) ? props.layoutedNodes : [];
    if (allNodes.length === 0) {
      return computeBlueprintLayout(blueprintNodes, blueprintEdges);
    }

    const isSitemap = allNodes.some(n => (Array.isArray(n.childIds) && n.childIds.length > 0) || Boolean(n.hasChildren));
    if (!isSitemap) {
      return {
        layoutedNodes: allNodes,
        activeLanes: props.activeLanes || LANE_CONFIG.filter((l) => allNodes.some((n) => n && n.laneId === l.id)),
      };
    }

    const parentMap = new Map();
    allNodes.forEach(n => {
      if (n.childIds && Array.isArray(n.childIds)) {
        n.childIds.forEach(cid => parentMap.set(cid, n.id));
      }
    });

    const filtered = allNodes.filter(node => {
      let currParentId = parentMap.get(node.id);
      while (currParentId) {
        if (!expandedNodeIds.has(currParentId)) return false;
        currParentId = parentMap.get(currParentId);
      }
      return true;
    });

    const { layoutedNodes: relayouted } = computeSitemapLayout({ nodes: filtered, edges: blueprintEdges });
    return {
      layoutedNodes: relayouted,
      activeLanes: props.activeLanes || LANE_CONFIG.filter((l) => relayouted.some((n) => n && n.laneId === l.id)),
    };
  }, [blueprintNodes, blueprintEdges, props.layoutedNodes, props.activeLanes, expandedNodeIds]);


  // Index layouted nodes by ID
  const layoutedNodeMap = useMemo(() => {
    return new Map(layoutedNodes.map(n => [n.id, n]));
  }, [layoutedNodes]);

  // Execution-Neighborhood Highlighting (Phase 8 of the Blueprint Flow v2 refactor — TASK.md)
  //
  // Replaces the Part 1 unbounded `getBidirectionalReachableNodes` call with a bounded,
  // directional `getExecutionNeighborhood`: selecting a node highlights only its immediate
  // predecessor(s) and successor(s) — "what ran before this, what runs next" — not everything
  // reachable from it. This is what keeps highlighting useful on large graphs (selecting a
  // near-root node no longer lights up most of the diagram).
  //
  // `direction` per node lets the card render upstream/downstream distinctly (see
  // BlueprintNodeCard); `connectedNodeIds` (the union, unchanged in shape from Part 1) still
  // drives edge highlighting and the dim/non-dim split exactly as before — only the *size* of
  // what feeds it changed, from "everything reachable" to "one hop each way" by default.
  const { upstreamIds, downstreamIds, connectedNodeIds } = useMemo(() => {
    const targetId = selectedId || hoveredNodeId;
    if (!targetId) {
      return { upstreamIds: new Set(), downstreamIds: new Set(), connectedNodeIds: new Set() };
    }
    // Empty allowedEdgeTypes = trust blueprintEdges as already curated; no further filtering —
    // same convention as Part 1's reachability call.
    const { upstream, downstream } = getExecutionNeighborhood(
      { nodes: blueprintNodes, edges: blueprintEdges },
      targetId,
      { upstreamHops: 1, downstreamHops: 1, allowedEdgeTypes: [] }
    );
    const union = new Set([targetId, ...upstream, ...downstream]);
    return { upstreamIds: upstream, downstreamIds: downstream, connectedNodeIds: union };
  }, [selectedId, hoveredNodeId, blueprintNodes, blueprintEdges]);

  // Bounding box calculation
  const bounds = useMemo(() => {
    if (layoutedNodes.length === 0) return { minX: -200, minY: -100, maxX: 1200, maxY: 800 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    layoutedNodes.forEach(n => {
      if (!n) return;
      const x = n.metadata?.x ?? n.x ?? n.position?.x ?? 0;
      const y = n.metadata?.y ?? n.y ?? n.position?.y ?? 0;
      const w = n.metadata?.w ?? n.w ?? 180;
      const h = n.metadata?.h ?? n.h ?? 60;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      return { minX: -200, minY: -100, maxX: 1200, maxY: 800 };
    }

    const pad = 120;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [layoutedNodes]);

  // Auto-center view on initial load
  useEffect(() => {
    if (layoutedNodes.length === 0) return;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setPan({ x: -cx + 400, y: -cy + 250 });
    setZoom(0.70);
  }, [rawNodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Pan Handlers
  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    setIsPanning(true);
    isDraggingRef.current = false;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
  }, [pan, zoom]);

  const onMouseMove = useCallback(e => {
    if (!isPanning) return;
    const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
    const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
    if (dx > 3 || dy > 3) {
      isDraggingRef.current = true;
    }
    setPan({ x: (e.clientX - panStart.x) / zoom, y: (e.clientY - panStart.y) / zoom });
  }, [isPanning, panStart, zoom]);

  const onMouseUp = useCallback(() => setIsPanning(false), []);

  const handleCanvasClick = useCallback((e) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    if (onSelectNode) onSelectNode("");
  }, [onSelectNode]);

  // Wheel Zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(z => Math.max(0.3, Math.min(2.2, z + delta)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Imperative Export
  useImperativeHandle(ref, () => ({
    exportModel(type) {
      console.log(`Exporting flow diagram as ${type}`);
    }
  }));

  const svgW = Math.max(bounds.maxX - bounds.minX, 1400);
  const svgH = Math.max(bounds.maxY - bounds.minY, 900);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        cursor: isPanning ? "grabbing" : "default",
        background: "#F8FAFC",
        userSelect: "none",
        width: "100%",
        height: "100%",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onClick={handleCanvasClick}
    >
      {/* ── Center-to-Outwards Radial Gradient Background ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        background: "radial-gradient(ellipse at 50% 50%, #EDE9FE 0%, #F5F3FF 35%, #FAFAFF 65%, #FFFFFF 100%)",
      }} />
      {/* Top Header Label & Semantic Flow Legend */}
      <div style={{
        position: "absolute", top: 16, left: 20, zIndex: 20,
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        padding: "6px 14px",
        borderRadius: 10,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 8px rgba(15,23,42,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <GitBranch size={15} color="#0EA5E9" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", fontFamily: INTER, letterSpacing: "-0.01em" }}>
              Architectural Blueprint Flow
            </div>
            <div style={{ fontSize: 9.5, color: "#64748B", fontFamily: INTER }}>
              {layoutedNodes.length} nodes across {activeLanes.length} semantic layers
            </div>
          </div>
        </div>

        {/* Semantic Data Flow Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 12, borderLeft: "1px solid #E2E8F0", fontSize: 10, fontWeight: 600, fontFamily: INTER }}>
          <div style={{ display: "flex", items: "center", gap: 4, color: "#059669" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#10B981" }} />
            <span>Reads</span>
          </div>
          <div style={{ display: "flex", items: "center", gap: 4, color: "#DC2626" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#EF4444" }} />
            <span>Writes</span>
          </div>
          <div style={{ display: "flex", items: "center", gap: 4, color: "#7C3AED" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#8B5CF6" }} />
            <span>Reads & Writes</span>
          </div>
          <div style={{ display: "flex", items: "center", gap: 4, color: "#D97706" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "#F59E0B" }} />
            <span>API Request</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div style={{
        position: "absolute", bottom: 20, right: 20, zIndex: 20,
        display: "flex", alignItems: "center", gap: 6,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 10, padding: 4,
        boxShadow: "0 4px 14px rgba(15,23,42,0.08)",
      }}>
        <button
          onClick={() => setZoom(z => Math.min(z + 0.15, 2.2))}
          style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ZoomIn size={14} color="#475569" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(z - 0.15, 0.3))}
          style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ZoomOut size={14} color="#475569" />
        </button>
        <button
          onClick={() => { setZoom(0.85); setPan({ x: -400, y: -200 }); }}
          style={{ width: 28, height: 28, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Maximize2 size={14} color="#475569" />
        </button>
      </div>

      {/* Transform Canvas */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transformOrigin: "0 0",
        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        transition: isPanning ? "none" : "transform 0.12s ease-out",
      }}>
        {/* SVG Bezier Connection Edges with Dynamic Semantic Directions */}
        <svg
          style={{
            position: "absolute",
            left: 0, top: 0,
            width: svgW * 2, height: svgH * 2,
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 8,
          }}
        >
          <defs>
            <style>{`
              @keyframes flowLineLeftToRight {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
              }
              @keyframes flowLineRightToLeft {
                from { stroke-dashoffset: 0; }
                to { stroke-dashoffset: 24; }
              }
            `}</style>

            <marker id="arrow-read" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10B981" />
            </marker>
            <marker id="arrow-write" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#EF4444" />
            </marker>
            <marker id="arrow-bidirectional" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#8B5CF6" />
            </marker>
            <marker id="arrow-api" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#F59E0B" />
            </marker>
            <marker id="arrow-structural" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94A3B8" />
            </marker>
          </defs>

          {blueprintEdges.map((edge, idx) => {
            const srcNode = layoutedNodeMap.get(edge.source);
            const tgtNode = layoutedNodeMap.get(edge.target);

            if (!srcNode || !tgtNode) return null;

            const semantic = classifyEdgeSemantic(edge, srcNode, tgtNode);

            const srcW = srcNode.metadata?.w ?? srcNode.w ?? (srcNode.isCenterNode ? 230 : srcNode.isCategoryNode ? 160 : 130);
            const srcH = srcNode.metadata?.h ?? srcNode.h ?? (srcNode.isCenterNode ? 110 : srcNode.isCategoryNode ? 44 : 34);
            const srcNodeX = srcNode.metadata?.x ?? srcNode.x ?? 0;
            const srcNodeY = srcNode.metadata?.y ?? srcNode.y ?? 0;
            const srcCx = srcNodeX + srcW / 2;
            const srcCy = srcNodeY + srcH / 2;

            const tgtW = tgtNode.metadata?.w ?? tgtNode.w ?? (tgtNode.isCenterNode ? 230 : tgtNode.isCategoryNode ? 160 : 130);
            const tgtH = tgtNode.metadata?.h ?? tgtNode.h ?? (tgtNode.isCenterNode ? 110 : tgtNode.isCategoryNode ? 44 : 34);
            const tgtNodeX = tgtNode.metadata?.x ?? tgtNode.x ?? 0;
            const tgtNodeY = tgtNode.metadata?.y ?? tgtNode.y ?? 0;
            const tgtCx = tgtNodeX + tgtW / 2;
            const tgtCy = tgtNodeY + tgtH / 2;

            const isRadial = Boolean(
              props.queryMeta?.graphType === "composed-architecture" ||
              props.queryMeta?.composerName === "composed-architecture" ||
              srcNode.isCenterNode || srcNode.isCategoryNode || srcNode.isChildNode ||
              tgtNode.isCenterNode || tgtNode.isCategoryNode || tgtNode.isChildNode
            );

            let srcX, srcY, tgtX, tgtY, pathD;

            if (isRadial) {
              const radialPathInfo = getRadialSPath(srcNode, tgtNode);
              srcX = radialPathInfo.srcP.x;
              srcY = radialPathInfo.srcP.y;
              tgtX = radialPathInfo.tgtP.x;
              tgtY = radialPathInfo.tgtP.y;
              pathD = radialPathInfo.pathD;
            } else {
              srcX = srcNodeX + srcW;
              srcY = srcNodeY + srcH / 2;
              tgtX = tgtNodeX;
              tgtY = tgtNodeY + tgtH / 2;

              const dx = Math.max(45, Math.abs(tgtX - srcX) * 0.45);
              pathD = `M ${srcX} ${srcY} C ${srcX + dx} ${srcY}, ${tgtX - dx} ${tgtY}, ${tgtX} ${tgtY}`;
            }

            const isTargeted = connectedNodeIds.size > 0 && connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
            const isDimmed = connectedNodeIds.size > 0 && !isTargeted;

            const lineColor = edge.color || (isTargeted
              ? (semantic.category === "READS" ? "#059669" : semantic.category === "WRITES" ? "#DC2626" : "#7C3AED")
              : semantic.color);
            const lineOpacity = isDimmed ? 0.1 : isTargeted ? 1 : 0.85;

            // Dual Bidirectional Edges: Render two independent animated paths
            if (semantic.animDirection === "bidirectional") {
              const pathForward = pathD;
              const pathBackward = pathD;

              return (
                <g key={edge.id || `${edge.source}-${edge.target}-${idx}`}>
                  <path d={pathForward} fill="none" stroke={lineColor} strokeWidth={2} strokeOpacity={lineOpacity * 0.25} />
                  <path
                    d={pathForward}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={isTargeted ? 2.5 : 1.75}
                    strokeOpacity={lineOpacity}
                    strokeDasharray={semantic.dashArray}
                    markerEnd={`url(#${semantic.markerId})`}
                    style={{ animation: isDimmed ? "none" : "flowLineLeftToRight 1.2s linear infinite" }}
                  />
                  <circle cx={srcX} cy={srcY} r="3" fill={lineColor} stroke="#FFFFFF" strokeWidth="1" />
                  <circle cx={tgtX} cy={tgtY} r="3" fill={lineColor} stroke="#FFFFFF" strokeWidth="1" />
                </g>
              );
            }

            return (
              <g key={edge.id || `${edge.source}-${edge.target}-${idx}`}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isTargeted ? 3 : 2}
                  strokeOpacity={lineOpacity * 0.2}
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isTargeted ? 2.5 : 1.75}
                  strokeOpacity={lineOpacity}
                  strokeDasharray={semantic.dashArray}
                  markerEnd={`url(#${semantic.markerId})`}
                  style={{
                    animation: isDimmed
                      ? "none"
                      : semantic.animDirection === "reverse"
                      ? "flowLineRightToLeft 1.2s linear infinite"
                      : "flowLineLeftToRight 1.2s linear infinite",
                  }}
                />
                {isRadial && (
                  <>
                    <circle cx={srcX} cy={srcY} r="3.5" fill={lineColor} stroke="#FFFFFF" strokeWidth="1.5" />
                    <circle cx={tgtX} cy={tgtY} r="3.5" fill={lineColor} stroke="#FFFFFF" strokeWidth="1.5" />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Node Cards */}
        <AnimatePresence>
          {layoutedNodes.map(node => {
            if (node.isCenterNode || node.isCategoryNode || node.isChildNode) {
              const isSelected = selectedId === node.id || selectedId === node.canonicalId;
              const x = node.metadata?.x ?? node.x ?? 0;
              const y = node.metadata?.y ?? node.y ?? 0;
              return (
                <div
                  key={node.id}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    left: x,
                    top: y,
                    zIndex: node.isCenterNode ? 35 : node.isCategoryNode ? 25 : 15,
                  }}
                >
                  <ComposedArchitectureCard
                    node={node}
                    isSelected={isSelected}
                    onSelect={(n) => {
                      const targetId = n?.canonicalId || n?.name || node.canonicalId || node.name || n?.id || node.id;
                      const targetLine = n?.line || node.line || n?.metadata?.line || node.metadata?.line || null;
                      if (onSelectNode) onSelectNode(targetId, targetLine);
                    }}
                    onToggleExpand={(catId) => {
                      if (props.onToggleCategoryExpand) {
                        props.onToggleCategoryExpand(catId);
                      }
                    }}
                    onDrillDown={(n) => {
                      if (onDrillDown) onDrillDown(n);
                    }}
                  />
                </div>
              );
            }

            const isSelected = selectedId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isDimmed = connectedNodeIds.size > 0 && !isConnected;
            // Precedence when a node is (rarely) reachable both ways within one hop, e.g. via a
            // cycle: label it "upstream" — an arbitrary but documented tie-break, not a claim
            // that the relationship is exclusively backward.
            const direction = upstreamIds.has(node.id) ? "upstream" : downstreamIds.has(node.id) ? "downstream" : null;

            const isExpanded = expandedNodeIds.has(node.id);

            return (
              <BlueprintNodeCard
                key={node.id}
                node={node}
                isSelected={isSelected}
                isConnected={isConnected}
                isDimmed={isDimmed}
                isExpanded={isExpanded}
                direction={direction}
                onSelect={(id) => onSelectNode && onSelectNode(id)}
                onToggleExpand={(id) => {
                  setExpandedNodeIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onHover={(id) => setHoveredNodeId(id)}
                onHoverEnd={() => setHoveredNodeId("")}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default FlowDiagram;