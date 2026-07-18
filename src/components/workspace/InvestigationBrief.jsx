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
          Architect AI Brief
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
          <>
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

            {/* Keyboard hints dynamically updating based on index */}
            {(() => {
              const domainIds = ["architecture", "routes", "state", "api", "documentation"];
              const selectedId = active ?? recommendedDomainId;
              const selectedIndex = domainIds.indexOf(selectedId);
              
              const kbdStyle = {
                padding: "2px 5px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "4px",
                margin: "0 4px",
                background: "rgba(255, 255, 255, 0.03)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "8.5px",
                color: "rgba(255, 255, 255, 0.6)",
              };

              const hintContainerStyle = {
                marginTop: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "8.5px",
                letterSpacing: "1.2px",
                color: "rgba(255, 255, 255, 0.25)",
                textTransform: "uppercase",
                paddingLeft: "10px",
              };

              if (selectedIndex === 0) {
                return (
                  <div style={hintContainerStyle}>
                    <div>
                      Press <kbd style={kbdStyle}>Enter</kbd> to open
                    </div>
                    <div>
                      Press <kbd style={kbdStyle}>→</kbd> for next studio
                    </div>
                  </div>
                );
              } else if (selectedIndex === domainIds.length - 1) {
                return (
                  <div style={hintContainerStyle}>
                    <div>
                      Press <kbd style={kbdStyle}>Enter</kbd> to open
                    </div>
                    <div>
                      Press <kbd style={kbdStyle}>←</kbd> for previous studio
                    </div>
                  </div>
                );
              } else if (selectedIndex > 0 && selectedIndex < domainIds.length - 1) {
                return (
                  <div style={hintContainerStyle}>
                    <div>
                      Press <kbd style={kbdStyle}>←</kbd> or <kbd style={kbdStyle}>→</kbd> to browse studios
                    </div>
                    <div>
                      Press <kbd style={kbdStyle}>Enter</kbd> to open
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </>
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
