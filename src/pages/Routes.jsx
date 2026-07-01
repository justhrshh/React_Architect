import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { selectNodeId, clearSelection } from "@/redux/slices/graphSlice";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  Search, ZoomIn, ZoomOut, Maximize2, Maximize, Share2, Settings,
  Layers, ChevronRight, GitBranch, ArrowLeft, FileCode, CheckCircle, GitMerge, Link2
} from "lucide-react";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { toReactFlow } from "@/engines/adapters/reactFlowAdapter";
import "@xyflow/react/dist/style.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const NW = 240;
const NH = 110;

const INTER = "'Inter', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Fraunces', Georgia, serif";

const TYPE_CFG = {
  router:   { label: "Router Core", color: "#111827", bg: "#F3F4F6", text: "#374151" },
  endpoint: { label: "Route Path",  color: "#06B6D4", bg: "#ECFEFF", text: "#0891B2" },
};

// ─── Custom React Flow Route Node Component ───────────────────────────────────

function CustomRouteNode({ data }) {
  const { node, isSelected, isConnected } = data;
  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.endpoint;

  const shadow = isSelected
    ? `0 0 0 2.5px ${cfg.color}30, 0 8px 28px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)`
    : isConnected
    ? `0 0 0 1.5px ${cfg.color}22, 0 4px 14px rgba(0,0,0,0.06)`
    : "0 1px 3px rgba(0,0,0,0.05), 0 4px 14px rgba(0,0,0,0.04)";

  const borderColor = isSelected
    ? cfg.color + "99"
    : isConnected
    ? cfg.color + "44"
    : "#E8EAED";

  const componentName = node.metadata?.componentName || "Component";

  return (
    <div style={{ position: "relative" }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: cfg.color, border: "none", width: 6, height: 6 }}
      />
      
      <div
        style={{
          width: NW,
          height: NH,
          background: "#FFFFFF",
          borderRadius: 12,
          border: `1px solid ${borderColor}`,
          borderLeft: `3px solid ${cfg.color}`,
          boxShadow: shadow,
          display: "flex",
          flexDirection: "column",
          padding: "13px 14px 11px 15px",
          boxSizing: "border-box",
        }}
      >
        {/* URL Path / Title */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
            fontFamily: MONO,
          }}>
            {node.name}
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: cfg.text,
            background: cfg.bg,
            padding: "3px 6px",
            borderRadius: 4,
            flexShrink: 0,
            fontFamily: INTER,
            marginTop: 1,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* Mapped Component */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <span style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: INTER }}>Element:</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
            fontFamily: INTER,
          }}>
            {`<${componentName} />`}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* File location */}
        <div style={{
          fontSize: 9,
          color: "#B8BEC9",
          fontFamily: MONO,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          borderTop: "1px solid #F3F4F6",
          paddingTop: 8,
        }}>
          {node.file}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: cfg.color, border: "none", width: 6, height: 6 }}
      />
    </div>
  );
}

// ─── Zoom Button Helper ───────────────────────────────────────────────────────

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

// ─── Inspector Detail Panel ───────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#C8CDD8",
      fontFamily: INTER,
      margin: "0 0 9px 0",
    }}>
      {children}
    </p>
  );
}

function Sep() {
  return <div style={{ height: 1, background: "#F1F3F5", margin: "16px 0" }} />;
}

function InspectorPanel({ node }) {
  if (!node) {
    return (
      <aside style={{
        width: 308,
        background: "#FFFFFF",
        borderLeft: "1px solid #E8EAED",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid #F1F3F5" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8CDD8", fontFamily: INTER }}>
            Inspector
          </span>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <span style={{ fontSize: 12, color: "#D1D5DB", fontFamily: INTER }}>Select a route path</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.endpoint;
  const componentName = node.metadata?.componentName || "Component";

  return (
    <aside style={{
      width: 308,
      background: "#FFFFFF",
      borderLeft: "1px solid #E8EAED",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid #F1F3F5", flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8CDD8", fontFamily: INTER }}>
          Inspector
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: "18px 20px 28px" }}
        >
          {/* URL path identity */}
          <div>
            <SectionLabel>Endpoint</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
              <h2 style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.25,
                fontFamily: MONO,
              }}>
                {node.name}
              </h2>
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: cfg.text,
                background: cfg.bg,
                padding: "4px 8px",
                borderRadius: 5,
                flexShrink: 0,
                fontFamily: INTER,
                marginTop: 3,
              }}>
                {cfg.label}
              </span>
            </div>
          </div>

          <Sep />

          {/* Target Element */}
          <div>
            <SectionLabel>Target Element</SectionLabel>
            <div className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 flex items-center gap-3">
              <FileCode size={14} className="text-neutral-400" />
              <div style={{ lineHeight: 1.25 }}>
                <span className="block font-mono text-[12px] font-bold text-neutral-800">
                  {`<${componentName} />`}
                </span>
                <span className="block font-mono text-[9px] text-neutral-400 mt-0.5">
                  {node.file}
                </span>
              </div>
            </div>
          </div>

          <Sep />

          {/* Route Config details */}
          <div>
            <SectionLabel>Router properties</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, color: "#8A909E" }}>Dynamic Param</span>
                <span style={{ fontSize: 11, fontFamily: MONO, color: "#111827" }}>
                  {node.name.includes(":") ? "Yes" : "No"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11.5, color: "#8A909E" }}>Security Guard</span>
                <span style={{ fontSize: 11, fontFamily: MONO, color: "#10B981", fontWeight: 600 }}>
                  {node.name.includes("dashboard") || node.name.includes("settings") ? "Protected" : "Public"}
                </span>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ routeCount, projectName, handleBack }) {
  return (
    <header style={{
      height: 52,
      background: "#FFFFFF",
      borderBottom: "1px solid #E8EAED",
      display: "flex",
      alignItems: "center",
      padding: "0 16px 0 18px",
      flexShrink: 0,
      gap: 0,
      zIndex: 20,
    }}>
      <button
        onClick={handleBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "rgba(0,0,0,0.03)",
          color: "#374151",
          fontSize: 11,
          fontFamily: INTER,
          fontWeight: 600,
          cursor: "pointer",
          marginRight: 16,
          transition: "background 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.06)"}
        onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
      >
        <ArrowLeft size={13} strokeWidth={2.5} />
        Command Center
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30,
          height: 30,
          background: "#06B6D4",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <GitMerge size={14} color="white" />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#111827",
            letterSpacing: "-0.03em",
            fontFamily: SERIF,
            lineHeight: 1.15,
          }}>
            React Architect
          </div>
          <div style={{
            fontSize: 8,
            color: "#B8BEC9",
            fontFamily: INTER,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginTop: 1,
          }}>
            Route Studio — URL Navigation Flow
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 18, background: "#E8EAED", margin: "0 16px" }} />

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#A8B0BF", fontFamily: INTER }}>{projectName || "react-project"}</span>
        <ChevronRight size={11} color="#D1D5DB" />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GitBranch size={11} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#374151", fontFamily: INTER, fontWeight: 500 }}>main</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#ECFEFF",
        borderRadius: 6,
        border: "1px solid #CFFAFE",
      }}>
        <span style={{ fontSize: 10, color: "#0891B2", fontFamily: INTER, fontWeight: 650 }}>
          URL Endpoint Flow
        </span>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#F8F9FB",
        borderRadius: 6,
        border: "1px solid #E8EAED",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06B6D4" }} />
        <span style={{ fontSize: 11, color: "#6B7280", fontFamily: INTER }}>
          {routeCount} endpoints
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
        {[
          { Icon: Search, label: "Search" },
          { Icon: Share2, label: "Share" },
          { Icon: Settings, label: "Settings" },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            title={label}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 7,
              background: "transparent",
              border: "none",
              color: "#B8BEC9",
              cursor: "pointer",
              transition: "background 0.14s, color 0.14s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "#F3F4F6";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#B8BEC9";
            }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </header>
  );
}

// ─── Inner Routes React Flow Canvas Component ──────────────────────────────────

function RoutesFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const reduxFiles = useSelector((state) => state.graph.files) || [];

  const routeNodes = useMemo(() => {
    return knowledgeGraph?.nodes.filter(n => n.kind === "route") || [];
  }, [knowledgeGraph]);

  const routeEdges = useMemo(() => {
    return knowledgeGraph?.edges.filter(e => e.type === "ROUTE_PARENT") || [];
  }, [knowledgeGraph]);

  const selectedId = useSelector((state) => state.graph.selectedNodeId);

  const setSelectedId = useCallback((id) => {
    dispatch(selectNodeId(id));
  }, [dispatch]);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);

  const nodeTypes = useMemo(() => ({
    customRoute: CustomRouteNode,
  }), []);

  // Pre-select first path node
  useEffect(() => {
    if (routeNodes.length > 0 && !selectedId) {
      const rootNode = routeNodes.find(n => n.name === "/") || routeNodes[0];
      setSelectedId(rootNode.id);
    }
  }, [routeNodes, selectedId, setSelectedId]);

  // Map to React Flow
  useEffect(() => {
    if (routeNodes && routeNodes.length > 0) {
      const { rfNodes, rfEdges } = toReactFlow(routeNodes, routeEdges, selectedId, "rgba(6, 182, 212, 0.7)");
      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [routeNodes, routeEdges, selectedId, setNodes, setEdges]);

  // Fit View
  useEffect(() => {
    if (nodes.length > 0) {
      const t = setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [routeNodes, fitView, nodes.length]);

  const selectedNode = useMemo(() => {
    return routeNodes.find(n => n.id === selectedId) || null;
  }, [routeNodes, selectedId]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedId("");
  }, []);

  const handleToggleGraphFullscreen = useCallback(() => {
    setIsGraphFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 300 });
      }, 100);
      return next;
    });
  }, [fitView]);

  const handleBack = () => {
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  };

  // Guard
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    }
  }, [selectedProject, navigate]);

  if (!selectedProject) return null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      fontFamily: INTER,
    }} className="page-fade">
      <TopBar routeCount={routeNodes.length - 1} projectName={selectedProject.name} handleBack={handleBack} />
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Left Directory Tree Pane */}
        {!isGraphFullscreen && (
          <aside className="w-64 border-r border-neutral-200 bg-[#F9FAFB] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto select-none">
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-widestest text-neutral-500 mb-3.5 font-bold">
                Route Source Files
              </h4>
              <div className="flex flex-col gap-2">
                {reduxFiles.filter(f => f.toLowerCase().includes("router") || f.toLowerCase().includes("route") || f.toLowerCase().includes("app") || f.toLowerCase().includes("page")).map((f) => {
                  return (
                    <div key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/60 transition-colors">
                      <FileCode size={12} className="text-neutral-400" />
                      <span className="font-mono text-[10.5px] truncate" title={f}>{f.split("/").pop()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* Center React Flow Canvas */}
        <main className="flex-1 flex flex-col relative bg-[#F8F9FB]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2.5}
          >
            <Background
              color="rgba(6, 182, 212, 0.15)"
              gap={28}
              size={1.5}
            />
          </ReactFlow>

          {/* Zoom controls */}
          <div
            className="absolute bottom-5 left-5 flex items-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAED",
              borderRadius: 12,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              padding: "4px",
              gap: 0,
              display: "flex",
              zIndex: 10,
            }}
          >
            <IconBtn onClick={() => zoomIn()} title="Zoom in">
              <ZoomIn size={13} />
            </IconBtn>
            <span style={{
              fontSize: 10,
              fontFamily: MONO,
              color: "#9CA3AF",
              width: 38,
              textAlign: "center",
              letterSpacing: "-0.02em",
              fontWeight: 500,
            }}>
              Zoom
            </span>
            <IconBtn onClick={() => zoomOut()} title="Zoom out">
              <ZoomOut size={13} />
            </IconBtn>
            <div style={{ width: 1, height: 14, background: "#E8EAED", margin: "0 3px" }} />
            <IconBtn onClick={() => fitView({ padding: 0.15, duration: 300 })} title="Fit graph to view">
              <Maximize size={12} />
            </IconBtn>
            <div style={{ width: 1, height: 14, background: "#E8EAED", margin: "0 3px" }} />
            <IconBtn onClick={handleToggleGraphFullscreen} title={isGraphFullscreen ? "Exit Full Screen" : "Full Screen Graph"}>
              <Maximize2 size={12} />
            </IconBtn>
          </div>

          {/* Node type legend — bottom right */}
          <div
            className="absolute bottom-5 right-5 flex items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.88)",
              backdropFilter: "blur(8px)",
              border: "1px solid #E8EAED",
              borderRadius: 10,
              padding: "7px 12px",
              zIndex: 10,
            }}
          >
            {Object.entries(TYPE_CFG).map(([type, cfg]) => (
              <div key={cfg.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, letterSpacing: "-0.01em" }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </main>

        {/* Right Inspector Panel */}
        {!isGraphFullscreen && (
          <InspectorPanel node={selectedNode} />
        )}
      </div>
    </div>
  );
}

// ─── Main Export Component with React Flow Provider ──────────────────────────

export default function Routes() {
  useEffect(() => {
    gsap.fromTo(".page-fade", {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    });
  }, []);

  return (
    <ReactFlowProvider>
      <RoutesFlow />
    </ReactFlowProvider>
  );
}
