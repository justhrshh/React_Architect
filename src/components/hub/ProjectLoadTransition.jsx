import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

/**
 * Cinematic fullscreen overlay that plays when a project is opened.
 * Sequences real engine progress then calls onComplete to trigger navigation.
 */
const ProjectLoadTransition = ({ projectName, onComplete }) => {
  const [mounted, setMounted] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const { phase } = useSelector((state) => state.analysis);

  useEffect(() => {
    // Fade in on mount
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const fadeTimer = setTimeout(() => {
          if (onComplete) onComplete();
        }, 450);
        return () => clearTimeout(fadeTimer);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  // Determine progress percent
  const getProgressPercent = () => {
    switch (phase) {
      case "scanning": return 25;
      case "building-graph": return 50;
      case "resolving": return 70;
      case "analyzing": return 90;
      case "complete": return 100;
      default: return 5;
    }
  };

  const progress = getProgressPercent();

  const phases = [
    { id: "scanning", label: "Scanning Source Files" },
    { id: "building-graph", label: "Building Knowledge Graph" },
    { id: "resolving", label: "Resolving Imports" },
    { id: "analyzing", label: "Analyzing Architecture" },
    { id: "complete", label: "Preparing Workspace" }
  ];

  const currentPhaseIndex = phases.findIndex(p => p.id === phase);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#050608] flex flex-col items-center justify-center pointer-events-none select-none"
      style={{
        opacity: mounted ? (isFadingOut ? 0 : 1) : 0,
        transition: "opacity 0.45s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      {/* Project name */}
      <div className="mb-10 text-center">
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30 block mb-2">
          Understanding DNA
        </span>
        <h2 
          className="font-display text-3xl md:text-4xl font-[800] text-white tracking-tightest"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          {projectName}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-[2px] bg-white/5 relative mb-12 overflow-hidden rounded-full">
        <div
          className="absolute inset-0 bg-[#00E5FF] rounded-full"
          style={{
            transform: `scaleX(${progress / 100})`,
            transformOrigin: "left center",
            transition: "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)",
            boxShadow: "0 0 10px rgba(0, 229, 255, 0.5)",
          }}
        />
      </div>

      {/* Sequenced status lines */}
      <div className="flex flex-col items-start gap-4 w-72">
        {phases.map((p, idx) => {
          const isComplete = currentPhaseIndex === -1 ? false : (currentPhaseIndex === 4 && phase === "complete" ? true : idx < currentPhaseIndex);
          const isActive = currentPhaseIndex === -1 ? (idx === 0) : (idx === currentPhaseIndex && phase !== "complete");
          const isPending = currentPhaseIndex === -1 ? (idx > 0) : (idx > currentPhaseIndex);

          return (
            <div 
              key={p.id}
              className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest transition-all duration-300"
              style={{
                opacity: isPending ? 0.15 : 1,
              }}
            >
              {/* Indicator */}
              <div className="w-4 h-4 flex items-center justify-center">
                {isComplete ? (
                  <span className="text-[#4ADE80] font-bold text-[11px]">✓</span>
                ) : isActive ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse shadow-[0_0_8px_#00E5FF]" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                )}
              </div>

              {/* Label */}
              <span 
                className={`transition-colors duration-300 ${
                  isComplete ? "text-white/40" : isActive ? "text-white font-medium" : "text-white/20"
                }`}
              >
                {p.label}...
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectLoadTransition;
