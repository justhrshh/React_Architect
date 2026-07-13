import { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { ChevronRight, AlertTriangle, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { INTER, MONO } from "./constants";

function findParentIds(nodesList, targetId, currentPath = []) {
  for (const node of nodesList) {
    if (node.id === targetId) {
      return currentPath;
    }
    if (node.children && node.children.length > 0) {
      const path = findParentIds(node.children, targetId, [...currentPath, node.id]);
      if (path) return path;
    }
  }
  return null;
}

// --- Zoom Button Helper ---
function IconBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        border: "none",
        background: "transparent",
        color: "#A0A8B4",
        cursor: "pointer",
        transition: "background 0.14s, color 0.14s",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "#F3F4F6";
        e.currentTarget.style.color = "#374151";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#A0A8B4";
      }}
    >
      {children}
    </button>
  );
}

// --- Flow Diagram Constants ---
const FLOW_NODE_W = 200;
const FLOW_NODE_H = 52;
const FLOW_CAT_H = 28;
const FLOW_H_GAP = 24;
const FLOW_V_GAP = 56;
const FLOW_CAT_V_GAP = 32;

const FLOW_TYPE_COLORS = {
  router:    { accent: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  endpoint:  { accent: "#6366F1", bg: "#EEF2FF", border: "#C7D2FE" },
  page:      { accent: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
  layout:    { accent: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  component: { accent: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  provider:  { accent: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  context:   { accent: "#DB2777", bg: "#FDF2F8", border: "#FBCFE8" },
  slice:     { accent: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
  gateway:   { accent: "#0891B2", bg: "#ECFEFF", border: "#A5F3FC" },
  category:  { accent: "#9CA3AF", bg: "transparent", border: "transparent" },
};

// --- Flow Layout Engine ---
function computeFlowLayout(roots, expandedSet) {
  const layoutNodes = [];
  const connections = [];
  let globalId = 0;

  function getNodeH(node) {
    return node.kind === "category" ? FLOW_CAT_H : FLOW_NODE_H;
  }
  function getVGap(node) {
    return node.kind === "category" ? FLOW_CAT_V_GAP : FLOW_V_GAP;
  }

  // Compute subtree width recursively
  function subtreeWidth(node, depth) {
    const isExpanded = expandedSet[node.id];
    const visibleChildren = (isExpanded && node.children && node.children.length > 0) ? node.children : [];

    if (visibleChildren.length === 0) {
      return FLOW_NODE_W;
    }

    let totalW = 0;
    visibleChildren.forEach((child, i) => {
      if (i > 0) totalW += FLOW_H_GAP;
      totalW += subtreeWidth(child, depth + 1);
    });

    return Math.max(FLOW_NODE_W, totalW);
  }

  // Position nodes
  function layoutNode(node, x, y, depth, parentLayoutId) {
    const layoutId = globalId++;
    const nodeH = getNodeH(node);
    const subtype = node.subtype || node.kind;
    const colorCfg = FLOW_TYPE_COLORS[subtype] || FLOW_TYPE_COLORS.component;

    layoutNodes.push({
      layoutId,
      id: node.id,
      x,
      y,
      width: FLOW_NODE_W,
      height: nodeH,
      node,
      depth,
      colorCfg,
    });

    if (parentLayoutId !== null) {
      const parentLN = layoutNodes.find(ln => ln.layoutId === parentLayoutId);
      if (parentLN) {
        connections.push({
          fromId: parentLN.id,
          toId: node.id,
          fromX: parentLN.x + parentLN.width / 2,
          fromY: parentLN.y + parentLN.height,
          toX: x + FLOW_NODE_W / 2,
          toY: y,
          colorCfg,
        });
      }
    }

    const isExpanded = expandedSet[node.id];
    const visibleChildren = (isExpanded && node.children && node.children.length > 0) ? node.children : [];

    if (visibleChildren.length > 0) {
      const childWidths = visibleChildren.map(c => subtreeWidth(c, depth + 1));
      const totalChildrenW = childWidths.reduce((a, b) => a + b, 0) + (visibleChildren.length - 1) * FLOW_H_GAP;
      let childX = x + FLOW_NODE_W / 2 - totalChildrenW / 2;
      const childY = y + nodeH + getVGap(node);

      visibleChildren.forEach((child, i) => {
        const cw = childWidths[i];
        const childCenterX = childX + cw / 2 - FLOW_NODE_W / 2;
        layoutNode(child, childCenterX, childY, depth + 1, layoutId);
        childX += cw + FLOW_H_GAP;
      });
    }
  }

  // Layout all roots side by side
  const rootWidths = roots.map(r => subtreeWidth(r, 0));
  const totalW = rootWidths.reduce((a, b) => a + b, 0) + (roots.length - 1) * FLOW_H_GAP * 2;
  let startX = -totalW / 2;

  roots.forEach((root, i) => {
    const rw = rootWidths[i];
    const rx = startX + rw / 2 - FLOW_NODE_W / 2;
    layoutNode(root, rx, 0, 0, null);
    startX += rw + FLOW_H_GAP * 2;
  });

  return { layoutNodes, connections };
}

// --- Flow Node Component ---
function FlowNodeCard({ ln, isSelected, isHighlighted, onSelect, onToggle, isExpanded, hasChildren }) {
  const { node, colorCfg } = ln;
  const isCategory = node.kind === "category";

  if (isCategory) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
        style={{
          position: "absolute",
          left: ln.x,
          top: ln.y,
          width: ln.width,
          height: ln.height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <div style={{
          width: 16, height: 1,
          background: `linear-gradient(to right, transparent, #D1D5DB)`,
        }} />
        <span style={{
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          color: "#9CA3AF",
          whiteSpace: "nowrap",
        }}>
          {node.name}
        </span>
        <div style={{
          width: 16, height: 1,
          background: `linear-gradient(to left, transparent, #D1D5DB)`,
        }} />
        {hasChildren && (
          <ChevronRight
            size={10}
            color="#9CA3AF"
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        )}
      </motion.div>
    );
  }

  const subtypeLabel = node.subtype ? node.subtype.charAt(0).toUpperCase() + node.subtype.slice(1) : "";
  const displayName = node.kind === "route" && node.subtype === "endpoint" ? (node.name || "/") : node.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        boxShadow: isSelected
          ? `0 0 0 2px ${colorCfg.accent}, 0 4px 16px ${colorCfg.accent}20`
          : isHighlighted
          ? `0 0 0 2px #3B82F6, 0 4px 16px rgba(59, 130, 246, 0.25)`
          : "0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px " + colorCfg.border,
      }}
      whileHover={{
        y: -3,
        scale: 1.025,
        boxShadow: isSelected
          ? `0 0 0 2px ${colorCfg.accent}, 0 8px 24px ${colorCfg.accent}30`
          : isHighlighted
          ? `0 0 0 2px #3B82F6, 0 8px 24px rgba(59, 130, 246, 0.35)`
          : "0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px " + colorCfg.accent
      }}
      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      style={{
        position: "absolute",
        left: ln.x,
        top: ln.y,
        width: ln.width,
        height: ln.height,
        background: isSelected ? colorCfg.bg : "#FFFFFF",
        borderRadius: 10,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 12px",
        userSelect: "none",
        transition: "background 0.2s",
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute",
        left: 0, top: 8, bottom: 8,
        width: 3,
        borderRadius: "0 2px 2px 0",
        background: colorCfg.accent,
        opacity: isSelected ? 1 : 0.5,
      }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 6 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
        }}>
          <span style={{
            fontFamily: INTER,
            fontSize: 12,
            fontWeight: 600,
            color: isSelected ? colorCfg.accent : "#1F2937",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: ln.width - 80,
          }}>
            {displayName}
          </span>
          {subtypeLabel && (
            <span style={{
              fontFamily: MONO,
              fontSize: 8,
              fontWeight: 600,
              color: colorCfg.accent,
              background: colorCfg.bg,
              padding: "1px 5px",
              borderRadius: 4,
              letterSpacing: "0.3px",
              textTransform: "uppercase",
              border: `1px solid ${colorCfg.border}`,
              flexShrink: 0,
            }}>
              {subtypeLabel}
            </span>
          )}
        </div>
        {node.file && (
          <div style={{
            fontFamily: MONO,
            fontSize: 9,
            color: "#9CA3AF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {node.file.split("/").pop()}
          </div>
        )}
      </div>

      {/* Expand/collapse chevron */}
      {hasChildren && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            borderRadius: 6,
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <ChevronRight
            size={12}
            color={isSelected ? colorCfg.accent : "#9CA3AF"}
            style={{
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      )}

      {/* Loop indicator */}
      {node.isLoop && (
        <div style={{
          position: "absolute",
          top: -6,
          right: -6,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#FEF2F2",
          border: "1.5px solid #FECACA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <AlertTriangle size={8} color="#EF4444" />
        </div>
      )}
    </motion.div>
  );
}

// --- Filter to UI-only Nodes (exclude State, Services, Providers) ---
function filterUiOnly(nodes) {
  if (!nodes) return [];
  return nodes
    .filter(node => {
      if (node.kind === "category") {
        return node.name === "Layout" || node.name === "Components";
      }
      if (node.kind === "state" || node.kind === "api") return false;
      if (node.subtype === "provider" || node.subtype === "context") return false;
      return true;
    })
    .map(node => {
      return {
        ...node,
        children: filterUiOnly(node.children)
      };
    });
}

const FlowDiagram = forwardRef(({ architectureModel, selectedId, onSelectNode, highlightedIds }, ref) => {
  const [flowExpanded, setFlowExpanded] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const rootIdsKey = useMemo(() => {
    return architectureModel.map(r => r.id).join(",");
  }, [architectureModel]);

  // Auto-expand top 2 levels on model change
  useEffect(() => {
    if (architectureModel.length > 0) {
      const init = {};
      const uiOnlyModel = filterUiOnly(architectureModel);
      uiOnlyModel.forEach(root => {
        init[root.id] = true;
        if (root.children) {
          root.children.forEach(child => {
            init[child.id] = true;
          });
        }
      });
      setTimeout(() => {
        setFlowExpanded(init);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootIdsKey]);

  const toggleFlowExpand = useCallback((id) => {
    setFlowExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const { layoutNodes, connections } = useMemo(() => {
    const uiOnlyModel = filterUiOnly(architectureModel);
    return computeFlowLayout(uiOnlyModel, flowExpanded);
  }, [architectureModel, flowExpanded]);

  // Compute bounding box for SVG
  const bounds = useMemo(() => {
    if (layoutNodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    layoutNodes.forEach(ln => {
      if (ln.x < minX) minX = ln.x;
      if (ln.y < minY) minY = ln.y;
      if (ln.x + ln.width > maxX) maxX = ln.x + ln.width;
      if (ln.y + ln.height > maxY) maxY = ln.y + ln.height;
    });
    const pad = 80;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [layoutNodes]);

  // Auto-center on initial load / project change
  useEffect(() => {
    if (layoutNodes.length > 0) {
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = bounds.minY;
      setTimeout(() => {
        setPan({ x: -cx, y: -cy + 40 });
        setZoom(1);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootIdsKey]); // only on model change, not every expand

  // Auto-expand parents in Flow diagram when selectedId changes
  useEffect(() => {
    if (selectedId && architectureModel.length > 0) {
      const parentIds = findParentIds(architectureModel, selectedId);
      if (parentIds && parentIds.length > 0) {
        const timer = setTimeout(() => {
          setFlowExpanded(prev => {
            const next = { ...prev };
            parentIds.forEach(id => {
              next[id] = true;
            });
            return next;
          });
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedId, architectureModel]);

  // Center on selected node when selection changes
  useEffect(() => {
    if (selectedId && layoutNodes.length > 0) {
      const selectedLayoutNode = layoutNodes.find(ln => ln.id === selectedId);
      if (selectedLayoutNode && containerRef.current) {
        const containerHeight = containerRef.current.clientHeight || 600;
        
        // Center coordinates of the node
        const nodeCx = selectedLayoutNode.x + selectedLayoutNode.width / 2;
        const nodeCy = selectedLayoutNode.y + selectedLayoutNode.height / 2;
        
        setPan({
          x: -nodeCx,
          y: -nodeCy + (containerHeight / 2) / zoom
        });
      }
    }
  }, [selectedId, layoutNodes, zoom]);

  // Container size tracking for Minimap viewport bounds
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setContainerSize({ width: el.clientWidth || 800, height: el.clientHeight || 600 });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute live visible viewport rectangle in canvas coordinates
  const viewportRect = useMemo(() => {
    const { width, height } = containerSize;
    const visibleMinX = -width / 2 / zoom - pan.x;
    const visibleMaxX = (width - width / 2) / zoom - pan.x;
    const visibleMinY = -pan.y;
    const visibleMaxY = height / zoom - pan.y;
    return { x1: visibleMinX, y1: visibleMinY, x2: visibleMaxX, y2: visibleMaxY };
  }, [containerSize, pan, zoom]);

  // Compute scaling parameters for rendering nodes in 144x94 minimap bounds
  const minimapParams = useMemo(() => {
    const pad = 30;
    const minX = bounds.minX - pad;
    const minY = bounds.minY - pad;
    const maxX = bounds.maxX + pad;
    const maxY = bounds.maxY + pad;
    const w = maxX - minX;
    const h = maxY - minY;
    const mw = 144;
    const mh = 94;
    const scale = Math.min(mw / w, mh / h);
    return { minX, minY, scale, w, h };
  }, [bounds]);


  // Synchronous Imperative Exporter to bypass browser popup blockers and download constraints
  useImperativeHandle(ref, () => ({
    exportModel(type) {


      const w = bounds.maxX - bounds.minX;
      const h = bounds.maxY - bounds.minY;
      
      let svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bounds.minX} ${bounds.minY} ${w} ${h}" width="${w}" height="${h}">`;
      svgXml += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${w}" height="${h}" fill="#F8F9FB"/>`;
      
      // grid lines pattern
      svgXml += `<defs>
        <pattern id="grid-pattern-export" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>`;
      svgXml += `<rect x="${bounds.minX}" y="${bounds.minY}" width="${w}" height="${h}" fill="url(#grid-pattern-export)"/>`;

      // Draw SVG connection lines with absolute coordinate paths
      connections.forEach(conn => {
        const x1 = conn.fromX;
        const y1 = conn.fromY;
        const x2 = conn.toX;
        const y2 = conn.toY;
        const midY = (y1 + y2) / 2;
        const isHigh = selectedId && (conn.fromId === selectedId || conn.toId === selectedId || (highlightedIds?.has(conn.fromId) && highlightedIds?.has(conn.toId)));

        svgXml += `<path d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" fill="none" stroke="${isHigh ? '#3B82F6' : '#D1D5DB'}" stroke-width="${isHigh ? 2.0 : 1.2}" stroke-opacity="${isHigh ? 0.95 : 0.35}" stroke-dasharray="${conn.style === 'dashed' ? '4,4' : 'none'}"/>`;
      });

      // Draw HTML components node cards transformed to SVG graphics
      layoutNodes.forEach(ln => {
        if (ln.node.kind === "category") {
          svgXml += `<text x="${ln.x + ln.width / 2}" y="${ln.y + ln.height / 2 + 3}" font-family="monospace, sans-serif" font-size="9" fill="#9CA3AF" text-anchor="middle" font-weight="600" letter-spacing="1.5">${ln.node.name.toUpperCase()}</text>`;
        } else {
          const color = ln.colorCfg?.accent || "#3B82F6";
          const border = ln.colorCfg?.border || "#E5E7EB";
          svgXml += `<g>`;
          // card outline
          svgXml += `<rect x="${ln.x}" y="${ln.y}" width="${ln.width}" height="${ln.height}" rx="10" fill="#FFFFFF" stroke="${border}" stroke-width="1"/>`;
          // left category colored tag
          svgXml += `<rect x="${ln.x}" y="${ln.y + 8}" width="3" height="${ln.height - 16}" rx="1.5" fill="${color}"/>`;
          // component name text
          svgXml += `<text x="${ln.x + 12}" y="${ln.y + 24}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#111827">${ln.node.name}</text>`;
          // role label
          const label = ln.node.subtype ? ln.node.subtype.charAt(0).toUpperCase() + ln.node.subtype.slice(1) : "Component";
          svgXml += `<text x="${ln.x + 12}" y="${ln.y + 38}" font-family="sans-serif" font-size="9" fill="#9CA3AF">${label}</text>`;
          svgXml += `</g>`;
        }
      });
      svgXml += `</svg>`;

      if (type === "SVG") {
        const dataStr = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgXml);
        const dl = document.createElement("a");
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "architecture_flow.svg");
        document.body.appendChild(dl);
        dl.click();
        dl.remove();
      } else if (type === "PNG") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgXml);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = w * 2;
          canvas.height = h * 2;
          const ctx = canvas.getContext("2d");
          ctx.scale(2, 2);
          ctx.drawImage(img, 0, 0);
          try {
            const pngUrl = canvas.toDataURL("image/png");
            const dl = document.createElement("a");
            dl.setAttribute("href", pngUrl);
            dl.setAttribute("download", "architecture_flow.png");
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
          } catch (err) {
            console.error("Failed PNG canvas download", err);
          }
        };
      } else if (type === "PDF") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Architecture Flow Diagram</title>
                <style>
                  body { margin: 30px; display: flex; align-items: center; justify-content: center; background: white; }
                  svg { width: 100%; height: auto; max-height: 95vh; }
                </style>
              </head>
              <body>
                ${svgXml}
                <script>
                  window.onload = () => {
                    setTimeout(() => {
                      window.print();
                      window.close();
                    }, 300);
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          alert("Popup blocker prevented exporting PDF. Please allow popups for this site.");
        }
      }
    }
  }));

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x * zoom, y: e.clientY - pan.y * zoom });
    }
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setPan({
      x: (e.clientX - panStart.x) / zoom,
      y: (e.clientY - panStart.y) / zoom,
    });
  }, [isPanning, panStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(prev => Math.max(0.15, Math.min(2.5, prev + delta)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  if (architectureModel.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#B8BEC9", fontSize: 13, fontFamily: INTER }}>
        No architecture model to visualize.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: "relative", overflow: "hidden", cursor: isPanning ? "grabbing" : "grab", background: "#F8F9FB" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transform container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          transformOrigin: "0 0",
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transition: isPanning ? "none" : "transform 0.15s ease-out",
        }}
      >
        {/* SVG connections layer */}
        <svg
          style={{
            position: "absolute",
            left: bounds.minX,
            top: bounds.minY,
            width: bounds.maxX - bounds.minX,
            height: bounds.maxY - bounds.minY,
            pointerEvents: "none",
            overflow: "visible",
          }}
        >
          {connections.map((conn, i) => {
            const x1 = conn.fromX - bounds.minX;
            const y1 = conn.fromY - bounds.minY;
            const x2 = conn.toX - bounds.minX;
            const y2 = conn.toY - bounds.minY;
            const midY = (y1 + y2) / 2;

            const isHigh = selectedId && (conn.fromId === selectedId || conn.toId === selectedId || (highlightedIds?.has(conn.fromId) && highlightedIds?.has(conn.toId)));

            return (
              <motion.path
                key={`${conn.fromId}-${conn.toId}-${i}`}
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={isHigh ? "#3B82F6" : conn.colorCfg.accent}
                strokeWidth={isHigh ? 2.0 : 1.2}
                strokeOpacity={isHigh ? 0.95 : 0.35}
                style={isHigh ? { strokeDasharray: "6,4" } : {}}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isHigh ? { strokeDashoffset: [0, -20], pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 0.35 }}
                transition={isHigh ? { strokeDashoffset: { repeat: Infinity, duration: 1.2, ease: "linear" } } : { duration: 0.5, delay: i * 0.02, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {/* Node cards layer */}
        {layoutNodes.map((ln) => (
          <FlowNodeCard
            key={ln.layoutId}
            ln={ln}
            isSelected={selectedId === ln.id}
            isHighlighted={highlightedIds?.has(ln.id)}
            onSelect={onSelectNode}
            onToggle={toggleFlowExpand}
            isExpanded={!!flowExpanded[ln.id]}
            hasChildren={ln.node.children && ln.node.children.length > 0}
          />
        ))}
      </div>

      {/* Keyboard Shortcuts HUD Cheat Sheet */}
      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 20,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(10px)",
          border: "1px solid #E8EAED",
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          zIndex: 10,
          width: 172,
          boxSizing: "border-box"
        }}
      >
        <span style={{ fontSize: 8.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: INTER, marginBottom: 2 }}>
          Shortcuts
        </span>
        {[
          { keys: "Ctrl+F", desc: "Search focus" },
          { keys: "F", desc: "Fullscreen chart" },
          { keys: "Esc", desc: "Exit focus / Back" },
          { keys: "Tab", desc: "Toggle inspector" },
        ].map((item, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 9.5, color: "#4B5563", fontFamily: INTER }}>{item.desc}</span>
            <kbd style={{
              fontSize: 8.5,
              fontFamily: MONO,
              color: "#374151",
              background: "#F3F4F6",
              border: "1px solid #E5E7EB",
              borderRadius: 4,
              padding: "1px 4px",
              boxShadow: "0 1px 0 rgba(0,0,0,0.05)",
              flexShrink: 0
            }}>
              {item.keys}
            </kbd>
          </div>
        ))}
      </div>

      {/* Zoom controls overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          display: "flex",
          alignItems: "center",
          background: "#FFFFFF",
          border: "1px solid #E8EAED",
          borderRadius: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          padding: 4,
          gap: 0,
          zIndex: 10,
        }}
      >
        <IconBtn onClick={() => setZoom(z => Math.min(2.5, z + 0.15))} title="Zoom in">
          <ZoomIn size={13} />
        </IconBtn>
        <span style={{
          fontSize: 10,
          fontFamily: MONO,
          color: "#9CA3AF",
          width: 40,
          textAlign: "center",
          fontWeight: 500,
        }}>
          {Math.round(zoom * 100)}%
        </span>
        <IconBtn onClick={() => setZoom(z => Math.max(0.15, z - 0.15))} title="Zoom out">
          <ZoomOut size={13} />
        </IconBtn>
        <div style={{ width: 1, height: 14, background: "#E8EAED", margin: "0 3px" }} />
        <IconBtn onClick={() => {
          const cx = (bounds.minX + bounds.maxX) / 2;
          const cy = bounds.minY;
          setPan({ x: -cx, y: -cy + 40 });
          setZoom(1);
        }} title="Reset view">
          <Maximize size={12} />
        </IconBtn>
      </div>

      {/* Flow legend */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 190,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(8px)",
          border: "1px solid #E8EAED",
          borderRadius: 10,
          padding: "7px 12px",
          zIndex: 10,
        }}
      >
        {[
          { label: "Page", color: "#3B82F6" },
          { label: "Layout", color: "#7C3AED" },
          { label: "Component", color: "#059669" },
          { label: "Route", color: "#6366F1" },
        ].map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, letterSpacing: "-0.01em" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* Minimap Widget */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          width: 160,
          height: 110,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid #E8EAED",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          padding: 8,
          zIndex: 10,
          userSelect: "none",
          overflow: "hidden",
          cursor: "crosshair",
          boxSizing: "border-box"
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          const handleMinimapInteraction = (ev) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const rx = ev.clientX - rect.left;
            const ry = ev.clientY - rect.top;
            const cx = (rx - 10) / minimapParams.scale + minimapParams.minX;
            const cy = (ry - 10) / minimapParams.scale + minimapParams.minY;
            setPan({
              x: -cx,
              y: -cy + (containerSize.height / 2) / zoom
            });
          };
          handleMinimapInteraction(e);
          
          const onMouseMove = (ev) => {
            handleMinimapInteraction(ev);
          };
          const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
          };
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", onMouseUp);
        }}
      >
        <span style={{ position: "absolute", top: 6, left: 8, fontSize: 7.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: INTER }}>
          Minimap
        </span>
        <svg
          width={144}
          height={94}
          style={{ marginTop: 12 }}
        >
          {/* Sibling node rectangles */}
          {layoutNodes.map(ln => {
            const mx = (ln.x - minimapParams.minX) * minimapParams.scale + 10;
            const my = (ln.y - minimapParams.minY) * minimapParams.scale + 10;
            const mw = ln.width * minimapParams.scale;
            const mh = ln.height * minimapParams.scale;
            const color = ln.node.kind === "category" ? "transparent" : (ln.colorCfg?.accent || "#3B82F6");
            if (ln.node.kind === "category") return null;
            return (
              <rect
                key={ln.layoutId}
                x={mx}
                y={my}
                width={Math.max(3, mw)}
                height={Math.max(2, mh)}
                fill={color}
                rx={0.5}
                opacity={0.6}
              />
            );
          })}
          {/* Active viewport guide */}
          {(() => {
            const vx1 = (viewportRect.x1 - minimapParams.minX) * minimapParams.scale + 10;
            const vy1 = (viewportRect.y1 - minimapParams.minY) * minimapParams.scale + 10;
            const vx2 = (viewportRect.x2 - minimapParams.minX) * minimapParams.scale + 10;
            const vy2 = (viewportRect.y2 - minimapParams.minY) * minimapParams.scale + 10;
            
            const x = Math.max(0, Math.min(144, vx1));
            const y = Math.max(0, Math.min(94, vy1));
            const w = Math.max(5, Math.min(144, vx2) - x);
            const h = Math.max(5, Math.min(94, vy2) - y);
            return (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill="rgba(59, 130, 246, 0.08)"
                stroke="#3B82F6"
                strokeWidth={1}
                rx={1.5}
              />
            );
          })()}
        </svg>
      </div>

      {/* Expand hint */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: MONO,
          fontSize: 9,
          letterSpacing: "1.5px",
          color: "#D1D5DB",
          textTransform: "uppercase",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        Click chevrons to expand architecture · Scroll to zoom · Drag to pan
      </div>
    </div>
  );
});

export default FlowDiagram;
