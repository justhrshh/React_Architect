import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
  FileCode,
  Loader
} from "lucide-react";
import { calculateMaintainability } from "@/engines/analysis/modules/maintainability";
import { analyzeImpact } from "@/engines/analysis";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import {
  geminiComplete,
  buildContext,
  getSystemPrompt
} from "@/engines/ai";
import MarkdownRenderer from "@/components/investigation/MarkdownRenderer";
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

// Multi-line pill row — flex wrap layout
function InboxRow({ label, children, noPad }) {
  return (
    <div style={{ borderBottom: "1px solid #F1F5F9", padding: noPad ? "12px 20px" : "12px 20px" }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER, display: "block", marginBottom: 8 }}>
          {label}
        </span>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Pill({ children, color = "#4B5563", bg = "#F1F5F9", onClick, title }) {
  return (
    <span
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        fontSize: 11,
        fontFamily: INTER,
        fontWeight: 500,
        color,
        background: bg,
        padding: "4px 10px",
        borderRadius: 999,
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
        transition: "opacity 0.15s",
        userSelect: "none",
      }}
      className={onClick ? "hover:opacity-75" : ""}
    >
      {children}
    </span>
  );
}

// Flat key-value row for overview fields
function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 20px", borderBottom: "1px solid #F8FAFC" }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", fontFamily: INTER, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontFamily: INTER, color: "#334155", fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }} title={typeof value === "string" ? value : undefined}>{value}</span>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{ padding: "16px 20px 6px" }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#CBD5E1", fontFamily: INTER }}>{title}</span>
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
  onHighlightChildren,
  onClose
}) {
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const navigate = useNavigate();
  const COLORS = {
    accent: '#6366F1',
    accentBg: '#EEF2FF',
    accentText: '#4338CA',
    text: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  };

  const analysis = useSelector((state) => state.analysis);
  const selectedProject = useSelector(selectSelectedProject);

  const [explanationText, setExplanationText] = useState("");
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  const fetchAIExplanation = useCallback(async () => {
    if (!node || !knowledgeGraph) return;

    setIsExplanationLoading(true);
    setExplanationError(null);
    setExplanationText("");

    try {
      // 1. Build context lazily using AI Core
      const ctx = buildContext(['selection', 'sourceCode', 'analysisSummary'], {
        knowledgeGraph,
        analysis,
        selectedId: node.id,
        selectedProject,
      });

      // 2. Build system persona prompt
      const sysPrompt = getSystemPrompt(ctx.projectOverview);

      // 3. Assemble prompt
      let userPrompt = `You are React Architect AI.
Explain the selected entity '${node.name}' (${node.kind}) to a developer who is trying to understand this project.

Focus on:
- Why this exists
- What responsibility it owns
- How it fits into the architecture
- Which entities/components interact with it
- Whether it follows good architectural practices
- Mention possible improvements only if meaningful. If you have improvements, format them under the exact heading '## Architect Notes'. Do NOT include this heading if there are no meaningful recommendations.

Do NOT talk about line counts.
Do NOT talk about LOC.
Do NOT dump raw metadata.
Explain the architecture like a senior engineer during onboarding.`;

      // 4. Inject visual/architecture context snapshot
      userPrompt += `\n\n## Context Snapshot\n`;
      if (ctx.selection) {
        const s = ctx.selection;
        userPrompt += `- Selected Node: ${s.name} (${s.kind})\n`;
        if (s.file) userPrompt += `- File path: ${s.file}\n`;
        if (s.outgoing?.length) {
          userPrompt += `- Dependencies: ${s.outgoing.map(o => `${o.targetName} (${o.targetKind})`).join(", ")}\n`;
        }
        if (s.incoming?.length) {
          userPrompt += `- Consumed by (parents): ${s.incoming.map(i => `${i.sourceName} (${i.sourceKind})`).join(", ")}\n`;
        }
        if (s.impact) {
          userPrompt += `- Risk level: ${s.impact.riskLevel ?? "low"}\n`;
        }
      }

      if (ctx.sourceCode) {
        userPrompt += `\n## Relevant Source Code\n\`\`\`jsx\n${ctx.sourceCode}\n\`\`\`\n`;
      }

      // 5. Call API
      const contents = [{ role: 'user', parts: [{ text: userPrompt }] }];

      let streamedText = "";
      await geminiComplete(sysPrompt, contents, (text) => {
        streamedText = text;
        setExplanationText(text);
      });

      if (!streamedText) {
        throw new Error("Empty response received from Gemini.");
      }
    } catch (err) {
      console.error("AI Explain Error:", err);
      if (err?.isModelUnavailable) {
        setExplanationError("The selected model is unavailable for this API key. Please switch to a different model in the main screen header.");
      } else {
        setExplanationError(err?.message || "An unexpected error occurred while explaining the component.");
      }
    } finally {
      setIsExplanationLoading(false);
    }
  }, [node, knowledgeGraph, analysis, selectedProject]);

  useEffect(() => {
    if (isAIModalOpen) {
      const timer = setTimeout(() => {
        fetchAIExplanation();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAIModalOpen, fetchAIExplanation]);

  const { mainExplanation, notes } = useMemo(() => {
    if (!explanationText) return { mainExplanation: "", notes: null };
    const parts = explanationText.split(/## Architect Notes|### Architect Notes/i);
    return {
      mainExplanation: parts[0].trim(),
      notes: parts[1] ? parts[1].trim() : null,
    };
  }, [explanationText]);

  const handleRedirectToAI = useCallback(() => {
    setIsAIModalOpen(false);
    navigate("/investigation");
  }, [navigate]);

  // (accordion state removed — now flat inbox rows)



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
        position: "absolute",
        top: 16,
        right: 16,
        bottom: 24,
        width: 340,
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid rgba(226, 232, 240, 0.8)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER }}>
            Architectural Inspector
          </span>
          {onClose && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94A3B8" }}>
              ✕
            </button>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <Info size={24} className="text-slate-400 mb-2" />
          <span style={{ fontSize: 12, color: "#64748B", fontFamily: INTER, fontWeight: 500 }}>Select a component to inspect its architecture</span>
        </div>
      </aside>
    );
  }

  const cfg = TYPE_CFG[node.subtype] || TYPE_CFG.component;
  const propsList = node.metadata?.props || [];
  const hooksList = node.metadata?.hooks || [];
  const importsList = node.metadata?.imports || [];

  return (
    <motion.aside
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        bottom: 24,
        width: 340,
        background: "#FFFFFF",
        borderRadius: 20,
        border: "1px solid rgba(226, 232, 240, 0.8)",
        boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        overflow: "hidden",
      }}
    >
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
      <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid #F1F5F9", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER }}>
          Architectural Specs
        </span>
        {onClose && (
          <button
            onClick={onClose}
            title="Close Inspector"
            style={{
              background: "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 22,
              height: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
              fontSize: 12,
              fontWeight: 700,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E2E8F0";
              e.currentTarget.style.color = "#0F172A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#F1F5F9";
              e.currentTarget.style.color = "#64748B";
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Flat inbox-style sections */}
      <div style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none" }}>

        {/* Node Summary Panel */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: cfg.text,
            background: cfg.bg,
            padding: "2px 8px",
            borderRadius: 999,
            fontFamily: INTER,
          }}>
            {cfg.label}
          </span>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#0F172A",
            letterSpacing: "-0.04em",
            margin: "8px 0 0",
            lineHeight: 1.2,
            fontFamily: INTER,
          }}>
            {node.name}
          </h2>
        </div>

        {/* 1. OVERVIEW — key/value flat rows */}
        <SectionHeader title="Overview" />
        <InfoRow label="File" value={node.file?.split("/").pop() || node.file} />
        <InfoRow label="Line" value={`L${node.metadata?.line || 1}`} />
        <InfoRow label="LOC" value={node.metadata?.loc ?? "—"} />
        {node.kind === "component" && (
          <>
            <InfoRow label="Export" value={node.metadata?.isDefaultExport ? "Default" : "Named"} />
            <InfoRow label="Paradigm" value={node.metadata?.isClassComponent ? "Class" : "Functional"} />
          </>
        )}
        {node.kind === "route" && (
          <>
            <InfoRow label="Router" value={treeNode?.metadata?.routerType || node.metadata?.source || "Router"} />
            {node.subtype === "endpoint" && node.metadata?.componentName && (
              <InfoRow label="Component" value={node.metadata.componentName} />
            )}
          </>
        )}
        {propsList.length > 0 && (
          <InboxRow label="Props">
            {propsList.map(p => (
              <Pill key={p.name} bg="#F1F5F9" color="#334155" title={p.type || "any"}>
                {p.name}
              </Pill>
            ))}
          </InboxRow>
        )}

        {/* 2. ARCHITECTURE HEALTH */}
        {node.kind === "component" && maintainability && (
          <>
            <SectionHeader title="Architecture Health" />
            <div style={{ padding: "4px 20px 12px", borderBottom: "1px solid #F1F5F9" }}>
              {/* Score bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span
                  style={{ fontSize: 11, fontWeight: 500, color: "#94A3B8", fontFamily: INTER, cursor: "help" }}
                  title="An overall architectural health score based on code size, responsibility separation, and hook complexity."
                >
                  Maintainability (?)
                </span>
                <span style={{
                  fontSize: 13,
                  fontFamily: INTER,
                  fontWeight: 700,
                  color: maintainability.score >= 85 ? "#059669" : maintainability.score >= 70 ? "#D97706" : "#DC2626"
                }}>{maintainability.score}<span style={{ fontSize: 10, fontWeight: 400, color: "#94A3B8" }}>/100</span></span>
              </div>
              <div style={{ height: 4, background: "#F1F5F9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${maintainability.score}%`, background: maintainability.score >= 85 ? "#10B981" : maintainability.score >= 70 ? "#F59E0B" : "#EF4444", borderRadius: 99, transition: "width 0.5s ease" }} />
              </div>
            </div>
            {recommendations.length > 0 && (
              <div style={{ padding: "12px 20px 14px", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER, display: "block", marginBottom: 8 }}>
                  Suggestions & Best Practices
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {recommendations.map((rec, i) => {
                    const isObj = typeof rec === "object" && rec !== null && rec.title;
                    const title = isObj ? rec.title : "Architectural Advice";
                    const description = isObj ? rec.description : (typeof rec === "string" ? rec : String(rec));
                    const confidence = isObj && rec.confidence ? Math.round(rec.confidence * 100) : null;
                    const severity = isObj ? rec.severity : "medium";
                    const suggestion = isObj ? rec.refactoringSuggestion : null;
                    const metrics = isObj ? rec.metrics : null;

                    const isHigh = severity === "high" || severity === "critical";
                    const isWarn = isHigh || severity === "medium" || (typeof rec === "string" && (rec.toLowerCase().includes("consider") || rec.toLowerCase().includes("combines") || rec.toLowerCase().includes("violation")));

                    return (
                      <div
                        key={i}
                        style={{
                          background: isHigh ? "#FEF2F2" : isWarn ? "#FFF7ED" : "#F0FDF4",
                          border: `1px solid ${isHigh ? "#FCA5A5" : isWarn ? "#FED7AA" : "#BBF7D0"}`,
                          borderRadius: 12,
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {/* Title Header & Confidence Badge */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: isHigh ? "#DC2626" : isWarn ? "#EA580C" : "#16A34A",
                              flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 11.5, fontWeight: 700, color: isHigh ? "#991B1B" : isWarn ? "#9A3412" : "#166534", fontFamily: INTER }}>
                              {title}
                            </span>
                          </div>
                          {confidence && (
                            <span
                              style={{
                                fontSize: 8.5,
                                fontWeight: 700,
                                fontFamily: MONO,
                                background: isHigh ? "#FEE2E2" : isWarn ? "#FFEDD5" : "#DCFCE7",
                                color: isHigh ? "#991B1B" : isWarn ? "#9A3412" : "#166534",
                                padding: "1px 6px",
                                borderRadius: 99,
                                flexShrink: 0,
                              }}
                              title="Analysis Engine confidence rating based on static code metrics."
                            >
                              {confidence}% CONF
                            </span>
                          )}
                        </div>

                        {/* Why This Matters */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: isHigh ? "#991B1B" : isWarn ? "#9A3412" : "#166534", fontFamily: INTER, opacity: 0.8 }}>
                            Why this matters
                          </span>
                          <span style={{
                            fontSize: 10.5,
                            lineHeight: 1.45,
                            color: isHigh ? "#7F1D1D" : isWarn ? "#7C2D12" : "#14532D",
                            fontFamily: INTER,
                            fontWeight: 450,
                          }}>
                            {description}
                          </span>
                        </div>

                        {/* Triggering Metrics Badges (Human Developer Terms) */}
                        {metrics && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                            {metrics.loc && <span style={{ fontSize: 8.5, fontFamily: MONO, background: "rgba(0,0,0,0.04)", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>{metrics.loc} Lines</span>}
                            {metrics.role && <span style={{ fontSize: 8.5, fontFamily: MONO, background: "rgba(0,0,0,0.04)", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>{metrics.role}</span>}
                            {metrics.effectHooks !== undefined && <span style={{ fontSize: 8.5, fontFamily: MONO, background: "rgba(0,0,0,0.04)", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>{metrics.effectHooks} Effects</span>}
                            {metrics.apiCallsCount !== undefined && <span style={{ fontSize: 8.5, fontFamily: MONO, background: "rgba(0,0,0,0.04)", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>{metrics.apiCallsCount} API Calls</span>}
                            {metrics.projectImpactRating && <span style={{ fontSize: 8.5, fontFamily: MONO, background: "rgba(0,0,0,0.04)", color: "#475569", padding: "1px 6px", borderRadius: 4 }}>Project Impact: {metrics.projectImpactRating}</span>}
                          </div>
                        )}

                        {/* Actionable Refactoring Guidance */}
                        {suggestion && (
                          <div style={{
                            marginTop: 4,
                            paddingTop: 6,
                            borderTop: `1px solid ${isHigh ? "#FECACA" : isWarn ? "#FFEDD5" : "#DCFCE7"}`,
                            fontSize: 10,
                            lineHeight: 1.4,
                            color: isHigh ? "#991B1B" : isWarn ? "#9A3412" : "#166534",
                            fontFamily: INTER,
                            fontWeight: 500,
                          }}>
                            💡 <strong>Recommendation:</strong> {suggestion}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* 3. HIERARCHY */}
        {(parentNodes.length > 0 || childNodes.length > 0) && (
          <>
            {parentNodes.length > 0 && (
              <InboxRow label="Parents">
                {parentNodes.map(p => (
                  <Pill key={p.id} bg="#F8FAFC" color="#475569" onClick={() => onNavigate(p.id)} title={p.file}>
                    {p.name}
                  </Pill>
                ))}
              </InboxRow>
            )}
            {childNodes.length > 0 && (
              <InboxRow label="Children">
                {childNodes.map(c => (
                  <Pill key={c.id} bg="#EFF6FF" color="#2563EB" onClick={() => onNavigate(c.id)} title={c.file}>
                    {c.name}
                  </Pill>
                ))}
              </InboxRow>
            )}
          </>
        )}

        {/* 5. HOOKS */}
        {hooksList.length > 0 && (
          <InboxRow label="Hooks">
            {hooksList.map(hook => {
              const builtin = BUILTIN_HOOKS.has(hook);
              return (
                <Pill key={hook} bg={builtin ? "#F8FAFC" : "#ECFDF5"} color={builtin ? "#64748B" : "#059669"}>
                  {hook}
                </Pill>
              );
            })}
          </InboxRow>
        )}

        {/* 6. STATE */}
        {consumedStates.length > 0 && (
          <InboxRow label="State">
            {consumedStates.map(s => (
              <Pill key={s.id} bg="#EEF2FF" color="#4F46E5">{s.name}</Pill>
            ))}
          </InboxRow>
        )}

        {/* 7. APIS */}
        {apiCalls.length > 0 && (
          <InboxRow label="APIs">
            {apiCalls.map(api => (
              <Pill key={api.id} bg="#FFFBEB" color="#B45309">{api.name}</Pill>
            ))}
          </InboxRow>
        )}

        {/* 8. IMPORTS */}
        {importsList.length > 0 && (
          <InboxRow label="Imports">
            {importsList.map((imp, i) => (
              <Pill key={i} bg="#F8FAFC" color="#475569">{imp.split("/").pop()}</Pill>
            ))}
          </InboxRow>
        )}

        {/* 10. RELATED FILES */}
        {relatedFiles.length > 0 && (
          <InboxRow label="Related Files">
            {relatedFiles.map(rf => (
              <Pill
                key={rf.path}
                bg={rf.nodeId ? "#EFF6FF" : "#F8FAFC"}
                color={rf.nodeId ? "#2563EB" : "#64748B"}
                onClick={rf.nodeId ? () => onNavigate(rf.nodeId) : undefined}
                title={rf.path}
              >
                <FileCode size={10} style={{ marginRight: 4, flexShrink: 0, display: "inline" }} />
                {rf.name}
              </Pill>
            ))}
          </InboxRow>
        )}
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

                {isExplanationLoading && !explanationText ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: 12 }}>
                    <Loader size={20} className="text-blue-500 animate-spin" />
                    <span style={{ fontSize: 12, color: "#64748B", fontFamily: INTER }}>Consulting AI Advisor...</span>
                  </div>
                ) : explanationError ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <AlertTriangle size={14} style={{ color: "#DC2626" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", fontFamily: INTER }}>Error</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: "#991B1B", fontFamily: INTER, lineHeight: 1.5 }}>
                      {explanationError}
                    </span>
                    <button
                      onClick={() => fetchAIExplanation()}
                      style={{
                        alignSelf: "flex-start",
                        padding: "4px 10px",
                        background: "#FFFFFF",
                        border: "1px solid #EF444430",
                        color: "#B91C1C",
                        fontSize: 11,
                        borderRadius: 6,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                      className="hover:bg-red-50"
                    >
                      Retry Explanation
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ fontSize: 12, color: "#334155", fontFamily: INTER, lineHeight: 1.6 }}>
                      <MarkdownRenderer content={mainExplanation} />
                    </div>

                    {notes && (
                      <div style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "#FFFBEB",
                        border: "1px solid #FDE68A",
                        color: "#78350F",
                        marginTop: 4,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <Sparkles size={13} style={{ color: "#D97706" }} />
                          <span style={{ fontSize: 10, fontWeight: 750, fontFamily: INTER, textTransform: "uppercase", letterSpacing: "0.02em" }}>Architect Notes</span>
                        </div>
                        <div style={{ fontSize: 11.5, fontFamily: INTER, lineHeight: 1.5 }}>
                          <MarkdownRenderer content={notes} />
                        </div>
                      </div>
                    )}

                    {isExplanationLoading && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                        <Loader size={12} className="text-blue-500 animate-spin" />
                        <span style={{ fontSize: 11, color: "#64748B", fontFamily: INTER }}>AI is writing...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "12px 20px",
                borderTop: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#F8FAFC"
              }}>
                <span style={{ fontSize: 10.5, color: "#64748B", fontFamily: INTER }}>
                  For more information, visit{" "}
                  <button
                    onClick={handleRedirectToAI}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.accent,
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                      font: "inherit",
                      fontWeight: 600,
                    }}
                  >
                    Architect AI
                  </button>
                </span>
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
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
