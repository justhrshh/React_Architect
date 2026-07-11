import { useState, useEffect } from "react";
import { motion } from "framer-motion";

function AnimatedCounter({ value, duration = 1.5 }) {
  const numVal = parseInt(value, 10);
  const isNumeric = !isNaN(numVal) && /^\d+$/.test(String(value).trim());
  const [count, setCount] = useState(() => isNumeric ? 0 : value);

  useEffect(() => {
    if (!isNumeric) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      setCount(Math.floor(progress * numVal));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration, isNumeric, numVal]);

  return <>{isNumeric ? count : value}</>;
}

export default function OrbitSystem({
  introStep,
  transitionPhase,
  active,
  hovered,
  recommendedDomainId,
  orbitRotation,
  extraRotation,
  coreCX,
  coreCY,
  localC,
  ORBIT_R,
  EDGE,
  domains,
  handleDomain,
  setHovered,
}) {
  const isTransitioning = transitionPhase !== null;

  return (
    <motion.div
      animate={{
        rotate: orbitRotation + extraRotation,
        scale: (introStep === "dormant" || introStep === "booting") ? 0 : 1,
        opacity: (introStep === "dormant" || introStep === "booting") ? 0 : 1
      }}
      transition={
        transitionPhase === "acknowledgement" ? { duration: 0.12, ease: "easeOut" } :
        transitionPhase === "acceleration" ? { duration: 0.35, ease: "easeIn" } :
        transitionPhase === "charge" ? { duration: 0.25, ease: "easeIn" } :
        transitionPhase === "expansion" ? { duration: 0.25, ease: "easeIn" } :
        { duration: 1.2, ease: [0.25, 1, 0.4, 1] }
      }
      style={{
        position: "absolute",
        left: coreCX - localC,
        top: coreCY - localC,
        width: localC * 2,
        height: localC * 2,
        transformOrigin: "center center",
        pointerEvents: "none",
        zIndex: 3
      }}
    >
      {/* Orbit rings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <circle cx={localC} cy={localC} r={ORBIT_R}
          fill="none" stroke="white" strokeWidth="0.4" opacity="0.04" />
        <circle cx={localC} cy={localC} r={ORBIT_R + 44}
          fill="none" stroke="white" strokeWidth="0.25" opacity="0.02" />
      </svg>

      {/* Connection lines + data flow dot stream */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <filter id="glow-line" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {domains.map((domain, idx) => {
          const len   = Math.sqrt(domain.x ** 2 + domain.y ** 2);
          const nx    = domain.x / len;
          const ny    = domain.y / len;
          const isAct = active  === domain.id;
          const isHov = hovered === domain.id && !active;
          const isAnyActive = active !== null;
          
          const x1 = (localC + nx * EDGE) || 0;
          const y1 = (localC + ny * EDGE) || 0;
          const x2 = (localC + domain.x - nx * 24) || 0;
          const y2 = (localC + domain.y - ny * 24) || 0;
          
          const lineOpacity = isTransitioning
            ? (isAct ? 0.75 : 0.3)
            : (isAct ? 0.35 : isHov ? 0.2 : (recommendedDomainId === domain.id && !isAnyActive && (introStep === "ready" || introStep === "briefing")) ? 0.45 : isAnyActive ? 0.015 : 0.08);

          const strokeWidth = isTransitioning
            ? (isAct ? 1.8 : 0.9)
            : (isAct ? 0.9 : 0.5);

          return (
            <g key={domain.id}>
              {/* Base link lines */}
              <motion.line
                x1={x1}
                y1={y1}
                initial={{
                  x2: x1,
                  y2: y1
                }}
                animate={{
                  x2: (introStep === "dormant" || introStep === "booting") ? x1 : x2,
                  y2: (introStep === "dormant" || introStep === "booting") ? y1 : y2,
                }}
                transition={{
                  type: "spring",
                  stiffness: 70,
                  damping: 15,
                  delay: introStep === "awakening" ? idx * 0.15 : 0
                }}
                stroke={isAct || isHov ? domain.color : "white"} 
                strokeWidth={strokeWidth}
                opacity={lineOpacity}
                style={{ transition: "opacity 0.6s ease, stroke 0.6s ease, stroke-width 0.6s ease" }}
              />

              {/* Active highlight glow path */}
              {(isAct || (isTransitioning && isAct)) && (
                <line x1={x1} y1={y1} x2={x2 || x1} y2={y2 || y1}
                  stroke={domain.color} strokeWidth={isTransitioning ? "1.8" : "1.2"} opacity="0.3"
                  filter="url(#glow-line)" />
              )}

              {/* Active node data stream (flowing from node into Core) */}
              {(isAct || (isTransitioning && transitionPhase !== "acknowledgement")) && (
                <line x1={x2 || x1} y1={y2 || y1} x2={x1} y2={y1}
                  stroke={domain.color}
                  strokeWidth={isAct ? 2.5 : 1.2}
                  opacity={isAct ? 0.9 : 0.5}
                  className={isTransitioning && transitionPhase !== "acknowledgement" ? "data-flow-fast" : "data-flow"}
                  filter="url(#glow-line)" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Orbit celestial nodes */}
      {domains.map((domain, idx) => {
        const isAct    = active  === domain.id;
        const isHov    = hovered === domain.id;
        const isAnyActive = active !== null;
        const isDimmed = isAnyActive && !isAct;

        const arcR     = 17;
        const circ     = 2 * Math.PI * arcR;
        const arcDash  = (domain.score / 100) * circ;

        const nodeBlur = (isTransitioning && transitionPhase !== "acknowledgement")
          ? "blur(6px)"
          : "blur(0px)";

        const isRecommended = recommendedDomainId === domain.id;
        const isRecommendedActive = isRecommended && !isAnyActive && (introStep === "ready" || introStep === "briefing");

        const scale = isTransitioning && transitionPhase !== "acknowledgement"
          ? (isAct ? 1.3 : 0.6)
          : (isAct ? 1.15 : isHov ? 1.08 : (isRecommendedActive ? 1.08 : 1.0));

        const opacity = isTransitioning && transitionPhase !== "acknowledgement"
          ? (isAct ? 0.9 : 0.1)
          : (isDimmed ? 0.3 : 1.0);

        const textOpacity = isTransitioning && transitionPhase !== "acknowledgement" ? 0 : 1;

        const countParts = String(domain.count).split(" ");
        const countNum = countParts[0];
        const countLabel = countParts.slice(1).join(" ");

        return (
          <motion.button
            key={domain.id}
            onClick={() => !isTransitioning && handleDomain(domain.id)}
            onMouseEnter={() => !isTransitioning && setHovered(domain.id)}
            onMouseLeave={() => !isTransitioning && setHovered(null)}
            className="absolute focus:outline-none cursor-pointer pointer-events-auto"
            style={{
              left: localC - 22,
              top:  localC - 22,
              width: 44,
              height: 44,
              zIndex: isAct || isHov ? 20 : 10,
              border: "none",
              background: "transparent",
              padding: 0,
            }}
            animate={{
              x: (introStep === "dormant" || introStep === "booting") ? 0 : domain.x,
              y: (introStep === "dormant" || introStep === "booting") ? 0 : domain.y,
            }}
            transition={{
              type: "spring",
              stiffness: 70,
              damping: 15,
              delay: introStep === "awakening" ? idx * 0.15 : 0
            }}
          >
            <motion.div
              animate={
                isRecommendedActive
                  ? {
                      scale: [1.08, 1.13, 1.08],
                      opacity: 1.0,
                      rotate: - (orbitRotation + extraRotation),
                      filter: nodeBlur
                    }
                  : { 
                      scale, 
                      opacity,
                      rotate: - (orbitRotation + extraRotation),
                      filter: nodeBlur
                    }
              }
              transition={
                isRecommendedActive
                  ? {
                      scale: { repeat: Infinity, duration: 2.2, ease: "easeInOut" },
                      default: { duration: 1.2, ease: [0.25, 1, 0.4, 1] }
                    }
                  : (
                      transitionPhase === "acknowledgement" ? { duration: 0.12, ease: "easeOut" } :
                      transitionPhase === "acceleration" ? { duration: 0.35, ease: "easeIn" } :
                      transitionPhase === "charge" ? { duration: 0.25, ease: "easeIn" } :
                      transitionPhase === "expansion" ? { duration: 0.25, ease: "easeIn" } :
                      { duration: 1.2, ease: [0.25, 1, 0.4, 1] }
                    )
              }
              className="relative w-full h-full"
            >
              {/* Score arc + center dot */}
              <div className="absolute inset-0">
                <svg width={44} height={44} viewBox="0 0 44 44"
                  style={{ transform: "rotate(-90deg)" }}>
                  <circle cx={22} cy={22} r={arcR} fill="none"
                    stroke={domain.color} strokeWidth="1" opacity={0.12 * textOpacity} />
                  <circle cx={22} cy={22} r={arcR} fill="none"
                    stroke={domain.color} strokeWidth="1.2"
                    opacity={(isAct ? 0.9 : 0.42) * textOpacity}
                    strokeDasharray={`${arcDash} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: "opacity 0.5s" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    style={{
                      width:  isAct ? 13 : 9,
                      height: isAct ? 13 : 9,
                      borderRadius: "50%",
                      background: domain.color,
                      boxShadow: isAct
                        ? `0 0 24px 7px ${domain.color}A0`
                        : isHov 
                          ? `0 0 16px 5px ${domain.color}70`
                          : isRecommendedActive
                            ? `0 0 20px 4px ${domain.color}CC`
                            : `0 0 8px 1px ${domain.color}45`,
                      transition: "all 0.5s ease",
                    }}
                  />
                </div>
              </div>

              {/* Label + count */}
              <motion.div 
                animate={{ opacity: textOpacity }}
                transition={{ duration: 0.2 }}
                className="absolute flex flex-col items-center gap-[4px]"
                style={{
                  top: 53,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 160,
                  textAlign: "center",
                  pointerEvents: "none"
                }}
              >
                <div style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "11px", fontWeight: 600,
                  letterSpacing: "2.2px", textTransform: "uppercase",
                  color: isAct ? domain.color : "rgba(255,255,255,0.42)",
                  transition: "color 0.5s",
                }}>
                  {domain.label}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "8.5px", letterSpacing: "0.8px",
                  color: isAct ? `${domain.color}72` : "rgba(255,255,255,0.17)",
                  transition: "color 0.5s",
                }}>
                  <AnimatedCounter value={countNum} /> {countLabel}
                </div>
              </motion.div>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
