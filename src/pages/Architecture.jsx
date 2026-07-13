import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { selectNodeId } from "@/redux/slices/graphSlice";
import gsap from "gsap";
import { FileCode, ShieldAlert, XCircle, AlertTriangle, CheckCircle, Info, ChevronRight } from "lucide-react";
import { buildArchitectureModel } from "@/engines/adapters/architectureAdapter";
import { calculateMaintainability } from "@/engines/analysis/modules/maintainability";

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

// Extracted Subcomponents & Constants
import { INTER, MONO, findPathToNode } from "@/components/architecture/constants";
import InspectorPanel from "@/components/architecture/InspectorPanel";
import TopBar from "@/components/architecture/TopBar";
import TreeNode from "@/components/architecture/TreeNode";
import FlowDiagram from "@/components/architecture/FlowDiagram";

// ─── Inner React Flow Canvas Component ─────────────────────────────────────────

function ArchitectureFlow() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const reduxFiles = useSelector((state) => state.graph.files);
  const analysis = useSelector((state) => state.analysis);

  // Tab Selection Switcher: "summary" | "explore" | "flow" | "graph"
  const [activeTab, setActiveTab] = useState("summary");

  const validation = useMemo(() => {
    return knowledgeGraph?.validation || { errors: [], warnings: [], suggestions: [] };
  }, [knowledgeGraph]);

  const reduxNodes = useMemo(() => {
    return knowledgeGraph?.nodes.filter(n => n.kind === "component") || [];
  }, [knowledgeGraph]);


  const selectedId = useSelector((state) => state.graph.selectedNodeId);

  const setSelectedId = useCallback((id) => {
    dispatch(selectNodeId(id));
  }, [dispatch]);

  const handleSelectSearchNode = useCallback((id) => {
    setSelectedId(id);
    if (activeTab === "summary") {
      setActiveTab("explore");
    }
  }, [activeTab, setSelectedId]);


  // Pre-select default page node
  useEffect(() => {
    if (reduxNodes.length > 0 && !selectedId) {
      const dashboardNode = reduxNodes.find(n => n.name.toLowerCase().includes("dashboard") || n.id.toLowerCase().includes("dashboard"));
      const appNode = reduxNodes.find(n => n.name === "App" || n.id.includes("App"));
      const defaultNode = dashboardNode || appNode || reduxNodes[0];
      setSelectedId(defaultNode.id);
    }
  }, [reduxNodes, selectedId, setSelectedId]);

  const selectedNode = useMemo(() => {
    if (!knowledgeGraph) return null;
    return knowledgeGraph.nodes.find(n => n.id === selectedId) || null;
  }, [knowledgeGraph, selectedId]);

  const uniqueFiles = useMemo(() => {
    return reduxFiles || [];
  }, [reduxFiles]);

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

  const treeNode = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : null;

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

  // Auto-expand tree folders leading to selected node when selectedId changes
  useEffect(() => {
    if (selectedId && architectureModel.length > 0) {
      const parentIds = findParentIds(architectureModel, selectedId);
      if (parentIds && parentIds.length > 0) {
        const timer = setTimeout(() => {
          setExpandedNodes(prev => {
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

  // Smoothly scroll selected node into view in Explore tab
  useEffect(() => {
    if (selectedId && activeTab === "explore") {
      const timer = setTimeout(() => {
        const el = document.querySelector(`[data-node-id="${selectedId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedId, activeTab]);


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

    // Poor maintainability components
    const poorMaintainabilityComps = [];
    reduxNodes.forEach(c => {
      const m = calculateMaintainability(c, knowledgeGraph);
      if (m && m.score < 70) {
        poorMaintainabilityComps.push({ component: c, score: m.score });
      }
    });
    poorMaintainabilityComps.sort((a, b) => a.score - b.score);

    return {
      componentCount,
      routeCount,
      contextCount,
      apiEndpointCount,
      stateCount,
      largestComp,
      cycles,
      deadComps,
      poorMaintainabilityComps
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
      <style>{`
        @keyframes node-highlight-flash {
          0% { background-color: #DBEAFE; transform: scale(1.03); box-shadow: 0 0 8px rgba(59, 130, 246, 0.4); }
          100% { transform: scale(1); box-shadow: none; }
        }
      `}</style>
      <TopBar 
        nodeCount={reduxNodes.length} 
        projectName={selectedProject.name} 
        handleBack={handleBack} 
        activeTab={activeTab} 
        onSelectNode={handleSelectSearchNode}
        knowledgeGraph={knowledgeGraph}
      />
      
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
          { id: "flow",    label: "Flow",    desc: "Architecture Flow Diagram" }
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
        
        {/* Left Directory Tree Pane (Shown only in Explore mode) */}
        {activeTab === "explore" && (
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
                      <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#4B5563" }}>
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
                      <div key={dna.label} style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center" }}>
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

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, justifyContent: "center" }}>
                    {summaryMetrics.cycles.length > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, lineHeight: "normal" }}>
                          Investigate circular component rendering loop between <strong>{summaryMetrics.cycles[0].message.split('"')[1] || "modules"}</strong>.
                        </p>
                      </div>
                    ) : summaryMetrics.poorMaintainabilityComps.length > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, lineHeight: "normal" }}>
                          Improve component <strong>{summaryMetrics.poorMaintainabilityComps[0].component.name}</strong> (Maintainability Score: {summaryMetrics.poorMaintainabilityComps[0].score}/100) to resolve architectural risks.
                        </p>
                      </div>
                    ) : summaryMetrics.deadComps.length > 0 ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                        <p style={{ fontSize: 11.5, color: "#4B5563", margin: 0, lineHeight: "normal" }}>
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
                    <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#6B7280" }}>
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
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "30px 0", color: "#D1D5DB" }}>
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
                        <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F9FAFB" }}>
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
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#B8BEC9", fontSize: 13 }}>
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

          {/* TAB 3: FLOW VIEW */}
          {activeTab === "flow" && (
            <FlowDiagram
              architectureModel={architectureModel}
              selectedId={selectedId}
              onSelectNode={setSelectedId}
            />
          )}



        </main>

        {/* Right Inspector Panel */}
        <InspectorPanel nodes={reduxNodes} node={selectedNode} treeNode={treeNode} onNavigate={setSelectedId} knowledgeGraph={knowledgeGraph} />
      </div>
    </div>
  );
}

// ─── Main Export Component with React Flow Provider ──────────────────────────

export default function Architecture() {
  // Visual mount continuity transition
  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.querySelector(".page-fade");
      if (el) {
        gsap.fromTo(el, {
          opacity: 0,
        }, {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
        });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return <ArchitectureFlow />;
}
