import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getProjectHandle } from "@/lib/analysis/projectStore";
import { selectSelectedProject, clearSelectedProject } from "@/redux/slices/hubSlice";
import { setAppMode, setActiveRoom } from "@/redux/slices/uiSlice";
import { startProjectAnalysis } from "@/services/analysisService";

import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import OrbitSystem from "@/components/workspace/OrbitSystem";
import CoreSystem from "@/components/workspace/CoreSystem";
import InvestigationBrief from "@/components/workspace/InvestigationBrief";

// --- Constants ---
const CORE_R = 180;       // px - radius of the Core circle
const CHAMBER_INSET = 68; // px - inset of inner chamber from core edge

function toXY(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(rad)), y: Math.round(r * Math.sin(rad)) };
}

// --- Dynamic Briefing Helper ---
function getCoreContextOverview(displayRoom, analysis, projectName) {
  const baseDNA = {
    projectName: projectName || "React Project",
    components: analysis?.projectDNA?.componentCount || 0,
    routes: analysis?.projectDNA?.routeCount || 0,
    contexts: analysis?.projectDNA?.contextCount || 0,
    apis: analysis?.projectDNA?.apiCount || 0,
    healthScore: analysis?.architectureHealth?.score ?? 91,
    circulars: (analysis?.architectureHealth?.errors || []).concat(analysis?.architectureHealth?.warnings || []).filter(item => item.type === "CIRCULAR_DEPENDENCIES").length,
    largeComps: (analysis?.architectureHealth?.errors || []).concat(analysis?.architectureHealth?.warnings || []).filter(item => item.type === "POOR_MAINTAINABILITY").length,
    unusedComps: analysis?.deadCode?.unusedComponents?.length || 0,
    deadRoutes: analysis?.deadCode?.unusedRoutes?.length || 0,
    unusedHooks: analysis?.deadCode?.unusedHooks?.length || 0,
    unusedApis: analysis?.deadCode?.unusedApiServices?.length || 0,
  };

  if (displayRoom === "default" || displayRoom === "project-brain") {
    let targetDomain = "Architecture";
    let reason = "Verify modular boundaries and structural imports.";
    if (baseDNA.circulars > 0) {
      targetDomain = "Architecture";
      reason = `${baseDNA.circulars} circular dependency loops were detected.`;
    } else if (baseDNA.deadRoutes > 0) {
      targetDomain = "Navigation";
      reason = `${baseDNA.deadRoutes} dead routes were detected.`;
    } else if (baseDNA.unusedHooks > 0) {
      targetDomain = "Data Flow";
      reason = `${baseDNA.unusedHooks} unused state slices or hooks carry cascade invalidation risks.`;
    } else if (baseDNA.unusedApis > 0) {
      targetDomain = "Network";
      reason = `${baseDNA.unusedApis} stale API client endpoints were mapped.`;
    }

    return {
      metric: baseDNA.healthScore,
      color: "#7B9CF4",
      headline: `Project structure is in ${baseDNA.healthScore >= 90 ? "optimal" : "concerning"} standing`,
      body: `The Knowledge Graph has mapped ${baseDNA.components} components, ${baseDNA.routes} routes, ${baseDNA.contexts} slices, and ${baseDNA.apis} API endpoints.`,
      recommendation: reason,
      actionLabel: `Investigate ${targetDomain}`
    };
  }

  if (displayRoom === "architecture") {
    const headline = baseDNA.circulars > 0 ? "Circular import issues detected" : "Structural integrity is strong";
    const body = baseDNA.circulars > 0 
      ? `A circular dependency chain has begun attracting satellite imports. ${baseDNA.largeComps} components with poor maintainability require decomposition.`
      : `${baseDNA.components} active components mapped with clear separation of modular boundaries.`;
    return {
      metric: baseDNA.healthScore,
      color: "#D4A847",
      headline,
      body,
      recommendation: baseDNA.circulars > 0 ? "Resolve circular dependency loops before compilation size spikes." : "All component systems stable.",
      actionLabel: "Inspect Architecture"
    };
  }

  if (displayRoom === "routes") {
    const headline = baseDNA.deadRoutes > 0 ? "Routing health is deteriorating" : "Route configurations look healthy";
    const body = baseDNA.deadRoutes > 0
      ? `${baseDNA.deadRoutes} dead routes were detected. Navigation complexity exceeds recommended performance thresholds.`
      : `All ${baseDNA.routes} application routes are mapped and active. No orphan paths found.`;
    return {
      metric: Math.max(100 - baseDNA.deadRoutes * 12, 10),
      color: "#5BB8D4",
      headline,
      body,
      recommendation: baseDNA.deadRoutes > 0 ? "Audit layout templates and remove unreachable navigation pathways." : "All route gates secure.",
      actionLabel: "Investigate Navigation"
    };
  }

  if (displayRoom === "state") {
    const headline = baseDNA.unusedHooks > 0 ? "State redundancy risk is elevated" : "Data subscriptions are optimal";
    const body = baseDNA.unusedHooks > 0
      ? `${baseDNA.unusedHooks} unused state slices or hooks were detected. Cascade invalidation events are likely without hooks cleanups.`
      : `All global store slices and hooks share optimal render subscription trees.`;
    return {
      metric: Math.max(100 - baseDNA.unusedHooks * 8, 10),
      color: "#9B7AE8",
      headline,
      body,
      recommendation: baseDNA.unusedHooks > 0 ? "Merge duplicate selectors and decouple stale component bindings." : "State store clear.",
      actionLabel: "Analyze Data Flow"
    };
  }

  if (displayRoom === "api") {
    const headline = baseDNA.unusedApis > 0 ? "Stale API client calls detected" : "Fetch layers are well-formed";
    const body = baseDNA.unusedApis > 0
      ? `${baseDNA.unusedApis} endpoints lack consumer imports. Fetch retry configurations carry cache mismatches.`
      : `All ${baseDNA.apis} API endpoints are actively called by client modules.`;
    return {
      metric: Math.max(100 - baseDNA.unusedApis * 10, 10),
      color: "#E8705A",
      headline,
      body,
      recommendation: baseDNA.unusedApis > 0 ? "Audit stale axios requests and cache redundant network fetches." : "Endpoints resolved.",
      actionLabel: "Review Network"
    };
  }

  if (displayRoom === "documentation") {
    return {
      metric: 85,
      color: "#6DB885",
      headline: "Critical components undocumented",
      body: "Only 38% component coverage. Core components have zero JSDoc descriptors and lack Storybook examples.",
      recommendation: "Document high-leverage button and input components first.",
      actionLabel: "Start Investigation"
    };
  }

  return {
    metric: "100",
    color: "#7B9CF4",
    headline: "System Mapped",
    body: "All systems healthy.",
    recommendation: "No active alerts.",
    actionLabel: "Explore Workspace"
  };
}

function getRecommendedDomainId(analysis) {
  if (!analysis || !analysis.architectureHealth) return "architecture";

  const scores = {
    architecture: analysis.architectureHealth.score ?? 87,
    routes: Math.max(100 - (analysis.deadCode?.unusedRoutes?.length * 12 || 0), 10),
    state: Math.max(100 - (analysis.deadCode?.unusedHooks?.length * 8 || 0), 10),
    api: Math.max(100 - (analysis.deadCode?.unusedApiServices?.length * 10 || 0), 10),
    documentation: 85,
  };

  const domains = ["architecture", "routes", "state", "api", "documentation"];

  const priorities = domains.map(id => {
    const score = scores[id];
    // Severity: 0 to 1 (higher = lower health score)
    const severity = Math.max(0, (100 - score) / 100);

    // Confidence: how much real data validates this domain
    let confidence = 0.5;
    if (id === "architecture") {
      confidence = analysis.architectureHealth ? 0.9 : 0.5;
    } else if (id === "routes") {
      confidence = (analysis.projectDNA?.routeCount ?? 0) > 0 ? 0.95 : 0.3;
    } else if (id === "state") {
      confidence = (analysis.projectDNA?.contextCount ?? 0) > 0 ? 0.9 : 0.3;
    } else if (id === "api") {
      confidence = (analysis.projectDNA?.apiCount ?? 0) > 0 ? 0.85 : 0.3;
    } else if (id === "documentation") {
      confidence = 0.4;
    }

    // Impact: scale of the domain within the project size
    let impact = 0.3;
    const totalFiles = analysis.projectDNA?.fileCount || 30;
    if (id === "architecture") {
      impact = Math.min(1.0, (analysis.projectDNA?.componentCount || 0) / totalFiles + 0.3);
    } else if (id === "routes") {
      impact = Math.min(1.0, (analysis.projectDNA?.routeCount || 0) / totalFiles + 0.4);
    } else if (id === "state") {
      impact = Math.min(1.0, (analysis.projectDNA?.contextCount || 0) * 1.5 / totalFiles + 0.3);
    } else if (id === "api") {
      impact = Math.min(1.0, (analysis.projectDNA?.apiCount || 0) * 2.0 / totalFiles + 0.3);
    } else if (id === "documentation") {
      impact = 0.2;
    }

    return { id, priority: severity * confidence * impact };
  });

  priorities.sort((a, b) => b.priority - a.priority);
  return priorities[0]?.id || "architecture";
}

const getTargetRotation = (activeDomainId) => {
  if (!activeDomainId) return 0;
  const angleMap = {
    "architecture": -90,
    "routes": -18,
    "state": 54,
    "api": 126,
    "documentation": 198
  };
  const baseAngle = angleMap[activeDomainId] ?? 0;
  // Rotate system so that the selected angle aligns at -90 degrees (top center)
  return -90 - baseAngle;
};

// --- Main Workspace Component ---
const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const selectedProject = useSelector(selectSelectedProject);
  const analysis = useSelector((state) => state.analysis);
  const recommendedDomainId = getRecommendedDomainId(analysis);
  const needsPermission = analysis?.needsPermission;

  const [active, setActive]     = useState(null);
  const [hovered, setHovered]   = useState(null);
  const [vw, setVw]             = useState(1440);
  const [vh, setVh]             = useState(900);

  const [transitionPhase, setTransitionPhase] = useState(null);
  const [extraRotation, setExtraRotation] = useState(0);

  // Experience Redesign state machine ("dormant" -> "booting" -> "awakening" -> "understood" -> "briefing" -> "ready")
  const [introStep, setIntroStep] = useState("dormant");

  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const rawFiles = knowledgeGraph?.rawFiles || [];

  // Parse project's package.json dependencies dynamically
  const packageJsonFile = rawFiles.find(f => f.name === "package.json");
  let dependencies = {};
  if (packageJsonFile) {
    try {
      const parsed = JSON.parse(packageJsonFile.content);
      dependencies = {
        ...parsed.dependencies,
        ...parsed.devDependencies,
        ...parsed.peerDependencies
      };
    } catch (e) {
      console.error("Failed to parse package.json dependencies", e);
    }
  }

  // Detect package manager
  const packageManager = rawFiles.some(f => f.name === "package-lock.json") ? "npm" :
                         rawFiles.some(f => f.name === "yarn.lock") ? "yarn" :
                         rawFiles.some(f => f.name === "pnpm-lock.yaml") ? "pnpm" : "npm";

  // Category mapping catalog
  const CATEGORY_MAP = {
    "Frontend": [
      { key: "react", label: "React" },
      { key: "vite", label: "Vite" },
      { key: "typescript", label: "TypeScript" },
      { key: "vue", label: "Vue" },
      { key: "svelte", label: "Svelte" },
      { key: "@angular/core", label: "Angular" },
    ],
    "State": [
      { key: "@reduxjs/toolkit", label: "Redux Toolkit" },
      { key: "redux", label: "Redux" },
      { key: "zustand", label: "Zustand" },
      { key: "mobx", label: "MobX" },
      { key: "recoil", label: "Recoil" },
      { key: "xstate", label: "XState" },
    ],
    "Routing": [
      { key: "react-router-dom", label: "React Router" },
      { key: "react-router", label: "React Router" },
      { key: "@tanstack/react-router", label: "TanStack Router" },
      { key: "wouter", label: "Wouter" },
    ],
    "Styling": [
      { key: "tailwindcss", label: "Tailwind CSS" },
      { key: "sass", label: "Sass" },
      { key: "scss", label: "SCSS" },
      { key: "less", label: "Less" },
      { key: "styled-components", label: "Styled Components" },
      { key: "@emotion/react", label: "Emotion" },
    ],
    "Animation": [
      { key: "gsap", label: "GSAP" },
      { key: "@gsap/react", label: "GSAP React" },
      { key: "framer-motion", label: "Framer Motion" },
      { key: "motion", label: "Motion" },
      { key: "animejs", label: "Anime.js" },
    ],
    "Networking": [
      { key: "axios", label: "Axios" },
      { key: "@tanstack/react-query", label: "TanStack Query" },
      { key: "swr", label: "SWR" },
    ],
    "Tooling": [
      { key: "eslint", label: "ESLint" },
      { key: "prettier", label: "Prettier" },
      { key: "typescript", label: "TypeScript" },
      { key: "vitest", label: "Vitest" },
      { key: "jest", label: "Jest" },
    ]
  };

  const detectedCategories = {};

  if (Object.keys(dependencies).length > 0) {
    Object.entries(CATEGORY_MAP).forEach(([category, list]) => {
      const activeInCat = [];
      list.forEach(({ key, label }) => {
        if (key in dependencies) {
          if (!activeInCat.includes(label)) {
            activeInCat.push(label);
          }
        }
      });

      // Special contextual overrides
      if (category === "Frontend") {
        if (!activeInCat.includes("React") && ("react" in dependencies)) {
          activeInCat.push("React");
        }
        if (!activeInCat.includes("JavaScript")) {
          activeInCat.push("JavaScript");
        }
      }
      if (category === "Tooling") {
        const pmLabel = packageManager.toUpperCase();
        if (!activeInCat.includes(pmLabel)) {
          activeInCat.push(pmLabel);
        }
      }

      if (activeInCat.length > 0) {
        detectedCategories[category] = activeInCat;
      }
    });
  } else {
    // Fallback using selectedProject flags
    const frontend = ["React", "JavaScript"];
    if (selectedProject?.hasTypeScript) frontend.push("TypeScript");
    detectedCategories["Frontend"] = frontend;

    const styling = [];
    if (selectedProject?.hasTailwind) styling.push("Tailwind CSS");
    if (styling.length > 0) detectedCategories["Styling"] = styling;

    const state = [];
    if (selectedProject?.hasRedux) state.push("Redux Toolkit");
    else state.push("Context API");
    detectedCategories["State"] = state;

    const routing = [];
    if (selectedProject?.hasRouter) routing.push("React Router");
    if (routing.length > 0) detectedCategories["Routing"] = routing;

    detectedCategories["Tooling"] = [packageManager.toUpperCase()];
  }

  // Redirect to Hub if no project is loaded, or trigger analysis if idle
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    } else {
      dispatch(setAppMode("workspace"));
      if (analysis.status === "idle") {
        dispatch(startProjectAnalysis({ projectId: selectedProject.id, project: selectedProject }));
      }
    }
  }, [selectedProject, navigate, dispatch, analysis.status]);

  // Cinematic auto-boot sequence
  useEffect(() => {
    if (analysis.status === "ready" && introStep === "dormant") {
      const timer = setTimeout(() => {
        setIntroStep("booting");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [analysis.status, introStep]);

  useEffect(() => {
    if (introStep === "booting") {
      const timer = setTimeout(() => {
        setIntroStep("awakening");
      }, 1800);
      return () => clearTimeout(timer);
    } else if (introStep === "awakening") {
      const timer = setTimeout(() => {
        setIntroStep("understood");
      }, 2500);
      return () => clearTimeout(timer);
    } else if (introStep === "understood") {
      const timer = setTimeout(() => {
        setIntroStep("briefing");
      }, 1400);
      return () => clearTimeout(timer);
    } else if (introStep === "briefing") {
      const timer = setTimeout(() => {
        setIntroStep("ready");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [introStep]);

  useEffect(() => {
    const resize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleRequestPermission = async () => {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    let dirHandle = window.projectHandles?.[projectId];
    if (!dirHandle) {
      dirHandle = await getProjectHandle(projectId);
    }
    if (!dirHandle) return;
    try {
      const permission = await dirHandle.requestPermission({ mode: "read" });
      if (permission === "granted") {
        if (!window.projectHandles) window.projectHandles = {};
        window.projectHandles[projectId] = dirHandle;
        dispatch(startProjectAnalysis({ projectId, project: selectedProject }));
      }
    } catch (err) {
      console.error("Failed to request permission", err);
    }
  };

  const handleReturnToHub = () => {
    dispatch(clearSelectedProject());
    dispatch(setAppMode("hub"));
    dispatch(setActiveRoom("project-brain"));
    navigate("/hub");
  };

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);

  const intelKey = active ?? "default";
  const intel = getCoreContextOverview(intelKey, analysis, selectedProject?.name);

  // Preview color: active > hovered > default
  const displayId = active ?? hovered;
  const displayColor = displayId ? (
    displayId === "architecture" ? "#D4A847" :
    displayId === "routes" ? "#5BB8D4" :
    displayId === "state" ? "#9B7AE8" :
    displayId === "api" ? "#E8705A" :
    displayId === "documentation" ? "#6DB885" : "#7B9CF4"
  ) : intel.color;

  const ring1Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "2s" :
                       transitionPhase === "acceleration" ? "6s" : "24s";
  const ring2Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "3s" :
                       transitionPhase === "acceleration" ? "9s" : "36s";
  const ring3Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "1.5s" :
                       transitionPhase === "acceleration" ? "4s" : "14s";

  const coreCX = vw * 0.38;
  const coreCY = vh * 0.5;

  const brainX = (introStep === "dormant" || introStep === "booting") ? (vw / 2) : coreCX;
  const brainY = (introStep === "dormant" || introStep === "booting") ? (vh / 2) : coreCY;

  // Orbit ring -> line start just outside the Core edge
  const EDGE = CORE_R + 14;

  const handleDomain = (id) => setActive(p => p === id ? null : id);

  const startSignatureTransition = useCallback((targetDomainId = active) => {
    // 1. Acknowledgement (~120ms)
    setTransitionPhase("acknowledgement");
    
    // 2. Orbit acceleration (~350ms)
    setTimeout(() => {
      setTransitionPhase("acceleration");
      setExtraRotation(180);
    }, 120);

    // 3. Core charge (~250ms)
    setTimeout(() => {
      setTransitionPhase("charge");
      setExtraRotation(540);
    }, 470);

    // 4. Core expansion (~250ms)
    setTimeout(() => {
      setTransitionPhase("expansion");
      setExtraRotation(1080);
    }, 720);

    // 5. Navigation / Arrival
    setTimeout(() => {
      const routes = {
        "architecture": "/architecture",
        "routes": "/routes",
        "state": "/state",
        "api": "/api",
        "documentation": "/docs",
      };
      const targetRoute = routes[targetDomainId];
      if (targetRoute) {
        navigate(targetRoute);
      }
      setTransitionPhase(null);
      setExtraRotation(0);
      setActive(null);
    }, 970);
  }, [active, navigate]);

  // Handle Left/Right arrow keys to cycle through domains, and Enter to trigger transition
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }
      if (introStep !== "ready" || transitionPhase !== null) {
        return;
      }
      const domainIds = ["architecture", "routes", "state", "api", "documentation"];
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setActive((currentActive) => {
          if (!currentActive) {
            return recommendedDomainId || domainIds[0];
          }
          const currentIndex = domainIds.indexOf(currentActive);
          const nextIndex = (currentIndex + 1) % domainIds.length;
          return domainIds[nextIndex];
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActive((currentActive) => {
          if (!currentActive) {
            return recommendedDomainId || domainIds[domainIds.length - 1];
          }
          const currentIndex = domainIds.indexOf(currentActive);
          const prevIndex = (currentIndex - 1 + domainIds.length) % domainIds.length;
          return domainIds[prevIndex];
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const targetId = active ?? recommendedDomainId;
        if (targetId) {
          startSignatureTransition(targetId);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [introStep, transitionPhase, recommendedDomainId, active, startSignatureTransition]);

  // Dynamic layout score mapping & dynamic orbit radius
  const ORBIT_R = Math.max(260, Math.min(310, vw * 0.21));
  const localC = ORBIT_R + 60;

  const baseDNA = {
    components: analysis?.projectDNA?.componentCount || 0,
    routes: analysis?.projectDNA?.routeCount || 0,
    contexts: analysis?.projectDNA?.contextCount || 0,
    apis: analysis?.projectDNA?.apiCount || 0,
  };

  const domains = [
    { id: "architecture", label: "Architecture", color: "#D4A847", score: analysis?.architectureHealth?.score ?? 87, count: `${baseDNA.components} components`, ...toXY(-90, ORBIT_R) },
    { id: "routes",       label: "Navigation",   color: "#5BB8D4", score: Math.max(100 - (analysis?.deadCode?.unusedRoutes?.length * 12 || 0), 10), count: `${baseDNA.routes} routes`,       ...toXY(-18, ORBIT_R) },
    { id: "state",        label: "Data Flow",    color: "#9B7AE8", score: Math.max(100 - (analysis?.deadCode?.unusedHooks?.length * 8 || 0), 10), count: `${baseDNA.contexts} contexts`,       ...toXY(54, ORBIT_R)  },
    { id: "api",          label: "Network",      color: "#E8705A", score: Math.max(100 - (analysis?.deadCode?.unusedApiServices?.length * 10 || 0), 10), count: `${baseDNA.apis} endpoints`,    ...toXY(126, ORBIT_R) },
    { id: "documentation",label: "Investigation",color: "#6DB885", score: 85, count: "85% coverage",    ...toXY(198, ORBIT_R) },
  ];



  // Dynamic rotate angle
  const orbitRotation = getTargetRotation(active);

  // Core metrics contextual mapping
  const getContextualMetric = (domainId, analysis, overview) => {
    if (!domainId) {
      return {
        metric: overview.metric,
        label: "Architecture Health"
      };
    }
    
    switch (domainId) {
      case "architecture":
        return {
          metric: analysis?.architectureHealth?.score ?? 87,
          label: "Architecture Health"
        };
      case "routes":
        return {
          metric: analysis?.deadCode?.unusedRoutes?.length ?? 14,
          label: "Navigation Health"
        };
      case "state":
        return {
          metric: analysis?.projectDNA?.hookCount ?? 48,
          label: "Data Flow Health"
        };
      case "api":
        return {
          metric: analysis?.deadCode?.unusedApiServices?.length ?? 2,
          label: "Network Health"
        };
      case "documentation":
        return {
          metric: "61%",
          label: "Investigation Coverage"
        };
      default:
        return {
          metric: overview.metric,
          label: "Architecture Health"
        };
    }
  };

  const coreMetric = getContextualMetric(active, analysis, intel);

  if (!selectedProject) {
    return null;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
        @keyframes spin-cw   { to { transform: rotate(360deg); } }
        @keyframes spin-ccw  { to { transform: rotate(-360deg); } }
        @keyframes breathe   { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @keyframes status-blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes data-flow { from { stroke-dashoffset:28; } to { stroke-dashoffset:0; } }
        @keyframes scan      { 0%   { transform:translateY(0); opacity:0.6; }
                               88%  { opacity:0.6; }
                               100% { transform:translateY(224px); opacity:0; } }
        @keyframes fade-up   { from { opacity:0; transform:translateY(12px); }
                               to   { opacity:1; transform:translateY(0); } }
        @keyframes threshold-in { from { opacity:0; transform:translateY(6px); }
                                  to   { opacity:1; transform:translateY(0); } }
        @keyframes entering-wipe { from { opacity:0; } to { opacity:1; } }

        .spin-cw-24  { animation: spin-cw  24s linear infinite; }
        .spin-cw-14  { animation: spin-cw  14s linear infinite; }
        .spin-ccw-36 { animation: spin-ccw 36s linear infinite; }
        .breathe     { animation: breathe 4.5s ease-in-out infinite; }
        .status-blink{ animation: status-blink 2.6s ease-in-out infinite; }
        .data-flow   { stroke-dasharray: 3 10; animation: data-flow 1.4s linear infinite; }
        .data-flow-fast { stroke-dasharray: 3 10; animation: data-flow 0.4s linear infinite; }
        .scan-line   { animation: scan 7s ease-in-out infinite; }
      `}</style>

      <div
        className="relative w-full h-screen overflow-hidden select-none"
        style={{ background: "#05080E", fontFamily: "'Bricolage Grotesque', sans-serif" }}
      >
        {/* -- Atmospheric glow -- */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 880px 680px at ${brainX}px ${brainY}px, ${displayColor}16 0%, transparent 62%)`,
            transition: "background 1.1s ease",
          }}
        />

        {/* -- Vignette -- */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 110% 110% at 50% 50%, transparent 35%, #05080E 100%)",
          }}
        />

        {/* -- Spatial grid -- */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.022 }}>
          <defs>
            <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* -- Rotating Orbital System Container -- */}
        <OrbitSystem
          introStep={introStep}
          transitionPhase={transitionPhase}
          active={active}
          hovered={hovered}
          recommendedDomainId={recommendedDomainId}
          orbitRotation={orbitRotation}
          extraRotation={extraRotation}
          coreCX={coreCX}
          coreCY={coreCY}
          localC={localC}
          ORBIT_R={ORBIT_R}
          EDGE={EDGE}
          domains={domains}
          handleDomain={handleDomain}
          setHovered={setHovered}
        />

        {/* -- THE CORE -- */}
        <CoreSystem
          introStep={introStep}
          transitionPhase={transitionPhase}
          brainX={brainX}
          brainY={brainY}
          displayColor={displayColor}
          ring1Duration={ring1Duration}
          ring2Duration={ring2Duration}
          ring3Duration={ring3Duration}
          CORE_R={CORE_R}
          CHAMBER_INSET={CHAMBER_INSET}
          analysis={analysis}
          coreMetric={coreMetric}
          intelKey={intelKey}
          extraRotation={extraRotation}
        />

        {/* -- Header HUD -- */}
        <WorkspaceHeader
          introStep={introStep}
          transitionPhase={transitionPhase}
          selectedProject={selectedProject}
          analysis={analysis}
          needsPermission={needsPermission}
          handleReturnToHub={handleReturnToHub}
          handleRequestPermission={handleRequestPermission}
        />

        {/* -- Bottom-left live timestamp -- */}
        {(introStep !== "dormant" && introStep !== "booting") && (
          <motion.div
            className="absolute"
            initial={{ opacity: 0 }}
            animate={{ opacity: transitionPhase === "expansion" ? 0 : 1 }}
            transition={{ duration: 0.8, delay: introStep === "awakening" ? 1.5 : 0 }}
            style={{ left: 36, bottom: 30, zIndex: 10 }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "8px", letterSpacing: "1.5px",
              color: "rgba(255,255,255,0.12)", textTransform: "uppercase",
            }}>
              SYSTEM * {timeStr}
            </div>
          </motion.div>
        )}

        {/* -- Investigation Brief Panel -- */}
        <InvestigationBrief
          introStep={introStep}
          transitionPhase={transitionPhase}
          active={active}
          recommendedDomainId={recommendedDomainId}
          vw={vw}
          displayColor={displayColor}
          intel={intel}
          intelKey={intelKey}
          startSignatureTransition={startSignatureTransition}
        />
      </div>
    </>
  );
};

export default Workspace;