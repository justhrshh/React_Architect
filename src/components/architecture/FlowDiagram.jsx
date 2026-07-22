import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, GitBranch } from "lucide-react";
import { INTER, MONO } from "./constants";

// ─── helpers ────────────────────────────────────────────────────────────────
function findParentIds(nodesList, targetId, path = []) {
  for (const n of nodesList) {
    if (n.id === targetId) return path;
    if (n.children?.length) {
      const r = findParentIds(n.children, targetId, [...path, n.id]);
      if (r) return r;
    }
  }
  return null;
}

// ─── type config ─────────────────────────────────────────────────────────────
const TYPE_CFG = {
  router:    { color: "#06B6D4", label: "Route",     abbr: "RO" },
  endpoint:  { color: "#06B6D4", label: "Route",     abbr: "RO" },
  page:      { color: "#EC4899", label: "Page",      abbr: "PG" },
  layout:    { color: "#8B5CF6", label: "Layout",    abbr: "LY" },
  component: { color: "#6366F1", label: "Component", abbr: "CP" },
  provider:  { color: "#F59E0B", label: "Provider",  abbr: "PR" },
  context:   { color: "#EC4899", label: "Context",   abbr: "CX" },
  slice:     { color: "#F97316", label: "Slice",     abbr: "SL" },
  gateway:   { color: "#F97316", label: "Service",   abbr: "SV" },
  hook:      { color: "#8B5CF6", label: "Hook",      abbr: "HK" },
  category:  { color: "#94A3B8", label: "",          abbr: "—"  },
};
function getCfg(node) {
  return TYPE_CFG[node.subtype] || TYPE_CFG[node.kind] || TYPE_CFG.component;
}

// ─── layout constants ────────────────────────────────────────────────────────
const NODE_W   = 168;
const NODE_H   = 64;
const COL_GAP  = 56;   // horizontal gap between depth levels
const ROW_GAP  = 12;   // vertical gap between siblings
const CAT_H    = 22;

// ─── horizontal tree layout engine ──────────────────────────────────────────
function computeLayout(roots, expanded) {
  const nodes = [];
  const edges = [];
  let uid = 0;

  function subtreeHeight(node, depth) {
    const isExp = expanded[node.id];
    const kids  = isExp && node.children?.length ? node.children : [];
    if (!kids.length) return node.kind === "category" ? CAT_H : NODE_H;
    const childHeights = kids.map(c => subtreeHeight(c, depth + 1));
    const total = childHeights.reduce((a, b) => a + b, 0) + Math.max(0, kids.length - 1) * ROW_GAP;
    return Math.max(node.kind === "category" ? CAT_H : NODE_H, total);
  }

  function place(node, x, cy, depth, parentId) {
    const id    = uid++;
    const h     = node.kind === "category" ? CAT_H : NODE_H;
    const y     = cy - h / 2;

    nodes.push({ uid: id, id: node.id, x, y, w: NODE_W, h, node, cfg: getCfg(node) });

    if (parentId !== null) {
      const par = nodes.find(n => n.uid === parentId);
      if (par) edges.push({ from: par, to: { x, y, w: NODE_W, h }, fromId: par.id, toId: node.id, cfg: getCfg(node) });
    }

    const isExp = expanded[node.id];
    const kids  = isExp && node.children?.length ? node.children : [];
    if (!kids.length) return;

    const childX = x + NODE_W + COL_GAP;
    const heights = kids.map(c => subtreeHeight(c, depth + 1));
    const total   = heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * ROW_GAP;
    let startY    = cy - total / 2;

    kids.forEach((child, i) => {
      const ch   = heights[i];
      place(child, childX, startY + ch / 2, depth + 1, id);
      startY += ch + ROW_GAP;
    });
  }

  // layout roots side by side vertically
  const rootHeights = roots.map(r => subtreeHeight(r, 0));
  const total = rootHeights.reduce((a, b) => a + b, 0) + (roots.length - 1) * ROW_GAP;
  let cy = -total / 2;
  roots.forEach((r, i) => {
    const h = rootHeights[i];
    place(r, 0, cy + h / 2, 0, null);
    cy += h + ROW_GAP;
  });

  return { nodes, edges };
}

// ─── filter ──────────────────────────────────────────────────────────────────
function filterNodes(nodes) {
  if (!nodes) return [];
  return nodes
    .map(n => ({ ...n, children: filterNodes(n.children) }))
    .filter(n => n.kind !== "state" && n.kind !== "api");
}

// ─── Node Card ───────────────────────────────────────────────────────────────
function NodeCard({ n, isSelected, isHighlighted, onSelect, onToggle, isExpanded, hasChildren }) {
  const { node, cfg } = n;
  const isCategory = node.kind === "category";

  if (isCategory) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={e => { e.stopPropagation(); onToggle(node.id); }}
        style={{
          position: "absolute", left: n.x, top: n.y,
          width: n.w, height: n.h,
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
        <span style={{ fontFamily: INTER, fontSize: 9, fontWeight: 700, letterSpacing: "1.6px", textTransform: "uppercase", color: "#94A3B8", whiteSpace: "nowrap" }}>
          {node.name}
        </span>
        <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
      </motion.div>
    );
  }

  const displayName = node.kind === "route" && node.subtype === "endpoint" ? (node.name || "/") : node.name;
  const fileName    = node.file ? node.file.split("/").pop() : null;
  const loc         = node.metadata?.loc;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      whileHover={{ y: -1, boxShadow: `0 4px 20px rgba(0,0,0,0.12), 0 0 0 1.5px ${cfg.color}` }}
      transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
      onClick={e => { e.stopPropagation(); onSelect(node.id); }}
      style={{
        position: "absolute",
        left: n.x, top: n.y,
        width: n.w, height: n.h,
        background: "#FFFFFF",
        borderRadius: 10,
        border: isSelected
          ? `1.5px dashed ${cfg.color}`
          : isHighlighted
          ? `1.5px solid ${cfg.color}88`
          : "1px solid #E8EDF5",
        boxShadow: isSelected
          ? `0 0 0 3px ${cfg.color}18, 0 4px 16px rgba(0,0,0,0.08)`
          : "0 1px 4px rgba(15,23,42,0.06)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px 0 10px",
        userSelect: "none",
        boxSizing: "border-box",
        overflow: "hidden",
        transition: "border 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Colored icon box */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: cfg.color + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9, fontFamily: INTER, fontWeight: 800,
          color: cfg.color, letterSpacing: "0.3px", textTransform: "uppercase",
        }}>
          {cfg.abbr}
        </span>
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <span style={{
            fontFamily: INTER, fontSize: 12, fontWeight: 700,
            color: "#0F172A",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1,
          }}>
            {displayName}
          </span>
          {hasChildren && (
            <div
              onClick={e => { e.stopPropagation(); onToggle(node.id); }}
              style={{
                width: 16, height: 16, borderRadius: 4,
                background: isExpanded ? cfg.color + "18" : "#F1F5F9",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path
                  d={isExpanded ? "M1 3 L4 6 L7 3" : "M3 1 L6 4 L3 7"}
                  stroke={isExpanded ? cfg.color : "#94A3B8"}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Type label row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
          <span style={{
            fontFamily: INTER, fontSize: 8.5, fontWeight: 700,
            color: cfg.color, letterSpacing: "0.5px", textTransform: "uppercase",
          }}>
            {cfg.label}
          </span>
          {loc !== undefined && (
            <span style={{ fontFamily: MONO, fontSize: 8.5, color: "#94A3B8", fontWeight: 500 }}>
              {loc}
            </span>
          )}
        </div>

        {/* File path */}
        {fileName && (
          <span style={{
            fontFamily: MONO, fontSize: 8.5, color: "#CBD5E1",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            display: "block", marginTop: 1,
          }}>
            {fileName}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main FlowDiagram ────────────────────────────────────────────────────────
const FlowDiagram = forwardRef(({ architectureModel, selectedId, onSelectNode, highlightedIds }, ref) => {
  const [expanded, setExpanded]   = useState({});
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const [zoom, setZoom]           = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart]   = useState({ x: 0, y: 0 });
  const containerRef              = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 600 });

  const rootKey = useMemo(() => architectureModel.map(r => r.id).join(","), [architectureModel]);
  const model   = useMemo(() => filterNodes(architectureModel), [architectureModel]);

  // Auto-expand first 2 levels
  useEffect(() => {
    if (model.length === 0) return;
    const init = {};
    model.forEach(r => {
      init[r.id] = true;
      r.children?.forEach(c => { init[c.id] = true; });
    });
    setTimeout(() => setExpanded(init), 0);
  }, [rootKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-expand parents when selection changes
  useEffect(() => {
    if (!selectedId) return;
    const parents = findParentIds(architectureModel, selectedId);
    if (parents?.length) {
      setExpanded(prev => {
        const next = { ...prev };
        parents.forEach(id => { next[id] = true; });
        return next;
      });
    }
  }, [selectedId, architectureModel]);

  const toggle = useCallback(id => setExpanded(prev => ({ ...prev, [id]: !prev[id] })), []);

  const { nodes, edges } = useMemo(() => computeLayout(model, expanded), [model, expanded]);

  // Bounding box
  const bounds = useMemo(() => {
    if (!nodes.length) return { minX: -400, minY: -300, maxX: 400, maxY: 300 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + n.w > maxX) maxX = n.x + n.w;
      if (n.y + n.h > maxY) maxY = n.y + n.h;
    });
    const pad = 80;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [nodes]);

  // Auto-center on load
  useEffect(() => {
    if (!nodes.length) return;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    setTimeout(() => { setPan({ x: -cx, y: -cy }); setZoom(1); }, 0);
  }, [rootKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Pan handlers
  const onMouseDown = useCallback(e => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
  }, [pan, zoom]);

  const onMouseMove = useCallback(e => {
    if (!isPanning) return;
    setPan({ x: (e.clientX - panStart.x) / zoom, y: (e.clientY - panStart.y) / zoom });
  }, [isPanning, panStart, zoom]);

  const onMouseUp = useCallback(() => setIsPanning(false), []);

  // Scroll-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(z => Math.max(0.2, Math.min(2.5, z + delta)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Minimap params
  const mmW = 144, mmH = 90;
  const minimapParams = useMemo(() => {
    const pad = 20;
    const minX = bounds.minX - pad, minY = bounds.minY - pad;
    const w = bounds.maxX - bounds.minX + pad * 2;
    const h = bounds.maxY - bounds.minY + pad * 2;
    const scale = Math.min(mmW / w, mmH / h);
    return { minX, minY, scale };
  }, [bounds]);

  // Export
  useImperativeHandle(ref, () => ({
    exportModel(type) {
      const w = bounds.maxX - bounds.minX;
      const h = bounds.maxY - bounds.minY;
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${w} ${h}" width="${w}" height="${h}">`;
      svg += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${w}" height="${h}" fill="#F8FAFC"/>`;
      edges.forEach(e => {
        const x1 = e.from.x + e.from.w;
        const y1 = e.from.y + e.from.h / 2;
        const x2 = e.to.x;
        const y2 = e.to.y + e.to.h / 2;
        const mx = (x1 + x2) / 2;
        svg += `<path d="M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}" fill="none" stroke="#CBD5E1" stroke-width="1"/>`;
      });
      nodes.forEach(n => {
        if (n.node.kind === "category") return;
        const c = n.cfg.color;
        svg += `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10" fill="#FFFFFF" stroke="#E8EDF5" stroke-width="1"/>`;
        svg += `<rect x="${n.x + 10}" y="${n.y + 16}" width="32" height="32" rx="8" fill="${c}18"/>`;
        svg += `<text x="${n.x + 26}" y="${n.y + 37}" font-family="sans-serif" font-size="9" font-weight="800" fill="${c}" text-anchor="middle">${n.cfg.abbr}</text>`;
        svg += `<text x="${n.x + 52}" y="${n.y + 28}" font-family="sans-serif" font-size="12" font-weight="700" fill="#0F172A">${n.node.name}</text>`;
        svg += `<text x="${n.x + 52}" y="${n.y + 42}" font-family="sans-serif" font-size="8.5" font-weight="700" fill="${c}">${n.cfg.label.toUpperCase()}</text>`;
      });
      svg += `</svg>`;
      if (type === "SVG") {
        const a = document.createElement("a");
        a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        a.download = "architecture_flow.svg";
        document.body.appendChild(a); a.click(); a.remove();
      }
    }
  }));

  if (!architectureModel.length) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94A3B8", fontSize: 13, fontFamily: INTER }}>
        No architecture model to visualize.
      </div>
    );
  }

  const svgW = bounds.maxX - bounds.minX;
  const svgH = bounds.maxY - bounds.minY;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1, position: "relative", overflow: "hidden",
        cursor: isPanning ? "grabbing" : "default",
        background: "#F8FAFC",
        userSelect: "none",
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Transform canvas ── */}
      <div style={{
        position: "absolute",
        left: "50%", top: "50%",
        transformOrigin: "0 0",
        transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        transition: isPanning ? "none" : "transform 0.12s ease-out",
      }}>
        {/* SVG edges */}
        <svg
          style={{
            position: "absolute",
            left: bounds.minX, top: bounds.minY,
            width: svgW, height: svgH,
            pointerEvents: "none", overflow: "visible",
          }}
        >
          {edges.map((e, i) => {
            const x1 = e.from.x + e.from.w - bounds.minX;
            const y1 = e.from.y + e.from.h / 2 - bounds.minY;
            const x2 = e.to.x - bounds.minX;
            const y2 = e.to.y + e.to.h / 2 - bounds.minY;
            const mx = (x1 + x2) / 2;
            const isHigh = selectedId && (e.fromId === selectedId || e.toId === selectedId);
            return (
              <motion.path
                key={i}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={isHigh ? e.cfg.color : "#CBD5E1"}
                strokeWidth={isHigh ? 1.5 : 1}
                strokeOpacity={isHigh ? 0.9 : 0.7}
                strokeDasharray={isHigh ? "5,3" : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isHigh
                  ? { pathLength: 1, opacity: 0.9, strokeDashoffset: [0, -16] }
                  : { pathLength: 1, opacity: 0.7 }}
                transition={isHigh
                  ? { pathLength: { duration: 0.3 }, strokeDashoffset: { repeat: Infinity, duration: 1, ease: "linear" } }
                  : { duration: 0.35, delay: i * 0.01 }}
              />
            );
          })}
        </svg>

        {/* Node cards */}
        <AnimatePresence>
          {nodes.map(n => (
            <NodeCard
              key={n.uid}
              n={n}
              isSelected={selectedId === n.id}
              isHighlighted={!!highlightedIds?.has(n.id)}
              onSelect={onSelectNode}
              onToggle={toggle}
              isExpanded={!!expanded[n.id]}
              hasChildren={!!n.node.children?.length}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Legend — top right ── */}
      <div style={{
        position: "absolute", top: 16, right: 20,
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(8px)",
        border: "1px solid #E8EDF5",
        borderRadius: 10, padding: "6px 14px",
        zIndex: 20, boxShadow: "0 1px 8px rgba(15,23,42,0.06)",
      }}>
        {[
          { label: "Component", color: "#6366F1" },
          { label: "Hook",      color: "#8B5CF6" },
          { label: "Service",   color: "#F97316" },
          { label: "Page",      color: "#EC4899" },
          { label: "Route",     color: "#06B6D4" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10.5, color: "#64748B", fontFamily: INTER, fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* ── FLOW label — top left ── */}
      <div style={{ position: "absolute", top: 16, left: 20, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <GitBranch size={13} color="#94A3B8" />
          <span style={{ fontFamily: INTER, fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.04em" }}>
            Dependency graph
          </span>
        </div>
      </div>

      {/* ── Zoom controls — bottom left ── */}
      <div style={{
        position: "absolute", bottom: 20, left: 20,
        display: "flex", flexDirection: "column",
        background: "#FFFFFF",
        border: "1px solid #E8EDF5",
        borderRadius: 8,
        boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
        overflow: "hidden", zIndex: 20,
      }}>
        {[
          { icon: <ZoomIn size={14} />, action: () => setZoom(z => Math.min(2.5, z + 0.15)), title: "Zoom in" },
          { icon: <ZoomOut size={14} />, action: () => setZoom(z => Math.max(0.2, z - 0.15)), title: "Zoom out" },
          { icon: <Maximize2 size={12} />, action: () => {
              const cx = (bounds.minX + bounds.maxX) / 2;
              const cy = (bounds.minY + bounds.maxY) / 2;
              setPan({ x: -cx, y: -cy }); setZoom(1);
            }, title: "Fit" },
        ].map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            title={item.title}
            style={{
              width: 30, height: 30,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", background: "transparent",
              color: "#94A3B8", cursor: "pointer",
              borderBottom: i < 2 ? "1px solid #F1F5F9" : "none",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.color = "#334155"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94A3B8"; }}
          >
            {item.icon}
          </button>
        ))}
      </div>

      {/* Zoom % label */}
      <div style={{
        position: "absolute", bottom: 24, left: 60,
        fontFamily: MONO, fontSize: 10, color: "#94A3B8", fontWeight: 500, zIndex: 20,
      }}>
        {Math.round(zoom * 100)}%
      </div>

      {/* ── Minimap — bottom right ── */}
      <div style={{
        position: "absolute", bottom: 20, right: 20,
        width: mmW + 16, height: mmH + 16,
        background: "#FFFFFF",
        border: "1px solid #E8EDF5",
        borderRadius: 10,
        padding: 8,
        zIndex: 20,
        boxShadow: "0 1px 6px rgba(15,23,42,0.06)",
        cursor: "crosshair",
      }}
        onMouseDown={e => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const handle = ev => {
            const rx = (ev.clientX - rect.left - 8) / minimapParams.scale + minimapParams.minX;
            const ry = (ev.clientY - rect.top  - 8) / minimapParams.scale + minimapParams.minY;
            setPan({ x: -rx, y: -ry + containerSize.height / 2 / zoom });
          };
          handle(e);
          const up = () => { window.removeEventListener("mousemove", handle); window.removeEventListener("mouseup", up); };
          window.addEventListener("mousemove", handle);
          window.addEventListener("mouseup", up);
        }}
      >
        <svg width={mmW} height={mmH}>
          {nodes.filter(n => n.node.kind !== "category").map(n => {
            const mx = (n.x - minimapParams.minX) * minimapParams.scale;
            const my = (n.y - minimapParams.minY) * minimapParams.scale;
            const mw = Math.max(4, n.w * minimapParams.scale);
            const mh = Math.max(3, n.h * minimapParams.scale);
            return <rect key={n.uid} x={mx} y={my} width={mw} height={mh} rx={1} fill={n.cfg.color} opacity={0.5} />;
          })}
          {/* Viewport rect */}
          {(() => {
            const vx = (-pan.x + (-containerSize.width / 2 / zoom)) - minimapParams.minX;
            const vy = (-pan.y) - minimapParams.minY;
            const vw = containerSize.width / zoom;
            const vh = containerSize.height / zoom;
            return (
              <rect
                x={vx * minimapParams.scale} y={vy * minimapParams.scale}
                width={Math.max(10, vw * minimapParams.scale)} height={Math.max(10, vh * minimapParams.scale)}
                fill="rgba(99,102,241,0.06)" stroke="#6366F1" strokeWidth={1} rx={2}
              />
            );
          })()}
        </svg>
      </div>

      {/* ── Hint text ── */}
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        fontFamily: INTER, fontSize: 9.5, color: "#CBD5E1", fontWeight: 500,
        pointerEvents: "none", zIndex: 20, whiteSpace: "nowrap",
      }}>
        Scroll to zoom · Drag to pan · Click nodes to inspect
      </div>
    </div>
  );
});

export default FlowDiagram;
