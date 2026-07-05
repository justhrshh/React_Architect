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
  Layers, ChevronRight, GitBranch, ArrowLeft, FileCode, CheckCircle, Database
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

const NW = 230;
const NH = 100;

const INTER = "'Inter', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Fraunces', Georgia, serif";

const TYPE_CFG = {
  store: { label: "State Store", color: "#111827", bg: "#F3F4F6", text: "#374151" },
  slice: { label: "Redux Slice", color: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9" },
  user:  { label: "Consumer Component", color: "#059669", bg: "#ECFDF5", text: "#047857" },
};

// ─── Custom Node Component ────────────────────────────────────────────────────

function CustomStateNode({ data }) {
  const { node, isSelected, isConnected } = data;
  const typeKey = node.kind === "component" ? "user" : node.subtype;
  const cfg = TYPE_CFG[typeKey] || TYPE_CFG.slice;

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

  const sliceKeys = node.metadata?.keys || [];
  const hookDetails = node.metadata?.hooks?.filter(h => h.includes("Selector") || h.includes("Dispatch")).join(", ") || "useSelector";

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
        {/* Title */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.015em",
            lineHeight: 1.25,
            fontFamily: INTER,
          }}>
            {node.name}
          </span>
          <span style={{
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: cfg.text,
            background: cfg.bg,
            padding: "2.5px 5.5px",
            borderRadius: 4,
            flexShrink: 0,
            fontFamily: INTER,
          }}>
            {cfg.label}
          </span>
        </div>

        {/* State variables or details */}
        <div style={{
          fontSize: 10,
          color: "#4B5563",
          fontFamily: MONO,
          marginTop: 6,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {node.kind === "state" && node.subtype === "slice" && sliceKeys.length > 0 ? `keys: ${sliceKeys.join(", ")}` : hookDetails}
        </div>

        <div style={{ flex: 1 }} />

        {/* File Path */}
        <div style={{
          fontSize: 9,
          color: "#B8BEC9",
          fontFamily: MONO,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          borderTop: "1px solid #F3F4F6",
          paddingTop: 6,
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
          <span style={{ fontSize: 12, color: "#D1D5DB", fontFamily: INTER }}>Select a state element</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.type] || TYPE_CFG.user;

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
          {/* Identity */}
          <div>
            <SectionLabel>State Element</SectionLabel>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.02em",
                margin: 0,
                lineHeight: 1.25,
                fontFamily: INTER,
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
            <p style={{ fontSize: 10, color: "#B8BEC9", fontFamily: MONO, margin: "5px 0 0" }}>
              {node.file}
            </p>
          </div>

          <Sep />

          {/* Details */}
          <div>
            <SectionLabel>Description</SectionLabel>
            <p className="text-xs text-neutral-600 leading-relaxed font-sans">
              {node.kind === "state" && node.subtype === "store" && "Central store configuring reducer slices and middlewares."}
              {node.kind === "state" && node.subtype === "slice" && "Redux toolkit slice managing slice variables, action creators, and state reducers."}
              {node.kind === "component" && "React Component that hooks into the central state using useSelector hooks."}
            </p>
          </div>

          {node.metadata?.keys && node.metadata.keys.length > 0 && (
            <>
              <Sep />
              <SectionLabel>State Variables</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {node.metadata.keys.map(k => (
                  <span key={k} style={{
                    fontSize: 10.5,
                    fontFamily: MONO,
                    background: "#F8F9FB",
                    border: "1px solid #E8EAED",
                    padding: "3px 8px",
                    borderRadius: 6,
                    color: "#374151",
                  }}>
                    {k}
                  </span>
                ))}
              </div>
            </>
          )}

        </motion.div>
      </div>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

function TopBar({ nodeCount, projectName, handleBack }) {
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
          background: "#7C3AED",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Database size={14} color="white" />
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
            React<span style={{ color: "#00E5FF", fontWeight: 700 }}>/</span>Architect
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
            State Studio — Redux Slices & Variables
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
        background: "#F5F3FF",
        borderRadius: 6,
        border: "1px solid #EDE9FE",
      }}>
        <span style={{ fontSize: 10, color: "#6D28D9", fontFamily: INTER, fontWeight: 650 }}>
          Central State Graph
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
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED" }} />
        <span style={{ fontSize: 11, color: "#6B7280", fontFamily: INTER }}>
          {nodeCount} state nodes
        </span>
      </div>
    </header>
  );
}

// ─── State Flow Main Component ───────────────────────────────────────────────

function StateFlowInner() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const reduxFiles = useSelector((state) => state.graph.files) || [];

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);

  const selectedId = useSelector((state) => state.graph.selectedNodeId);

  const setSelectedId = useCallback((id) => {
    dispatch(selectNodeId(id));
  }, [dispatch]);

  const nodeTypes = useMemo(() => ({
    customState: CustomStateNode,
  }), []);

  // Dynamically build the Redux/State flow nodes from project components
  const { stateNodes, stateEdges } = useMemo(() => {
    if (!knowledgeGraph) return { stateNodes: [], stateEdges: [] };

    const sNodes = knowledgeGraph.nodes.filter(n => n.kind === "state") || [];
    const consumerIds = new Set(
      knowledgeGraph.edges
        .filter(e => e.type === "STATE_CONSUMER")
        .map(e => e.target)
    );
    const compConsumers = (knowledgeGraph.nodes || []).filter(n => consumerIds.has(n.id));
    const nodesList = [...sNodes, ...compConsumers];

    const edgesList = knowledgeGraph.edges.filter(
      e => e.type === "STATE_CONSUMER" || (e.type === "DEPENDENCY" && e.source.includes("store") && e.target.includes("slice"))
    ) || [];

    return { stateNodes: nodesList, stateEdges: edgesList };
  }, [knowledgeGraph]);

  // Pre-select first state node
  useEffect(() => {
    if (stateNodes.length > 0 && !selectedId) {
      setSelectedId(stateNodes[0].id);
    }
  }, [stateNodes, selectedId, setSelectedId]);

  // Map to React Flow
  const { rfNodes, rfEdges } = useMemo(() => {
    const connectedKeys = new Set();
    if (selectedId) {
      stateEdges.forEach(e => {
        if (e.source === selectedId || e.target === selectedId) {
          connectedKeys.add(`${e.source}|${e.target}`);
          connectedKeys.add(e.source);
          connectedKeys.add(e.target);
        }
      });
    }

    const n = stateNodes.map(node => {
      const isSelected = selectedId === node.id;
      const isConnected = connectedKeys.has(node.id);
      
      const x = node.metadata.x !== undefined ? node.metadata.x : 100;
      const y = node.metadata.y !== undefined ? node.metadata.y : 100;

      return {
        id: node.id,
        type: "customState",
        position: { x, y },
        data: {
          node,
          isSelected,
          isConnected,
        },
        width: NW,
        height: NH,
      };
    });

    const e = stateEdges.map(edge => {
      const active = connectedKeys.has(`${edge.source}|${edge.target}`);
      return {
        id: `edge-${edge.id}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: active,
        style: {
          stroke: active ? "rgba(124, 58, 237, 0.7)" : "rgba(224, 227, 232, 0.5)",
          strokeWidth: active ? 2 : 1,
        },
      };
    });

    return { rfNodes: n, rfEdges: e };
  }, [stateNodes, stateEdges, selectedId]);

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  // Fit View
  useEffect(() => {
    if (nodes.length > 0) {
      const t = setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [stateNodes, fitView, nodes.length]);

  const selectedNode = useMemo(() => {
    return stateNodes.find(n => n.id === selectedId) || null;
  }, [stateNodes, selectedId]);

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
      <TopBar nodeCount={stateNodes.length} projectName={selectedProject.name} handleBack={handleBack} />
      
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Left Directory Tree Pane */}
        {!isGraphFullscreen && (
          <aside className="w-64 border-r border-neutral-200 bg-[#F9FAFB] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto select-none">
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-widestest text-neutral-500 mb-3.5 font-bold">
                State Store Files
              </h4>
              <div className="flex flex-col gap-2">
                {reduxFiles.filter(f => f.toLowerCase().includes("redux") || f.toLowerCase().includes("slice") || f.toLowerCase().includes("store") || f.toLowerCase().includes("context")).map((f) => {
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
              color="rgba(124, 58, 237, 0.15)"
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

export default function StateFlow() {
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
      <StateFlowInner />
    </ReactFlowProvider>
  );
}
