import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Animated Counter ---
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

// --- Analysis-aware system status message helper ---
function getSystemMessage(analysis) {
  if (!analysis) return "Project understood.";
  const health = analysis.architectureHealth?.score ?? 100;
  const deadRoutes = analysis.deadCode?.unusedRoutes?.length ?? 0;
  const deadComponents = analysis.deadCode?.unusedComponents?.length ?? 0;
  
  const ruleResults = analysis.architectureHealth?.ruleResults ?? [];
  const poorMaintainability = ruleResults.find(r => r.id === 'POOR_MAINTAINABILITY')?.findingCount ?? 0;
  const circularDeps = ruleResults.find(r => r.id === 'CIRCULAR_DEPENDENCIES')?.findingCount ?? 0;

  if (circularDeps > 0) return "Circular dependencies detected.";
  if (deadRoutes > 5) return "Routing complexity requires investigation.";
  if (poorMaintainability > 3) return "Poor maintainability components detected.";
  if (deadComponents > 8) return "Significant dead code detected.";
  if (health < 50) return "Architectural risks detected.";
  if (health >= 85) return "Project in good standing.";
  return "Project understood.";
}

// --- Core Boot Messages Component ---
function CoreBootMessages({ introStep, analysis, color }) {
  const [msg, setMsg] = useState("");
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    if (introStep === "dormant") {
      setTimeout(() => {
        setMsg("");
        setIsFinal(false);
      }, 0);
    } else if (introStep === "booting") {
      setTimeout(() => {
        setMsg("INITIALIZING...");
      }, 0);
      const t1 = setTimeout(() => setMsg("SCANNING SOURCE"), 600);
      const t2 = setTimeout(() => setMsg("BUILDING KNOWLEDGE GRAPH"), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else if (introStep === "awakening") {
      setTimeout(() => {
        setMsg("ANALYZING ARCHITECTURE");
      }, 0);
    } else if (introStep === "understood") {
      setTimeout(() => {
        setMsg("PROJECT UNDERSTOOD");
      }, 0);
      const t3 = setTimeout(() => {
        setMsg(getSystemMessage(analysis));
        setIsFinal(true);
      }, 700);
      return () => clearTimeout(t3);
    } else {
      setTimeout(() => {
        setMsg("");
        setIsFinal(false);
      }, 0);
    }
  }, [introStep, analysis]);

  return (
    <AnimatePresence mode="wait">
      {msg && (
        <motion.div
          key={msg}
          initial={{ opacity: 0, filter: "blur(4px)", scale: 0.95 }}
          animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          exit={{ opacity: 0, filter: "blur(4px)", scale: 1.05 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 20px",
            color: color,
            ...(isFinal ? {
              fontFamily: "'Bodoni Moda', serif",
              fontStyle: "italic",
              fontSize: "20px",
              letterSpacing: "-0.5px",
              textShadow: `0 0 30px ${color}40`,
            } : {
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              textShadow: `0 0 12px ${color}60`,
            })
          }}
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Core Tick Ring ---
function TickRing({ size, ticks, color, opacity }) {
  const r = size / 2;
  const items = Array.from({ length: ticks }, (_, i) => {
    const a = (i * (360 / ticks) * Math.PI) / 180;
    const x1 = size / 2 + Math.cos(a) * (r - 5);
    const y1 = size / 2 + Math.sin(a) * (r - 5);
    const x2 = size / 2 + Math.cos(a) * r;
    const y2 = size / 2 + Math.sin(a) * r;
    return { x1, y1, x2, y2 };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className="absolute inset-0" style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="0.8" opacity={opacity} />
      {items.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={color} strokeWidth="1" opacity={opacity * 1.6} />
      ))}
    </svg>
  );
}

// --- Morph Overlay Component ---
function MorphOverlay({ domain, color }) {
  if (domain === "architecture") {
    return (
      <svg viewBox="-100 -100 200 200" className="w-full h-full">
        <motion.path
          d="M -90 -60 L 90 -60 M -90 0 L 90 0 M -90 60 L 90 60 M -60 -90 L -60 90 M 0 -90 L 0 90 M 60 -90 L 60 90"
          stroke={`${color}25`}
          strokeWidth="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M 0 -80 L 0 0 M 0 0 L -60 0 L -60 60 M 0 0 L 60 0 L 60 60"
          stroke={color}
          strokeWidth="1.2"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
        />
        <motion.rect
          x="-16" y="-88" width="32" height="16" rx="2"
          fill="#0E1828" stroke={color} strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        />
        <motion.rect
          x="-76" y="52" width="32" height="16" rx="2"
          fill="#0E1828" stroke={color} strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        />
        <motion.rect
          x="44" y="52" width="32" height="16" rx="2"
          fill="#0E1828" stroke={color} strokeWidth="1.5"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        />
      </svg>
    );
  }

  if (domain === "routes") {
    return (
      <svg viewBox="-100 -100 200 200" className="w-full h-full">
        <motion.path
          d="M -90 -40 C -30 -40, -30 40, 30 40 L 90 40 M -90 40 L -30 40 C 0 40, 0 -40, 30 -40 L 90 -40"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
        />
        <motion.circle
          cx="-90" cy="-40" r="4.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
        />
        <motion.circle
          cx="-90" cy="40" r="4.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.25 }}
        />
        <motion.circle
          cx="90" cy="-40" r="4.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.55 }}
        />
        <motion.circle
          cx="90" cy="40" r="4.5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.6 }}
        />
      </svg>
    );
  }

  if (domain === "state") {
    return (
      <svg viewBox="-100 -100 200 200" className="w-full h-full">
        <motion.line
          x1="0" y1="0" x2="-60" y2="-60"
          stroke={color} strokeWidth="1.2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.line
          x1="0" y1="0" x2="60" y2="-60"
          stroke={color} strokeWidth="1.2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.line
          x1="0" y1="0" x2="0" y2="70"
          stroke={color} strokeWidth="1.2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.circle
          cx="0" cy="0" r="9"
          fill="#0E1828" stroke={color} strokeWidth="2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx="-60" cy="-60" r="5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        />
        <motion.circle
          cx="60" cy="-60" r="5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        />
        <motion.circle
          cx="0" cy="70" r="5"
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2, delay: 0.4 }}
        />
      </svg>
    );
  }

  if (domain === "api") {
    return (
      <svg viewBox="-100 -100 200 200" className="w-full h-full">
        <motion.line
          x1="-80" y1="-30" x2="80" y2="-30"
          stroke={color} strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.line
          x1="-80" y1="0" x2="80" y2="0"
          stroke={color} strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.line
          x1="-80" y1="30" x2="80" y2="30"
          stroke={color} strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.rect
          x="-88" y="-45" width="16" height="90" rx="1"
          fill="#0E1828" stroke={color} strokeWidth="1.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.rect
          x="72" y="-45" width="16" height="90" rx="1"
          fill="#0E1828" stroke={color} strokeWidth="1.2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </svg>
    );
  }

  if (domain === "documentation") {
    return (
      <svg viewBox="-100 -100 200 200" className="w-full h-full">
        <motion.rect
          x="-80" y="-80" width="160" height="160" rx="2"
          fill="none" stroke={`${color}33`} strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.line
          x1="-60" y1="-60" x2="20" y2="-60"
          stroke={color} strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
        <motion.line
          x1="-60" y1="-40" x2="40" y2="-40"
          stroke={`${color}77`} strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        />
        <motion.line
          x1="-60" y1="-20" x2="30" y2="-20"
          stroke={`${color}77`} strokeWidth="1.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        <motion.rect
          x="-60" y="5" width="120" height="50" rx="1"
          fill="none" stroke={color} strokeWidth="1"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        />
      </svg>
    );
  }

  return null;
}

// --- Core Visualization (Normal Static State) ---
function CoreViz({ domain, color }) {
  const o = 0.22;

  if (domain === "default") return (
    <svg viewBox="-75 -48 150 96" className="w-full h-full">
      <line x1="-48" y1="-18" x2="0" y2="0" stroke={color} strokeWidth="0.6" opacity={o * 1.2} />
      <line x1="38" y1="-28" x2="0" y2="0" stroke={color} strokeWidth="0.6" opacity={o * 1.2} />
      <line x1="28" y1="24" x2="0" y2="0" stroke={color} strokeWidth="0.6" opacity={o * 1.2} />
      <line x1="-36" y1="28" x2="0" y2="0" stroke={color} strokeWidth="0.6" opacity={o * 1.2} />
      <line x1="-48" y1="-18" x2="-65" y2="8" stroke={color} strokeWidth="0.4" opacity={o * 0.7} />
      <line x1="38" y1="-28" x2="62" y2="-12" stroke={color} strokeWidth="0.4" opacity={o * 0.7} />
      <line x1="38" y1="-28" x2="-48" y2="-18" stroke={color} strokeWidth="0.3" opacity={o * 0.5} />
      <circle cx="0"   cy="0"   r="5"   fill={color} opacity={0.5} />
      <circle cx="-48" cy="-18" r="2.5" fill={color} opacity={0.28} />
      <circle cx="38"  cy="-28" r="2.5" fill={color} opacity={0.28} />
      <circle cx="28"  cy="24"  r="2.5" fill={color} opacity={0.28} />
      <circle cx="-36" cy="28"  r="2.5" fill={color} opacity={0.28} />
      <circle cx="-65" cy="8"   r="1.5" fill={color} opacity={0.14} />
      <circle cx="62"  cy="-12" r="1.5" fill={color} opacity={0.14} />
    </svg>
  );

  if (domain === "architecture") return (
    <svg viewBox="-75 -48 150 96" className="w-full h-full">
      <circle cx="0" cy="-38" r="3.5" fill={color} opacity={0.45} />
      <line x1="0" y1="-34" x2="-36" y2="-10" stroke={color} strokeWidth="0.6" opacity={0.3} />
      <line x1="0" y1="-34" x2="36"  y2="-10" stroke={color} strokeWidth="0.6" opacity={0.3} />
      <circle cx="-36" cy="-10" r="2.5" fill={color} opacity={0.3} />
      <circle cx="36"  cy="-10" r="2.5" fill={color} opacity={0.3} />
      <line x1="-36" y1="-7" x2="-52" y2="18" stroke={color} strokeWidth="0.5" opacity={0.2} />
      <line x1="-36" y1="-7" x2="-18" y2="18" stroke={color} strokeWidth="0.5" opacity={0.2} />
      <line x1="36"  y1="-7" x2="18"  y2="18" stroke={color} strokeWidth="0.5" opacity={0.2} />
      <line x1="36"  y1="-7" x2="52"  y2="18" stroke={color} strokeWidth="0.5" opacity={0.2} />
      <circle cx="-52" cy="18" r="1.8" fill={color} opacity={0.18} />
      <circle cx="-18" cy="18" r="1.8" fill={color} opacity={0.18} />
      <circle cx="18"  cy="18" r="1.8" fill={color} opacity={0.18} />
      <circle cx="52"  cy="18" r="1.8" fill={color} opacity={0.18} />
      <path d="M 36 -10 Q 58 -34 10 -42 Q -4 -45 -8 -33" fill="none" stroke="#E8705A" strokeWidth="0.8" opacity={0.5} strokeDasharray="3,3" />
    </svg>
  );

  if (domain === "routes") return (
    <svg viewBox="-75 -48 150 96" className="w-full h-full">
      <circle cx="0" cy="-36" r="3" fill={color} opacity={0.45} />
      <line x1="0" y1="-36" x2="-52" y2="30" stroke={color} strokeWidth="0.7" opacity={0.25} />
      <line x1="0" y1="-36" x2="-18" y2="36" stroke={color} strokeWidth="0.7" opacity={0.25} />
      <line x1="0" y1="-36" x2="18"  y2="36" stroke={color} strokeWidth="0.7" opacity={0.25} />
      <line x1="0" y1="-36" x2="52"  y2="30" stroke={color} strokeWidth="0.7" opacity={0.25} />
      <line x1="0" y1="-36" x2="0"   y2="36" stroke={color} strokeWidth="0.4" opacity={0.14} />
      <circle cx="-52" cy="30" r="2.5" fill="none" stroke="#E8705A" strokeWidth="0.9" opacity={0.65} />
      <circle cx="18"  cy="36" r="2.5" fill="none" stroke="#E8705A" strokeWidth="0.9" opacity={0.65} />
      <circle cx="-18" cy="36" r="2"   fill={color} opacity={0.2} />
      <circle cx="52"  cy="30" r="2"   fill={color} opacity={0.2} />
      <circle cx="0"   cy="36" r="1.5" fill={color} opacity={0.15} />
    </svg>
  );

  if (domain === "state") return (
    <svg viewBox="-75 -48 150 96" className="w-full h-full">
      <circle cx="0" cy="0" r="6"  fill={color} opacity={0.55} />
      <circle cx="0" cy="0" r="18" fill="none" stroke={color} strokeWidth="0.8" opacity={0.38} />
      <circle cx="0" cy="0" r="31" fill="none" stroke={color} strokeWidth="0.5" opacity={0.22} strokeDasharray="9,3" />
      <circle cx="0" cy="0" r="44" fill="none" stroke={color} strokeWidth="0.4" opacity={0.12} strokeDasharray="7,6" />
      <line x1="-5" y1="-5" x2="5" y2="5"  stroke="#E8705A" strokeWidth="0.9" opacity={0.55} />
      <line x1="-5" y1="5"  x2="5" y2="-5" stroke="#E8705A" strokeWidth="0.9" opacity={0.55} />
      <circle cx="20"  cy="0"  r="2" fill={color} opacity={0.3} />
      <circle cx="-20" cy="0"  r="2" fill={color} opacity={0.3} />
      <circle cx="0"   cy="20" r="2" fill={color} opacity={0.3} />
      <circle cx="0"   cy="-20"r="2" fill={color} opacity={0.3} />
    </svg>
  );

  if (domain === "api") {
    const dots = [];
    for (let row = -3; row <= 3; row++) {
      for (let col = -6; col <= 6; col++) {
        const isWarn = row >= 2 && col >= 3;
        dots.push(
          <circle key={`${row}-${col}`} cx={col * 10} cy={row * 12}
            r={isWarn ? 2.2 : 1.4}
            fill={isWarn ? "#E8705A" : color}
            opacity={isWarn ? 0.5 : 0.18} />
        );
      }
    }
    return <svg viewBox="-75 -48 150 96" className="w-full h-full">{dots}</svg>;
  }

  const bars = [
    { y: -34, w: 114, warn: false }, { y: -22, w: 76, warn: false },
    { y: -10, w: 96,  warn: false }, { y: 2,   w: 28, warn: true  },
    { y: 14,  w: 104, warn: false }, { y: 26,  w: 22, warn: true  },
    { y: 38,  w: 82,  warn: false },
  ];
  return (
    <svg viewBox="-75 -48 150 96" className="w-full h-full">
      {bars.map((b, i) => (
        <rect key={i} x={-b.w / 2} y={b.y - 4} width={b.w} height={6} rx={1}
          fill={b.warn ? "#E8705A" : color}
          opacity={b.warn ? 0.38 : 0.2} />
      ))}
    </svg>
  );
}

export default function CoreSystem({
  introStep,
  transitionPhase,
  brainX,
  brainY,
  displayColor,
  ring1Duration,
  ring2Duration,
  ring3Duration,
  CORE_R = 180,
  CHAMBER_INSET = 68,
  analysis,
  coreMetric,
  intelKey,
}) {

  return (
    <motion.div
      className="absolute"
      animate={{
        left: brainX,
        top: brainY,
        scale: (introStep === "dormant") ? 1.3 :
               (introStep === "booting") ? 1.45 :
               transitionPhase === "acknowledgement" ? 1.05 :
               transitionPhase === "acceleration" ? 1.02 :
               transitionPhase === "charge" ? 1.15 :
               transitionPhase === "expansion" ? 30.0 : 1.0,
        borderRadius: transitionPhase === "expansion" ? "0%" : "50%"
      }}
      transition={
        introStep === "awakening" ? { type: "spring", stiffness: 80, damping: 15 } :
        transitionPhase === "expansion" ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] } :
        transitionPhase === "acknowledgement" ? { duration: 0.12, ease: "easeOut" } :
        { duration: 0.8, ease: "easeInOut" }
      }
      style={{
        position: "absolute",
        width: CORE_R * 2, height: CORE_R * 2,
        marginLeft: -CORE_R, marginTop: -CORE_R,
        zIndex: transitionPhase === "expansion" ? 50 : 4,
        overflow: "visible"
      }}
    >
      {/* Super glow radial burst */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -80,
          background: `radial-gradient(circle, ${displayColor}40 0%, ${displayColor}18 30%, ${displayColor}08 55%, transparent 75%)`,
          filter: `blur(8px)`,
        }}
        animate={{
          opacity: introStep === "booting" ? 1 : 0,
          scale: introStep === "booting" ? [1, 1.25, 1.1] : 0.6,
        }}
        transition={
          introStep === "booting"
            ? { opacity: { duration: 0.3 }, scale: { duration: 1.5, ease: "easeInOut" } }
            : { duration: 0.6, ease: "easeOut" }
        }
      />

      {/* Outer glow halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: introStep === "dormant" ? `0 0 20px 2px ${displayColor}05` :
                     introStep === "booting" ? `0 0 160px 40px ${displayColor}50, 0 0 300px 80px ${displayColor}20` :
                     introStep === "awakening" ? `0 0 90px 20px ${displayColor}25, 0 0 180px 40px ${displayColor}10` :
                     transitionPhase === "acknowledgement" ? `0 0 90px 24px ${displayColor}35, 0 0 180px 48px ${displayColor}1A` :
                     transitionPhase === "acceleration" ? `0 0 120px 32px ${displayColor}50, 0 0 200px 64px ${displayColor}2A` :
                     transitionPhase === "charge" ? `0 0 180px 48px ${displayColor}80, 0 0 300px 96px ${displayColor}4A` :
                     transitionPhase === "expansion" ? `0 0 350px 120px ${displayColor}FF, 0 0 600px 200px ${displayColor}80` :
                     `0 0 70px 12px ${displayColor}1C, 0 0 140px 36px ${displayColor}09`
        }}
        transition={{ duration: (introStep === "booting" || introStep === "awakening") ? 0.8 : 0.25 }}
      />

      {/* Scanner sweep line */}
      {introStep === "booting" && (
        <motion.div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: `linear-gradient(to right, transparent, ${displayColor}, transparent)`,
            boxShadow: `0 0 8px ${displayColor}`,
            top: 0,
            zIndex: 5
          }}
          animate={{
            top: ["0%", "100%"],
            opacity: [0, 1, 1, 0]
          }}
          transition={{
            duration: 1.2,
            delay: 0.2,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Ring 1 - outermost */}
      <motion.div 
        className="absolute rounded-full spin-cw-24"
        animate={{
          inset: transitionPhase === "charge" ? -40 : transitionPhase === "expansion" ? -300 : 0,
          opacity: transitionPhase === "expansion" ? 0 : (introStep === "dormant" ? 0 : 0.35)
        }}
        transition={{ duration: 0.3, ease: "easeInOut", delay: introStep === "booting" ? 0.5 : 0 }}
        style={{ 
          border: `1px solid ${displayColor}30`, 
          transition: "border-color 1s",
          animationDuration: ring1Duration
        }}>
        <TickRing size={CORE_R * 2} ticks={12} color={displayColor} opacity={0.35} />
      </motion.div>

      {/* Ring 2 - middle */}
      <motion.div 
        className="absolute rounded-full spin-ccw-36"
        animate={{
          inset: transitionPhase === "charge" ? 22 : transitionPhase === "expansion" ? -200 : CHAMBER_INSET / 2,
          opacity: transitionPhase === "expansion" ? 0 : (introStep === "dormant" ? 0 : 0.25)
        }}
        transition={{ duration: 0.35, ease: "easeInOut", delay: introStep === "booting" ? 0.6 : 0 }}
        style={{ 
          border: `1px dashed ${displayColor}20`, 
          transition: "border-color 1s",
          animationDuration: ring2Duration
        }} />

      {/* Ring 3 - inner */}
      <motion.div 
        className="absolute rounded-full spin-cw-14"
        animate={{
          inset: transitionPhase === "charge" ? 34 : transitionPhase === "expansion" ? -100 : CHAMBER_INSET,
          opacity: transitionPhase === "expansion" ? 0 : (introStep === "dormant" ? 0 : 0.42)
        }}
        transition={{ duration: 0.38, ease: "easeInOut", delay: introStep === "booting" ? 0.75 : 0 }}
        style={{ 
          border: `1px dashed ${displayColor}14`, 
          transition: "border-color 1s",
          animationDuration: ring3Duration
        }} />

      {/* Inner chamber */}
      <motion.div
        className="absolute overflow-hidden"
        animate={{
          inset: transitionPhase === "expansion" ? 0 : CHAMBER_INSET,
          borderRadius: transitionPhase === "expansion" ? "0%" : "50%",
          opacity: transitionPhase === "expansion" ? 0 : 1
        }}
        transition={
          transitionPhase === "expansion" ? { duration: 0.3, ease: "easeIn" } :
          { duration: 0.25, ease: "easeInOut" }
        }
        style={{
          background: `radial-gradient(circle at 42% 36%, #0E1828 0%, #070A0E 100%)`,
          boxShadow: `inset 0 0 36px rgba(0,0,0,0.85), inset 0 0 18px ${displayColor}10, 0 0 0 1px ${displayColor}22`,
        }}
      >
        {/* Scan line */}
        <div
          className="absolute scan-line pointer-events-none"
          style={{
            left: 0, right: 0, top: 0, height: 1,
            background: `linear-gradient(to right, transparent 0%, ${displayColor}28 40%, ${displayColor}28 60%, transparent 100%)`,
          }}
        />

        {/* Domain visualization */}
        <div className="absolute inset-0">
          <motion.div
            key={`viz-${intelKey}`}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: (introStep === "dormant" || introStep === "booting" || introStep === "awakening" || introStep === "understood") ? 0 : 
                       (transitionPhase === "charge" || transitionPhase === "expansion" ? 0 : 1) 
            }}
            transition={{ duration: 0.8 }}
            className="w-full h-full"
          >
            <CoreViz domain={intelKey} color={displayColor} />
          </motion.div>
        </div>

        {/* Morph Overlay */}
        {(transitionPhase === "charge" || transitionPhase === "expansion") && (
          <div className="absolute inset-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ 
                opacity: 1, 
                scale: transitionPhase === "expansion" ? 1.5 : 1.0 
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full h-full"
            >
              <MorphOverlay domain={intelKey} color={displayColor} />
            </motion.div>
          </div>
        )}

        {/* Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {analysis && analysis.status === "analyzing" ? null : (
            <motion.div
              key={`metric-${intelKey}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ 
                opacity: (introStep === "dormant" || introStep === "booting" || introStep === "awakening" || introStep === "understood") ? 0 : 
                         (transitionPhase === "charge" || transitionPhase === "expansion" ? 0 : 1), 
                scale: transitionPhase === "expansion" ? 0.8 : 1 
              }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <div
                style={{
                  fontFamily: "'Bodoni Moda', serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  fontSize: "clamp(44px, 6vw, 58px)",
                  color: displayColor,
                  lineHeight: 1,
                  letterSpacing: "-2px",
                  textShadow: `0 0 40px ${displayColor}50`,
                  transition: "color 0.9s, text-shadow 0.9s",
                }}
              >
                <AnimatedCounter value={coreMetric.metric} />
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "7.5px",
                  letterSpacing: "2.5px",
                  color: `${displayColor}70`,
                  marginTop: 8,
                  textTransform: "uppercase",
                  transition: "color 0.9s",
                }}
              >
                {coreMetric.label}
              </div>
            </motion.div>
          )}
        </div>

        <CoreBootMessages introStep={introStep} analysis={analysis} color={displayColor} />
      </motion.div>

      {/* Framework info text below the Core */}
      {(introStep !== "dormant" && introStep !== "booting") && (
        <div
          style={{
            position: "absolute",
            top: CORE_R * 2 + 16,
            left: "50%",
            transform: "translateX(-50%)",
            width: CORE_R * 2,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "8.5px",
              letterSpacing: "3.5px",
              color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
              whiteSpace: "nowrap"
            }}
          >
            {analysis?.projectDNA?.framework || "React"} • {analysis?.projectDNA?.language || "JavaScript"}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
