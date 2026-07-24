import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { selectNodeId } from "@/redux/slices/graphSlice";
import { buildArchitectureModel } from "@/engines/adapters/architectureAdapter";

import { INTER, MONO, findPathToNode } from "@/components/architecture/constants";
import InspectorPanel      from "@/components/architecture/InspectorPanel";
import TopBar              from "@/components/architecture/TopBar";
import FlowDiagram         from "@/components/architecture/FlowDiagram";
import ArchitectureSidebar from "@/components/architecture/ArchitectureSidebar";
import CommandDock         from "@/components/architecture/CommandDock";
import TreeNode            from "@/components/architecture/TreeNode";
import AIArchitecturalAdvisorModal from "@/components/architecture/AIArchitecturalAdvisorModal";
import ArchitectureDnaCard from "@/components/architecture/ArchitectureDnaCard";
import ArchitectureHealthGauge from "@/components/architecture/ArchitectureHealthGauge";
import HistoryStudio       from "@/components/architecture/HistoryStudio";
import CodeHygieneStudio   from "@/components/architecture/CodeHygieneStudio";

import {
  FileCode, AlertTriangle, CheckCircle, ChevronRight, TrendingUp, Layers, Cpu, GitBranch, Sparkles,
} from "lucide-react";
import { calculateMaintainability } from "@/engines/analysis/modules/maintainability";

function ArchitectureStudio() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedProject = useSelector(selectSelectedProject);
  const knowledgeGraph  = useSelector((state) => state.graph.knowledgeGraph);
  const reduxFiles      = useSelector((state) => state.graph.files);
  const analysis        = useSelector((state) => state.analysis);

  const [activeTab, setActiveTab] = useState(() => location.state?.tab || "summary");
  const [showInspector, setShowInspector] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const flowRef = useRef(null);

  const [origin, setOrigin] = useState(() => {
    if (location.state?.fromAI) return "ai";
    if (location.state?.fromWorkspace) return "workspace";
    return "hub";
  });

  useEffect(() => {
    if (location.state?.fromAI) setOrigin("ai");
    else if (location.state?.fromWorkspace) setOrigin("workspace");
  }, [location.state]);

  useEffect(() => {
    if (location.state?.focusNode) {
      const targetNode = location.state.focusNode;
      window.history.replaceState({}, document.title);
      setTimeout(() => {
        setActiveTab("flow");
        setShowInspector(true);
        dispatch(selectNodeId(targetNode));
      }, 0);
    }
  }, [location.state, dispatch]);

  const validation = useMemo(() => {
    return knowledgeGraph?.validation || { errors: [], warnings: [], suggestions: [] };
  }, [knowledgeGraph]);

  const reduxNodes = useMemo(() => {
    return knowledgeGraph?.nodes.filter(n => n.kind === "component") || [];
  }, [knowledgeGraph]);

  const selectedId = useSelector((state) => state.graph.selectedNodeId);
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [targetHighlightLine, setTargetHighlightLine] = useState(null);

  const handleSelectNode = useCallback((id, line = null) => {
    dispatch(selectNodeId(id));
    setTargetHighlightLine(line);
    setHighlightedIds(new Set());
    setShowInspector(true);
  }, [dispatch]);

  useEffect(() => {
    if (reduxNodes.length > 0 && !selectedId) {
      const dashboardNode = reduxNodes.find(n => n.name.toLowerCase().includes("dashboard") || n.id.toLowerCase().includes("dashboard"));
      const appNode       = reduxNodes.find(n => n.name === "App" || n.id.includes("App"));
      const defaultNode   = dashboardNode || appNode || reduxNodes[0];
      dispatch(selectNodeId(defaultNode.id));
    }
  }, [reduxNodes, selectedId, dispatch]);

  const selectedNode = useMemo(() => {
    if (!knowledgeGraph) return null;
    return knowledgeGraph.nodes.find(n => n.id === selectedId) || null;
  }, [knowledgeGraph, selectedId]);

  const uniqueFiles = useMemo(() => reduxFiles || [], [reduxFiles]);

  const handleBack = useCallback(() => {
    if (origin === "ai") {
      navigate("/investigation");
    } else {
      dispatch(setActiveRoom("project-brain"));
      navigate("/workspace");
    }
  }, [dispatch, navigate, origin]);

  const architectureModel = useMemo(() => {
    return buildArchitectureModel(knowledgeGraph);
  }, [knowledgeGraph]);

  const breadcrumbs = useMemo(() => {
    if (!selectedId) return [];
    return findPathToNode(architectureModel, selectedId) || [];
  }, [architectureModel, selectedId]);

  const [expandedNodes, setExpandedNodes] = useState({});
  const toggleExpand = useCallback((id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    if (architectureModel.length > 0) {
      setExpandedNodes(prev => {
        const next = { ...prev };
        architectureModel.forEach(root => {
          next[root.id] = true;
          if (root.children) {
            root.children.forEach(cat => { next[cat.id] = true; });
          }
        });
        return next;
      });
    }
  }, [architectureModel]);

  // Global Keyboard Shortcuts (Tab = Toggle Sidebar, F = Fullscreen, Esc = Close Inspector / Back, Space = Architect AI)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setActiveTab("flow");
        setIsFullscreen(prev => !prev);
      } else if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (showInspector) {
          setShowInspector(false);
          setHighlightedIds(new Set());
        } else {
          handleBack();
        }
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        navigate("/investigation");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showInspector, handleBack, navigate]);

  const handleOpenArchitectAiConnection = useCallback(() => {
    navigate('/investigation');
  }, [navigate]);

  const handleRecommendationClick = useCallback((rec) => {
    if (rec.targetId) {
      dispatch(selectNodeId(rec.targetId));
      setShowInspector(true);
      return;
    }
    if (!knowledgeGraph?.nodes) return;
    const textToMatch = `${rec.title} ${rec.desc}`.toLowerCase();
    
    // Find component/file matching recommendation title or description
    const matchedNode = knowledgeGraph.nodes.find(n => {
      if (!n) return false;
      const name = (n.name || '').toLowerCase();
      const file = (n.file || n.id || '').toLowerCase();
      return (name && textToMatch.includes(name)) || (file && textToMatch.includes(file));
    });

    if (matchedNode) {
      dispatch(selectNodeId(matchedNode.id));
      setShowInspector(true);
    } else if (reduxNodes.length > 0) {
      dispatch(selectNodeId(reduxNodes[0].id));
      setShowInspector(true);
    }
  }, [knowledgeGraph, reduxNodes, dispatch]);

  const summaryMetrics = useMemo(() => {
    const componentsCount = knowledgeGraph?.nodes.filter(n => n.kind === "component").length || reduxNodes.length;
    const hooksCount      = knowledgeGraph?.nodes.filter(n => n.kind === "hook" || (n.name && /^use[A-Z]/.test(n.name))).length || 0;
    const servicesCount   = knowledgeGraph?.nodes.filter(n => n.kind === "api" || n.kind === "service").length || 0;
    const pagesCount      = knowledgeGraph?.nodes.filter(n => n.kind === "route" || n.file?.includes("pages")).length || 0;
    const routesCount     = knowledgeGraph?.nodes.filter(n => n.kind === "route").length || 0;
    
    const totalLoc = reduxNodes.reduce((sum, n) => sum + (n.metadata?.loc || 0), 0);

    let largestComp = null;
    reduxNodes.forEach(c => {
      const loc = c.metadata?.loc || 0;
      if (!largestComp || loc > (largestComp.metadata?.loc || 0)) largestComp = c;
    });

    const cycles    = validation.warnings?.filter(w => w.type === "CIRCULAR_REFERENCE") || [];
    const deadComps = analysis?.deadCode?.unusedComponents || [];

    // Dynamic AI Recommendations derived from single-source-of-truth Maintainability Engine
    const recommendations = [];

    // 1. Circular dependency loops
    if (cycles.length > 0) {
      recommendations.push({
        title: `Circular dependency loop`,
        desc: `${cycles.length} circular reference hint(s) detected across project modules.`,
        level: "HIGH", color: "#EF4444", bg: "#FEE2E2", iconColor: "#DC2626",
        targetId: cycles[0]?.nodeId || null
      });
    }

    // 2. Scan component maintainability recommendations from single source of truth engine
    const componentRecommendations = [];
    reduxNodes.forEach(c => {
      if (c.kind === "component") {
        const m = calculateMaintainability(c, knowledgeGraph);
        if (m && m.recommendations) {
          m.recommendations.forEach(rec => {
            if (rec.severity === "high" || rec.severity === "medium") {
              componentRecommendations.push({
                component: c,
                rec,
                maintainability: m
              });
            }
          });
        }
      }
    });

    // Sort by severity (high first) then lower maintainability score
    componentRecommendations.sort((a, b) => {
      if (a.rec.severity === "high" && b.rec.severity !== "high") return -1;
      if (a.rec.severity !== "high" && b.rec.severity === "high") return 1;
      return (a.maintainability.score - b.maintainability.score);
    });

    componentRecommendations.slice(0, 3).forEach(({ component, rec }) => {
      const isHigh = rec.severity === "high";
      recommendations.push({
        title: rec.title ? `${rec.title}: ${component.name}` : `Refactor ${component.name}`,
        desc: rec.whyItMatters || rec.description || String(rec),
        level: isHigh ? "HIGH" : "MEDIUM",
        color: isHigh ? "#EF4444" : "#F59E0B",
        bg: isHigh ? "#FEE2E2" : "#FEF3C7",
        iconColor: isHigh ? "#DC2626" : "#D97706",
        targetId: component.id
      });
    });

    // 4. Dead / Unused components
    if (deadComps.length > 0) {
      deadComps.slice(0, 2).forEach(dc => {
        const name = typeof dc === 'string' ? dc : dc.name;
        const target = reduxNodes.find(n => n.name === name || n.id === dc.id);
        recommendations.push({
          title: `Unused entity: ${name}`,
          desc: `'${name}' is not imported or referenced anywhere in the dependency graph.`,
          level: "LOW", color: "#64748B", bg: "#F1F5F9", iconColor: "#64748B",
          targetId: target?.id || null
        });
      });
    }

    // 5. Fallback clean structure recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        title: "Clean Modular Structure",
        desc: "All components pass architectural health & coupling guidelines cleanly.",
        level: "LOW", color: "#10B981", bg: "#ECFDF5", iconColor: "#059669",
        targetId: reduxNodes[0]?.id || null
      });
    }

    return {
      componentsCount,
      hooksCount,
      servicesCount,
      pagesCount,
      routesCount,
      totalLoc,
      largestComp,
      cycles,
      deadComps,
      recommendations,
    };
  }, [reduxNodes, knowledgeGraph, validation, analysis]);

  useEffect(() => {
    if (!selectedProject) navigate("/hub");
  }, [selectedProject, navigate]);

  if (!selectedProject || !knowledgeGraph) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", width: "100vw", background: "#ECEDF8", fontFamily: INTER
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "#FFF", fontSize: 20 }}>⟳</span>
          </div>
          <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Initializing Architecture Studio...</span>
        </div>
      </div>
    );
  }

  const healthScore = analysis?.architectureHealth?.score || 100;
  const isGitProject = Boolean(
    selectedProject?.importMethod === 'git' ||
    selectedProject?.importMethod === 'folder-git' ||
    selectedProject?.repoUrl ||
    selectedProject?.gitMetadata?.isGitRepo ||
    selectedProject?.gitProvider ||
    selectedProject?.isGitRepo
  );

  const leftOffset = isFullscreen ? 0 : (isSidebarCollapsed ? 76 : 260) + 26;
  const rightOffset = isFullscreen ? 0 : (showInspector && selectedNode ? 380 : 16);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        fontFamily: INTER,
        backgroundColor: isFullscreen ? "#FFFFFF" : "#F6F7FB",
        position: "relative",
      }}
    >
      {/* ── Ambient Background Glow Blobs ── */}
      {!isFullscreen && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -160, left: -80, width: 520, height: 520, borderRadius: 999, background: "rgba(221,214,254,0.45)", filter: "blur(64px)" }} />
          <div style={{ position: "absolute", top: "50%", right: -160, width: 520, height: 520, borderRadius: 999, background: "rgba(165,243,252,0.35)", filter: "blur(64px)" }} />
          <div style={{ position: "absolute", bottom: 0, left: "33%", width: 420, height: 420, borderRadius: 999, background: "rgba(fbcfe8,0.25)", filter: "blur(64px)" }} />
        </div>
      )}

      {/* ── 1. Floating Global Header ── */}
      {!isFullscreen && (
        <TopBar
          projectName={selectedProject.name}
          healthScore={healthScore}
          activeTab={activeTab}
          handleBack={handleBack}
          isSidebarCollapsed={isSidebarCollapsed}
          showInspector={showInspector && !!selectedNode}
          leftOffset={leftOffset}
          rightOffset={rightOffset}
          gitMeta={isGitProject ? selectedProject : null}
        />
      )}

      {/* ── 2. Left Collapsible Sidebar ── */}
      {!isFullscreen && (
        <ArchitectureSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          isGitProject={isGitProject}
        />
      )}

      {/* ── 3. Center Mount Station ── */}
      <main
        style={{
          position: "absolute",
          top: isFullscreen ? 0 : 86,
          left: leftOffset,
          right: rightOffset,
          bottom: isFullscreen ? 0 : 44,
          background: "transparent",
          border: "none",
          boxShadow: "none",
          overflow: "hidden",
          transition: "all 0.3s ease",
          display: "flex",
          flexDirection: "column",
          zIndex: isFullscreen ? 50 : 20,
        }}
      >
        {/* SUMMARY STUDIO */}
        {activeTab === "summary" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px", boxSizing: "border-box" }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
              
              {/* ── HEADER ── */}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#818CF8", fontFamily: INTER, marginBottom: 4 }}>
                  ARCHITECTURAL BRIEFING
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em", margin: 0, fontFamily: INTER, lineHeight: 1.15 }}>
                  {selectedProject.name} <span style={{ color: "#94A3B8", fontWeight: 400 }}>— architecture at a glance.</span>
                </h1>
                <p style={{ fontSize: 13.5, color: "#64748B", margin: "8px 0 0", fontFamily: INTER, lineHeight: 1.5 }}>
                  A calm, holistic view of your codebase. <strong style={{ color: "#334155" }}>{(reduxFiles?.length || reduxNodes.length).toLocaleString()} files</strong>, <strong style={{ color: "#334155" }}>{summaryMetrics.totalLoc.toLocaleString()} lines of code</strong>, analyzed 2 minutes ago. Overall health is <strong style={{ color: "#10B981" }}>{healthScore}%</strong>.
                </p>
              </div>

              {/* ── ROW 1: HEALTH & PROJECT DNA ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 20 }}>
                
                {/* ARCHITECTURE HEALTH GAUGE CARD */}
                <div style={{
                  background: "#FFFFFF", borderRadius: 24, border: "1px solid rgba(226,232,240,0.8)",
                  boxShadow: "0 8px 30px rgba(15,23,42,0.03)", padding: "24px 20px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
                }}>
                  <div style={{ position: "absolute", top: 20, left: 24, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER, zIndex: 10 }}>
                    ARCHITECTURE HEALTH
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <ArchitectureHealthGauge score={healthScore} />
                  </div>
                </div>

                {/* ARCHITECTURE DNA CARD */}
                <ArchitectureDnaCard
                  reduxNodes={reduxNodes}
                  reduxFiles={reduxFiles}
                  knowledgeGraph={knowledgeGraph}
                  summaryMetrics={summaryMetrics}
                  onFullStatsClick={() => setActiveTab("explore")}
                />

              </div>

              {/* ── ROW 2: AI RECOMMENDATIONS & DEPENDENCY ANALYSIS ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                
                {/* AI RECOMMENDATIONS CARD */}
                <div style={{
                  background: "#FFFFFF", borderRadius: 24, border: "1px solid rgba(226,232,240,0.8)",
                  boxShadow: "0 8px 30px rgba(15,23,42,0.03)", padding: "24px", display: "flex", flexDirection: "column", gap: 16,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Sparkles size={14} color="#8B5CF6" />
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER }}>
                        RECOMMENDATIONS
                      </span>
                    </div>
                    <button
                      onClick={handleOpenArchitectAiConnection}
                      style={{ fontSize: 11, fontWeight: 600, color: "#6366F1", border: "none", background: "transparent", cursor: "pointer" }}
                    >
                      Ask Architect
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {summaryMetrics.recommendations.map(rec => (
                      <div
                        key={rec.title}
                        onClick={() => handleRecommendationClick(rec)}
                        title="Click to inspect this component / file in Inspector Panel"
                        style={{
                          background: "#F8FAFC",
                          borderRadius: 16,
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          border: "1px solid rgba(241,245,249,0.8)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#F1F5F9";
                          e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#F8FAFC";
                          e.currentTarget.style.borderColor = "rgba(241,245,249,0.8)";
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: rec.bg, color: rec.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <AlertTriangle size={15} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", fontFamily: INTER }}>{rec.title}</div>
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2, fontFamily: INTER }}>{rec.desc}</div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: rec.color, background: rec.bg, padding: "3px 8px", borderRadius: 8, fontFamily: INTER }}>
                          {rec.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DEPENDENCY ANALYSIS CARD */}
                <div style={{
                  background: "#FFFFFF", borderRadius: 24, border: "1px solid rgba(226,232,240,0.8)",
                  boxShadow: "0 8px 30px rgba(15,23,42,0.03)", padding: "24px", display: "flex", flexDirection: "column", gap: 16,
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", fontFamily: INTER }}>
                    DEPENDENCY ANALYSIS
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {[
                      { label: "Coupling", val: `${Math.round(analysis?.architectureHealth?.couplingScore ?? (100 - healthScore))}%`, sub: healthScore >= 80 ? "Loosely coupled" : "Moderately coupled", bar: Math.round(analysis?.architectureHealth?.couplingScore ?? (100 - healthScore)), color: "#8B5CF6" },
                      { label: "Cohesion", val: `${Math.round(analysis?.architectureHealth?.cohesionScore ?? healthScore)}%`, sub: "Strong module boundaries", bar: Math.round(analysis?.architectureHealth?.cohesionScore ?? healthScore), color: "#10B981" },
                      { label: "Cyclic deps", val: `${summaryMetrics.cycles.length}`, sub: summaryMetrics.cycles.length > 0 ? `${summaryMetrics.cycles.length} circular loops in graph` : "Zero circular dependencies", bar: summaryMetrics.cycles.length * 20, color: summaryMetrics.cycles.length > 0 ? "#EF4444" : "#10B981" },
                      { label: "Reuse index", val: `${Math.round(analysis?.architectureHealth?.reuseIndex ?? 85)}%`, sub: "Above baseline", bar: Math.round(analysis?.architectureHealth?.reuseIndex ?? 85), color: "#3B82F6" },
                    ].map(dep => (
                      <div key={dep.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: INTER }}>{dep.label}</span>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", fontFamily: INTER }}>{dep.val}</span>
                        </div>
                        <div style={{ width: "100%", height: 6, borderRadius: 99, background: "#F1F5F9", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, Math.max(5, dep.bar))}%`, height: "100%", borderRadius: 99, background: dep.color }} />
                        </div>
                        <span style={{ fontSize: 10.5, color: "#94A3B8", fontFamily: INTER }}>{dep.sub}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* EXPLORER STUDIO */}
        {activeTab === "explore" && (
          <div style={{ flex: 1, display: "flex", padding: "16px", gap: 16, boxSizing: "border-box", overflow: "hidden" }}>
            
            <div style={{
              width: 220, background: "#F8FAFC", borderRadius: 12, border: "1px solid rgba(226,232,240,0.8)",
              padding: "12px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto"
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" }}>
                Project Files ({uniqueFiles.length})
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {uniqueFiles.map(f => {
                  const active = selectedNode && selectedNode.file === f;
                  const matchingNode = reduxNodes.find(n => n.file === f);
                  return (
                    <button
                      key={f}
                      onClick={() => { if (matchingNode) handleSelectNode(matchingNode.id); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", borderRadius: 6,
                        border: "none", background: active ? "#EEF2FF" : "transparent",
                        color: active ? "#6366F1" : matchingNode ? "#0F172A" : "#94A3B8",
                        cursor: matchingNode ? "pointer" : "default", textAlign: "left",
                        fontSize: 11, fontFamily: MONO, width: "100%", transition: "all 0.12s ease"
                      }}
                      onMouseEnter={e => { if (!active && matchingNode) e.currentTarget.style.background = "#F1F5F9"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <FileCode size={11} color={active ? "#6366F1" : "#94A3B8"} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.split("/").pop()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, background: "#F8FAFC",
                borderRadius: 10, padding: "7px 12px", border: "1px solid rgba(226,232,240,0.8)"
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>Path:</span>
                {breadcrumbs.length === 0 ? (
                  <span style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>No entity selected</span>
                ) : (
                  breadcrumbs.map((crumb, idx) => (
                    <div key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {idx > 0 && <ChevronRight size={10} color="#CBD5E1" />}
                      <span
                        onClick={() => handleSelectNode(crumb.id)}
                        style={{
                          fontSize: 11, fontFamily: MONO, cursor: "pointer",
                          fontWeight: idx === breadcrumbs.length - 1 ? 700 : 500,
                          color: idx === breadcrumbs.length - 1 ? "#6366F1" : "#64748B"
                        }}
                      >
                        {crumb.name}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div style={{
                flex: 1, background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(226,232,240,0.8)",
                padding: "16px 18px", overflowY: "auto"
              }}>
                {architectureModel.map(rootNode => (
                  <TreeNode
                    key={rootNode.id}
                    node={rootNode}
                    selectedId={selectedId}
                    onSelect={handleSelectNode}
                    expandedNodes={expandedNodes}
                    toggleExpand={toggleExpand}
                  />
                ))}
              </div>
            </div>

          </div>
        )}

        {/* FLOW STUDIO (React Flow / Radial Canvas) */}
        {activeTab === "flow" && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            margin: isFullscreen ? 0 : "12px 16px 12px 16px",
            background: "#FFFFFF",
            borderRadius: isFullscreen ? 0 : 16,
            border: isFullscreen ? "none" : "1px solid rgba(226,232,240,0.9)",
            boxShadow: isFullscreen ? "none" : "0 2px 16px rgba(15,23,42,0.06)",
            overflow: "hidden",
          }}>
            <FlowDiagram
              ref={flowRef}
              architectureModel={architectureModel}
              knowledgeGraph={knowledgeGraph}
              selectedId={selectedId}
              onSelectNode={handleSelectNode}
              highlightedIds={highlightedIds}
            />
          </div>
        )}

        {/* HISTORY STUDIO — Repository Architecture Timeline */}
        {activeTab === "history" && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            margin: "12px 16px 12px 16px",
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(226,232,240,0.9)",
            boxShadow: "0 2px 16px rgba(15,23,42,0.06)",
            overflow: "hidden",
          }}>
            <HistoryStudio />
          </div>
        )}

        {/* CODE HYGIENE STUDIO — Dead Code & Cleanup Analysis */}
        {activeTab === "hygiene" && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            margin: "12px 16px 12px 16px",
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid rgba(226,232,240,0.9)",
            boxShadow: "0 2px 16px rgba(15,23,42,0.06)",
            padding: "24px",
            overflowY: "auto",
            boxSizing: "border-box",
          }}>
            <CodeHygieneStudio
              hygieneReport={analysis?.deadCode}
              knowledgeGraph={knowledgeGraph}
              onInspectNode={(id, line) => {
                dispatch(selectNodeId(id));
                setTargetHighlightLine(line || null);
                setShowInspector(true);
              }}
            />
          </div>
        )}

      </main>

      {/* ── 4. Floating Right Inspector ── */}
      {!isFullscreen && showInspector && selectedNode && (
        <InspectorPanel
          node={selectedNode}
          onNavigate={handleSelectNode}
          knowledgeGraph={knowledgeGraph}
          targetLine={targetHighlightLine}
          onClose={() => setShowInspector(false)}
        />
      )}

      {/* ── 5. Floating Bottom Command Dock ── */}
      <div style={{ position: "absolute", bottom: isFullscreen ? 16 : 12, left: "50%", transform: "translateX(-50%)", zIndex: isFullscreen ? 60 : 35 }}>
        <CommandDock
          activeItem={isFullscreen ? 'focus' : (activeTab === 'flow' ? 'graph' : 'search')}
          onGraph={() => { if (isFullscreen) setIsFullscreen(false); setActiveTab('flow'); }}
          onFocus={() => {
            setActiveTab('flow');
            setIsFullscreen(prev => !prev);
          }}
          onAIExplain={() => setShowAIModal(true)}
          onOpenAIStudio={() => navigate('/investigation')}
          onExport={() => flowRef.current?.exportModel('SVG')}
          onSelectSearchNode={handleSelectNode}
          knowledgeGraph={knowledgeGraph}
          selectedNodeFile={selectedNode?.file}
        />
      </div>

      {/* ── AI Architectural Advisor Report Modal ── */}
      <AIArchitecturalAdvisorModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        node={selectedNode}
        knowledgeGraph={knowledgeGraph}
        analysis={analysis}
        selectedProject={selectedProject}
      />

    </div>
  );
}

export default function Architecture() {
  return <ArchitectureStudio />;
}
