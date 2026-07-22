import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function ArchitectureHealthGauge({ score = 88 }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));

  const START_ANGLE = 135;
  const SWEEP_ANGLE = 270;
  const targetAngle = START_ANGLE + (safeScore / 100) * SWEEP_ANGLE;

  // 1. Spring for animated score counter (0 -> safeScore)
  const animatedScore = useSpring(0, {
    stiffness: 35,
    damping: 18,
    restDelta: 0.01,
  });

  // 2. Synchronized Spring for rotation angle (135° -> targetAngle)
  const animatedAngleSpring = useSpring(START_ANGLE, {
    stiffness: 35,
    damping: 18,
    restDelta: 0.05,
  });

  const [displayScore, setDisplayScore] = useState(0);
  const [currentAnimatedAngle, setCurrentAnimatedAngle] = useState(START_ANGLE);

  useEffect(() => {
    animatedScore.set(safeScore);
    animatedAngleSpring.set(targetAngle);
  }, [safeScore, targetAngle, animatedScore, animatedAngleSpring]);

  useEffect(() => {
    const unsubScore = animatedScore.on('change', latest => {
      setDisplayScore(Math.round(latest));
    });
    const unsubAngle = animatedAngleSpring.on('change', latest => {
      setCurrentAnimatedAngle(latest);
    });
    return () => {
      unsubScore();
      unsubAngle();
    };
  }, [animatedScore, animatedAngleSpring]);

  // Geometry calculations driven dynamically by currentAnimatedAngle
  const currentAngleRad = (currentAnimatedAngle * Math.PI) / 180;

  const CX = 155;
  const CY = 155;
  const R_OUTER = 124; // Large 248px diameter outer ring
  const R_DISC = 88;   // Large 176px diameter inner disc

  // Indicator line coordinates: Rotates dynamically with currentAnimatedAngle
  const lineStartX = CX + R_OUTER * Math.cos(currentAngleRad);
  const lineStartY = CY + R_OUTER * Math.sin(currentAngleRad);

  // Line enters inside the inner circle (r = R_DISC - 22)
  const lineEndX = CX + (R_DISC - 22) * Math.cos(currentAngleRad);
  const lineEndY = CY + (R_DISC - 22) * Math.sin(currentAngleRad);

  // Outer track start & end boundary dots
  const startDotX = CX + R_OUTER * Math.cos((START_ANGLE * Math.PI) / 180);
  const startDotY = CY + R_OUTER * Math.sin((START_ANGLE * Math.PI) / 180);

  const endDotX = CX + R_OUTER * Math.cos(((START_ANGLE + SWEEP_ANGLE) * Math.PI) / 180);
  const endDotY = CY + R_OUTER * Math.sin(((START_ANGLE + SWEEP_ANGLE) * Math.PI) / 180);

  // SVG Arc Path builder
  const describeArc = (x, y, radius, startAngleDeg, endAngleDeg) => {
    const startRad = (startAngleDeg * Math.PI) / 180;
    const endRad = (endAngleDeg * Math.PI) / 180;

    const x1 = x + radius * Math.cos(startRad);
    const y1 = y + radius * Math.sin(startRad);
    const x2 = x + radius * Math.cos(endRad);
    const y2 = y + radius * Math.sin(endRad);

    const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? 0 : 1;

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  const trackBgPath = describeArc(CX, CY, R_OUTER, START_ANGLE, START_ANGLE + SWEEP_ANGLE);
  const activeArcPath = describeArc(CX, CY, R_OUTER, START_ANGLE, Math.max(START_ANGLE + 0.1, currentAnimatedAngle));

  return (
    <div
      style={{
        position: 'relative',
        width: 310,
        height: 310,
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        userSelect: 'none',
        margin: '0 auto',
      }}
    >
      <svg
        width="310"
        height="310"
        viewBox="0 0 310 310"
        style={{ width: 310, height: 310, display: 'block' }}
      >
        <defs>
          {/* Ambient Outer Radial Glow */}
          <radialGradient id="outerAuraGlow" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#818CF8" stopOpacity="0.15" />
            <stop offset="90%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Soft Glow Directly Around Inner Circle Perimeter */}
          <radialGradient id="innerDiscPerimeterGlow" cx="35%" cy="30%" r="55%">
            <stop offset="70%" stopColor="#93C5FD" stopOpacity="0.45" />
            <stop offset="88%" stopColor="#6366F1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Center Dark Disc Gradient */}
          <radialGradient id="centerDiscGradLarge" cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="85%" stopColor="#080C14" />
          </radialGradient>

          {/* Disc Drop Shadow Filter */}
          <filter id="centerDiscShadowLarge" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* ── 1. ATMOSPHERIC BACKDROP RADIAL GLOW ── */}
        <circle cx={CX} cy={CY} r="130" fill="url(#outerAuraGlow)" />

        {/* ── 2. SOFT GLOW AURA DIRECTLY AROUND INNER CIRCLE ── */}
        <circle cx={CX} cy={CY} r={R_DISC + 14} fill="url(#innerDiscPerimeterGlow)" />

        {/* ── 3. OUTER BACKGROUND TRACK (Thin line) ── */}
        <path
          d={trackBgPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.25"
          strokeLinecap="round"
        />

        {/* ── 4. ANIMATED PURE WHITE ACTIVE OUTER ARC ── */}
        <path
          d={activeArcPath}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Boundary dots at 135° and 405° */}
        <circle cx={startDotX} cy={startDotY} r="2.5" fill="rgba(255, 255, 255, 0.5)" />
        <circle cx={endDotX} cy={endDotY} r="2.5" fill="rgba(255, 255, 255, 0.5)" />

        {/* ── 5. PERFECTLY CENTERED BLACK DISC ── */}
        <circle
          cx={CX}
          cy={CY}
          r={R_DISC}
          fill="url(#centerDiscGradLarge)"
          filter="url(#centerDiscShadowLarge)"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1"
        />

        {/* ── 6. ANIMATED ROTATING INDICATOR NEEDLE LINE (ENTERS INNER CIRCLE IN LOCKSTEP) ── */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={lineEndX}
          y2={lineEndY}
          stroke="#FFFFFF"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Bright Pure White Dot on outer ring rotating in lockstep */}
        <circle
          cx={lineStartX}
          cy={lineStartY}
          r="3"
          fill="#FFFFFF"
        />

        {/* ── 7. SCORE NUMBER - MATHEMATICALLY DEAD CENTERED ── */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontSize="56"
          fontWeight="200"
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="-0.04em"
        >
          {displayScore}
        </text>

        {/* ── 8. MINIMAL SUBTEXT - MATHEMATICALLY DEAD CENTERED ── */}
        <text
          x={CX}
          y={CY + 26}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255, 255, 255, 0.45)"
          fontSize="10"
          fontWeight="400"
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          letterSpacing="0.04em"
        >
          Architecture Health
        </text>
      </svg>
    </div>
  );
}
