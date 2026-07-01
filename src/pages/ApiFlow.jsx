import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { setActiveRoom } from "@/redux/slices/uiSlice";
import { selectSelectedProject } from "@/redux/slices/hubSlice";
import { ArrowLeft, GitMerge, FileCode } from "lucide-react";

const ApiFlow = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProject = useSelector(selectSelectedProject);

  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    }
  }, [selectedProject, navigate]);

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
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  };

  if (!selectedProject) return null;

  return (
    <div className="min-h-screen w-full text-slate-100 flex flex-col font-sans select-none relative overflow-hidden page-fade">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] pointer-events-none rounded-full"
        style={{ background: "radial-gradient(circle, rgba(0,229,255,0.025) 0%, transparent 70%)", zIndex: 0 }} 
      />

      <header className="relative z-10 w-full flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md px-6 py-4.5">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-white transition-all cursor-pointer font-bold"
          >
            <ArrowLeft size={13} strokeWidth={2.5} />
            Command Center
          </button>
          <span className="w-px h-4 bg-white/15" />
          <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
            {selectedProject.name} // API Studio
          </span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 tracking-widestest uppercase">
          Studio // v1.4
        </div>
      </header>

      <div className="flex-1 w-full flex relative z-10 min-h-0 overflow-hidden">
        <aside className="w-64 border-r border-white/5 bg-black/25 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <h4 className="font-mono text-[9px] uppercase tracking-widestest text-slate-400 font-bold">
            Endpoints
          </h4>
          <div className="flex flex-col gap-2.5">
            {["src/services/api.js"].map((f) => (
              <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/15 bg-accent/5 text-slate-100">
                <FileCode size={12} className="text-accent" />
                <span className="font-mono text-[10px] truncate">{f}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center relative bg-[#090b11]/30">
          <div className="relative z-10 max-w-sm flex flex-col items-center gap-4.5">
            <div className="w-12 h-12 rounded-xl border border-accent/20 bg-accent/5 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <GitMerge size={22} />
            </div>
            <div>
              <h3 className="font-display font-[800] text-lg text-white tracking-tightest leading-none mb-2">
                API Studio Portal Stable
              </h3>
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-accent mb-4">
                /04_API_FLOW
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ready to visualize REST/GraphQL API connections and trace data flow lines throughout components.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApiFlow;
