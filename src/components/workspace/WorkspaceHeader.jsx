import { motion } from "framer-motion";

export default function WorkspaceHeader({
  introStep,
  transitionPhase,
  selectedProject,
  analysis,
  needsPermission,
  handleReturnToHub,
  handleRequestPermission,
}) {
  if (introStep === "dormant" || introStep === "booting") {
    return null;
  }

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 flex items-start justify-between"
      initial={{ opacity: 0 }}
      animate={{ opacity: transitionPhase === "expansion" ? 0 : 1 }}
      transition={{ duration: 0.8, delay: introStep === "awakening" ? 1.2 : 0 }}
      style={{ padding: "28px 36px", zIndex: 10 }}
    >
      {/* Left - project identity */}
      <div>
        <div 
          onClick={handleReturnToHub}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "8.5px", letterSpacing: "3px",
            color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
            marginBottom: 6,
            cursor: "pointer"
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.72)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
        >
          React<span style={{ color: "#00E5FF", fontWeight: 700 }}>/</span>Architect * Return to Hub
        </div>
        <div style={{
          fontFamily: "'Bodoni Moda', serif",
          fontStyle: "italic", fontWeight: 500,
          fontSize: "19px", color: "rgba(255,255,255,0.82)",
          letterSpacing: "-0.3px",
        }}>
          {selectedProject?.name || "react-project"}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "8.5px", color: "rgba(255,255,255,0.18)",
          marginTop: 3, letterSpacing: "0.4px",
        }}>
          {selectedProject?.framework || "React"} * {analysis && analysis.projectDNA?.language || "JavaScript"}
        </div>
      </div>

      {/* Right - quiet system status */}
      <div className="flex flex-col gap-[7px] items-end">
        {needsPermission ? (
          <button 
            onClick={handleRequestPermission}
            className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 bg-red-950/40 border border-red-500/30 text-red-400 rounded cursor-pointer hover:bg-red-900/50 transition-colors pointer-events-auto"
          >
            Unlock Folder Permission
          </button>
        ) : analysis && analysis.status === "error" ? (
          <div className="flex items-center gap-[9px]">
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "7.5px", letterSpacing: "1.6px",
              color: "#EF4444", textTransform: "uppercase",
            }}>
              Analysis Failed
            </div>
            <div
              className="status-blink"
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#EF4444",
              }}
            />
          </div>
        ) : analysis && analysis.status === "analyzing" ? (
          <div className="flex items-center gap-[9px]">
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "7.5px", letterSpacing: "1.6px",
              color: "#00E5FF", textTransform: "uppercase",
            }}>
              Scanning Source Files
            </div>
            <div
              className="status-blink"
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#00E5FF",
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-[9px]">
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "7.5px", letterSpacing: "2px",
              color: "#4ADE80", textTransform: "uppercase",
            }}>
              Analysis Ready
            </div>
            <div
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 10px #4ADE80",
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
