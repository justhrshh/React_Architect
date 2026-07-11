import { motion } from "framer-motion";

export default function InvestigationBrief({
  introStep,
  transitionPhase,
  active,
  recommendedDomainId,
  vw,
  displayColor,
  intel,
  intelKey,
  startSignatureTransition,
}) {
  if (introStep !== "ready" && introStep !== "briefing") {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        right: vw < 1200 ? 40 : 80,
        top: "50%",
        transform: "translateY(-50%)",
        width: vw < 1200 ? 320 : 380,
        textAlign: "left",
        zIndex: 6,
      }}
    >
      <motion.div
        key={`brief-${intelKey}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: transitionPhase === "expansion" ? 0 : 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Section Header */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "8.5px", letterSpacing: "3.3px",
          color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
          marginBottom: 20,
        }}>
          Investigation Brief
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "18px", fontWeight: 700,
          lineHeight: 1.4,
          color: displayColor, marginBottom: 16,
          transition: "color 0.9s",
        }}>
          {intel.headline}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: "13.5px", color: "rgba(255,255,255,0.45)",
          lineHeight: 1.8, marginBottom: 24,
        }}>
          {intel.body}
        </div>

        {/* Recommendation Sub-Header */}
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "7.5px", letterSpacing: "1.8px",
          color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
          marginBottom: 8
        }}>
          Recommended Action
        </div>

        {/* Recommendation */}
        <div style={{
          fontFamily: "'Bodoni Moda', serif",
          fontStyle: "italic", fontSize: "16px",
          color: "rgba(255,255,255,0.8)", lineHeight: 1.6,
          marginBottom: 36,
        }}>
          {intel.recommendation}
        </div>

        {/* Studio Contextual Action Button (Primary Action) */}
        {!transitionPhase && (active || recommendedDomainId) && (
          <motion.button
            onClick={() => startSignatureTransition(active ?? recommendedDomainId)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group flex items-center gap-[18px] focus:outline-none cursor-pointer"
          >
            <div style={{
              width: 40, height: 1,
              background: `linear-gradient(to right, transparent, ${displayColor}77)`,
            }} />
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "9px", letterSpacing: "2.8px",
                color: "rgba(255,255,255,0.5)", textTransform: "uppercase",
                transition: "color 0.3s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.95)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
            >
              {intel.actionLabel}
            </div>
            <div style={{
              width: 40, height: 1,
              background: `linear-gradient(to left, transparent, ${displayColor}77)`,
            }} />
          </motion.button>
        )}

        {/* Guidance Alert if no domain is selected */}
        {!active && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "8.5px", letterSpacing: "2.5px",
            color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
            marginTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 20
          }}>
            Select a domain node to brief
          </div>
        )}
      </motion.div>
    </div>
  );
}
