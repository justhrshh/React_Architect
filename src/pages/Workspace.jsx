import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
import { setActiveRoom, setAppMode } from "@/redux/slices/uiSlice";
import { setNodes, setEdges, setFiles, setRouteNodes, setRouteEdges } from "@/redux/slices/graphSlice";
import {
  selectSelectedProject,
  clearSelectedProject,
} from "@/redux/slices/hubSlice";
import WorkspaceScene from "@/features/workspace/WorkspaceScene";
import { getProjectHandle } from "@/lib/analysis/projectStore";
import { buildRouteGraph } from "@/lib/analysis/routeParser";

const roomDetails = {
  "project-brain": {
    title: "Project Brain",
    type: "Core Analysis Hub",
    desc: "Architectural health scores, AI-assisted refactoring, and codebase statistics will plug in here in future sprints.",
  },
  "architecture": {
    title: "Architecture",
    type: "Component Tree",
    desc: "Interactive component hierarchy graph. Sprint 4 will load AST structures and render nodes using React Flow.",
  },
  "routes": {
    title: "Routes",
    type: "Navigation Flow",
    desc: "Trace react-router page paths, screen dependencies, and router hooks dynamically.",
  },
  "state-flow": {
    title: "State Flow",
    type: "RTK & Context Slice",
    desc: "Reveal Redux slices, contexts, and local state dependencies inside a visual state trace.",
  },
  "api-flow": {
    title: "API Flow",
    type: "Network Endpoints",
    desc: "Map request and response surfaces, REST / GraphQL calls, and mock api structures.",
  },
  "documentation": {
    title: "Documentation",
    type: "Interactive Markdown",
    desc: "Inspect auto-generated codebase documents, setup guides, and inline code docstrings.",
  },
  "explore": {
    title: "Space Explorer",
    type: "Immersive 3D Void",
    desc: "You are in wide-angle explore mode. Click and drag the mouse to look around, scroll to zoom, or select a platform to focus and lock in.",
  },
};

const menuItems = [
  { key: "project-brain", label: "00 Brain" },
  { key: "architecture", label: "01 Architecture" },
  { key: "routes", label: "02 Routes" },
  { key: "state-flow", label: "03 State" },
  { key: "api-flow", label: "04 API" },
  { key: "documentation", label: "05 Docs" },
];

// ── Main Workspace Component ─────────────────────────────────────────────────
const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const activeRoom = useSelector((state) => state.ui.activeRoom);
  const selectedProject = useSelector(selectSelectedProject);

  const [focusedRoom, setFocusedRoom] = useState("project-brain");

  // Redirect to Hub if no project is selected
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    } else {
      dispatch(setAppMode("workspace"));
    }
  }, [selectedProject, navigate, dispatch]);

  const [needsPermission, setNeedsPermission] = useState(false);
  const [cachedHandle, setCachedHandle] = useState(null);

  // Dynamic project scanning and graph loading
  useEffect(() => {
    if (!selectedProject) return;

    const projectId = selectedProject.id;
    let dirHandle = window.projectHandles?.[projectId];
    let zipFile = window.projectZipFiles?.[projectId];

    async function loadAndScan() {
      // 1. Load from IndexedDB if not in memory
      if (!dirHandle && !zipFile) {
        const persisted = await getProjectHandle(projectId);
        if (persisted) {
          if (persisted instanceof File) {
            zipFile = persisted;
            if (!window.projectZipFiles) window.projectZipFiles = {};
            window.projectZipFiles[projectId] = zipFile;
          } else {
            dirHandle = persisted;
            if (!window.projectHandles) window.projectHandles = {};
            window.projectHandles[projectId] = dirHandle;
          }
        }
      }

      // 2. Check permissions for folders
      if (dirHandle) {
        const permission = await dirHandle.queryPermission({ mode: "read" });
        if (permission !== "granted") {
          setCachedHandle(dirHandle);
          setNeedsPermission(true);
          return;
        }
        setNeedsPermission(false);
      }

      // 3. Trigger Scanning
      if (dirHandle || zipFile) {
        const { analyzeProject } = await import("@/lib/analysis/analyzer");
        analyzeProject(selectedProject, dirHandle, zipFile)
          .then(({ nodes, edges, files, rawFiles, routeNodes, routeEdges }) => {
            dispatch(setNodes(nodes));
            dispatch(setEdges(edges));
            dispatch(setFiles(files));
            dispatch(setRouteNodes(routeNodes));
            dispatch(setRouteEdges(routeEdges));
            window.projectFiles = rawFiles;
          })
          .catch(err => {
            console.error("Failed to analyze dynamic project", err);
          });
      } else {
        // Showcase seed fallback
        const { getGraphDataForProject } = await import("@/lib/analysis/mockDataGenerator");
        const { nodes, edges, files } = getGraphDataForProject(selectedProject);
        dispatch(setNodes(nodes));
        dispatch(setEdges(edges));
        dispatch(setFiles(files));

        // Dynamic route matching fallback
        const mockFiles = files.map(f => ({ path: f, content: "" }));
        const routeGraph = buildRouteGraph(mockFiles, selectedProject);
        dispatch(setRouteNodes(routeGraph.nodes));
        dispatch(setRouteEdges(routeGraph.edges));
      }
    }

    loadAndScan().catch(err => {
      console.error("Error in loadAndScan", err);
    });
  }, [selectedProject, dispatch]);

  const handleRequestPermission = async () => {
    if (!cachedHandle) return;
    try {
      const permission = await cachedHandle.requestPermission({ mode: "read" });
      if (permission === "granted") {
        setNeedsPermission(false);
        const projectId = selectedProject.id;
        if (!window.projectHandles) window.projectHandles = {};
        window.projectHandles[projectId] = cachedHandle;

        const { analyzeProject } = await import("@/lib/analysis/analyzer");
        const { nodes, edges, files, rawFiles, routeNodes, routeEdges } = await analyzeProject(selectedProject, cachedHandle, null);
        dispatch(setNodes(nodes));
        dispatch(setEdges(edges));
        dispatch(setFiles(files));
        dispatch(setRouteNodes(routeNodes));
        dispatch(setRouteEdges(routeEdges));
        window.projectFiles = rawFiles;
      }
    } catch (err) {
      console.error("Failed to request permission", err);
    }
  };

  const handleArrivalChange = (room) => {
    setFocusedRoom(room);
  };

  const handleNavClick = (roomKey) => {
    dispatch(setActiveRoom(roomKey));
  };

  const handlePlatformSelect = (roomKey) => {
    dispatch(setActiveRoom(roomKey));
  };

  // Return to Dashboard Hub
  const handleReturnToHub = () => {
    dispatch(clearSelectedProject());
    dispatch(setAppMode("hub"));
    dispatch(setActiveRoom("project-brain"));
    navigate("/hub");
  };

  const handlePortalComplete = useCallback((roomKey) => {
    const routes = {
      "architecture": "/architecture",
      "routes": "/routes",
      "state-flow": "/state",
      "api-flow": "/api",
      "documentation": "/docs",
    };
    const targetRoute = routes[roomKey];
    if (targetRoute) {
      navigate(targetRoute);
    }
  }, [navigate]);

  const activeDetail = roomDetails[focusedRoom];
  const isFlying = focusedRoom === null;
  const showHUD = !isFlying && (activeRoom === "project-brain");

  if (!selectedProject) {
    return null; // Let the redirect trigger in useEffect
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-obsidian select-none text-slate-100 flex flex-col font-sans">
      
      {/* 3D spatial scene background */}
      <WorkspaceScene 
        onArrivalChange={handleArrivalChange} 
        onSelectRoom={handlePlatformSelect}
        onSelectProject={() => {}}
        onAddClick={() => navigate("/hub")}
        onContextMenu={() => {}}
        onPortalComplete={handlePortalComplete}
      />

      {/* Explore Mode Instructions Overlay HUD */}
      {focusedRoom === "explore" && (
        <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-fade-in z-20">
          <div className="font-mono text-[10px] uppercase tracking-widestest text-accent mb-2">
            Explore Mode Active
          </div>
          <h2 className="font-display text-lg md:text-xl font-[800] text-white tracking-tightest text-balance max-w-lg leading-tight">
            Drag mouse to look around &bull; Scroll to zoom &bull; Click platform to lock
          </h2>
        </div>
      )}

      {/* Premium HUD UI overlays */}
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col justify-between p-6 md:p-10">
        
        {/* Top Header Panel */}
        <header 
          className={`w-full flex items-center justify-between pointer-events-auto bg-obsidian/30 backdrop-blur-md border border-edge-subtle p-4 rounded-xl shadow-lg gap-4 transition-all duration-500 transform ${
            showHUD ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6 pointer-events-none"
          }`}
        >
          <div 
            onClick={() => handleNavClick("project-brain")}
            className="font-display font-[800] text-sm tracking-tightest cursor-pointer text-white hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            React<span className="text-accent">/</span>Architect
          </div>
          
          {/* Active project name */}
          {selectedProject && (
            <div className="hidden md:flex items-center gap-2">
              <span className="w-px h-3 bg-white/15" />
              <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
                {selectedProject.name}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widestest px-1.5 py-0.5 bg-white/5 border border-edge-subtle rounded text-ink-faint">
                {selectedProject.framework}
              </span>
            </div>
          )}

          {/* Navigation Room Selectors */}
          <nav className="hidden lg:flex items-center gap-6">
            {menuItems.map((item) => {
              const isSelected = activeRoom === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`nav-underline font-mono text-[10px] md:text-xs uppercase tracking-widestest transition-all duration-300 ${
                    isSelected ? "text-accent font-semibold" : "text-ink-dim hover:text-white"
                  }`}
                  data-active={isSelected}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Explore / Look Around Button */}
            {activeRoom !== "explore" && (
              <button
                onClick={() => handleNavClick("explore")}
                className="font-mono text-[10px] md:text-xs uppercase tracking-widestest px-4 py-2 border border-edge-subtle text-ink-dim hover:text-white hover:border-white/20 rounded-lg transition-colors shadow-lg bg-obsidian/45"
              >
                Look Around
              </button>
            )}

            {/* Exit to Hub */}
            <button
              onClick={handleReturnToHub}
              className="font-mono text-[10px] md:text-xs uppercase tracking-widestest text-ink-dim hover:text-white border border-edge-subtle hover:border-white/20 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              ← Hub
            </button>
          </div>
        </header>

        {/* Floating Mobile Nav bar (visible on small viewports) */}
        <div 
          className={`lg:hidden w-full overflow-x-auto flex items-center gap-4 py-2 pointer-events-auto mt-4 bg-obsidian/50 backdrop-blur border border-edge-subtle p-3 rounded-lg transition-all duration-500 ${
            showHUD ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          {menuItems.map((item) => {
            const isSelected = activeRoom === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`whitespace-nowrap font-mono text-[9px] uppercase tracking-widestest px-3 py-1.5 rounded ${
                  isSelected ? "bg-accent/10 text-accent font-semibold border border-accent/25" : "text-ink-dim"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Bottom Info Details panel */}
        <footer className="w-full flex items-end justify-between mt-auto">
          <div className="w-full max-w-md pointer-events-auto">
            <div
              className={`glass p-6 md:p-8 rounded-2xl border border-edge-subtle shadow-2xl transition-all duration-500 transform ${
                (showHUD && focusedRoom) 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-6 scale-95"
              }`}
            >
              {activeDetail ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
                    <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
                      {activeDetail.type}
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-[800] text-white tracking-tightest mb-3 leading-none animate-slide-up">
                    {activeDetail.title}
                  </h3>
                  <p className="text-sm text-ink-dim leading-relaxed">
                    {activeDetail.desc}
                  </p>
                </>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                  <span className="font-mono text-[10px] uppercase tracking-widestest text-accent animate-pulse">
                    SWEEPING CAMERA POSITION...
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div 
            className={`hidden md:block font-mono text-[10px] text-ink-faint uppercase tracking-widestest p-4 transition-opacity duration-500 ${
              showHUD ? "opacity-100" : "opacity-0"
            }`}
          >
            Workspace Mode // HUD_v0.5.3
          </div>
        </footer>

      </div>

      {/* Directory Access Permission Modal Overlay */}
      {needsPermission && (
        <div className="absolute inset-0 z-[8000] bg-obsidian/96 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 select-none pointer-events-auto">
          <div className="w-14 h-14 rounded-full border border-blue-500/20 bg-blue-500/5 flex items-center justify-center text-blue-400 mb-6 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <Layers size={22} className="animate-pulse" />
          </div>
          <h3 className="font-display text-xl font-[800] text-white tracking-tightest mb-2">
            Local Directory Access Required
          </h3>
          <p className="font-mono text-[9px] text-slate-400 max-w-sm leading-relaxed mb-8 uppercase tracking-widest">
            React Architect needs permission to scan your local folder to construct the component architecture graph.
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleReturnToHub}
              className="px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-all duration-300 font-bold"
            >
              Back to Hub
            </button>
            <button
              onClick={handleRequestPermission}
              className="px-6 py-3.5 rounded-xl bg-accent text-slate-900 font-mono text-xs uppercase tracking-wider font-bold hover:shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all duration-300 shadow-[0_4px_12px_rgba(0,229,255,0.15)]"
            >
              Grant Folder Access
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspace;