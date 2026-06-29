import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import WorkspaceScene from "@/features/workspace/WorkspaceScene";

const menuItems = [
  { key: "project-brain", label: "00 Brain" },
  { key: "architecture", label: "01 Architecture" },
  { key: "routes", label: "02 Routes" },
  { key: "state-flow", label: "03 State" },
  { key: "api-flow", label: "04 API" },
  { key: "documentation", label: "05 Docs" },
];

const roomDetails = {
  "project-brain": {
    title: "Project Brain",
    type: "Core Analysis Hub",
    desc: "Architectural health scores, AI-assisted refactoring, and codebases statistics will plug in here in future sprints.",
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

const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const activeRoom = useSelector((state) => state.ui.activeRoom);
  
  // local state tracks camera arrival. Null indicates the camera is in-flight.
  const [focusedRoom, setFocusedRoom] = useState("project-brain");

  const handleArrivalChange = (room) => {
    setFocusedRoom(room);
  };

  const handleNavClick = (roomKey) => {
    dispatch(setActiveRoom(roomKey));
  };

  const handlePlatformSelect = (roomKey) => {
    dispatch(setActiveRoom(roomKey));
  };

  const handleExit = () => {
    navigate("/");
  };

  const activeDetail = roomDetails[focusedRoom];
  const isFlying = focusedRoom === null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-obsidian select-none">
      
      {/* 3D spatial scene background */}
      <WorkspaceScene 
        onArrivalChange={handleArrivalChange} 
        onSelectRoom={handlePlatformSelect}
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
        
        {/* Top Header Panel (Slides out of screen when camera is flying) */}
        <header 
          className={`w-full flex items-center justify-between pointer-events-auto bg-obsidian/30 backdrop-blur-md border border-edge-subtle p-4 rounded-xl shadow-lg gap-4 transition-all duration-500 transform ${
            !isFlying ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6 pointer-events-none"
          }`}
        >
          <div 
            onClick={() => handleNavClick("project-brain")}
            className="font-display font-[800] text-sm tracking-tightest cursor-pointer text-white hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            React<span className="text-accent">/</span>Architect
          </div>

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

          <div className="flex items-center gap-4">
            {/* Explore / Look Around Button (Only visible when LOCKED in some workspace) */}
            {activeRoom !== "explore" && (
              <button
                onClick={() => handleNavClick("explore")}
                className="font-mono text-[10px] md:text-xs uppercase tracking-widestest px-4 py-2 border border-edge-subtle text-ink-dim hover:text-white hover:border-white/20 rounded-lg transition-colors shadow-lg bg-obsidian/45"
              >
                Look Around
              </button>
            )}

            {/* Exit Workspace */}
            <button
              onClick={handleExit}
              className="font-mono text-[10px] md:text-xs uppercase tracking-widestest text-ink-dim hover:text-white border border-edge-subtle hover:border-white/20 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Exit
            </button>
          </div>
        </header>

        {/* Floating Mobile Nav bar (visible on small viewports) */}
        <div 
          className={`lg:hidden w-full overflow-x-auto flex items-center gap-4 py-2 pointer-events-auto mt-4 bg-obsidian/50 backdrop-blur border border-edge-subtle p-3 rounded-lg transition-all duration-500 ${
            !isFlying ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
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

        {/* Bottom Info Details panel (fades out when camera is moving, fades in on target focus) */}
        <footer className="w-full flex items-end justify-between mt-auto">
          <div className="w-full max-w-md pointer-events-auto">
            <div
              className={`glass p-6 md:p-8 rounded-2xl border border-edge-subtle shadow-2xl transition-all duration-500 transform ${
                focusedRoom 
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
              !isFlying ? "opacity-100" : "opacity-0"
            }`}
          >
            Workspace Mode // HUD_v0.3.5
          </div>
        </footer>

      </div>
    </div>
  );
};

export default Workspace;