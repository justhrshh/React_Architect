import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { selectNodeId } from "@/redux/slices/graphSlice";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  Search, ZoomIn, ZoomOut, Maximize2, Maximize, Share2, Settings,
  Layers, ChevronRight, GitBranch, ArrowLeft, FileCode,
  AlertTriangle, XCircle, ShieldAlert, CheckCircle, Info
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
import { buildArchitectureModel } from "@/engines/adapters/architectureAdapter";
import "@xyflow/react/dist/style.css";


// ─── Constants ────────────────────────────────────────────────────────────────

const NW = 224;
const NH = 110;

const INTER = "'Inter', -apple-system, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', monospace";
const SERIF = "'Fraunces', Georgia, serif";

const TYPE_CFG = {
  page:      { label: "Page",      color: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
  layout:    { label: "Layout",    color: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9" },
  component: { label: "Component", color: "#059669", bg: "#ECFDF5", text: "#047857" },
  provider:  { label: "Provider",  color: "#D97706", bg: "#FFFBEB", text: "#B45309" },
  context:   { label: "Context",   color: "#DB2777", bg: "#FDF2F8", text: "#9D174D" },
};

const BUILTIN_HOOKS = new Set([
  "useState", "useEffect", "useCallback", "useMemo", "useRef",
  "useContext", "useReducer", "useId", "useLayoutEffect",
  "useParams", "useRoutes", "useActiveRoute", "useScrollRestoration",
  "useNavigation", "useLoaderData", "useSearchParams", "useLocation", "useNavigate",
]);

// ─── Node Metric Component ────────────────────────────────────────────────────

function NodeMetric({ value, label, accentColor }) {
  return (
    <span style={{
      fontSize: 10,
      color: accentColor ?? "#B0B7C3",
      fontFamily: INTER,
      display: "flex",
      gap: 3,
      alignItems: "center",
    }}>
      <span style={{ fontWeight: 600, color: accentColor ?? "#8A909E" }}>{value}</span>
      {label}
    </span>
  );
}

// ─── Custom React Flow Node Component ─────────────────────────────────────────

function CustomNode({ data }) {
  const { node, isSelected, isConnected } = data;
  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;

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

  const hookCount = node.metadata?.hooks?.length || 0;
  const childCount = node.metadata?.children?.length || 0;
  const apiCount = node.metadata?.apiCalls?.length || 0;

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
        {/* Name + badge */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#111827",
            letterSpacing: "-0.018em",
            lineHeight: 1.25,
            fontFamily: INTER,
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

        {/* File path */}
        <div style={{
          fontSize: 9.5,
          color: "#B8BEC9",
          fontFamily: MONO,
          marginTop: 5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          letterSpacing: "-0.01em",
        }}>
          {node.file}
        </div>

        <div style={{ flex: 1 }} />

        {/* Metrics */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingTop: 8,
          borderTop: "1px solid #F3F4F6",
        }}>
          <NodeMetric value={hookCount} label="hooks" />
          <NodeMetric value={childCount} label="children" />
          {apiCount > 0 && (
            <NodeMetric value={apiCount} label="api" accentColor={cfg.color} />
          )}
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

function InspectorPanel({ node, onNavigate, knowledgeGraph }) {
  // Query Parent and Children nodes from graph edges
  const parentNodes = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "RENDERS" && e.target === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.source))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  const childNodes = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "RENDERS" && e.source === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Query API endpoint connections
  const apiCalls = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "USES_API" && e.source === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.target))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Query Redux slices consumed
  const consumedStates = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    return knowledgeGraph.edges
      .filter(e => e.type === "STATE_CONSUMER" && e.target === node.id)
      .map(e => knowledgeGraph.nodes.find(n => n.id === e.source))
      .filter(Boolean);
  }, [knowledgeGraph, node]);

  // Check if component has cycle/circular renderings
  const isCyclic = useMemo(() => {
    if (!knowledgeGraph || !node) return false;
    const cycles = knowledgeGraph.validation?.warnings?.filter(w => w.type === "CIRCULAR_REFERENCE" && w.file === node.file) || [];
    return cycles.length > 0;
  }, [knowledgeGraph, node]);

  // Generate architectural recommendations
  const recommendations = useMemo(() => {
    if (!node) return [];
    const list = [];
    const loc = node.metadata?.loc || 0;
    if (loc > 250) {
      list.push("Component size exceeds 250 lines of code. Decompose into smaller components to keep modules focused.");
    }
    if (isCyclic) {
      list.push("Component is flagged inside a circular rendering loop. Refactor tree structure to break dependencies.");
    }
    if (node.metadata?.children?.length > 12) {
      list.push("Renders more than 12 child nodes. Group children inside layout containers or decompose rendering sections.");
    }
    const isOrphan = parentNodes.length === 0 && !["page", "layout", "provider", "context"].includes(node.subtype);
    if (isOrphan) {
      list.push("No components render this element. Consider checking if it represents unused/dead code.");
    }
    if (list.length === 0) {
      list.push("No violations. Component complies with project architecture standards.");
    }
    return list;
  }, [node, parentNodes, isCyclic]);

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
            Architectural Inspector
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <Info size={24} className="text-neutral-300 mb-2" />
          <span style={{ fontSize: 12, color: "#9CA3AF", fontFamily: INTER, fontWeight: 500 }}>Select a component to inspect its architecture</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;
  const propsList = node.metadata?.props || [];
  const hooksList = node.metadata?.hooks || [];
  const importsList = node.metadata?.imports || [];


  // Derive Component Architectural Role Label
  const getRoleLabel = () => {
    if (node.subtype === "layout") return "Layout Template Wrapper";
    if (node.subtype === "page") return "Page View Controller";
    if (node.subtype === "provider") return "React Context Provider";
    if (node.subtype === "context") return "React Context Definition";
    return "User Interface Component";
  };

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
      {/* Panel header */}
      <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid #F1F3F5", flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#C8CDD8", fontFamily: INTER }}>
          Architectural Specs
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ padding: "18px 20px 28px" }}
        >
          {/* Component Identity */}
          <div>
            <span style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: cfg.text,
              background: cfg.bg,
              padding: "2px 6px",
              borderRadius: 4,
              fontFamily: INTER,
            }}>
              {cfg.label}
            </span>
            <h2 style={{
              fontSize: 20,
              fontWeight: 650,
              color: "#111827",
              letterSpacing: "-0.035em",
              margin: "6px 0 3px",
              lineHeight: 1.2,
              fontFamily: INTER,
            }}>
              {node.name}
            </h2>
            <p style={{
              fontSize: 10,
              color: "#6B7280",
              fontFamily: INTER,
              margin: "0 0 8px",
              fontWeight: 500,
            }}>
              {getRoleLabel()}
            </p>
            <p style={{
              fontSize: 9.5,
              color: "#A0A8B4",
              fontFamily: MONO,
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }} title={node.file}>
              {node.file}
            </p>
          </div>

          <Sep />

          {/* Architectural Health */}
          <SectionLabel>Architecture Health</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11.5, color: "#4B5563", fontWeight: 500, fontFamily: INTER }}>Complexity (LOC)</span>
              <span style={{ fontSize: 11.5, color: "#111827", fontFamily: MONO, fontWeight: 600 }}>{node.metadata?.loc || 0} lines</span>
            </div>
            {node.metadata?.loc > 250 && (
              <div className="flex gap-2 p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 text-[10px] text-amber-800 font-sans leading-normal">
                <AlertTriangle size={12} className="text-amber-600 shrink-0 mt-0.5" />
                <span>Large Component Warning. Exceeds 250 LOC threshold.</span>
              </div>
            )}
            {isCyclic && (
              <div className="flex gap-2 p-2.5 rounded-lg border border-red-100 bg-red-50/50 text-[10px] text-red-800 font-sans leading-normal">
                <XCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                <span>Cyclic Render Loop detected for this module.</span>
              </div>
            )}
          </div>

          <Sep />

          {/* Hierarchy Connections */}
          <SectionLabel>Hierarchy Connections</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Parents list */}
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 5px" }}>Rendered By (Parents)</p>
              {parentNodes.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Entry point)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parentNodes.map(p => (
                    <span
                      key={p.id}
                      onClick={() => onNavigate(p.id)}
                      style={{ fontSize: 10.5, fontFamily: MONO, color: "#4B5563", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-neutral-200"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Children list */}
            <div>
              <p style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", margin: "5px 0 5px" }}>Renders (Children)</p>
              {childNodes.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Leaf Component)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {childNodes.map(c => (
                    <span
                      key={c.id}
                      onClick={() => onNavigate(c.id)}
                      style={{ fontSize: 10.5, fontFamily: MONO, color: "#2563EB", background: "#EFF6FF", padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-blue-100"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Sep />

          {/* Props Specs */}
          {propsList.length > 0 && (
            <>
              <SectionLabel>Properties (Props)</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
                {propsList.map(prop => (
                  <div
                    key={prop.name}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background: prop.required ? "#3B82F6" : "#9CA3AF",
                      }} />
                      <span style={{ fontSize: 11.5, color: "#374151", fontFamily: MONO, fontWeight: 600, truncate: true }}>
                        {prop.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 10.5, color: "#9CA3AF", fontFamily: MONO }}>
                      {prop.type || "any"}
                    </span>
                  </div>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* State Slices Consumed */}
          {consumedStates.length > 0 && (
            <>
              <SectionLabel>Consumed State Slices</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {consumedStates.map(state => (
                  <span
                    key={state.id}
                    style={{ fontSize: 10.5, fontFamily: MONO, color: "#4F46E5", background: "#EEF2FF", padding: "2px 6px", borderRadius: 4 }}
                  >
                    {state.name}
                  </span>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* API endpoints used */}
          {apiCalls.length > 0 && (
            <>
              <SectionLabel>API Services Consumed</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 }}>
                {apiCalls.map(api => (
                  <div
                    key={api.id}
                    style={{ fontSize: 10.5, fontFamily: MONO, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: 4, border: "1px solid #FDE68A" }}
                  >
                    {api.name}
                  </div>
                ))}
              </div>
              <Sep />
            </>
          )}

          {/* Custom hooks */}
          {hooksList.length > 0 && (
            <>
              <SectionLabel>Hooks Used</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 16 }}>
                {hooksList.map(hook => {
                  const builtin = BUILTIN_HOOKS.has(hook);
                  return (
                    <span
                      key={hook}
                      style={{
                        fontSize: 10.5,
                        fontFamily: MONO,
                        color: builtin ? "#6B7280" : "#059669",
                        background: builtin ? "#F3F4F6" : "#ECFDF5",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}
                    >
                      {hook}
                    </span>
                  );
                })}
              </div>
              <Sep />
            </>
          )}

          {/* Recommendations */}
          <SectionLabel>Architecture Recommendations</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-2 p-2.5 rounded-xl border border-neutral-100 bg-[#F9FAFB] text-[10.5px] text-neutral-600 font-sans leading-relaxed">
                <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>

          {/* Imports */}
          {importsList.length > 0 && (
            <>
              <Sep />
              <SectionLabel>Imports</SectionLabel>
              <p style={{
                fontSize: 10,
                color: "#A8B0BF",
                fontFamily: MONO,
                letterSpacing: "-0.02em",
                lineHeight: 1.9,
                margin: 0,
                whiteSpace: "pre-wrap"
              }}>
                {importsList.join(",\n")}
              </p>
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
      {/* Back button */}
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

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30,
          height: 30,
          background: "#111827",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          <Layers size={14} color="white" />
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
            Architecture Studio — Component Nesting Hierarchy
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: "#E8EAED", margin: "0 16px" }} />

      {/* Project path */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12, color: "#A8B0BF", fontFamily: INTER }}>{projectName || "react-project"}</span>
        <ChevronRight size={11} color="#D1D5DB" />
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GitBranch size={11} color="#9CA3AF" />
          <span style={{ fontSize: 12, color: "#374151", fontFamily: INTER, fontWeight: 500 }}>main</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Nesting Hierarchy Info Badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginRight: 12,
        padding: "4px 10px",
        background: "#EFF6FF",
        borderRadius: 6,
        border: "1px solid #BFDBFE",
      }}>
        <span style={{ fontSize: 10, color: "#1D4ED8", fontFamily: INTER, fontWeight: 650 }}>
          Parent-Child Nesting Tree
        </span>
      </div>

      {/* Component count pill */}
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
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }} />
        <span style={{ fontSize: 11, color: "#6B7280", fontFamily: INTER }}>
          {nodeCount} components
        </span>
      </div>

      {/* Actions */}
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

// ─── TreeNode Helper Components ──────────────────────────────────────────────

function findPathToNode(nodesList, targetId, currentPath = []) {
  for (const node of nodesList) {
    const nextPath = node.kind === "category" ? currentPath : [...currentPath, node];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const path = findPathToNode(node.children, targetId, nextPath);
      if (path) return path;
    }
  }
  return null;
}

function TreeNode({ node, selectedId, onSelect, expandedNodes, toggleExpand }) {
  const isExpanded = !!expandedNodes[node.id];
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = () => {
    if (node.kind === "category") return null;
    if (node.kind === "component") {
      if (node.subtype === "page") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", flexShrink: 0 }} />;
      if (node.subtype === "layout") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", flexShrink: 0 }} />;
      if (node.subtype === "provider" || node.subtype === "context") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#DB2777", flexShrink: 0 }} />;
      return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#059669", flexShrink: 0 }} />;
    }
    if (node.kind === "state") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4F46E5", flexShrink: 0 }} />;
    if (node.kind === "api") return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", flexShrink: 0 }} />;
    return <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#9CA3AF", flexShrink: 0 }} />;
  };

  const getSubtypeLabel = () => {
    if (node.kind === "category") return null;
    if (node.kind === "component") return node.subtype || "component";
    return node.kind;
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (node.kind !== "category") {
      onSelect(node.id);
    } else {
      toggleExpand(node.id);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingLeft: node.kind === "category" ? 0 : 8 }}>
      {/* Node Row */}
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "5px 8px",
          borderRadius: 6,
          cursor: "pointer",
          background: isSelected ? "#EFF6FF" : "transparent",
          border: isSelected ? "1px solid #BFDBFE" : "1px solid transparent",
          transition: "background 0.12s, border-color 0.12s",
          gap: 6,
          userSelect: "none"
        }}
        className={!isSelected && node.kind !== "category" ? "hover:bg-neutral-100/70" : ""}
      >
        {/* Toggle Arrow for folders/categories */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.id);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#9CA3AF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: 14,
              height: 14,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.12s"
            }}
          >
            <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        ) : (
          <div style={{ width: 14 }} />
        )}

        {/* Semantic dot color indicator */}
        {getIcon()}

        {/* Name */}
        <span
          style={{
            fontSize: node.kind === "category" ? 10.5 : 12,
            fontFamily: node.kind === "category" ? INTER : MONO,
            fontWeight: node.kind === "category" ? 750 : isSelected ? 650 : 500,
            color: node.kind === "category" ? "#8A909E" : isSelected ? "#1D4ED8" : "#374151",
            letterSpacing: node.kind === "category" ? "0.06em" : "-0.015em",
            textTransform: node.kind === "category" ? "uppercase" : "none"
          }}
        >
          {node.name}
          {node.isLoop && <span style={{ color: "#EF4444", fontSize: 9, marginLeft: 4, fontWeight: 700 }}>[loop]</span>}
        </span>

        {/* Subtype tag */}
        {getSubtypeLabel() && (
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "1px 5px",
              borderRadius: 4,
              fontFamily: INTER,
              letterSpacing: "0.03em",
              marginLeft: "auto",
              background: isSelected ? "#DBEAFE" : "#F3F4F6",
              color: isSelected ? "#1e40af" : "#4B5563",
              flexShrink: 0
            }}
          >
            {getSubtypeLabel()}
          </span>
        )}
      </div>

      {/* Children Nodes */}
      {hasChildren && isExpanded && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #E5E7EB",
          marginLeft: 14,
          paddingLeft: 4,
          marginTop: 2,
          gap: 2
        }}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner React Flow Canvas Component ─────────────────────────────────────────

function ArchitectureFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const reduxFiles = useSelector((state) => state.graph.files);
  const analysis = useSelector((state) => state.analysis);

  // Tab Selection Switcher: "summary" | "explore" | "graph"
  const [activeTab, setActiveTab] = useState("summary");

  const validation = useMemo(() => {
    return knowledgeGraph?.validation || { errors: [], warnings: [], suggestions: [] };
  }, [knowledgeGraph]);

  const reduxNodes = useMemo(() => {
    return knowledgeGraph?.nodes.filter(n => n.kind === "component") || [];
  }, [knowledgeGraph]);

  const reduxEdges = useMemo(() => {
    return knowledgeGraph?.edges.filter(e => e.type === "RENDERS") || [];
  }, [knowledgeGraph]);

  const selectedId = useSelector((state) => state.graph.selectedNodeId);

  const setSelectedId = useCallback((id) => {
    dispatch(selectNodeId(id));
  }, [dispatch]);

  const [isGraphFullscreen, setIsGraphFullscreen] = useState(false);

  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const handleToggleGraphFullscreen = useCallback(() => {
    setIsGraphFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        fitView({ padding: 0.15, duration: 300 });
      }, 100);
      return next;
    });
  }, [fitView]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({
    customNode: CustomNode,
  }), []);

  // Pre-select default page node
  useEffect(() => {
    if (reduxNodes.length > 0 && !selectedId) {
      const dashboardNode = reduxNodes.find(n => n.name.toLowerCase().includes("dashboard") || n.id.toLowerCase().includes("dashboard"));
      const appNode = reduxNodes.find(n => n.name === "App" || n.id.includes("App"));
      const defaultNode = dashboardNode || appNode || reduxNodes[0];
      setSelectedId(defaultNode.id);
    }
  }, [reduxNodes, selectedId, setSelectedId]);

  // Map to React Flow models when nodes/edges or selection changes
  useEffect(() => {
    if (reduxNodes && reduxNodes.length > 0) {
      const { rfNodes, rfEdges } = toReactFlow(reduxNodes, reduxEdges, selectedId);
      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [reduxNodes, reduxEdges, selectedId, setNodes, setEdges]);

  // Fit View on initial nodes load
  useEffect(() => {
    if (nodes.length > 0) {
      const t = setTimeout(() => {
        fitView({ padding: 0.15, duration: 400 });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [reduxNodes, fitView, nodes.length]);

  const selectedNode = useMemo(() => {
    if (!knowledgeGraph) return null;
    return knowledgeGraph.nodes.find(n => n.id === selectedId) || null;
  }, [knowledgeGraph, selectedId]);

  const uniqueFiles = useMemo(() => {
    return reduxFiles || [];
  }, [reduxFiles]);

  const handleNodeClick = useCallback((event, node) => {
    setSelectedId(node.id);
  }, [setSelectedId]);

  const handlePaneClick = useCallback(() => {
    setSelectedId("");
  }, [setSelectedId]);

  const handleBack = () => {
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  };

  // Guard: if no project is active, redirect to Hub
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    }
  }, [selectedProject, navigate]);

  // Traversal layer model generation
  const architectureModel = useMemo(() => {
    return buildArchitectureModel(knowledgeGraph);
  }, [knowledgeGraph]);

  // Breadcrumbs generator
  const breadcrumbs = useMemo(() => {
    if (!selectedId) return [];
    return findPathToNode(architectureModel, selectedId) || [];
  }, [architectureModel, selectedId]);

  // Tree expand/collapse states
  const [expandedNodes, setExpandedNodes] = useState({});

  const toggleExpand = useCallback((id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Pre-expand roots and categories on load
  useEffect(() => {
    if (architectureModel.length > 0) {
      const timer = setTimeout(() => {
        setExpandedNodes(prev => {
          const next = { ...prev };
          architectureModel.forEach(root => {
            next[root.id] = true;
            if (root.children) {
              root.children.forEach(cat => {
                next[cat.id] = true;
              });
            }
          });
          return next;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [architectureModel]);

  // Derive summary metrics
  const summaryMetrics = useMemo(() => {
    const componentCount = reduxNodes.length;
    const routeCount = knowledgeGraph?.nodes.filter(n => n.kind === "route" && n.subtype !== "router").length || 0;
    const contextCount = knowledgeGraph?.nodes.filter(n => n.kind === "component" && (n.subtype === "provider" || n.subtype === "context")).length || 0;
    const apiEndpointCount = knowledgeGraph?.nodes.filter(n => n.kind === "api" && n.subtype === "endpoint").length || 0;
    const stateCount = knowledgeGraph?.nodes.filter(n => n.kind === "state" && n.subtype === "slice").length || 0;
    
    // Largest component
    let largestComp = null;
    reduxNodes.forEach(c => {
      const loc = c.metadata?.loc || 0;
      if (!largestComp || loc > (largestComp.metadata?.loc || 0)) {
        largestComp = c;
      }
    });

    // Circular loops
    const cycles = validation.warnings?.filter(w => w.type === "CIRCULAR_REFERENCE") || [];

    // Dead component check
    const deadComps = analysis.deadCode?.unusedComponents || [];

    return {
      componentCount,
      routeCount,
      contextCount,
      apiEndpointCount,
      stateCount,
      largestComp,
      cycles,
      deadComps
    };
  }, [reduxNodes, knowledgeGraph, validation, analysis]);

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
      <TopBar nodeCount={reduxNodes.length} projectName={selectedProject.name} handleBack={handleBack} />
      
      {/* Perspectives tabs switching bar */}
      <div style={{
        display: "flex",
        background: "#FFFFFF",
        borderBottom: "1px solid #E8EAED",
        padding: "0 24px",
        gap: 28,
        height: 40,
        alignItems: "center",
        flexShrink: 0,
        zIndex: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
      }}>
        {[
          { id: "summary", label: "Summary", desc: "Overall Health Diagnostics" },
          { id: "explore", label: "Explore", desc: "Component Traversal Tree" },
          { id: "graph",   label: "Graph",   desc: "Interactive React Flow View" }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "2px solid #3B82F6" : "2px solid transparent",
                color: isActive ? "#2563EB" : "#6B7280",
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                padding: "10px 4px 8px",
                cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                fontFamily: INTER,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "#111827"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#6B7280"; }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* Left Directory Tree Pane (Shown only in Graph and Explore modes) */}
        {!isGraphFullscreen && activeTab !== "summary" && (
          <aside className="w-64 border-r border-neutral-200 bg-[#F9FAFB] p-6 flex flex-col gap-6 shrink-0 overflow-y-auto select-none">
            <div>
              <h4 className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-3.5 font-bold">
                Detected Files
              </h4>
              <div className="flex flex-col gap-2">
                {uniqueFiles.map((f) => {
                  const active = selectedNode && selectedNode.file === f;
                  const matchingNode = reduxNodes.find(n => n.file === f);
                  return (
                    <div
                      key={f}
                      onClick={() => {
                        if (matchingNode) {
                          setSelectedId(matchingNode.id);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                        matchingNode ? "cursor-pointer" : "opacity-60 cursor-not-allowed"
                      } ${
                        active 
                          ? "border-blue-200 bg-blue-50/60 text-blue-700 shadow-sm" 
                          : matchingNode
                          ? "border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 hover:border-neutral-200"
                          : "border-transparent text-neutral-400"
                      }`}
                    >
                      <FileCode size={12} className={active ? "text-blue-500" : "text-neutral-400"} />
                      <span className="font-mono text-[10.5px] truncate" title={f}>{f.split("/").pop()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostics Alerts */}
            {((validation.errors && validation.errors.length > 0) || (validation.warnings && validation.warnings.length > 0)) && (
              <div className="mt-2 pt-4 border-t border-neutral-200/80">
                <h4 className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-3.5 font-bold flex items-center gap-1.5">
                  <ShieldAlert size={11} className="text-amber-500" />
                  Code Diagnostics
                </h4>
                <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {validation.errors.map((err, i) => {
                    const matchingNode = err.file ? reduxNodes.find(n => n.file === err.file) : null;
                    return (
                      <div
                        key={`err-${i}`}
                        onClick={() => {
                          if (matchingNode) setSelectedId(matchingNode.id);
                        }}
                        className={`p-2.5 rounded-xl border border-red-100 bg-red-50/40 text-red-800 text-[11px] leading-normal flex flex-col gap-1 transition-all duration-150 ${
                          matchingNode ? "cursor-pointer hover:bg-red-50 hover:border-red-200" : ""
                        }`}
                      >
                        <div className="flex items-start gap-1.5 font-bold text-red-700">
                          <XCircle size={11} className="text-red-500 shrink-0 mt-0.5" />
                          <span>{err.type || "Error"}</span>
                        </div>
                        <p className="text-neutral-600 font-sans text-[10px] leading-normal">{err.message}</p>
                        {err.file && (
                          <span className="font-mono text-[9px] text-neutral-400 truncate mt-0.5" title={err.file}>
                            {err.file.split("/").pop()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {validation.warnings.map((warn, i) => {
                    const matchingNode = warn.file ? reduxNodes.find(n => n.file === warn.file) : null;
                    return (
                      <div
                        key={`warn-${i}`}
                        onClick={() => {
                          if (matchingNode) setSelectedId(matchingNode.id);
                        }}
                        className={`p-2.5 rounded-xl border border-amber-100 bg-amber-50/40 text-amber-800 text-[11px] leading-normal flex flex-col gap-1 transition-all duration-150 ${
                          matchingNode ? "cursor-pointer hover:bg-amber-50 hover:border-amber-200" : ""
                        }`}
                      >
                        <div className="flex items-start gap-1.5 font-bold text-amber-700">
                          <AlertTriangle size={11} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>{warn.type || "Warning"}</span>
                        </div>
                        <p className="text-neutral-600 font-sans text-[10px] leading-normal">{warn.message}</p>
                        {warn.file && (
                          <span className="font-mono text-[9px] text-neutral-400 truncate mt-0.5" title={warn.file}>
                            {warn.file.split("/").pop()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Center content depending on active tab view */}
        <main className="flex-1 flex flex-col relative bg-[#F8F9FB] overflow-hidden">
          
          {/* TAB 1: SUMMARY VIEW */}
          {activeTab === "summary" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px", boxSizing: "border-box" }} className="w-full flex flex-col gap-8 max-w-6xl mx-auto">
              
              {/* Header block */}
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: "-0.04em", margin: "0 0 6px", fontFamily: INTER }}>
                  Architecture Summary
                </h1>
                <p style={{ fontSize: 13, color: "#6B7280", margin: 0, fontFamily: INTER }}>
                  High-level diagnostics and metric insights of the project.
                </p>
              </div>

              {/* Grid 1: Health & Metrics overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Health & Score Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF" }}>
                    Architecture Health
                  </span>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      border: "4px solid #EFF6FF",
                      borderTopColor: (analysis.architectureHealth?.score || 100) >= 80 ? "#10B981" : (analysis.architectureHealth?.score || 100) >= 60 ? "#F59E0B" : "#EF4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#111827",
                      fontFamily: MONO
                    }}>
                      {analysis.architectureHealth?.score || 100}
                    </div>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 750, color: (analysis.architectureHealth?.score || 100) >= 80 ? "#10B981" : (analysis.architectureHealth?.score || 100) >= 60 ? "#F59E0B" : "#EF4444", fontFamily: INTER, lineHeight: 1 }}>
                        Grade {analysis.architectureHealth?.grade || "A"}
                      </div>
                      <span style={{ fontSize: 11.5, color: "#9CA3AF", fontFamily: INTER }}>Based on modularity standards</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid #F3F4F6", paddingTop: 14 }}>
                    {(analysis.architectureHealth?.ruleResults || []).map(r => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContext: "space-between", fontSize: 11, color: "#4B5563" }}>
                        <span>{r.label}</span>
                        {r.deduction > 0 ? (
                          <span style={{ color: "#EF4444", fontWeight: 600 }}>-{r.deduction} pts</span>
                        ) : (
                          <span style={{ color: "#10B981", fontWeight: 650 }}>Optimal</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project DNA Metrics Card */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF" }}>
                    Project DNA
                  </span>

                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {[
                      { label: "Components", value: summaryMetrics.componentCount },
                      { label: "State Slices", value: summaryMetrics.stateCount },
                      { label: "API Services", value: summaryMetrics.apiEndpointCount },
                      { label: "Routing Paths", value: summaryMetrics.routeCount },
                    ].map(dna => (
                      <div key={dna.label} style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", justifyContext: "center" }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#111827", fontFamily: MONO }}>{dna.value}</span>
                        <span style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{dna.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Investigation */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF" }}>
                    Recommended Action
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContext: "center" }}>
                    {summaryMetrics.cycles.length > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, leading: "normal" }}>
                          Investigate circular component rendering loop between <strong>{summaryMetrics.cycles[0].message.split('"')[1] || "modules"}</strong>.
                        </p>
                      </div>
                    ) : summaryMetrics.largestComp && (summaryMetrics.largestComp.metadata?.loc || 0) > 250 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, leading: "normal" }}>
                          Refactor large component <strong>{summaryMetrics.largestComp.name}</strong> ({summaryMetrics.largestComp.metadata?.loc} LOC) by breaking it down.
                        </p>
                      </div>
                    ) : summaryMetrics.deadComps.length > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, leading: "normal" }}>
                          Review and clean up dead component <strong>{summaryMetrics.deadComps[0].name}</strong> which appears unused.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                        <p style={{ fontSize: 11.5, color: "#10B981", margin: 0, fontWeight: 600 }}>
                          Architecture matches optimal code quality parameters!
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {summaryMetrics.largestComp && (
                    <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10, display: "flex", alignItems: "center", justifyContext: "space-between", fontSize: 10.5, color: "#6B7280" }}>
                      <span>Largest Component</span>
                      <strong style={{ fontFamily: MONO, color: "#374151" }}>{summaryMetrics.largestComp.name} ({summaryMetrics.largestComp.metadata?.loc} lines)</strong>
                    </div>
                  )}
                </div>

              </div>

              {/* Grid 2: Warnings & Issues list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Circular Loops & Dead components */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF" }}>
                    Rendering Cycles & Dead Modules
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                    {summaryMetrics.cycles.map((c, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-red-50 text-[11px] text-red-800 leading-normal">
                        <AlertTriangle size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <span>{c.message}</span>
                      </div>
                    ))}
                    {summaryMetrics.deadComps.map((c, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-neutral-50 text-[11px] text-neutral-600 leading-normal">
                        <Info size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                        <span>Unused component: <strong>{c.name}</strong> ({c.file})</span>
                      </div>
                    ))}
                    {summaryMetrics.cycles.length === 0 && summaryMetrics.deadComps.length === 0 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContext: "center", padding: "30px 0", color: "#D1D5DB" }}>
                        <CheckCircle size={22} className="text-emerald-400 mb-1" />
                        <span style={{ fontSize: 11.5, color: "#9CA3AF" }}>No circular renders or dead components found.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Largest Files Grid */}
                <div style={{ background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9CA3AF" }}>
                    Largest Code Modules
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {reduxNodes
                      .slice()
                      .sort((a, b) => (b.metadata?.loc || 0) - (a.metadata?.loc || 0))
                      .slice(0, 5)
                      .map((c, i) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContext: "space-between", padding: "6px 0", borderBottom: "1px solid #F9FAFB" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: MONO }}>0{i+1}</span>
                            <span style={{ fontSize: 12, fontFamily: MONO, color: "#374151" }}>{c.name}</span>
                          </div>
                          <span style={{ fontSize: 11.5, color: "#6B7280", fontFamily: MONO }}>{c.metadata?.loc || 0} lines</span>
                        </div>
                      ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: EXPLORE TREE VIEW */}
          {activeTab === "explore" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "20px 24px 28px", boxSizing: "border-box", overflow: "hidden" }}>
              
              {/* Breadcrumbs Trail */}
              {breadcrumbs && (
                <div style={{ flexShrink: 0 }}>
                  {breadcrumbs.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 8, padding: "8px 12px", marginBottom: 16 }}>
                      <span style={{ fontSize: 10, fontWeight: 650, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.02em", fontFamily: INTER }}>Path:</span>
                      <span style={{ fontSize: 11.5, color: "#A8B0BF", fontStyle: "italic", fontFamily: INTER }}>No component selected</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", border: "1px solid #E8EAED", borderRadius: 8, padding: "8px 12px", marginBottom: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, fontWeight: 650, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.02em", fontFamily: INTER }}>Path:</span>
                      {breadcrumbs.map((crumb, idx) => (
                        <div key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {idx > 0 && <ChevronRight size={10} color="#D1D5DB" strokeWidth={2.5} />}
                          <span
                            onClick={() => setSelectedId(crumb.id)}
                            style={{
                              fontSize: 11.5,
                              fontFamily: MONO,
                              fontWeight: idx === breadcrumbs.length - 1 ? 650 : 500,
                              color: idx === breadcrumbs.length - 1 ? "#2563EB" : "#4B5563",
                              cursor: "pointer",
                            }}
                            className="hover:underline"
                          >
                            {crumb.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tree Container scroll */}
              <div style={{
                flex: 1,
                background: "#FFFFFF",
                border: "1px solid #E8EAED",
                borderRadius: 12,
                padding: "20px 24px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}>
                {architectureModel.length === 0 ? (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContext: "center", color: "#B8BEC9", fontSize: 13 }}>
                    No architecture model trees generated.
                  </div>
                ) : (
                  architectureModel.map((rootNode) => (
                    <TreeNode
                      key={rootNode.id}
                      node={rootNode}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      expandedNodes={expandedNodes}
                      toggleExpand={toggleExpand}
                    />
                  ))
                )}
              </div>

            </div>
          )}

          {/* TAB 3: GRAPH VIEW */}
          {activeTab === "graph" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
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
                  color="rgba(59,130,246,0.15)"
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
                {Object.values(TYPE_CFG).map((cfg) => (
                  <div key={cfg.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#9CA3AF", fontFamily: INTER, letterSpacing: "-0.01em" }}>
                      {cfg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>

        {/* Right Inspector Panel */}
        {!isGraphFullscreen && (
          <InspectorPanel nodes={reduxNodes} node={selectedNode} onNavigate={setSelectedId} knowledgeGraph={knowledgeGraph} />
        )}
      </div>
    </div>
  );
}

// ─── Main Export Component with React Flow Provider ──────────────────────────

export default function Architecture() {
  // Visual mount continuity transition
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
      <ArchitectureFlow />
    </ReactFlowProvider>
  );
}
