import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  GitBranch,
  ChevronDown,
  Copy,
  Check,
  Sparkles,
  FolderOpen,
  Network,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  FileCode
} from "lucide-react";
import { calculateMaintainability } from "@/engines/analysis/modules/maintainability";
import { analyzeImpact } from "@/engines/analysis";
import { INTER, MONO, TYPE_CFG, BUILTIN_HOOKS } from "./constants";

const RISK_STYLE = {
  low: { text: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Low Risk" },
  medium: { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "Medium Risk" },
  high: { text: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "High Risk" },
};

function ImpactGroup({ label, items, tone, onNavigate }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 9.5, color: "#9CA3AF", fontFamily: INTER, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.02em", margin: "0 0 5px" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {items.slice(0, 6).map(item => (
          <span
            key={`${label}-${item.id}`}
            onClick={() => onNavigate?.(item.id)}
            title={item.file}
            style={{
              fontSize: 10,
              fontFamily: MONO,
              color: tone.text,
              background: tone.bg,
              padding: "2px 6px",
              borderRadius: 4,
              cursor: "pointer",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              transition: "opacity 0.15s",
            }}
            className="hover:opacity-80"
          >
            {item.name}
          </span>
        ))}
        {items.length > 6 && (
          <span style={{ fontSize: 10, fontFamily: MONO, color: "#6B7280", background: "#F3F4F6", padding: "2px 6px", borderRadius: 4 }}>
            +{items.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
}

function AccordionSection({ id, title, count, expanded, onToggle, children, refProp }) {
  return (
    <div
      ref={refProp}
      style={{
        borderBottom: "1px solid rgba(139, 92, 26, 0.04)",
        background: expanded ? "rgba(255, 255, 255, 0.25)" : "transparent",
        transition: "background-color 0.2s ease"
      }}
    >
      <button
        onClick={() => onToggle(id)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          outline: "none"
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: INTER, color: expanded ? "#8B7E66" : "#2E2D2B", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
          {title}
          {count !== undefined && count > 0 && (
            <span style={{
              fontSize: 9.5,
              fontWeight: 650,
              background: expanded ? "#FAF9F6" : "#F5F3EF",
              color: expanded ? "#8B7E66" : "#8C867C",
              padding: "1px 5px",
              borderRadius: 999,
              fontFamily: MONO
            }}>
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: expanded ? "#8B7E66" : "#8C867C",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 20px 18px", fontSize: 11.5, color: "#4B5563", fontFamily: INTER, lineHeight: 1.5 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InspectorPanel({
  node,
  onNavigate,
  knowledgeGraph,
  treeNode,
  onHighlightDependencies,
  onHighlightParents,
  onHighlightChildren
}) {
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Accordion Sections Expand States
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    health: true,
    hierarchy: false,
    dependencies: false,
    hooks: false,
    state: false,
    apis: false,
    imports: false,
    impact: false,
    related: false,
  });

  const impactRef = useRef(null);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Copy success toggle
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Section toggle handler
  const handleToggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Action handlers
  const handleOpenFile = () => {
    if (!node) return;
    const fileUrl = `/__open-in-editor?file=${encodeURIComponent(node.file)}`;
    fetch(fileUrl)
      .then(res => {
        if (res.status === 200 || res.ok) {
          setToast(`Opening ${node.name} in your editor...`);
        } else {
          setToast(`Opening request sent for: ${node.file.split("/").pop()}`);
        }
      })
      .catch(() => {
        setToast(`Request sent. Editor opening is available in dev mode.`);
      });
  };

  const handleCopyPath = () => {
    if (!node) return;
    navigator.clipboard.writeText(node.file)
      .then(() => {
        setCopied(true);
        setToast("File path copied to clipboard!");
      })
      .catch(() => {
        setToast("Failed to copy file path.");
      });
  };

  const handleHighlight = (type) => {
    if (!node) return;
    if (type === "dependencies" && onHighlightDependencies) {
      onHighlightDependencies();
      setToast("Highlighting component dependencies");
    } else if (type === "parents" && onHighlightParents) {
      onHighlightParents();
      setToast("Highlighting component parents");
    } else if (type === "children" && onHighlightChildren) {
      onHighlightChildren();
      setToast("Highlighting component children");
    } else {
      setToast(`Highlighting ${type} in visualization views.`);
    }
  };

  const handleScrollToImpact = () => {
    setExpandedSections(prev => ({ ...prev, impact: true }));
    setToast("Scrolled to Impact Analysis");
    setTimeout(() => {
      if (impactRef.current) {
        impactRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 120);
  };


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

  // Check if component has circular rendering warnings
  const isCyclic = useMemo(() => {
    if (!knowledgeGraph || !node) return false;
    const cycles = knowledgeGraph.validation?.warnings?.filter(w => w.type === "CIRCULAR_REFERENCE" && w.file === node.file) || [];
    return cycles.length > 0;
  }, [knowledgeGraph, node]);

  // Maintainability details
  const maintainability = useMemo(() => {
    if (!node || node.kind !== "component") return null;
    return calculateMaintainability(node, knowledgeGraph);
  }, [node, knowledgeGraph]);

  // Impact analysis
  const impact = useMemo(() => {
    if (!node || !knowledgeGraph) return null;
    return analyzeImpact(knowledgeGraph, node.id);
  }, [knowledgeGraph, node]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    if (!node) return [];
    if (node.kind === "component") {
      const list = [...(maintainability?.recommendations || [])];
      if (isCyclic) {
        list.push("Component is flagged inside a circular rendering loop. Refactor tree structure to break dependencies.");
      }
      return list;
    }
    const list = [];
    if (node.kind === "route") {
      list.push("Ensure routing parameters are validated at the page component level.");
    } else if (node.kind === "state") {
      list.push("Keep slice reducers side-effect free. Use middleware or thunks for async logic.");
    } else if (node.kind === "api") {
      list.push("Centralize API calls in service modules. Avoid importing axios/fetch directly into UI components.");
    }
    if (list.length === 0) {
      list.push("Node complies with project architecture standards.");
    }
    return list;
  }, [node, maintainability, isCyclic]);

  // Separate imports into Internal & External
  const dependenciesList = useMemo(() => {
    if (!node) return { external: [], internal: [] };
    const imports = node.metadata?.imports || [];
    const external = [];
    const internal = [];

    imports.forEach(imp => {
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      const source = match ? match[1] : imp;
      
      if (source.startsWith(".") || source.startsWith("@/")) {
        internal.push(source);
      } else {
        external.push(source);
      }
    });

    return { external, internal };
  }, [node]);

  // Compute Related Files
  const relatedFiles = useMemo(() => {
    if (!knowledgeGraph || !node) return [];
    const parts = node.file.split("/");
    parts.pop();
    const folder = parts.join("/");
    
    const matched = [];
    const siblings = new Set();
    
    knowledgeGraph.nodes.forEach(n => {
      if (n.file && n.file !== node.file && n.file.startsWith(folder)) {
        const relative = n.file.replace(folder + "/", "");
        if (!relative.includes("/")) {
          siblings.add(n.file);
        }
      }
    });

    siblings.forEach(file => {
      const isRelatedComponent = knowledgeGraph.nodes.find(n => n.file === file && n.kind === "component");
      matched.push({
        name: file.split("/").pop(),
        path: file,
        type: file.endsWith(".css") ? "style" : file.endsWith(".test.js") || file.endsWith(".test.jsx") ? "test" : "code",
        nodeId: isRelatedComponent?.id || null
      });
    });

    return matched;
  }, [knowledgeGraph, node]);

  // Generate dynamic AI report
  const generateAIReport = () => {
    if (!node) return null;
    
    const reports = [];
    reports.push({
      title: "System Role Description",
      content: `The component '${node.name}' acts as a ${getRoleLabel().toLowerCase()} in the project tree structure. It resides in '${node.file}'.`
    });

    if (maintainability) {
      const score = maintainability.score;
      const status = score >= 85 ? "excellent quality" : score >= 70 ? "moderate maintainability" : "refactoring candidate";
      const tips = maintainability.score < 70 
        ? "We recommend splitting subcomponents, extracting hooks, or flattening nested layouts to bring down LOC and improve cohesion."
        : "No urgent structural updates required. The component is highly modular and cohesive.";
      reports.push({
        title: "Maintainability & Complexity Review",
        content: `Score: ${score}/100 (${status}). The file has ${maintainability.loc} lines of code. ${tips}`
      });
    }

    if (impact) {
      const risk = impact.riskLevel === "high" ? "Critical Risk" : impact.riskLevel === "medium" ? "Moderate Risk" : "Minimal Risk";
      reports.push({
        title: "Blast Radius & Dependencies Impact",
        content: `Refactoring risk level is classified as '${risk}' with a blast radius of ${impact.blastRadius} dependent nodes. It directly depends on ${impact.direct.uses.length} nodes and is consumed upstream by ${impact.direct.usedBy.length} nodes. Modifying its signature requires checking all render references.`
      });
    }

    const steps = [];
    if (maintainability && maintainability.score < 75) {
      steps.push("Decompose large JSX render blocks into smaller subcomponents.");
    }
    if (node.metadata?.hooks && node.metadata.hooks.length > 4) {
      steps.push(`Consolidate hooks (currently utilizing ${node.metadata.hooks.length} hooks) into custom, domain-specific state hooks.`);
    }
    if (apiCalls.length > 0) {
      steps.push("Ensure remote backend endpoints are triggered within thunks/actions rather than inside component side-effects.");
    }
    if (isCyclic) {
      steps.push("Resolve circular imports immediately by introducing an interface layer or external context dispatcher.");
    }
    if (steps.length === 0) {
      steps.push("Adhere to clean coding standards: run prettier, keep props typed, and write tests for edge-cases.");
    }

    reports.push({
      title: "Recommended Refactoring Roadmap",
      items: steps
    });

    return reports;
  };

  const getRoleLabel = () => {
    if (node.kind === "route") {
      return node.subtype === "router" ? "Application Router" : "Route Endpoint";
    }
    if (node.subtype === "layout") return "Layout Template Wrapper";
    if (node.subtype === "page") return "Page View Controller";
    if (node.subtype === "provider") return "React Context Provider";
    if (node.subtype === "context") return "React Context Definition";
    return "User Interface Component";
  };

  if (!node) {
    return (
      <aside style={{
        width: 308,
        background: "#EFECE6",
        borderLeft: "1px solid rgba(139, 92, 26, 0.06)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid rgba(139, 92, 26, 0.05)" }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C867C", fontFamily: INTER }}>
            Architectural Inspector
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <Info size={24} className="text-neutral-400 mb-2" />
          <span style={{ fontSize: 12, color: "#8C867C", fontFamily: INTER, fontWeight: 500 }}>Select a component to inspect its architecture</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;
  const propsList = node.metadata?.props || [];
  const hooksList = node.metadata?.hooks || [];
  const importsList = node.metadata?.imports || [];

  return (
    <aside style={{
      width: 308,
      background: "#EFECE6",
      borderLeft: "1px solid rgba(139, 92, 26, 0.06)",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      position: "relative"
    }}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              background: "rgba(31, 41, 55, 0.95)",
              backdropFilter: "blur(8px)",
              color: "#FFFFFF",
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 10.5,
              fontFamily: INTER,
              fontWeight: 500,
              zIndex: 100,
              boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Info size={12} className="text-blue-400 shrink-0" />
            <span className="truncate">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding: "12px 20px 11px", borderBottom: "1px solid rgba(139, 92, 26, 0.05)", flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8C867C", fontFamily: INTER }}>
          Architectural Specs
        </span>
      </div>

      {/* Accordion container */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>
        
        {/* Node Summary Panel */}
        <div style={{ padding: "18px 20px" }}>
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
            color: "#2E2D2B",
            letterSpacing: "-0.035em",
            margin: "6px 0 3px",
            lineHeight: 1.2,
            fontFamily: INTER,
          }}>
            {node.name}
          </h2>
          <p style={{ fontSize: 10, color: "#6B7280", fontFamily: INTER, margin: "0 0 14px", fontWeight: 500 }}>
            {getRoleLabel()}
          </p>

          {/* Quick Actions Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            background: "#F9FAFB",
            border: "1px solid #F1F5F9",
            borderRadius: 10,
            padding: 8,
          }}>
            <button
              onClick={handleOpenFile}
              title="Open file in IDE"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <FolderOpen size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Open</span>
            </button>
            <button
              onClick={handleCopyPath}
              title="Copy absolute path"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              {copied ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              )}
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>{copied ? "Copied" : "Path"}</span>
            </button>
            <button
              onClick={() => handleHighlight("dependencies")}
              title="Highlight active dependencies"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <Network size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Deps</span>
            </button>
            <button
              onClick={() => handleHighlight("parents")}
              title="Highlight parent nodes"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <ArrowUpCircle size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Parents</span>
            </button>
            <button
              onClick={() => handleHighlight("children")}
              title="Highlight children nodes"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <ArrowDownCircle size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Children</span>
            </button>
            <button
              onClick={handleScrollToImpact}
              title="Scroll to Impact analysis"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <Activity size={13} className="text-neutral-500 group-hover:text-neutral-800" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Impact</span>
            </button>
            <button
              onClick={() => setIsAIModalOpen(true)}
              title="Explain using simulated AI"
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0", border: "none", background: "transparent", cursor: "pointer" }}
              className="hover:bg-neutral-100 rounded-lg group"
            >
              <Sparkles size={13} className="text-blue-500 group-hover:text-blue-600" />
              <span style={{ fontSize: 8.5, fontWeight: 600, color: "#6B7280", fontFamily: INTER }}>Explain</span>
            </button>

          </div>
        </div>

        {/* 1. OVERVIEW */}
        <AccordionSection
          id="overview"
          title="Overview"
          count={node.metadata?.loc}
          expanded={expandedSections.overview}
          onToggle={handleToggleSection}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>File Path</span>
              <span style={{ color: "#4B5563", fontSize: 10.5, fontFamily: MONO, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }} title={node.file}>{node.file}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Decl Line</span>
              <span style={{ color: "#4B5563", fontSize: 10.5, fontFamily: MONO }}>L{node.metadata?.line || 1}</span>
            </div>
            {node.kind === "component" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Export Style</span>
                  <span style={{ color: "#4B5563", fontSize: 10.5, fontFamily: MONO }}>{node.metadata?.isDefaultExport ? "Default Export" : "Named Export"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Paradigm</span>
                  <span style={{ color: "#4B5563", fontSize: 10.5, fontFamily: MONO }}>{node.metadata?.isClassComponent ? "Class Component" : "Functional"}</span>
                </div>
              </>
            )}
            {node.kind === "route" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Router Host</span>
                  <span style={{ color: "#4B5563", fontSize: 10.5, fontFamily: MONO }}>{treeNode?.metadata?.routerType || node.metadata?.source || "Router"}</span>
                </div>
                {node.subtype === "endpoint" && node.metadata?.componentName && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Target Component</span>
                    <span style={{ color: "#2563EB", fontSize: 10.5, fontFamily: MONO, fontWeight: 600 }}>{node.metadata.componentName}</span>
                  </div>
                )}
              </>
            )}

            {propsList.length > 0 && (
              <div style={{ marginTop: 8, borderTop: "1px dashed #F1F3F5", paddingTop: 8 }}>
                <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Props / Properties</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                  {propsList.map(prop => (
                    <div key={prop.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10 }}>
                      <span style={{ fontFamily: MONO, color: "#4B5563" }}>{prop.name}</span>
                      <span style={{ color: "#9CA3AF" }}>{prop.type || "any"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 2. ARCHITECTURE HEALTH */}
        {node.kind === "component" && maintainability && (
          <AccordionSection
            id="health"
            title="Architecture Health"
            count={recommendations.length}
            expanded={expandedSections.health}
            onToggle={handleToggleSection}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: 10.5, fontWeight: 600 }}>Maintainability Score</span>
                <span style={{
                  fontSize: 12,
                  fontFamily: MONO,
                  fontWeight: 700,
                  color: maintainability.score >= 85 ? "#059669" : maintainability.score >= 70 ? "#D97706" : "#DC2626"
                }}>
                  {maintainability.score} / 100
                </span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Complexity Drivers</span>
                {maintainability.drivers.map((drv, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4B5563" }}>
                    {drv.type === "success" ? (
                      <CheckCircle size={10} className="text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle size={10} className="text-amber-500 shrink-0" />
                    )}
                    <span>{drv.text}</span>
                  </div>
                ))}
                {isCyclic && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#DC2626" }}>
                    <XCircle size={10} className="text-red-500 shrink-0" />
                    <span>Cyclic Render Loop detected</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4, borderTop: "1px dashed #F1F3F5", paddingTop: 8 }}>
                <span style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Recommendations</span>
                {recommendations.map((rec, i) => {
                  const isInfo = rec.toLowerCase().includes("consider") || rec.toLowerCase().includes("split") || rec.toLowerCase().includes("decompose");
                  return (
                    <div key={i} className="flex gap-1.5 p-2 rounded-lg border border-neutral-100 bg-[#F9FAFB] text-[10px] text-neutral-600 leading-normal">
                      {isInfo ? (
                        <Info size={10} className="text-blue-500 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle size={10} className="text-emerald-500 shrink-0 mt-0.5" />
                      )}
                      <span>{rec}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionSection>
        )}

        {/* 3. HIERARCHY */}
        <AccordionSection
          id="hierarchy"
          title="Hierarchy"
          count={parentNodes.length + childNodes.length}
          expanded={expandedSections.hierarchy}
          onToggle={handleToggleSection}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", margin: "0 0 5px" }}>Rendered By (Parents)</p>
              {parentNodes.length === 0 ? (
                <p style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Entry point)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {parentNodes.map(p => (
                    <span
                      key={p.id}
                      onClick={() => onNavigate(p.id)}
                      style={{ fontSize: 9.5, fontFamily: MONO, color: "#4B5563", background: "#F3F4F6", padding: "2px 5px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-neutral-200"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", margin: "5px 0 5px" }}>Renders (Children)</p>
              {childNodes.length === 0 ? (
                <p style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None (Leaf Component)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {childNodes.map(c => (
                    <span
                      key={c.id}
                      onClick={() => onNavigate(c.id)}
                      style={{ fontSize: 9.5, fontFamily: MONO, color: "#2563EB", background: "#EFF6FF", padding: "2px 5px", borderRadius: 4, cursor: "pointer" }}
                      className="hover:bg-blue-100"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionSection>

        {/* 4. DEPENDENCIES */}
        <AccordionSection
          id="dependencies"
          title="Dependencies"
          count={dependenciesList.external.length + dependenciesList.internal.length}
          expanded={expandedSections.dependencies}
          onToggle={handleToggleSection}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", margin: "0 0 5px" }}>Third-Party Packages</p>
              {dependenciesList.external.length === 0 ? (
                <p style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {dependenciesList.external.map(ext => (
                    <span
                      key={ext}
                      style={{ fontSize: 9.5, fontFamily: MONO, color: "#0891B2", background: "#ECFEFF", padding: "2px 5px", borderRadius: 4 }}
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", margin: "5px 0 5px" }}>Internal Modules</p>
              {dependenciesList.internal.length === 0 ? (
                <p style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>None</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {dependenciesList.internal.map(int => (
                    <span
                      key={int}
                      style={{ fontSize: 9.5, fontFamily: MONO, color: "#4B5563", background: "#F3F4F6", padding: "2px 5px", borderRadius: 4 }}
                      title={int}
                    >
                      {int.split("/").pop()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionSection>

        {/* 5. HOOKS */}
        {hooksList.length > 0 && (
          <AccordionSection
            id="hooks"
            title="Hooks"
            count={hooksList.length}
            expanded={expandedSections.hooks}
            onToggle={handleToggleSection}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {hooksList.map(hook => {
                const builtin = BUILTIN_HOOKS.has(hook);
                return (
                  <span
                    key={hook}
                    style={{
                      fontSize: 9.5,
                      fontFamily: MONO,
                      color: builtin ? "#6B7280" : "#059669",
                      background: builtin ? "#F3F4F6" : "#ECFDF5",
                      padding: "2px 5px",
                      borderRadius: 4
                    }}
                  >
                    {hook}
                  </span>
                );
              })}
            </div>
          </AccordionSection>
        )}

        {/* 6. STATE */}
        {consumedStates.length > 0 && (
          <AccordionSection
            id="state"
            title="State"
            count={consumedStates.length}
            expanded={expandedSections.state}
            onToggle={handleToggleSection}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {consumedStates.map(state => (
                <span
                  key={state.id}
                  style={{ fontSize: 9.5, fontFamily: MONO, color: "#4F46E5", background: "#EEF2FF", padding: "2px 5px", borderRadius: 4 }}
                >
                  {state.name}
                </span>
              ))}
            </div>
          </AccordionSection>
        )}

        {/* 7. APIS */}
        {apiCalls.length > 0 && (
          <AccordionSection
            id="apis"
            title="APIs"
            count={apiCalls.length}
            expanded={expandedSections.apis}
            onToggle={handleToggleSection}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {apiCalls.map(api => (
                <div
                  key={api.id}
                  style={{ fontSize: 9.5, fontFamily: MONO, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: 4, border: "1px solid #FDE68A" }}
                >
                  {api.name}
                </div>
              ))}
            </div>
          </AccordionSection>
        )}

        {/* 8. IMPORTS */}
        {importsList.length > 0 && (
          <AccordionSection
            id="imports"
            title="Imports"
            count={importsList.length}
            expanded={expandedSections.imports}
            onToggle={handleToggleSection}
          >
            <pre style={{
              fontSize: 9.5,
              color: "#6B7280",
              fontFamily: MONO,
              margin: 0,
              padding: 8,
              background: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
              overflowX: "auto",
              whiteSpace: "pre"
            }}>
              {importsList.join("\n")}
            </pre>
          </AccordionSection>
        )}

        {/* 9. IMPACT ANALYSIS */}
        {impact && (
          <AccordionSection
            refProp={impactRef}
            id="impact"
            title="Impact Analysis"
            count={impact.blastRadius}
            expanded={expandedSections.impact}
            onToggle={handleToggleSection}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                border: `1px solid ${RISK_STYLE[impact.riskLevel]?.border || "#E5E7EB"}`,
                background: RISK_STYLE[impact.riskLevel]?.bg || "#F9FAFB",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <GitBranch size={13} style={{ color: RISK_STYLE[impact.riskLevel]?.text || "#4B5563", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#374151", fontFamily: INTER, fontWeight: 650 }}>
                      Blast Radius
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 16, color: RISK_STYLE[impact.riskLevel]?.text || "#111827", fontFamily: MONO, fontWeight: 800, lineHeight: 1 }}>
                      {impact.blastRadius}
                    </span>
                    <span style={{ fontSize: 9, color: "#6B7280", fontFamily: INTER, fontWeight: 600 }}>
                      nodes
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  {[
                    ["Components", impact.affectedByKind.component, "#2563EB"],
                    ["Routes", impact.affectedByKind.route, "#0891B2"],
                    ["State", impact.affectedByKind.state, "#4F46E5"],
                    ["APIs", impact.affectedByKind.api, "#D97706"],
                  ].map(([label, value, color]) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 8, padding: "5px 6px" }}>
                      <div style={{ fontSize: 11.5, color, fontFamily: MONO, fontWeight: 800, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 9, color: "#6B7280", fontFamily: INTER, marginTop: 1 }}>{label}</div>
                    </div>
                  ))}
                </div>

                <div style={{
                  alignSelf: "flex-start",
                  color: RISK_STYLE[impact.riskLevel]?.text || "#4B5563",
                  background: "rgba(255,255,255,0.8)",
                  border: `1px solid ${RISK_STYLE[impact.riskLevel]?.border || "#E5E7EB"}`,
                  borderRadius: 999,
                  padding: "2px 7px",
                  fontSize: 9,
                  fontFamily: MONO,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}>
                  {RISK_STYLE[impact.riskLevel]?.label || "Unknown Risk"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                <ImpactGroup
                  label="Used By (Upstream)"
                  items={impact.direct.usedBy}
                  tone={{ text: "#2563EB", bg: "#EFF6FF" }}
                  onNavigate={onNavigate}
                />
                <ImpactGroup
                  label="Uses (Downstream)"
                  items={impact.direct.uses}
                  tone={{ text: "#4B5563", bg: "#F3F4F6" }}
                  onNavigate={onNavigate}
                />
              </div>

              <div className="flex gap-1.5 p-2 rounded-lg border border-neutral-100 bg-[#F9FAFB] text-[10px] text-neutral-600 leading-relaxed mt-2">
                {impact.riskLevel === "high" ? (
                  <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
                ) : impact.riskLevel === "medium" ? (
                  <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                )}
                <span>
                  {impact.riskLevel === "high"
                    ? "Review every dependent node before renaming, moving, or deleting this element."
                    : impact.riskLevel === "medium"
                      ? "Inspect direct dependents before refactoring this element."
                      : "This element has a narrow dependency surface and is likely safe to refactor."}
                </span>
              </div>
            </div>
          </AccordionSection>
        )}

        {/* 10. RELATED FILES */}
        <AccordionSection
          id="related"
          title="Related Files"
          count={relatedFiles.length}
          expanded={expandedSections.related}
          onToggle={handleToggleSection}
        >
          {relatedFiles.length === 0 ? (
            <p style={{ fontSize: 10.5, color: "#9CA3AF", fontStyle: "italic", margin: 0 }}>No related files found in folder</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {relatedFiles.map(rf => (
                <div
                  key={rf.path}
                  onClick={() => rf.nodeId && onNavigate(rf.nodeId)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 8px",
                    borderRadius: 6,
                    cursor: rf.nodeId ? "pointer" : "default",
                    background: "transparent",
                    transition: "background 0.15s",
                  }}
                  className={rf.nodeId ? "hover:bg-neutral-100" : ""}
                >
                  <FileCode size={12} className={rf.nodeId ? "text-blue-500" : "text-neutral-400"} />
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: MONO,
                      color: rf.nodeId ? "#2563EB" : "#4B5563",
                      textDecoration: rf.nodeId ? "underline" : "none"
                    }}
                    title={rf.path}
                  >
                    {rf.name}
                  </span>
                  <span style={{
                    fontSize: 8.5,
                    fontFamily: INTER,
                    color: "#9CA3AF",
                    background: "#F3F4F6",
                    padding: "1px 4px",
                    borderRadius: 4,
                    marginLeft: "auto"
                  }}>
                    {rf.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AccordionSection>
      </div>

      {/* AI Explanation Modal */}
      <AnimatePresence>
        {isAIModalOpen && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(6px)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setIsAIModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                background: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                borderRadius: 16,
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                width: "100%",
                maxWidth: 480,
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#F8FAFC"
              }}>
                <Sparkles size={16} className="text-blue-500 shrink-0" />
                <span style={{ fontSize: 12, fontWeight: 750, fontFamily: INTER, color: "#1E293B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  AI Architectural Advisor
                </span>
              </div>

              {/* Scrollable Report content */}
              <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 750, background: "#EFF6FF", color: "#2563EB", padding: "2px 6px", borderRadius: 4, fontFamily: INTER, textTransform: "uppercase" }}>
                    Analyzing Component
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 750, color: "#0F172A", margin: "6px 0 2px", fontFamily: INTER }}>{node.name}</h3>
                  <span style={{ fontSize: 10, color: "#64748B", fontFamily: MONO, wordBreak: "break-all" }}>{node.file}</span>
                </div>

                {generateAIReport()?.map((sect, i) => (
                  <div key={i} style={{ borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
                    <h4 style={{ fontSize: 11.5, fontWeight: 700, color: "#475569", margin: "0 0 6px", fontFamily: INTER }}>{sect.title}</h4>
                    {sect.items ? (
                      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                        {sect.items.map((it, idx) => (
                          <li key={idx} style={{ fontSize: 11, color: "#475569", fontFamily: INTER, lineHeight: 1.45 }}>{it}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontFamily: INTER, lineHeight: 1.45 }}>{sect.content}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{
                padding: "12px 20px",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "flex-end",
                background: "#F8FAFC"
              }}>
                <button
                  onClick={() => setIsAIModalOpen(false)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: INTER,
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.15)",
                  }}
                  className="hover:bg-blue-700"
                >
                  Dismiss Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
