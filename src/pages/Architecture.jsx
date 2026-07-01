import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { ArrowLeft, GitMerge, FileCode, CheckCircle, HelpCircle } from "lucide-react";

const Architecture = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectSelectedProject);

  // Guard: if no project is active, redirect to Hub
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    }
  }, [selectedProject, navigate]);

  // Visual continuity transition
  useEffect(() => {
    gsap.fromTo(".page-fade", {
      opacity: 0,
      backgroundColor: "#00E5FF",
    }, {
      opacity: 1,
      backgroundColor: "#06070b",
      duration: 0.8,
      ease: "power2.out",
    });
  }, []);

  const handleBack = () => {
    // Reset active room to project-brain to break the auto-portal redirection loop
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  };

  if (!selectedProject) return null;

  return (
    <div className="min-h-screen w-full text-slate-100 flex flex-col font-sans select-none relative overflow-hidden page-fade">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] pointer-events-none rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.025) 0%, transparent 70%)", zIndex: 0 }} 
      />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] pointer-events-none rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.015) 0%, transparent 70%)", zIndex: 0 }} 
      />

      {/* Top Header Panel */}
      <header className="relative z-10 w-full flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-4.5 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Command Center
          </button>
          <span className="w-px h-4 bg-white/15" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widestest text-ink-faint">
              {selectedProject.name} // Architecture Studio
            </span>
            <span className="font-mono text-[8px] uppercase tracking-widestest px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-ink-faint font-semibold">
              {selectedProject.framework}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-widestest text-accent font-bold">
              PORTAL_STABLE
            </span>
          </div>
          <span className="w-px h-4 bg-white/15" />
          <div className="text-[10px] font-mono text-slate-400 tracking-widestest uppercase">
            Studio // v1.4
          </div>
        </div>
      </header>

      {/* Main Workspace Body Layout */}
      <div className="flex-1 w-full flex relative z-10 min-h-0 overflow-hidden">
        
        {/* Left Directory Tree Mock Pane */}
        <aside className="w-64 border-r border-white/5 bg-black/25 p-6 flex flex-col gap-6 select-none shrink-0 overflow-y-auto">
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-widestest text-slate-400 mb-3.5 font-bold">
              Detected Files
            </h4>
            <div className="flex flex-col gap-2.5">
              {[
                { name: "main.jsx", active: true },
                { name: "app/Router.jsx", active: true },
                { name: "app/App.jsx", active: true },
                { name: "pages/Workspace.jsx", active: false },
                { name: "pages/Hub.jsx", active: false },
                { name: "components/hub/ImportProjectModal.jsx", active: false },
                { name: "redux/slices/uiSlice.js", active: false },
              ].map((f) => (
                <div key={f.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  f.active 
                    ? "border-accent/15 bg-accent/5 text-slate-100" 
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}>
                  <FileCode size={12} className={f.active ? "text-accent" : "text-slate-500"} />
                  <span className="font-mono text-[10px] truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-white/5 pt-4.5">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-slate-400">Scanner Engine</span>
              <span className="font-mono text-[11px] font-bold text-accent">BABEL-AST-V2</span>
            </div>
          </div>
        </aside>

        {/* Center Graph Mock Area */}
        <main className="flex-1 flex flex-col relative bg-[#090b11]/30">
          
          {/* Visual Grid Lines Background Overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none" style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />

          {/* Top visual parameters indicators */}
          <div className="flex justify-between items-center px-8 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <GitMerge size={14} className="text-accent" />
              <span className="font-display font-[800] text-[12px] tracking-tightest uppercase text-slate-200">
                Component Dependency Map
              </span>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                <CheckCircle size={10} className="text-green-500" />
                AST parsed successfully
              </div>
            </div>
          </div>

          {/* Placeholder Graph Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative select-none">
            
            {/* Holographic Target rings in center */}
            <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-accent/10 animate-spin" style={{ animationDuration: "35s" }} />
            <div className="absolute w-[180px] h-[180px] rounded-full border border-dashed border-accent/20 animate-spin" style={{ animationDuration: "20s" }} />

            <div className="relative z-10 max-w-sm flex flex-col items-center gap-4.5">
              <div className="w-12 h-12 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                <GitMerge size={22} />
              </div>
              <div>
                <h3 className="font-display font-[800] text-lg text-white tracking-tightest leading-none mb-2">
                  Architecture Studio Portal Stable
                </h3>
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-accent mb-4">
                  /01_COMPONENT_TREE
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The Three.js scene has successfully decoupled. Ready to mount the React Flow graph canvas and component dependency nodes in Sprint 7.
                </p>
              </div>
            </div>

            {/* Bottom mini status bar */}
            <div className="absolute bottom-6 left-8 right-8 flex justify-between items-center text-[8px] font-mono text-slate-500 uppercase tracking-widestest">
              <span>Nodes: 3 / Edges: 2</span>
              <span>Memory usage: negligible</span>
            </div>
          </div>

        </main>

      </div>
    </div>
  );
};

export default Architecture;
