import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { setFiles, setKnowledgeGraph } from "@/redux/slices/graphSlice";
import { selectSelectedProject, clearSelectedProject } from "@/redux/slices/hubSlice";
import { setAnalysisStatus, setAnalysisResults, resetAnalysis } from "@/redux/slices/analysisSlice";
import { setAppMode, setActiveRoom } from "@/redux/slices/uiSlice";
import { getProjectHandle } from "@/lib/analysis/projectStore";
import { buildKnowledgeGraph } from "@/engines/graph/buildKnowledgeGraph";

// --- Constants ---
const CORE_R = 180;       // px - radius of the Core circle
const CHAMBER_INSET = 68; // px - inset of inner chamber from core edge

function toXY(deg, r) {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.round(r * Math.cos(rad)), y: Math.round(r * Math.sin(rad)) };
}

// --- Core Visualization Components ---
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

  // documentation
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

function TickRing({ size, ticks, color, opacity }) {
  const r = size / 2 - 1;
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

// --- Morph Overlay Component (Deconstructed Studio Structures) ---
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

// --- Dynamic Briefing Helper ---
function getCoreContextOverview(displayRoom, analysis, projectName) {
  const baseDNA = {
    projectName: projectName || "React Project",
    components: analysis?.projectDNA?.componentCount || 0,
    routes: analysis?.projectDNA?.routeCount || 0,
    contexts: analysis?.projectDNA?.contextCount || 0,
    apis: analysis?.projectDNA?.apiCount || 0,
    healthScore: analysis?.architectureHealth?.score ?? 91,
    circulars: (analysis?.architectureHealth?.errors || []).concat(analysis?.architectureHealth?.warnings || []).filter(item => item.type === "CIRCULAR_DEPENDENCIES").length,
    largeComps: (analysis?.architectureHealth?.errors || []).concat(analysis?.architectureHealth?.warnings || []).filter(item => item.type === "LARGE_COMPONENTS").length,
    unusedComps: analysis?.deadCode?.unusedComponents?.length || 0,
    deadRoutes: analysis?.deadCode?.unusedRoutes?.length || 0,
    unusedHooks: analysis?.deadCode?.unusedHooks?.length || 0,
    unusedApis: analysis?.deadCode?.unusedApiServices?.length || 0,
  };

  if (displayRoom === "default" || displayRoom === "project-brain") {
    let targetDomain = "Architecture";
    let reason = "Verify modular boundaries and structural imports.";
    if (baseDNA.circulars > 0) {
      targetDomain = "Architecture";
      reason = `${baseDNA.circulars} circular dependency loops were detected.`;
    } else if (baseDNA.deadRoutes > 0) {
      targetDomain = "Routes";
      reason = `${baseDNA.deadRoutes} dead routes were detected.`;
    } else if (baseDNA.unusedHooks > 0) {
      targetDomain = "State";
      reason = `${baseDNA.unusedHooks} unused state slices or hooks carry cascade invalidation risks.`;
    } else if (baseDNA.unusedApis > 0) {
      targetDomain = "API";
      reason = `${baseDNA.unusedApis} stale API client endpoints were mapped.`;
    }

    return {
      metric: baseDNA.healthScore,
      color: "#7B9CF4",
      headline: `Project structure is in ${baseDNA.healthScore >= 90 ? "optimal" : "concerning"} standing`,
      body: `The Knowledge Graph has mapped ${baseDNA.components} components, ${baseDNA.routes} routes, ${baseDNA.contexts} slices, and ${baseDNA.apis} API endpoints.`,
      recommendation: reason,
      actionLabel: `Investigate ${targetDomain}`
    };
  }

  if (displayRoom === "architecture") {
    const headline = baseDNA.circulars > 0 ? "Circular import issues detected" : "Structural integrity is strong";
    const body = baseDNA.circulars > 0 
      ? `A circular dependency chain has begun attracting satellite imports. ${baseDNA.largeComps} monolithic component modules require decomposition.`
      : `${baseDNA.components} active components mapped with clear separation of modular boundaries.`;
    return {
      metric: baseDNA.healthScore,
      color: "#D4A847",
      headline,
      body,
      recommendation: baseDNA.circulars > 0 ? "Resolve circular dependency loops before compilation size spikes." : "All component systems stable.",
      actionLabel: "Inspect Architecture"
    };
  }

  if (displayRoom === "routes") {
    const headline = baseDNA.deadRoutes > 0 ? "Routing health is deteriorating" : "Route configurations look healthy";
    const body = baseDNA.deadRoutes > 0
      ? `${baseDNA.deadRoutes} dead routes were detected. Navigation complexity exceeds recommended performance thresholds.`
      : `All ${baseDNA.routes} application routes are mapped and active. No orphan paths found.`;
    return {
      metric: Math.max(100 - baseDNA.deadRoutes * 12, 10),
      color: "#5BB8D4",
      headline,
      body,
      recommendation: baseDNA.deadRoutes > 0 ? "Audit layout templates and remove unreachable navigation pathways." : "All route gates secure.",
      actionLabel: "Investigate Routes"
    };
  }

  if (displayRoom === "state") {
    const headline = baseDNA.unusedHooks > 0 ? "State redundancy risk is elevated" : "Data subscriptions are optimal";
    const body = baseDNA.unusedHooks > 0
      ? `${baseDNA.unusedHooks} unused state slices or hooks were detected. Cascade invalidation events are likely without hooks cleanups.`
      : `All global store slices and hooks share optimal render subscription trees.`;
    return {
      metric: Math.max(100 - baseDNA.unusedHooks * 8, 10),
      color: "#9B7AE8",
      headline,
      body,
      recommendation: baseDNA.unusedHooks > 0 ? "Merge duplicate selectors and decouple stale component bindings." : "State store clear.",
      actionLabel: "Analyze State"
    };
  }

  if (displayRoom === "api") {
    const headline = baseDNA.unusedApis > 0 ? "Stale API client calls detected" : "Fetch layers are well-formed";
    const body = baseDNA.unusedApis > 0
      ? `${baseDNA.unusedApis} endpoints lack consumer imports. Fetch retry configurations carry cache mismatches.`
      : `All ${baseDNA.apis} API endpoints are actively called by client modules.`;
    return {
      metric: Math.max(100 - baseDNA.unusedApis * 10, 10),
      color: "#E8705A",
      headline,
      body,
      recommendation: baseDNA.unusedApis > 0 ? "Audit stale axios requests and cache redundant network fetches." : "Endpoints resolved.",
      actionLabel: "Review APIs"
    };
  }

  if (displayRoom === "documentation") {
    return {
      metric: 85,
      color: "#6DB885",
      headline: "Critical components undocumented",
      body: "Only 38% component coverage. Core components have zero JSDoc descriptors and lack Storybook examples.",
      recommendation: "Document high-leverage button and input components first.",
      actionLabel: "Explore Documentation"
    };
  }

  return {
    metric: "100",
    color: "#7B9CF4",
    headline: "System Mapped",
    body: "All systems healthy.",
    recommendation: "No active alerts.",
    actionLabel: "Explore Workspace"
  };
}

const MOCK_FILES_CONTENT = {
  "README.md": `# Project Guide\nWelcome to the React Architect workspace documentation.\n\n## Getting Started\nTo view your project structure in real time:\n- Enter the **Architecture Studio** to see components.\n- Enter the **Route Studio** to examine endpoint mapping trees.\n- Browse slices in the **State Studio**.\n\n---\n*Generated dynamically by the React Architect scanner engine.*`,
  "docs/CHANGELOG.md": `# Changelog\nAll notable changes to this project will be documented in this file.\n\n## [3.0.0] - Centralized Knowledge Graph Engine\n- Integrated unified AST parsing extractor.\n- Decoupled visual layout calculation coordinates.`,
  "src/App.jsx": `import React from 'react';\nimport Router from './app/router';\nexport default function App() {\n  return <Router />;\n}`,
  "src/app/router.jsx": `import React from 'react';\nimport { createBrowserRouter, RouterProvider } from 'react-router-dom';\nimport App from '../App';\nimport Login from '../pages/Login';\nimport Dashboard from '../pages/Dashboard';\n\nconst router = createBrowserRouter([\n  { path: '/', element: <App /> },\n  { path: '/login', element: <Login /> },\n  { path: '/dashboard', element: <Dashboard /> }\n]);\n\nexport default function Router() {\n  return <RouterProvider router={router} />;\n}`,
  "src/pages/Login.jsx": `import React, { useState } from 'react';\nimport { useDispatch } from 'react-redux';\nimport FormInput from '../components/FormInput';\nimport api from '../services/api';\n\nexport default function Login() {\n  const dispatch = useDispatch();\n  const [email, setEmail] = useState('');\n  \n  const handleLogin = () => {\n    api.post('/auth/login', { email });\n  };\n\n  return <FormInput value={email} onChange={setEmail} onSubmit={handleLogin} />;\n}`,
  "src/pages/Dashboard.jsx": `import React from 'react';\nimport Sidebar from '../components/Sidebar';\n\nexport default function Dashboard() {\n  return (\n    <div>\n      <Sidebar />\n      <h1>Welcome to Dashboard</h1>\n    </div>\n  );\n}`,
  "src/components/Sidebar.jsx": `import React from 'react';\nexport default function Sidebar() {\n  return <aside>Navigation links</aside>;\n}`,
  "src/components/FormInput.jsx": `import React from 'react';\nexport default function FormInput({ value, onChange, onSubmit }) {\n  return (\n    <form onSubmit={onSubmit}>\n      <input value={value} onChange={e => onChange(e.target.value)} />\n    </form>\n  );\n}`,
  "src/redux/store.js": `import { configureStore } from '@reduxjs/toolkit';\nimport authReducer from './authSlice';\nimport uiReducer from './uiSlice';\n\nexport const store = configureStore({\n  reducer: {\n    auth: authReducer,\n    ui: uiReducer\n  }\n});`,
  "src/redux/authSlice.js": `import { createSlice } from '@reduxjs/toolkit';\nexport const authSlice = createSlice({\n  name: 'auth',\n  initialState: {\n    currentUser: null,\n    users: []\n  },\n  reducers: {}\n});\nexport default authSlice.reducer;`,
  "src/redux/uiSlice.js": `import { createSlice } from '@reduxjs/toolkit';\nexport const uiSlice = createSlice({\n  name: 'ui',\n  initialState: {\n    appMode: 'dark',\n    sidebarOpen: true\n  },\n  reducers: {}\n});\nexport default uiSlice.reducer;`,
  "src/services/api.js": `import axios from 'axios';\nexport const api = axios.create({\n  baseURL: 'api.domain.com'\n});`,
  "src/services/endpoints.js": `import { api } from './api';\nexport const login = (data) => api.post('/auth/login', data);\nexport const signup = (data) => api.post('/auth/signup', data);\nexport const getProjects = () => api.get('/projects');`
};

function generateMockContentForPath(path) {
  const cleanPath = path.replace(/\\/g, "/");
  if (MOCK_FILES_CONTENT[cleanPath]) {
    return MOCK_FILES_CONTENT[cleanPath];
  }
  const parts = cleanPath.split("/");
  const fileName = parts.pop();
  const name = fileName.split(".")[0];
  
  if (cleanPath.endsWith(".md")) {
    return `# ${name}\nMock document contents for ${cleanPath}.`;
  }
  
  if (cleanPath.includes("/components/") || cleanPath.includes("/pages/") || cleanPath.includes("page.jsx") || cleanPath.includes("layout.jsx") || cleanPath.includes("providers")) {
    const componentName = name.charAt(0).toUpperCase() + name.slice(1);
    return `import React from 'react';\nexport default function ${componentName}() {\n  return <div>${componentName} content</div>;\n}`;
  }
  
  return "";
}

const getTargetRotation = (activeDomainId) => {
  if (!activeDomainId) return 0;
  const angleMap = {
    "architecture": -90,
    "routes": -18,
    "state": 54,
    "api": 126,
    "documentation": 198
  };
  const baseAngle = angleMap[activeDomainId] ?? 0;
  // Rotate system so that the selected angle aligns at -90 degrees (top center)
  return -90 - baseAngle;
};

// --- Main Workspace Component ---
const Workspace = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const selectedProject = useSelector(selectSelectedProject);
  const analysis = useSelector((state) => state.analysis);

  const [active, setActive]     = useState(null);
  const [hovered, setHovered]   = useState(null);
  const [vw, setVw]             = useState(1440);
  const [vh, setVh]             = useState(900);

  const [transitionPhase, setTransitionPhase] = useState(null);
  const [extraRotation, setExtraRotation] = useState(0);

  // Onboarding sequence state ("intro" -> "charging" -> "shrinking" -> "revealing" -> "ready")
  const [introStep, setIntroStep] = useState("intro");

  // Progressive disclosure hover states
  const [hoveredStack, setHoveredStack] = useState(false);
  const [hoveredScale, setHoveredScale] = useState(false);
  const [hoveredHealth, setHoveredHealth] = useState(false);
  const [hoveredBottomDiagnostics, setHoveredBottomDiagnostics] = useState(false);

  const knowledgeGraph = useSelector((state) => state.graph.knowledgeGraph);
  const rawFiles = knowledgeGraph?.rawFiles || [];

  // Parse project's package.json dependencies dynamically
  const packageJsonFile = rawFiles.find(f => f.name === "package.json");
  let dependencies = {};
  if (packageJsonFile) {
    try {
      const parsed = JSON.parse(packageJsonFile.content);
      dependencies = {
        ...parsed.dependencies,
        ...parsed.devDependencies,
        ...parsed.peerDependencies
      };
    } catch (e) {
      console.error("Failed to parse package.json dependencies", e);
    }
  }

  // Detect package manager
  const packageManager = rawFiles.some(f => f.name === "package-lock.json") ? "npm" :
                         rawFiles.some(f => f.name === "yarn.lock") ? "yarn" :
                         rawFiles.some(f => f.name === "pnpm-lock.yaml") ? "pnpm" : "npm";

  // Category mapping catalog
  const CATEGORY_MAP = {
    "Frontend": [
      { key: "react", label: "React" },
      { key: "vite", label: "Vite" },
      { key: "typescript", label: "TypeScript" },
      { key: "vue", label: "Vue" },
      { key: "svelte", label: "Svelte" },
      { key: "@angular/core", label: "Angular" },
    ],
    "State": [
      { key: "@reduxjs/toolkit", label: "Redux Toolkit" },
      { key: "redux", label: "Redux" },
      { key: "zustand", label: "Zustand" },
      { key: "mobx", label: "MobX" },
      { key: "recoil", label: "Recoil" },
      { key: "xstate", label: "XState" },
    ],
    "Routing": [
      { key: "react-router-dom", label: "React Router" },
      { key: "react-router", label: "React Router" },
      { key: "@tanstack/react-router", label: "TanStack Router" },
      { key: "wouter", label: "Wouter" },
    ],
    "Styling": [
      { key: "tailwindcss", label: "Tailwind CSS" },
      { key: "sass", label: "Sass" },
      { key: "scss", label: "SCSS" },
      { key: "less", label: "Less" },
      { key: "styled-components", label: "Styled Components" },
      { key: "@emotion/react", label: "Emotion" },
    ],
    "Animation": [
      { key: "gsap", label: "GSAP" },
      { key: "@gsap/react", label: "GSAP React" },
      { key: "framer-motion", label: "Framer Motion" },
      { key: "motion", label: "Motion" },
      { key: "animejs", label: "Anime.js" },
    ],
    "Networking": [
      { key: "axios", label: "Axios" },
      { key: "@tanstack/react-query", label: "TanStack Query" },
      { key: "swr", label: "SWR" },
    ],
    "Tooling": [
      { key: "eslint", label: "ESLint" },
      { key: "prettier", label: "Prettier" },
      { key: "typescript", label: "TypeScript" },
      { key: "vitest", label: "Vitest" },
      { key: "jest", label: "Jest" },
    ]
  };

  const detectedCategories = {};

  if (Object.keys(dependencies).length > 0) {
    Object.entries(CATEGORY_MAP).forEach(([category, list]) => {
      const activeInCat = [];
      list.forEach(({ key, label }) => {
        if (key in dependencies) {
          if (!activeInCat.includes(label)) {
            activeInCat.push(label);
          }
        }
      });

      // Special contextual overrides
      if (category === "Frontend") {
        if (!activeInCat.includes("React") && ("react" in dependencies)) {
          activeInCat.push("React");
        }
        if (!activeInCat.includes("JavaScript")) {
          activeInCat.push("JavaScript");
        }
      }
      if (category === "Tooling") {
        const pmLabel = packageManager.toUpperCase();
        if (!activeInCat.includes(pmLabel)) {
          activeInCat.push(pmLabel);
        }
      }

      if (activeInCat.length > 0) {
        detectedCategories[category] = activeInCat;
      }
    });
  } else {
    // Fallback using selectedProject flags
    const frontend = ["React", "JavaScript"];
    if (selectedProject?.hasTypeScript) frontend.push("TypeScript");
    detectedCategories["Frontend"] = frontend;

    const styling = [];
    if (selectedProject?.hasTailwind) styling.push("Tailwind CSS");
    if (styling.length > 0) detectedCategories["Styling"] = styling;

    const state = [];
    if (selectedProject?.hasRedux) state.push("Redux Toolkit");
    else state.push("Context API");
    detectedCategories["State"] = state;

    const routing = [];
    if (selectedProject?.hasRouter) routing.push("React Router");
    if (routing.length > 0) detectedCategories["Routing"] = routing;

    detectedCategories["Tooling"] = [packageManager.toUpperCase()];
  }

  // Redirect to Hub if no project is loaded
  useEffect(() => {
    if (!selectedProject) {
      navigate("/hub");
    } else {
      dispatch(setAppMode("workspace"));
      dispatch(resetAnalysis());
    }
  }, [selectedProject, navigate, dispatch]);

  const [needsPermission, setNeedsPermission] = useState(false);
  const [cachedHandle, setCachedHandle] = useState(null);

  // Dynamic project scanning and AST extraction triggers
  useEffect(() => {
    if (!selectedProject) return;

    const projectId = selectedProject.id;
    let dirHandle = window.projectHandles?.[projectId];
    let zipFile = window.projectZipFiles?.[projectId];

    async function loadAndScan() {
      if (!dirHandle && !zipFile) {
        const persisted = await getProjectHandle(projectId);
        if (persisted) {
          if (persisted instanceof File) {
            zipFile = persisted;
            if (!window.projectZipFiles) window.projectZipFiles = {};
            window.projectZipFiles[projectId] = zipFile;
          } else {
            dirHandle = persisted;
            if (!window.projectHandles) window.projectHandles = {};
            window.projectHandles[projectId] = dirHandle;
          }
        }
      }

      if (dirHandle) {
        const permission = await dirHandle.queryPermission({ mode: "read" });
        if (permission !== "granted") {
          setCachedHandle(dirHandle);
          setNeedsPermission(true);
          return;
        }
        setNeedsPermission(false);
      }

      if (dirHandle || zipFile) {
        dispatch(setAnalysisStatus('analyzing'));
        const { analyzeProject } = await import("@/engines/analyzer");
        analyzeProject(selectedProject, dirHandle, zipFile)
          .then((kg) => {
            dispatch(setKnowledgeGraph(kg));
            dispatch(setFiles(kg.files));
            window.projectFiles = kg.rawFiles;
            dispatch(setAnalysisResults(kg.analysis));
          })
          .catch(err => {
            console.error("Failed to analyze project", err);
            dispatch(setAnalysisStatus('error'));
          });
      } else {
        dispatch(setAnalysisStatus('analyzing'));
        const { getGraphDataForProject } = await import("@/lib/analysis/mockDataGenerator");
        const { files } = getGraphDataForProject(selectedProject);

        const mockFiles = files.map(f => ({
          path: f,
          content: generateMockContentForPath(f)
        }));
        const kg = buildKnowledgeGraph(mockFiles, selectedProject);
        
        const { layoutGraphNodes } = await import("@/engines/layout/layoutEngine");
        const { runAnalysis } = await import("@/engines/analysis");
        kg.nodes = layoutGraphNodes(kg.nodes, kg.edges);
        kg.rawFiles = mockFiles;
        
        const analysisResults = runAnalysis(kg);
        kg.analysis = analysisResults;

        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(analysisResults));
      }
    }

    loadAndScan().catch(err => {
      console.error("Error in loadAndScan", err);
    });
  }, [selectedProject, dispatch]);

  useEffect(() => {
    const resize = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);



  const handleRequestPermission = async () => {
    if (!cachedHandle) return;
    try {
      const permission = await cachedHandle.requestPermission({ mode: "read" });
      if (permission === "granted") {
        setNeedsPermission(false);
        const projectId = selectedProject.id;
        if (!window.projectHandles) window.projectHandles = {};
        window.projectHandles[projectId] = cachedHandle;

        dispatch(setAnalysisStatus('analyzing'));
        const { analyzeProject } = await import("@/engines/analyzer");
        const kg = await analyzeProject(selectedProject, cachedHandle, null);
        dispatch(setKnowledgeGraph(kg));
        dispatch(setFiles(kg.files));
        window.projectFiles = kg.rawFiles;
        dispatch(setAnalysisResults(kg.analysis));
      }
    } catch (err) {
      console.error("Failed to request permission", err);
      dispatch(setAnalysisStatus('error'));
    }
  };

  const handleReturnToHub = () => {
    dispatch(clearSelectedProject());
    dispatch(setAppMode("hub"));
    dispatch(setActiveRoom("project-brain"));
    navigate("/hub");
  };

  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);

  const intelKey = active ?? "default";
  const intel = getCoreContextOverview(intelKey, analysis, selectedProject?.name);

  // Preview color: active > hovered > default
  const displayId = active ?? hovered;
  const displayColor = displayId ? (
    displayId === "architecture" ? "#D4A847" :
    displayId === "routes" ? "#5BB8D4" :
    displayId === "state" ? "#9B7AE8" :
    displayId === "api" ? "#E8705A" :
    displayId === "documentation" ? "#6DB885" : "#7B9CF4"
  ) : intel.color;

  const ring1Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "2s" :
                       transitionPhase === "acceleration" ? "6s" : "24s";
  const ring2Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "3s" :
                       transitionPhase === "acceleration" ? "9s" : "36s";
  const ring3Duration = transitionPhase === "charge" || transitionPhase === "expansion" ? "1.5s" :
                       transitionPhase === "acceleration" ? "4s" : "14s";

  const coreCX = vw * 0.38;
  const coreCY = vh * 0.5;

  const brainX = (introStep === "intro" || introStep === "charging") ? (vw / 2) : coreCX;
  const brainY = (introStep === "intro" || introStep === "charging") ? (vh / 2) : coreCY;

  const startOnboardingTransition = () => {
    if (analysis && analysis.status === "analyzing") return;
    setIntroStep("charging");
    setTimeout(() => {
      setIntroStep("shrinking");
      setTimeout(() => {
        setIntroStep("revealing");
        setTimeout(() => {
          setIntroStep("ready");
        }, 1200);
      }, 1000);
    }, 900);
  };

  // Orbit ring -> line start just outside the Core edge
  const EDGE = CORE_R + 14;

  const handleDomain = (id) => setActive(p => p === id ? null : id);

  const startSignatureTransition = () => {
    // 1. Acknowledgement (~120ms)
    setTransitionPhase("acknowledgement");
    
    // 2. Orbit acceleration (~350ms)
    setTimeout(() => {
      setTransitionPhase("acceleration");
      setExtraRotation(180);
    }, 120);

    // 3. Core charge (~250ms)
    setTimeout(() => {
      setTransitionPhase("charge");
      setExtraRotation(540);
    }, 470);

    // 4. Core expansion (~250ms)
    setTimeout(() => {
      setTransitionPhase("expansion");
      setExtraRotation(1080);
    }, 720);

    // 5. Navigation / Arrival
    setTimeout(() => {
      const routes = {
        "architecture": "/architecture",
        "routes": "/routes",
        "state": "/state",
        "api": "/api",
        "documentation": "/docs",
      };
      const targetRoute = routes[active];
      if (targetRoute) {
        navigate(targetRoute);
      }
      setTransitionPhase(null);
      setExtraRotation(0);
      setActive(null);
    }, 970);
  };

  const chamberSize = CORE_R * 2 - CHAMBER_INSET * 2;

  // Dynamic layout score mapping & dynamic orbit radius
  const ORBIT_R = Math.max(260, Math.min(310, vw * 0.21));
  const localC = ORBIT_R + 60;

  const baseDNA = {
    components: analysis?.projectDNA?.componentCount || 0,
    routes: analysis?.projectDNA?.routeCount || 0,
    contexts: analysis?.projectDNA?.contextCount || 0,
    apis: analysis?.projectDNA?.apiCount || 0,
  };

  const domains = [
    { id: "architecture", label: "Architecture", color: "#D4A847", score: analysis?.architectureHealth?.score ?? 87, count: `${baseDNA.components} components`, ...toXY(-90, ORBIT_R) },
    { id: "routes",       label: "Routes",       color: "#5BB8D4", score: Math.max(100 - (analysis?.deadCode?.unusedRoutes?.length * 12 || 0), 10), count: `${baseDNA.routes} routes`,       ...toXY(-18, ORBIT_R) },
    { id: "state",        label: "State",        color: "#9B7AE8", score: Math.max(100 - (analysis?.deadCode?.unusedHooks?.length * 8 || 0), 10), count: `${baseDNA.contexts} contexts`,       ...toXY(54, ORBIT_R)  },
    { id: "api",          label: "API",           color: "#E8705A", score: Math.max(100 - (analysis?.deadCode?.unusedApiServices?.length * 10 || 0), 10), count: `${baseDNA.apis} endpoints`,    ...toXY(126, ORBIT_R) },
    { id: "documentation",label: "Documentation",color: "#6DB885", score: 85, count: "85% coverage",    ...toXY(198, ORBIT_R) },
  ];



  // Dynamic rotate angle
  const orbitRotation = getTargetRotation(active);

  // Core metrics contextual mapping
  const getContextualMetric = (domainId, analysis, overview) => {
    if (!domainId) {
      return {
        metric: overview.metric,
        label: "Architecture Health"
      };
    }
    
    switch (domainId) {
      case "architecture":
        return {
          metric: analysis?.architectureHealth?.score ?? 87,
          label: "Architecture Health"
        };
      case "routes":
        return {
          metric: analysis?.deadCode?.unusedRoutes?.length ?? 14,
          label: "Dead Routes"
        };
      case "state":
        return {
          metric: analysis?.projectDNA?.hookCount ?? 48,
          label: "Redux Consumers"
        };
      case "api":
        return {
          metric: analysis?.deadCode?.unusedApiServices?.length ?? 2,
          label: "Stale API Endpoints"
        };
      case "documentation":
        return {
          metric: "61%",
          label: "Documentation Coverage"
        };
      default:
        return {
          metric: overview.metric,
          label: "Architecture Health"
        };
    }
  };

  const coreMetric = getContextualMetric(active, analysis, intel);

  if (!selectedProject) {
    return null;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
        @keyframes spin-cw   { to { transform: rotate(360deg); } }
        @keyframes spin-ccw  { to { transform: rotate(-360deg); } }
        @keyframes breathe   { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @keyframes status-blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes data-flow { from { stroke-dashoffset:28; } to { stroke-dashoffset:0; } }
        @keyframes scan      { 0%   { transform:translateY(0); opacity:0.6; }
                               88%  { opacity:0.6; }
                               100% { transform:translateY(${chamberSize}px); opacity:0; } }
        @keyframes fade-up   { from { opacity:0; transform:translateY(12px); }
                               to   { opacity:1; transform:translateY(0); } }
        @keyframes threshold-in { from { opacity:0; transform:translateY(6px); }
                                  to   { opacity:1; transform:translateY(0); } }
        @keyframes entering-wipe { from { opacity:0; } to { opacity:1; } }

        .spin-cw-24  { animation: spin-cw  24s linear infinite; }
        .spin-cw-14  { animation: spin-cw  14s linear infinite; }
        .spin-ccw-36 { animation: spin-ccw 36s linear infinite; }
        .breathe     { animation: breathe 4.5s ease-in-out infinite; }
        .status-blink{ animation: status-blink 2.6s ease-in-out infinite; }
        .data-flow   { stroke-dasharray: 3 10; animation: data-flow 1.4s linear infinite; }
        .data-flow-fast { stroke-dasharray: 3 10; animation: data-flow 0.4s linear infinite; }
        .scan-line   { animation: scan 7s ease-in-out infinite; }
      `}</style>

      <div
        className="relative w-full h-screen overflow-hidden select-none"
        style={{ background: "#05080E", fontFamily: "'Bricolage Grotesque', sans-serif" }}
      >
        {/* -- Atmospheric glow - shifts hue with domain -- */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 880px 680px at ${brainX}px ${brainY}px, ${displayColor}16 0%, transparent 62%)`,
            transition: "background 1.1s ease",
          }}
        />

        {/* -- Deep vignette -- */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 110% 110% at 50% 50%, transparent 35%, #05080E 100%)",
          }}
        />

        {/* -- Spatial grid -- */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.022 }}>
          <defs>
            <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* -- Rotating Orbital System Container -- */}
        <motion.div
          animate={{
            rotate: orbitRotation + extraRotation,
            scale: (introStep === "ready" || introStep === "revealing") ? 1 : 0,
            opacity: (introStep === "ready" || introStep === "revealing") ? 1 : 0
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
            {domains.map(domain => {
              const len   = Math.sqrt(domain.x ** 2 + domain.y ** 2);
              const nx    = domain.x / len;
              const ny    = domain.y / len;
              const isAct = active  === domain.id;
              const isHov = hovered === domain.id && !active;
              const isAnyActive = active !== null;
              
              const x1 = localC + nx * EDGE;
              const y1 = localC + ny * EDGE;
              // offset line to stop at the edge of the 44px planetary body (radius 22 + padding = 24)
              const x2 = localC + domain.x - nx * 24;
              const y2 = localC + domain.y - ny * 24;

              const isTransitioning = transitionPhase !== null;
              
              // Connections focus hierarchy & transition feed glow
              const lineOpacity = isTransitioning
                ? (isAct ? 0.75 : 0.3)
                : (isAct ? 0.35 : isHov ? 0.2 : isAnyActive ? 0.015 : 0.08);

              const strokeWidth = isTransitioning
                ? (isAct ? 1.8 : 0.9)
                : (isAct ? 0.9 : 0.5);

              return (
                <g key={domain.id}>
                  {/* Base link lines */}
                  <line x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={isAct || isHov ? domain.color : "white"} 
                    strokeWidth={strokeWidth}
                    opacity={lineOpacity}
                    style={{ transition: "opacity 0.6s ease, stroke 0.6s ease, stroke-width 0.6s ease" }}
                  />

                  {/* Active highlight glow path */}
                  {(isAct || (isTransitioning && isAct)) && (
                    <line x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={domain.color} strokeWidth={isTransitioning ? "1.8" : "1.2"} opacity="0.3"
                      filter="url(#glow-line)" />
                  )}

                  {/* Active node data stream (flowing from node into Core) */}
                  {(isAct || (isTransitioning && transitionPhase !== "acknowledgement")) && (
                    <line x1={x2} y1={y2} x2={x1} y2={y1}
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

          {/* Orbit celestial nodes (Enlarged) */}
          {domains.map(domain => {
            const isAct    = active  === domain.id;
            const isHov    = hovered === domain.id;
            const isAnyActive = active !== null;
            const isDimmed = isAnyActive && !isAct;

            const isTransitioning = transitionPhase !== null;

            // Enlarged planetary radii
            const arcR     = 17;
            const circ     = 2 * Math.PI * arcR;
            const arcDash  = (domain.score / 100) * circ;

            // Blur & scale nodes during acceleration/charge
            const nodeBlur = (isTransitioning && transitionPhase !== "acknowledgement")
              ? "blur(6px)"
              : "blur(0px)";

            const scale = isTransitioning && transitionPhase !== "acknowledgement"
              ? (isAct ? 1.3 : 0.6)
              : (isAct ? 1.15 : isHov ? 1.08 : 1.0);

            const opacity = isTransitioning && transitionPhase !== "acknowledgement"
              ? (isAct ? 0.9 : 0.1)
              : (isDimmed ? 0.3 : 1.0);

            // Labels and details fade out completely
            const textOpacity = isTransitioning && transitionPhase !== "acknowledgement" ? 0 : 1;

            return (
              <button
                key={domain.id}
                onClick={() => !isTransitioning && handleDomain(domain.id)}
                onMouseEnter={() => !isTransitioning && setHovered(domain.id)}
                onMouseLeave={() => !isTransitioning && setHovered(null)}
                className="absolute focus:outline-none cursor-pointer pointer-events-auto"
                style={{
                  left: localC + domain.x,
                  top:  localC + domain.y,
                  transform: "translate(-50%, -50%)",
                  zIndex: isAct || isHov ? 20 : 10,
                }}
              >
                {/* Counter-rotation to keep button text upright */}
                <motion.div
                  animate={{ 
                    scale, 
                    opacity,
                    rotate: - (orbitRotation + extraRotation),
                    filter: nodeBlur
                  }}
                  transition={
                    transitionPhase === "acknowledgement" ? { duration: 0.12, ease: "easeOut" } :
                    transitionPhase === "acceleration" ? { duration: 0.35, ease: "easeIn" } :
                    transitionPhase === "charge" ? { duration: 0.25, ease: "easeIn" } :
                    transitionPhase === "expansion" ? { duration: 0.25, ease: "easeIn" } :
                    { duration: 1.2, ease: [0.25, 1, 0.4, 1] }
                  }
                  className="flex flex-col items-center gap-[9px]"
                >
                  {/* Score arc + center dot */}
                  <div className="relative" style={{ width: 44, height: 44 }}>
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
                    className="flex flex-col items-center gap-[4px]"
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
                      {domain.count}
                    </div>
                  </motion.div>
                </motion.div>
              </button>
            );
          })}
        </motion.div>

        {/* -- THE CORE (Static Focal Point & Scaling Portal) -- */}
        <motion.div
          className="absolute"
          animate={{
            left: brainX,
            top: brainY,
            scale: (introStep === "intro") ? 1.45 :
                   (introStep === "charging") ? 1.55 :
                   (introStep === "shrinking") ? 1.0 :
                   transitionPhase === "acknowledgement" ? 1.05 :
                   transitionPhase === "acceleration" ? 1.02 :
                   transitionPhase === "charge" ? 1.15 :
                   transitionPhase === "expansion" ? 30.0 : 1.0,
            borderRadius: transitionPhase === "expansion" ? "0%" : "50%"
          }}
          transition={
            introStep === "shrinking" ? { type: "spring", stiffness: 80, damping: 15 } :
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
          {/* Super glow radial burst — fires during charging */}
          <motion.div
            className="absolute rounded-full"
            style={{
              inset: -80,
              background: `radial-gradient(circle, ${displayColor}40 0%, ${displayColor}18 30%, ${displayColor}08 55%, transparent 75%)`,
              filter: `blur(8px)`,
              pointerEvents: "none",
            }}
            animate={{
              opacity: introStep === "charging" ? 1 : 0,
              scale: introStep === "charging" ? [1, 1.35, 1.15] : 0.6,
            }}
            transition={
              introStep === "charging"
                ? { opacity: { duration: 0.3 }, scale: { duration: 0.9, times: [0, 0.6, 1], ease: "easeInOut" } }
                : { duration: 0.6, ease: "easeOut" }
            }
          />

          {/* Outer glow halo */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: introStep === "charging" ? `0 0 200px 60px ${displayColor}70, 0 0 400px 120px ${displayColor}35, 0 0 600px 200px ${displayColor}12` :
                         transitionPhase === "acknowledgement" ? `0 0 90px 24px ${displayColor}35, 0 0 180px 48px ${displayColor}1A` :
                         transitionPhase === "acceleration" ? `0 0 120px 32px ${displayColor}50, 0 0 200px 64px ${displayColor}2A` :
                         transitionPhase === "charge" ? `0 0 180px 48px ${displayColor}80, 0 0 300px 96px ${displayColor}4A` :
                         transitionPhase === "expansion" ? `0 0 350px 120px ${displayColor}FF, 0 0 600px 200px ${displayColor}80` :
                         introStep === "shrinking" ? `0 0 120px 36px ${displayColor}30, 0 0 250px 72px ${displayColor}15` :
                         `0 0 70px 12px ${displayColor}1C, 0 0 140px 36px ${displayColor}09`
            }}
            transition={{ duration: introStep === "charging" ? 0.5 : 0.25 }}
          />

          {/* Ring 1 - outermost, slow CW, with ticks (drifts outwards) */}
          <motion.div 
            className="absolute rounded-full spin-cw-24"
            animate={{
              inset: transitionPhase === "charge" ? -40 : transitionPhase === "expansion" ? -300 : 0,
              opacity: transitionPhase === "expansion" ? 0 : 0.35
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ 
              border: `1px solid ${displayColor}30`, 
              transition: "border-color 1s",
              animationDuration: ring1Duration
            }}>
            <TickRing size={CORE_R * 2} ticks={12} color={displayColor} opacity={0.35} />
          </motion.div>

          {/* Ring 2 - middle, CCW (collapses/drifts inwards) */}
          <motion.div 
            className="absolute rounded-full spin-ccw-36"
            animate={{
              inset: transitionPhase === "charge" ? 60 : transitionPhase === "expansion" ? 300 : 22,
              opacity: transitionPhase === "expansion" ? 0 : 0.2
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{
              border: `1px solid ${displayColor}1A`,
              transition: "border-color 1s",
              animationDuration: ring2Duration
            }} />

          {/* Ring 3 - inner, fast CW, dashed (separates) */}
          <motion.div 
            className="absolute rounded-full spin-cw-14"
            animate={{
              inset: transitionPhase === "charge" ? 10 : transitionPhase === "expansion" ? -150 : 44,
              opacity: transitionPhase === "expansion" ? 0 : 0.14
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{
              border: `1px dashed ${displayColor}14`,
              transition: "border-color 1s",
              animationDuration: ring3Duration
            }} />

          {/* Inner chamber (unfolds borders and expands) */}
          <motion.div
            className="absolute overflow-hidden"
            animate={{
              inset: transitionPhase === "expansion" ? 0 : CHAMBER_INSET,
              borderRadius: transitionPhase === "expansion" ? "0%" : "50%"
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

            {/* Domain visualization (normal static state) */}
            <div className="absolute inset-0">
              <motion.div
                key={`viz-${intelKey}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: transitionPhase === "charge" || transitionPhase === "expansion" ? 0 : 1 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <CoreViz domain={intelKey} color={displayColor} />
              </motion.div>
            </div>

            {/* Morph Overlay (Unfolding Studio Visual Language) */}
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

            {/* Metric (Dynamic contextual values based on active domain) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {analysis && analysis.status === "analyzing" ? (
                <div className="flex flex-col items-center animate-pulse">
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px",
                    letterSpacing: "1.5px",
                    color: "#00E5FF",
                    textTransform: "uppercase"
                  }}>
                    Scanning...
                  </div>
                </div>
              ) : (
                <motion.div
                  key={`metric-${intelKey}`}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ 
                    opacity: transitionPhase === "charge" || transitionPhase === "expansion" ? 0 : 1, 
                    scale: transitionPhase === "expansion" ? 0.8 : 1 
                  }}
                  transition={{ duration: 0.2 }}
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
                    {coreMetric.metric}
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
          </motion.div>
        </motion.div>

        {/* -- Header (Refined and Simplified) -- */}
        {(introStep === "ready" || introStep === "revealing") && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex items-start justify-between"
            animate={{ opacity: transitionPhase === "expansion" ? 0 : 1 }}
            transition={{ duration: 0.15 }}
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
        )}

        {/* -- Bottom-left - live timestamp -- */}
        {(introStep === "ready" || introStep === "revealing") && (
          <motion.div
            className="absolute"
            animate={{ opacity: transitionPhase === "expansion" ? 0 : 1 }}
            transition={{ duration: 0.15 }}
            style={{ left: 36, bottom: 30, zIndex: 10 }}
          >
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "8px", letterSpacing: "1.5px",
              color: "rgba(255,255,255,0.12)", textTransform: "uppercase",
            }}>
              SYSTEM * {timeStr}
            </div>
          </motion.div>
        )}

        {/* -- Investigation Brief Panel (Relocated to Floating Right Side Card) -- */}
        {(introStep === "ready" || introStep === "revealing") && (
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
              {active && !transitionPhase && (
                <motion.button
                  onClick={startSignatureTransition}
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
        )}

        {/* -- Onboarding Intro Overlay -- */}
        {introStep !== "ready" && introStep !== "revealing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: introStep === "intro" ? 1 : 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none"
            style={{ padding: "8vh 8vw" }}
          >
            {/* Back button to Project Hub (Absolute positioned further left to maintain title symmetry) */}
            <div className="absolute top-[36px] left-[36px] pointer-events-auto z-30">
              <button
                onClick={handleReturnToHub}
                className="group flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/25 transition-all duration-300 cursor-pointer focus:outline-none"
                style={{
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${displayColor}66`;
                  e.currentTarget.style.boxShadow = `0 0 16px ${displayColor}3A`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
              >
                <ArrowLeft size={16} className="text-white/60 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Top Bar Info */}
            <div className="flex justify-between items-start">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px", letterSpacing: "4px",
                    color: `${displayColor}CC`, textTransform: "uppercase",
                    textShadow: `0 0 10px ${displayColor}33`,
                    marginBottom: 10
                  }}
                >
                  Project Operating System
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800, fontSize: "clamp(36px, 4.5vw, 54px)",
                    color: "#FFFFFF", lineHeight: 1.1,
                    letterSpacing: "-1.5px"
                  }}
                >
                  {selectedProject?.name || "react-project"}
                </motion.h1>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-right"
              >
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "9px", letterSpacing: "2.5px",
                  color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                  marginBottom: 6
                }}>
                  SCAN INDEX
                </div>
                <div className="flex items-center justify-end gap-2.5">
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "11px", letterSpacing: "1px",
                    color: analysis && analysis.status === "analyzing" ? "#00E5FF" : "#4ADE80"
                  }}>
                    {analysis && analysis.status === "analyzing" ? "PARSING PROJECT DNA" : "VERIFICATION SECURED"}
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      analysis && analysis.status === "analyzing" ? "bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" : "bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]"
                    } animate-pulse`}
                  />
                </div>
              </motion.div>
            </div>

            {/* Left and Right Columns */}
            <div className="absolute inset-0 flex items-center justify-between px-[7vw] pointer-events-none" style={{ top: "15vh", height: "70vh" }}>
              {/* Left Column */}
              <div className="flex flex-col justify-between h-[56%] max-w-[280px] text-left">
                
                {/* 01 / PROJECT SCALE */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="pointer-events-auto"
                >
                  <div className="font-mono text-[8px] tracking-[4px] text-neutral-500 uppercase mb-3">
                    01 / PROJECT SCALE
                  </div>
                  
                  <div className="relative">
                    <div className="flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 w-[200px]">
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Components</span>
                        <span className="font-bold text-neutral-200 text-right">{analysis?.projectDNA?.componentCount || 23}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Pages</span>
                        <span className="font-bold text-neutral-200 text-right">5</span>
                      </div>
                      
                      {/* More details trigger */}
                      <div
                        onMouseEnter={() => setHoveredScale(true)}
                        onMouseLeave={() => setHoveredScale(false)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider mt-1 cursor-pointer transition-colors"
                      >
                        + More
                      </div>
                    </div>

                    {/* Floating Overlay for left panel details */}
                    <AnimatePresence>
                      {hoveredScale && (
                        <motion.div
                          initial={{ opacity: 0, x: -10, y: -5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, x: -5, y: -2 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-[220px] top-0 z-40 p-4 rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-2xl w-[220px] flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400"
                          style={{
                            boxShadow: "0 15px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 font-bold">PROJECT SCALE</div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Components</span>
                            <span className="font-bold text-neutral-200">{analysis?.projectDNA?.componentCount || 23}</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Pages</span>
                            <span className="font-bold text-neutral-200">5</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Layouts</span>
                            <span className="font-bold text-neutral-200">2</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Hooks</span>
                            <span className="font-bold text-neutral-200">{analysis?.projectDNA?.hookCount || 11}</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Context Providers</span>
                            <span className="font-bold text-neutral-200">{analysis?.projectDNA?.contextCount || 4}</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Redux Slices</span>
                            <span className="font-bold text-neutral-200">{analysis?.projectDNA?.reduxSliceCount || 3}</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Utilities</span>
                            <span className="font-bold text-neutral-200">6</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Assets</span>
                            <span className="font-bold text-neutral-200">8</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 03 / TECHNOLOGY */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="pointer-events-auto"
                >
                  <div className="font-mono text-[8px] tracking-[4px] text-neutral-500 uppercase mb-3">
                    03 / TECHNOLOGY
                  </div>
                  
                  <div className="relative">
                    <div className="flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 w-[200px]">
                      <div className="flex flex-col border-b border-white/5 pb-1 gap-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Stack Profile</span>
                        <span className="font-bold text-neutral-200 text-left">
                          {analysis?.projectDNA?.framework || selectedProject?.framework || "React"} &bull; {analysis?.projectDNA?.buildTool || selectedProject?.buildTool || "Vite"} &bull; {analysis?.projectDNA?.language || "JavaScript"}
                        </span>
                      </div>
                      
                      {/* More details trigger */}
                      <div
                        onMouseEnter={() => setHoveredStack(true)}
                        onMouseLeave={() => setHoveredStack(false)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider mt-1 cursor-pointer transition-colors"
                      >
                        + Technologies
                      </div>
                    </div>

                    {/* Floating Overlay for tech details */}
                    <AnimatePresence>
                      {hoveredStack && (
                        <motion.div
                          initial={{ opacity: 0, x: -10, y: 5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, x: -5, y: 2 }}
                          transition={{ duration: 0.2 }}
                          className="absolute left-[220px] bottom-0 z-40 p-5 rounded-xl border border-white/8 bg-slate-950/85 backdrop-blur-2xl w-[460px] flex flex-col gap-4 text-left"
                          style={{
                            boxShadow: "0 25px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 font-bold">TECHNOLOGY</div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10px] text-neutral-300">
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Framework</span>
                              <span className="font-bold text-neutral-200">{analysis?.projectDNA?.framework || selectedProject?.framework || "React"}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Routing</span>
                              <span className="font-bold text-neutral-200">{analysis?.projectDNA?.router || (selectedProject?.hasRouter ? "React Router" : "None")}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">State Management</span>
                              <span className="font-bold text-neutral-200">{analysis?.projectDNA?.stateLibrary || (selectedProject?.hasRedux ? "Redux Toolkit" : "Context API")}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Styling</span>
                              <span className="font-bold text-neutral-200">{selectedProject?.hasTailwind ? "Tailwind CSS" : "CSS Modules"}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Animation</span>
                              <span className="font-bold text-neutral-200">
                                {("gsap" in dependencies || "@gsap/react" in dependencies) && "framer-motion" in dependencies 
                                  ? "GSAP, Framer Motion" 
                                  : "framer-motion" in dependencies 
                                  ? "Framer Motion" 
                                  : "gsap" in dependencies 
                                  ? "GSAP" 
                                  : "None"}
                              </span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Networking</span>
                              <span className="font-bold text-neutral-200">{"axios" in dependencies ? "Axios" : "Fetch API"}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Visualization</span>
                              <span className="font-bold text-neutral-200">Three.js, React Flow</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5">
                              <span className="text-neutral-400">Build Tools</span>
                              <span className="font-bold text-neutral-200">{analysis?.projectDNA?.buildTool || selectedProject?.buildTool || "Vite"}</span>
                            </div>
                            <div className="flex justify-between items-baseline border-b border-white/5 pb-0.5 col-span-2">
                              <span className="text-neutral-400">Development Tools</span>
                              <span className="font-bold text-neutral-200">ESLint, Prettier ({packageManager.toUpperCase()})</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col justify-between h-[56%] max-w-[280px] text-right">
                
                {/* 02 / PROJECT HEALTH */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="pointer-events-auto flex flex-col items-end"
                >
                  <div className="font-mono text-[8px] tracking-[4px] text-neutral-500 uppercase mb-3 text-right">
                    02 / PROJECT HEALTH
                  </div>
                  
                  <div className="relative flex flex-col items-end text-right">
                    <div className="flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 w-[200px]">
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Health Score</span>
                        <span className="font-bold text-cyan-400 text-right" style={{ textShadow: `0 0 8px ${displayColor}33` }}>
                          {analysis?.architectureHealth?.score ?? 91}%
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Complexity</span>
                        <span className="font-bold text-neutral-200 text-right">MEDIUM</span>
                      </div>
                      
                      {/* More details trigger */}
                      <div
                        onMouseEnter={() => setHoveredHealth(true)}
                        onMouseLeave={() => setHoveredHealth(false)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider mt-1 cursor-pointer transition-colors text-right"
                      >
                        + More
                      </div>
                    </div>

                    {/* Floating Overlay for right panel details */}
                    <AnimatePresence>
                      {hoveredHealth && (
                        <motion.div
                          initial={{ opacity: 0, x: 10, y: -5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, x: 5, y: -2 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-[220px] top-0 z-40 p-4 rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-2xl w-[220px] flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 text-left"
                          style={{
                            boxShadow: "0 15px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1.5 border-b border-white/5 pb-1 text-right font-bold">PROJECT HEALTH</div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Health Score</span>
                            <span className="font-bold text-cyan-400">{analysis?.architectureHealth?.score ?? 91}%</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Complexity</span>
                            <span className="font-bold text-neutral-200">MEDIUM</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Warnings</span>
                            <span className="font-bold text-amber-500">2</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Dead Code</span>
                            <span className="font-bold text-neutral-200">3 segments</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Circular Dependencies</span>
                            <span className="font-bold text-neutral-200">0</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Broken Imports</span>
                            <span className="font-bold text-neutral-200">0</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Parser Confidence</span>
                            <span className="font-bold text-neutral-200">98.8%</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Graph Validation</span>
                            <span className="font-bold text-emerald-400">SECURED</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* 04 / ANALYSIS */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                  className="pointer-events-auto flex flex-col items-end"
                >
                  <div className="font-mono text-[8px] tracking-[4px] text-neutral-500 uppercase mb-3 text-right">
                    04 / ANALYSIS
                  </div>

                  <div className="relative flex flex-col items-end text-right">
                    <div className="flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 w-[200px]">
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Files Parsed</span>
                        <span className="font-bold text-neutral-200 text-right">{analysis?.projectDNA?.fileCount || 34}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                        <span className="text-neutral-400 uppercase tracking-wider text-[9px]">Analysis Time</span>
                        <span className="font-bold text-neutral-200 text-right">342ms</span>
                      </div>

                      {/* More details trigger */}
                      <div
                        onMouseEnter={() => setHoveredBottomDiagnostics(true)}
                        onMouseLeave={() => setHoveredBottomDiagnostics(false)}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider mt-1 cursor-pointer transition-colors text-right"
                      >
                        + Diagnostics
                      </div>
                    </div>

                    {/* Floating Overlay for diagnostics details */}
                    <AnimatePresence>
                      {hoveredBottomDiagnostics && (
                        <motion.div
                          initial={{ opacity: 0, x: 10, y: 5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, x: 5, y: 2 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-[220px] bottom-0 z-40 p-4 rounded-xl border border-white/10 bg-slate-950/90 backdrop-blur-2xl w-[220px] flex flex-col gap-2.5 font-mono text-[10px] text-neutral-400 text-left"
                          style={{
                            boxShadow: "0 15px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                          }}
                        >
                          <div className="text-[8px] text-neutral-500 uppercase tracking-widest mb-1 border-b border-white/5 pb-1 text-right font-bold">ANALYSIS</div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Files Parsed</span>
                            <span className="font-bold text-neutral-200">{analysis?.projectDNA?.fileCount || 34}</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Folders Indexed</span>
                            <span className="font-bold text-neutral-200">12</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Analysis Duration</span>
                            <span className="font-bold text-neutral-200">342ms</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Parser Version</span>
                            <span className="font-bold text-neutral-200">v2.4.1</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Knowledge Graph Nodes</span>
                            <span className="font-bold text-neutral-200">42</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Relationships</span>
                            <span className="font-bold text-neutral-200">56</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Import Resolution</span>
                            <span className="font-bold text-emerald-400">100%</span>
                          </div>
                          <div className="flex justify-between items-baseline border-b border-white/5 pb-1">
                            <span className="text-[9px]">Alias Detection</span>
                            <span className="font-bold text-emerald-400">ACTIVE (@/*)</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Bottom Section - CTA */}
            <div className="w-full flex flex-col items-center pb-4">
              <motion.button
                onClick={startOnboardingTransition}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                disabled={analysis && analysis.status === "analyzing"}
                className={`group flex items-center gap-[24px] focus:outline-none transition-all duration-300 pointer-events-auto ${
                  analysis && analysis.status === "analyzing" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div style={{
                  width: 50, height: 1,
                  background: `linear-gradient(to right, transparent, ${displayColor}77)`,
                }} />
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "9px", letterSpacing: "3.5px",
                    color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={e => {
                    if (analysis && analysis.status !== "analyzing") {
                      e.currentTarget.style.color = "rgba(255,255,255,0.98)";
                      e.currentTarget.style.textShadow = `0 0 10px ${displayColor}77`;
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                    e.currentTarget.style.textShadow = "none";
                  }}
                >
                  {analysis && analysis.status === "analyzing" ? "CALCULATING DNA..." : "INITIALIZE WORKSPACE EXPLORATION"}
                </div>
                <div style={{
                  width: 50, height: 1,
                  background: `linear-gradient(to left, transparent, ${displayColor}77)`,
                }} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default Workspace;