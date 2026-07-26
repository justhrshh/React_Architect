import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn, ZoomOut, Maximize2, GitBranch,
  FileCode, Layers, Box, Cpu, Radio, Shield, Server, Database, Key
} from "lucide-react";
import { INTER, MONO } from "./constants";
import { computeBlueprintLayout } from "@/engines/layout/blueprintLayoutEngine";
import { getExecutionNeighborhood } from "@/engines/graph/graphTraversal";
import { LANE_CONFIG } from "@/engines/graph/blueprintLaneConfig";

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

// ─── Subtype / Kind Icon Resolver ───────────────────────────────────────────
function getNodeIcon(node) {
  const kind = node?.kind;
  const subtype = node?.subtype;

  if (kind === "database") return Database;
  if (kind === "model") return Layers;
  if (kind === "service") return Server;
  if (kind === "controller") return Cpu;
  if (kind === "middleware") return Shield;
  if (kind === "api") return Radio;
  if (kind === "hook") return Key;
  if (kind === "route" || subtype === "router") return GitBranch;
  if (subtype === "page") return Box;
  if (kind === "component") return Layers;
  return FileCode;
}

// ─── Node Card Component ────────────────────────────────────────────────────
// Colors for execution-neighborhood direction (Phase 8) — deliberately distinct from the lane
// palette in blueprintLaneConfig.js, so "this is upstream/downstream of your selection" reads as
// its own signal, not a lane color. Kept to a small badge + ring tint rather than restyling the
// whole card, per the v2 design brief's "don't redesign the visual language" constraint.
const DIRECTION_COLORS = {
  upstream: "#D97706",   // amber — "what ran before"
  downstream: "#0284C7", // blue — "what runs next"
};

function BlueprintNodeCard({ node, isSelected, isConnected, isDimmed, direction, onSelect, onHover, onHoverEnd }) {
  const IconComponent = getNodeIcon(node);
  const laneCfg = LANE_CONFIG.find(l => l.id === node.laneId) || LANE_CONFIG[3];

  const meta = node.metadata || {};
  const x = meta.x || 0;
  const y = meta.y || 0;
  const w = meta.w || 220;
  const h = meta.h || 74;

  const accentColor = laneCfg.color;
  const directionColor = direction ? DIRECTION_COLORS[direction] : null;
  // Direction tint takes precedence over the plain lane-accent "connected" ring so the
  // before/next distinction reads clearly; the selected node itself has no direction (it's
  // neither upstream nor downstream of itself) and keeps its existing lane-accent treatment.
  const ringColor = directionColor || accentColor;

  const shadow = isSelected
    ? `0 0 0 2.5px ${accentColor}40, 0 10px 24px rgba(15,23,42,0.12)`
    : isConnected
    ? `0 0 0 1.5px ${ringColor}45, 0 4px 12px rgba(15,23,42,0.06)`
    : "0 1px 3px rgba(15,23,42,0.05), 0 4px 12px rgba(15,23,42,0.03)";

  const border = isSelected
    ? `1px solid ${accentColor}`
    : isConnected
    ? `1px solid ${ringColor}70`
    : "1px solid #E2E8F0";

  return (
    <motion.div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: "#FFFFFF",
        borderRadius: 12,
        border,
        borderLeft: `4px solid ${accentColor}`,
        boxShadow: shadow,
        cursor: "pointer",
        opacity: isDimmed ? 0.2 : 1,
        transition: "opacity 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease",
        zIndex: isSelected ? 30 : isConnected ? 20 : 10,
        boxSizing: "border-box",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
      onMouseEnter={() => onHover && onHover(node.id)}
      onMouseLeave={() => onHoverEnd && onHoverEnd()}
      whileHover={{ scale: isDimmed ? 1 : 1.02, y: isDimmed ? 0 : -2 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, overflow: "hidden" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: laneCfg.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <IconComponent size={12} color={accentColor} />
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#0F172A",
            fontFamily: INTER,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "-0.01em",
          }}>
            {node.name}
          </span>
        </div>

        <span style={{
          fontSize: 8.5,
          fontWeight: 800,
          color: accentColor,
          background: laneCfg.bg,
          padding: "2px 6px",
          borderRadius: 4,
          fontFamily: MONO,
          textTransform: "uppercase",
          flexShrink: 0,
        }}>
          {node.subtype || node.kind}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{
          fontSize: 9.5,
          color: "#64748B",
          fontFamily: MONO,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 140,
        }}>
          {node.annotation || (node.file ? node.file.split("/").pop() : "")}
        </span>

        {meta.loc && (
          <span style={{ fontSize: 9, color: "#94A3B8", fontFamily: MONO }}>
            {meta.loc} loc
          </span>
        )}
      </div>


      {direction && !isDimmed && (
        <span style={{
          position: "absolute",
          top: -9,
          right: 10,
          fontSize: 8,
          fontWeight: 800,
          color: "#FFFFFF",
          background: directionColor,
          padding: "2px 7px",
          borderRadius: 999,
          fontFamily: MONO,
          textTransform: "uppercase",
          letterSpacing: "0.03em",
          boxShadow: "0 1px 3px rgba(15,23,42,0.25)",
        }}>
          {direction === "upstream" ? "← before" : "next →"}
        </span>
      )}
    </motion.div>
  );
}

// ─── Main FlowDiagram Component ─────────────────────────────────────────────
const FlowDiagram = forwardRef((props, ref) => {
  const {
    architectureModel = [],
    knowledgeGraph = null,
    selectedId = "",
    onSelectNode,
    highlightedIds,
  } = props;

  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]           = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart]   = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState("");

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

  const { layoutedNodes, activeLanes } = useMemo(() => {
    if (Array.isArray(props.layoutedNodes)) {
      return {
        layoutedNodes: props.layoutedNodes,
        activeLanes: props.activeLanes || LANE_CONFIG.filter((l) => props.layoutedNodes.some((n) => n && n.laneId === l.id)),
      };
    }
    return computeBlueprintLayout(blueprintNodes, blueprintEdges);
  }, [blueprintNodes, blueprintEdges, props.layoutedNodes, props.activeLanes]);



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
      const x = n.metadata.x;
      const y = n.metadata.y;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + n.metadata.w > maxX) maxX = x + n.metadata.w;
      if (y + n.metadata.h > maxY) maxY = y + n.metadata.h;
    });

    const pad = 120;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [layoutedNodes]);

  // Auto-center view on initial load
  useEffect(() => {
    if (layoutedNodes.length === 0) return;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setPan({ x: -cx + 400, y: -cy + 250 });
    setZoom(0.85);
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
      {/* Top Header Label */}
      <div style={{
        position: "absolute", top: 16, left: 20, zIndex: 20,
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        padding: "6px 14px",
        borderRadius: 10,
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 8px rgba(15,23,42,0.05)",
      }}>
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
        {/* Semantic Lane Column Banners */}
        {activeLanes.map(lane => (
          <div
            key={lane.id}
            style={{
              position: "absolute",
              left: lane.x,
              top: bounds.minY - 20,
              width: lane.width,
              padding: "8px 12px",
              background: lane.bg,
              border: `1px solid ${lane.color}30`,
              borderTop: `3px solid ${lane.color}`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 5,
              boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: lane.color, fontFamily: INTER, letterSpacing: "-0.01em" }}>
              {lane.label}
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: lane.color, background: "#FFFFFF", padding: "1px 6px", borderRadius: 10, fontFamily: MONO }}>
              {lane.nodeCount}
            </span>
          </div>
        ))}

        {/* SVG Bezier Connection Edges */}
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
          {blueprintEdges.map((edge, idx) => {
            const srcNode = layoutedNodeMap.get(edge.source);
            const tgtNode = layoutedNodeMap.get(edge.target);

            if (!srcNode || !tgtNode) return null;

            const srcX = srcNode.metadata.x + srcNode.metadata.w;
            const srcY = srcNode.metadata.y + srcNode.metadata.h / 2;
            const tgtX = tgtNode.metadata.x;
            const tgtY = tgtNode.metadata.y + tgtNode.metadata.h / 2;

            const dx = Math.max(45, Math.abs(tgtX - srcX) * 0.45);
            const pathD = `M ${srcX} ${srcY} C ${srcX + dx} ${srcY}, ${tgtX - dx} ${tgtY}, ${tgtX} ${tgtY}`;

            const style = getEdgeStyle(edge.type);
            const isTargeted = connectedNodeIds.size > 0 && connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target);
            const isDimmed = connectedNodeIds.size > 0 && !isTargeted;

            return (
              <g key={edge.id || `${edge.source}-${edge.target}-${idx}`}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={isTargeted ? style.color : style.color}
                  strokeWidth={isTargeted ? style.width + 1 : style.width}
                  strokeOpacity={isDimmed ? 0.1 : isTargeted ? 1 : 0.6}
                  strokeDasharray={style.dash}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4 }}
                />
              </g>
            );
          })}
        </svg>

        {/* Node Cards */}
        <AnimatePresence>
          {layoutedNodes.map(node => {
            const isSelected = selectedId === node.id;
            const isConnected = connectedNodeIds.has(node.id);
            const isDimmed = connectedNodeIds.size > 0 && !isConnected;
            // Precedence when a node is (rarely) reachable both ways within one hop, e.g. via a
            // cycle: label it "upstream" — an arbitrary but documented tie-break, not a claim
            // that the relationship is exclusively backward.
            const direction = upstreamIds.has(node.id) ? "upstream" : downstreamIds.has(node.id) ? "downstream" : null;

            return (
              <BlueprintNodeCard
                key={node.id}
                node={node}
                isSelected={isSelected}
                isConnected={isConnected}
                isDimmed={isDimmed}
                direction={direction}
                onSelect={(id) => onSelectNode && onSelectNode(id)}
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