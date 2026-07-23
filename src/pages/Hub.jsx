import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { setAppMode, setActiveRoom } from "@/redux/slices/uiSlice";
import {
  selectAllProjects,
  selectProject,
  updateLastOpened,
  clearSelectedProject,
} from "@/redux/slices/hubSlice";
import { setProject } from "@/redux/slices/projectSlice";
import { startProjectAnalysis } from "@/services/analysisService";

// Components
import ImportProjectModal from "@/components/hub/ImportProjectModal";
import ProjectLoadTransition from "@/components/hub/ProjectLoadTransition";
import RenameModal from "@/components/hub/RenameModal";
import DeleteConfirmModal from "@/components/hub/DeleteConfirmModal";

import {
  Upload, Zap, ArrowUpRight
} from "lucide-react";

// ── Human-readable time ago helper ───────────────────────────────────────────
const timeAgo = (dateString) => {
  if (!dateString) return "never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays} days ago`;
};

// ── Context menu ─────────────────────────────────────────────────────────────
const ContextMenu = ({ x, y, project, onRename, onDelete, onClose }) => (
  <div className="fixed inset-0 z-40 pointer-events-auto" onClick={onClose}>
    <div
      className="absolute rounded-xl border border-edge-subtle shadow-2xl overflow-hidden w-36"
      style={{
        top:        y,
        left:       x,
        background: "rgba(10,12,20,0.95)",
        backdropFilter: "blur(20px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full text-left px-4 py-2.5 font-mono text-[9px] uppercase tracking-widestest text-ink-dim hover:text-white hover:bg-white/5 transition-colors"
        onClick={() => { onRename(project); onClose(); }}
      >
        Rename
      </button>
      <button
        className="w-full text-left px-4 py-2.5 font-mono text-[9px] uppercase tracking-widestest text-red-400 hover:bg-red-500/10 transition-colors"
        onClick={() => { onDelete(project); onClose(); }}
      >
        Delete
      </button>
    </div>
  </div>
);

// ─── Particle background ────────────────────────────────----------------──────
function ParticleBg() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; 
    if (!c) return;
    const ctx = c.getContext("2d");
    let raf;
    const pts = Array.from({ length: 70 }, () => ({
      x: Math.random(), 
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035, 
      vy: (Math.random() - 0.5) * 0.00035,
      r: Math.random() * 1.6 + 0.8,
    }));
    const resize = () => { 
      c.width = window.innerWidth; 
      c.height = window.innerHeight; 
    };
    resize(); 
    window.addEventListener("resize", resize);
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      pts.forEach(p => {
        p.x += p.vx; 
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,229,255,0.65)"; 
        ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const dx = (a.x - b.x) * c.width, dy = (a.y - b.y) * c.height;
        const d = Math.hypot(dx, dy);
        if (d < 190) {
          ctx.beginPath();
          ctx.moveTo(a.x * c.width, a.y * c.height);
          ctx.lineTo(b.x * c.width, b.y * c.height);
          ctx.strokeStyle = `rgba(0,229,255,${0.35 * (1 - d / 190)})`;
          ctx.lineWidth = 0.65; 
          ctx.stroke();
        }
      }));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { 
      cancelAnimationFrame(raf); 
      window.removeEventListener("resize", resize); 
    };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
}

// ─── Reusable Magnetic pill Button (Inherits system CSS styles from components.css) ───
function MagneticButton({ onClick, icon: Icon, label }) {
  const btnRef = useRef(null);

  const onMove = (e) => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${x * 0.18}px, ${y * 0.22}px, 0)`;
  };

  const onLeave = () => {
    if (btnRef.current) btnRef.current.style.transform = "translate3d(0,0,0)";
  };

  return (
    <div className="inline-flex pointer-events-auto" onMouseMove={onMove} onMouseLeave={onLeave}>
      <button
        ref={btnRef}
        onClick={onClick}
        className="pill group transition-transform cursor-pointer"
        style={{
          transition: "transform 350ms cubic-bezier(0.2,0.7,0.1,1), background-color 500ms ease, color 500ms ease, box-shadow 500ms ease",
        }}
      >
        <span className="pill-dot" />
        <span>{label}</span>
        {Icon && <Icon size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
      </button>
    </div>
  );
}

const ImportButton = ({ onClick, label = "Import Project" }) => (
  <button onClick={onClick} className="btn-17">
    <span className="text-container">
      <span className="text">{label}</span>
    </span>
  </button>
);

// Splits text into characters wrapped in overflow masks for GSAP rise transition
const splitText = (text) => {
  const words = text.split(" ");
  return words.map((word, wi) => (
    <span key={wi} className="inline-block whitespace-nowrap">
      {Array.from(word).map((ch, ci) => (
        <span key={ci} className="reveal-mask">
          <span className="reveal-char">{ch}</span>
        </span>
      ))}
      {wi < words.length - 1 && <span className="inline-block w-[0.3em]">&nbsp;</span>}
    </span>
  ));
};

// ─── Individual Premium Poster Slide Card Component (Plain White Background) ───
function CarouselCard({ project: p, active, style, onMouseDown, onTouchStart, onTouchMove, onTouchEnd, onContextMenu }) {
  const [hovered, setHovered] = useState(false);

  const getShadow = () => {
    if (active && hovered) return "0 55px 110px rgba(0, 0, 0, 0.55), 0 5px 20px rgba(0, 0, 0, 0.08)";
    if (hovered) return "0 40px 85px rgba(0, 0, 0, 0.35), 0 4px 15px rgba(0, 0, 0, 0.06)";
    if (active) return "0 35px 80px rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.04)";
    return "0 15px 35px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.02)";
  };

  const combinedStyle = {
    ...style,
    transform: hovered 
      ? `${style.transform} translateY(-20px) translateZ(40px) scale(1.03)` 
      : style.transform,
    boxShadow: getShadow(),
    transition: hovered 
      ? "transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 350ms, box-shadow 250ms ease" 
      : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms, box-shadow 600ms cubic-bezier(0.16, 1, 0.3, 1)",
  };

  return (
    <div
      style={combinedStyle}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`absolute w-[350px] h-[430px] rounded-[24px] cursor-pointer overflow-hidden bg-white text-neutral-900 border flex flex-col justify-between p-7 select-none ${
        active 
          ? "border-neutral-200 ring-1 ring-black/5" 
          : "border-neutral-200/60"
      }`}
    >
      {/* Top section: Monospace Metadata, Tech Stack & Context Menu Option */}
      <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
        <div className="min-w-0">
          <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase">
            {p.sprint} // ARCHITECTURE
          </span>
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-wide truncate">
            {p.tech}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="px-2 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-neutral-100 text-neutral-700 uppercase">
            {p.score}%
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            className="w-5 h-5 flex items-center justify-center rounded bg-neutral-50 border border-neutral-200 text-neutral-400 hover:text-neutral-900 transition-colors z-20 text-[10px]"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* Middle Section: Brand Title & blueprint */}
      <div className="relative flex-1 flex flex-col justify-center py-6 min-h-0">
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none select-none" style={{
          backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "20px 20px"
        }} />

        {/* Abstract blueprint vector */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
          <svg className="w-[80%] h-[80%]" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" stroke="#000" strokeWidth="0.5" fill="none" strokeDasharray="3, 3" />
            <circle cx="50" cy="50" r="20" stroke="#000" strokeWidth="0.5" fill="none" />
            <line x1="50" y1="5" x2="50" y2="95" stroke="#000" strokeWidth="0.3" />
            <line x1="5" y1="50" x2="95" y2="50" stroke="#000" strokeWidth="0.3" />
            <polygon points="50,18 78,66 22,66" stroke="#000" strokeWidth="0.4" fill="none" strokeDasharray="2, 2" />
          </svg>
        </div>

        <h3 className="font-display font-[900] tracking-tightest leading-tight text-neutral-900 text-center relative z-10 text-3xl break-words px-2 select-none" style={{ letterSpacing: "-0.04em" }}>
          {p.name}
        </h3>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 mt-auto">
        <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400">
          <span>STATUS: <span className="font-bold text-neutral-800 uppercase">{p.status}</span></span>
          <span>{p.lastEdited}</span>
        </div>
        
        {active ? (
          <div className="text-center text-[8.5px] font-bold font-mono tracking-widest uppercase mt-1 bg-neutral-950 text-white py-2 rounded-lg" style={{ animation: "pulse 2s ease-in-out infinite" }}>
            ↵ ENTER WORKSPACE
          </div>
        ) : (
          <div className="text-center text-[8.5px] font-mono tracking-widest text-neutral-300 uppercase mt-1 py-2">
            &nbsp;
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Flying Card Into Folder Animation Overlay ──────────────────────────────
function FlyingCardToFolder({ project, onComplete }) {
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const el = cardRef.current;

    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      left: "50%",
      top: "22%",
      scale: 0.35,
      rotationX: 30,
      rotationZ: -14,
      opacity: 0,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    // 1. Float in & expand
    tl.to(el, {
      opacity: 1,
      scale: 1.1,
      rotationZ: 4,
      rotationX: 0,
      top: "35%",
      duration: 0.45,
      ease: "back.out(1.7)",
    })
    // 2. Fly & dive into the 3D Vault Folder
    .to(el, {
      top: "56%",
      scale: 0.65,
      rotationX: 45,
      rotationZ: -4,
      opacity: 0.9,
      duration: 0.55,
      ease: "power3.inOut",
    })
    // 3. Drop into folder slot with vanishing squeeze
    .to(el, {
      top: "60%",
      scale: 0.25,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
    });

    return () => tl.kill();
  }, [onComplete]);

  if (!project) return null;

  return (
    <div
      ref={cardRef}
      className="fixed z-50 pointer-events-none w-[280px] h-[150px] rounded-2xl shadow-2xl p-5 border border-white/30 flex flex-col justify-between"
      style={{
        background: "linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)",
        boxShadow: "0 25px 50px -12px rgba(255, 95, 109, 0.6), 0 0 35px rgba(255, 195, 113, 0.5)",
        backfaceVisibility: "hidden",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold text-white/90 uppercase tracking-widest">
          IMPORTING // {project.framework || 'REACT'}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-[8px] font-mono text-white font-bold">
          98% SCORE
        </span>
      </div>

      <div className="my-auto">
        <h4 className="font-display font-[900] text-white text-xl truncate tracking-tight">
          {project.name}
        </h4>
        <p className="font-mono text-[9px] text-white/80 mt-0.5 truncate">
          {project.folderName || project.name}
        </p>
      </div>

      <div className="flex justify-between items-center text-[8px] font-mono text-white/70 border-t border-white/20 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          ADDED TO VAULT
        </span>
        <span>JUST NOW</span>
      </div>
    </div>
  );
}

// ─── 3D Interactive Project Vault Folder Component ───
function ProjectFolderVault({ projects, onLaunch, onContextMenu, importingProject }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBouncing, setIsBouncing] = useState(false);

  // Automatically flip open folder and trigger 3D bounce when a project is imported
  useEffect(() => {
    if (importingProject) {
      setIsOpen(true);
      const timer1 = setTimeout(() => {
        setIsBouncing(true);
      }, 750);
      const timer2 = setTimeout(() => {
        setIsBouncing(false);
      }, 1500);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [importingProject]);

  // Sort projects so matching items appear at the front (slot file-1), non-matching items move to the back slots!
  const { sortedProjects, matchCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { sortedProjects: projects, matchCount: projects.length };
    }
    const q = searchQuery.toLowerCase();
    const sorted = [...projects].sort((a, b) => {
      const aMatch =
        a.name.toLowerCase().includes(q) ||
        (a.tech && a.tech.toLowerCase().includes(q)) ||
        (a.framework && a.framework.toLowerCase().includes(q));
      const bMatch =
        b.name.toLowerCase().includes(q) ||
        (b.tech && b.tech.toLowerCase().includes(q)) ||
        (b.framework && b.framework.toLowerCase().includes(q));

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    const count = projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.tech && p.tech.toLowerCase().includes(q)) ||
        (p.framework && p.framework.toLowerCase().includes(q))
    ).length;

    return { sortedProjects: sorted, matchCount: count };
  }, [projects, searchQuery]);

  const fileGradients = [
    { bg: "linear-gradient(135deg, #37caf3 0%, #0072ff 100%)", label: "REACT", tag: "VITE" },
    { bg: "linear-gradient(135deg, #ff2200 0%, #ff8800 100%)", label: "NEXT", tag: "SSR" },
    { bg: "linear-gradient(135deg, #ab08f6 0%, #e4eeef 100%)", label: "REDUX", tag: "STORE" },
    { bg: "linear-gradient(135deg, #38ef7d 0%, #6fece1 100%)", label: "TS", tag: "TYPES" },
    { bg: "linear-gradient(135deg, #fdf102 0%, #e07000 100%)", label: "TAILWIND", tag: "CSS" },
  ];

  // Cards to render: when scattered render ALL projects; when closed/stacked render top 5
  const visibleProjects = isScattered ? sortedProjects : sortedProjects.slice(0, 5);

  return (
    <div className="flex flex-col items-center justify-center py-16 select-none relative w-full" style={{ transform: 'scale(1.85) translate(18px, 25px)', transformOrigin: 'center center' }}>
      <label className="folder-card" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          className="folder-toggle"
          checked={isOpen || isScattered}
          onChange={(e) => setIsOpen(e.target.checked)}
        />

        {/* Floating click hint arrow */}
        <div className="hint-wrapper">
          <span className="hint-text">Click to open</span>
          <svg className="hint-arrow" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 35, height: 35 }}>
            <path d="M 35 5 C 35 5, 15 5, 10 25 M 10 25 L 3 18 M 10 25 L 18 22" stroke="#3b8be6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className={`folder-container ${isBouncing ? "folder-bounce" : ""}`}>
          {/* Back folder SVG shape */}
          <svg className="folder-back" viewBox="0 0 50 40" fill="none" style={{ position: 'absolute', bottom: 0, width: '100%' }}>
            <path d="M0 4C0 1.79086 1.79086 0 4 0H16.524C17.721 0 18.8415 0.54051 19.574 1.4673L22.426 5.0654C23.1585 5.99219 24.279 6.5327 25.476 6.5327H46C48.2091 6.5327 50 8.32356 50 10.5327V36C50 38.2091 48.2091 40 46 40H4C1.79086 40 0 38.2091 0 36V4Z" fill="#2a2c2dc3" />
          </svg>

          {/* Search bar inside open folder */}
          <div className="folder-search" onClick={(e) => e.stopPropagation()}>
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: 12, height: 12, flexShrink: 0 }}>
              <circle cx={11} cy={11} r={8} />
              <line x1={21} y1={21} x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search files..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Display project cards: when scattered, fly out using basic CSS transform grid offsets */}
          {visibleProjects.map((p, idx) => {
            const isSearching = !!searchQuery.trim();
            const q = searchQuery.toLowerCase();
            const isMatch = isSearching && (
              p.name.toLowerCase().includes(q) ||
              (p.tech && p.tech.toLowerCase().includes(q)) ||
              (p.framework && p.framework.toLowerCase().includes(q))
            );

            const cardClass = `file file-${(idx % 5) + 1}`;
            const grad = fileGradients[idx % fileGradients.length];

            // Compute basic CSS transform scatter grid offsets when isScattered is true
            const col = idx % 3; // 0 (left), 1 (center), 2 (right)
            const row = Math.floor(idx / 3);
            const scatterX = (col - 1) * 165;
            const scatterY = row * 105 - 130;
            const scatterRot = ((idx % 5) - 2) * 5;

            const cardStyle = {
              background: grad.bg,
              filter: isSearching && !isMatch ? 'brightness(0.4) opacity(0.45)' : isMatch ? 'brightness(1.2)' : 'none',
              transform: isScattered
                ? `translate(${scatterX}px, ${scatterY}px) rotate(${scatterRot}deg) scale(1.08)`
                : isMatch
                ? 'translateY(-82px) scale(1.06) rotate(-6deg) translateZ(30px)'
                : undefined,
              zIndex: isScattered ? (100 + idx) : isMatch ? 60 : (30 - idx),
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            };

            return (
              <div
                key={p.id || idx}
                className={cardClass}
                style={cardStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunch(p);
                }}
              >
                <div className="shine" />
                <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14, position: 'absolute', top: 10, right: 10 }}>
                  <rect x={2} y={3} width={20} height={14} rx={2} ry={2} />
                  <line x1={8} y1={21} x2={16} y2={21} />
                  <line x1={12} y1={17} x2={12} y2={21} />
                </svg>
                <div className="file-text truncate max-w-[85%]">{p.name}</div>
                <div className="file-tag" style={{ opacity: isMatch ? 1 : undefined }}>
                  {isMatch ? "MATCHED" : (p.tech ? p.tech : `${grad.label} • ${grad.tag}`)}
                </div>
              </div>
            );
          })}

          {/* Front folder cover flap */}
          <div className="folder-front-wrapper">
            <svg className="folder-front" viewBox="0 0 50 34" fill="none" style={{ width: '100%', display: 'block' }}>
              <path d="M0 4C0 1.79086 1.79086 0 4 0H46C48.2091 0 50 1.79086 50 4V30C50 32.2091 48.2091 34 46 34H4C1.79086 34 0 32.2091 0 30V4Z" fill="#686a6aae" />
            </svg>
            <div className="folder-label" />

            {/* Live project count badge (Click to scatter/restore all projects in-place) */}
            <div
              className="counter"
              onClick={(e) => {
                e.stopPropagation();
                setIsScattered((prev) => !prev);
              }}
              title={isScattered ? "Click to gather cards into folder" : "Click to scatter all project cards"}
            >
              <div className="status-dot" />
              <span className="counter-label">{isScattered ? "SYSTEMIZE" : searchQuery.trim() ? "MATCHED" : "FILES"}</span>
              <span className="counter-number">{String(searchQuery.trim() ? matchCount : projects.length).padStart(2, "0")}</span>
            </div>
          </div>
        </div>
      </label>
    </div>
  );
}

// ─── Instagram Reels-style Snap Carousel ─────────────────────────────────────
function PerspectiveCarousel({ projects, activeId, onChangeActive, onLaunch, onContextMenu }) {
  // Refs for drag and spring animation state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragOffsetRef = useRef(0);
  const dragCardRef = useRef(null);
  const velocityRef = useRef(0);
  const lastMoveX = useRef(0);
  const lastMoveTime = useRef(0);

  const touchStartX = useRef(0);
  const touchCardRef = useRef(null);
  const touchLastX = useRef(0);
  const touchLastTime = useRef(0);
  const touchVelocity = useRef(0);

  const targetX = useRef(0);
  const currentX = useRef(0);
  const springVelocity = useRef(0);
  const rafId = useRef(null);
  const wheelTimeout = useRef(null);
  const hasExceededThreshold = useRef(false);
  const containerRef = useRef(null);

  // React state for re-renders and animation locks
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);

  const activeIndex = projects.findIndex((p) => p.id === activeId);
  const CARD_WIDTH = 390; // virtual card spacing for drag-to-index math

  // ── Spring Physics Loop ───────────────────────────────────────────────────
  function updateSpring() {
    const stiffness = 230;
    const damping = 28;
    const mass = 1;
    const dt = 0.016; // 60fps frame delta in seconds

    const diff = targetX.current - currentX.current;

    // Check if settled
    if (Math.abs(diff) < 0.1 && Math.abs(springVelocity.current) < 0.1 && !isDragging.current) {
      currentX.current = targetX.current;
      springVelocity.current = 0;
      setDragOffset(targetX.current);
      setAnimating(false);
      rafId.current = null;
      return;
    }

    const force = stiffness * diff - damping * springVelocity.current;
    const acceleration = force / mass;
    springVelocity.current += acceleration * dt;
    currentX.current += springVelocity.current * dt;

    setDragOffset(currentX.current);
    rafId.current = requestAnimationFrame(updateSpring);
  }

  const triggerSpring = useCallback(() => {
    if (!rafId.current) {
      setAnimating(true);
      rafId.current = requestAnimationFrame(updateSpring);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unified Snap/Release Logic ───────────────────────────────────────────
  const onMouseUpOrTouchEnd = useCallback((diff) => {
    isDragging.current = false;
    setDragging(false);

    // Click trigger - drag threshold was not met
    if (!hasExceededThreshold.current || Math.abs(diff) < 8) {
      const ci = dragCardRef.current !== null ? dragCardRef.current : touchCardRef.current;
      if (ci !== null) {
        const clickedProject = projects[ci];
        if (clickedProject) {
          if (clickedProject.id === activeId) {
            onLaunch(clickedProject);
          } else {
            onChangeActive(clickedProject.id);
          }
        }
      }
      targetX.current = 0;
      currentX.current = 0;
      springVelocity.current = 0;
      setDragOffset(0);
      return;
    }

    const ai = projects.findIndex((p) => p.id === activeId);
    let nextIndex = ai;

    const velocity = velocityRef.current || touchVelocity.current || 0;
    const swipeThreshold = 0.25; 
    const velocityThreshold = 0.25; 

    // Dragging right (diff > 0) moves the card stack right (brings previous card to center)
    // Dragging left (diff < 0) moves the card stack left (brings next card to center)
    if (velocity > velocityThreshold || diff > CARD_WIDTH * swipeThreshold) {
      nextIndex = ai - 1;
    } else if (velocity < -velocityThreshold || diff < -CARD_WIDTH * swipeThreshold) {
      nextIndex = ai + 1;
    }

    nextIndex = Math.max(0, Math.min(projects.length - 1, nextIndex));

    if (nextIndex !== ai) {
      const shift = nextIndex - ai;
      // Compensate dragOffset for index change to prevent jumping
      currentX.current = currentX.current - shift * CARD_WIDTH;
      targetX.current = 0;
      onChangeActive(projects[nextIndex].id);
    } else {
      targetX.current = 0;
    }

    velocityRef.current = 0;
    touchVelocity.current = 0;
    triggerSpring();
  }, [projects, activeId, onChangeActive, onLaunch, triggerSpring, CARD_WIDTH]);

  // ── Mouse Listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const rawDiff = e.clientX - dragStartX.current;

      if (!hasExceededThreshold.current) {
        if (Math.abs(rawDiff) > 6) {
          hasExceededThreshold.current = true;
          setDragging(true);
        } else {
          return;
        }
      }

      const diff = rawDiff;
      dragOffsetRef.current = diff;

      const now = performance.now();
      const dt = now - lastMoveTime.current;
      if (dt > 0) {
        velocityRef.current = (e.clientX - lastMoveX.current) / dt;
      }
      lastMoveX.current = e.clientX;
      lastMoveTime.current = now;

      targetX.current = diff;
      currentX.current = diff;
      springVelocity.current = 0;
      setDragOffset(diff);
    };

    const onMouseUp = () => {
      if (!isDragging.current) return;
      const diff = dragOffsetRef.current;
      onMouseUpOrTouchEnd(diff);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseUpOrTouchEnd]);

  // ── Per-card MouseDown ────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e, cardIndex) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragOffsetRef.current = 0;
    dragCardRef.current = cardIndex;
    touchCardRef.current = null;
    velocityRef.current = 0;
    lastMoveX.current = e.clientX;
    lastMoveTime.current = performance.now();
    hasExceededThreshold.current = false;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setAnimating(false);
  }, []);

  // ── Touch Event Handlers ─────────────────────────────────────────────────
  const handleTouchStart = useCallback((e, cardIndex) => {
    isDragging.current = true;
    touchStartX.current = e.touches[0].clientX;
    dragStartX.current = e.touches[0].clientX;
    dragCardRef.current = null;
    touchCardRef.current = cardIndex;
    touchLastX.current = e.touches[0].clientX;
    touchLastTime.current = performance.now();
    touchVelocity.current = 0;
    dragOffsetRef.current = 0;
    hasExceededThreshold.current = false;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setAnimating(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    const x = e.touches[0].clientX;
    const rawDiff = x - touchStartX.current;

    if (!hasExceededThreshold.current) {
      if (Math.abs(rawDiff) > 6) {
        hasExceededThreshold.current = true;
        setDragging(true);
      } else {
        return;
      }
    }

    const diff = rawDiff;
    dragOffsetRef.current = diff;

    const now = performance.now();
    const dt = now - touchLastTime.current;
    if (dt > 0) {
      touchVelocity.current = (x - touchLastX.current) / dt;
    }
    touchLastX.current = x;
    touchLastTime.current = now;

    targetX.current = diff;
    currentX.current = diff;
    springVelocity.current = 0;
    setDragOffset(diff);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    const diff = dragOffsetRef.current;
    onMouseUpOrTouchEnd(diff);
  }, [onMouseUpOrTouchEnd]);

  // ── Trackpad / MouseWheel Event Listener ─────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();

        if (rafId.current && !isDragging.current) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        setAnimating(false);

        if (!isDragging.current) {
          isDragging.current = true;
          hasExceededThreshold.current = true;
          setDragging(true);
          targetX.current = dragOffsetRef.current;
          currentX.current = dragOffsetRef.current;
        }

        // e.deltaX is positive when scrolling right, meaning card stack moves left
        targetX.current = Math.max(-CARD_WIDTH * 1.2, Math.min(CARD_WIDTH * 1.2, targetX.current - e.deltaX * 0.8));
        velocityRef.current = -e.deltaX / 16;

        triggerSpring();

        if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
        wheelTimeout.current = setTimeout(() => {
          if (!isDragging.current) return;
          const diff = currentX.current;
          onMouseUpOrTouchEnd(diff);
        }, 150);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [onMouseUpOrTouchEnd, triggerSpring, CARD_WIDTH]);

  // Clean up timers/animators
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    };
  }, []);

  // Determine if dynamic transitions should be disabled to prevent fight with RAF ticks
  const isAnimating = dragging || animating;

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full pointer-events-auto select-none"
      style={{ perspective: "1400px", cursor: dragging ? "grabbing" : "grab" }}
    >
      <div className="relative w-[350px] h-[470px] flex items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
        {projects.map((p, idx) => {
          const offset = idx - activeIndex;
          const dragFraction = dragOffset / CARD_WIDTH;
          // Drag right moves active card to right (positive translateX)
          const currentOffset = offset + dragFraction;
          const absOffset = Math.abs(currentOffset);

          if (Math.abs(offset) > 3) return null;

          const translateX = currentOffset * 320;
          const translateY = -30 + absOffset * 15;
          const translateZ = -absOffset * 120;
          const rotateY = -currentOffset * 25;
          const scale = Math.max(0.72, 1 - absOffset * 0.14);
          const zIndex = Math.round(100 - absOffset * 10);
          const opacity = Math.max(0.15, 1 - absOffset * 0.5);

          const style = {
            transform: `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
            zIndex,
            opacity,
            transition: isAnimating 
              ? "none" 
              : "transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 600ms cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform, opacity",
          };

          return (
            <CarouselCard
              key={p.id}
              project={p}
              active={absOffset < 0.05}
              style={style}
              onMouseDown={(e) => handleMouseDown(e, idx)}
              onTouchStart={(e) => handleTouchStart(e, idx)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => onContextMenu(e, p)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Main Hub Component ────────────────────────────────────────────────────────
const Hub = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const projects = useSelector(selectAllProjects);

  const [activeHubProjectId, setActiveHubProjectId] = useState(null);
  const [loadingProject, setLoading] = useState(null);

  // Overlay control states
  const [showImport, setShowImport]   = useState(false);
  const [importingProject, setImportingProject] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ctxMenu, setCtxMenu]         = useState(null);

  const handleModalClose = useCallback((importedProj) => {
    setShowImport(false);
    if (importedProj && (importedProj.name || importedProj.id)) {
      setImportingProject(importedProj);
    }
  }, []);

  // Clear selected project and ensure appMode is hub on mount
  useEffect(() => {
    dispatch(clearSelectedProject());
    dispatch(setAppMode("hub"));
  }, [dispatch]);

  // Global Keyboard Shortcuts (Esc = Close Overlay / Navigate to Landing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) {
        return;
      }

      if (e.key === "Escape" || e.key === "Esc") {
        e.preventDefault();
        if (showImport || renameTarget || deleteTarget || ctxMenu) {
          setShowImport(false);
          setRenameTarget(null);
          setDeleteTarget(null);
          setCtxMenu(null);
        } else {
          navigate("/");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImport, renameTarget, deleteTarget, ctxMenu, navigate]);



  // GSAP text reveal
  const hubCopyRef = useRef(null);
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".reveal-char", { y: "110%", opacity: 0 });
      gsap.to(".reveal-char", {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "expo.out",
        stagger: { each: 0.018, from: "start" },
        delay: 0.2,
      });

      gsap.from(".reveal-subtitle", {
        y: 24,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
        delay: 1.0,
      });
    }, hubCopyRef);
    return () => ctx.revert();
  }, []);

  // Scroll reveal setup using native IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Enrich actual projects with mock metadata details
  const enrichedProjects = projects.map((p, idx) => {
    const colors = ["#00d4ff", "#7c6bff", "#5a6178", "#00d4ff"];
    const statuses = ["active", "active", "review", "archived"];
    const modulesCount = [14, 8, 32, 5];
    const linesCount = ["12.4k", "6.2k", "28.1k", "3.8k"];
    const architectureScores = [94, 88, 91, 76];
    return {
      ...p,
      tech: `${p.framework} + ${p.hasTypeScript ? "TS" : "JS"}`,
      sprint: p.framework === "Next.js" ? "Sprint 02" : `Sprint 0${(idx % 6) + 1}`,
      status: statuses[idx % statuses.length],
      starred: idx === 0 || idx === 2,
      modules: modulesCount[idx % modulesCount.length],
      lines: linesCount[idx % linesCount.length],
      color: colors[idx % colors.length],
      score: architectureScores[idx % architectureScores.length],
      lastEdited: timeAgo(p.lastOpenedAt),
    };
  });

  // Default to the middle project on mount
  useEffect(() => {
    if (enrichedProjects.length > 0 && !activeHubProjectId) {
      const midIndex = Math.floor(enrichedProjects.length / 2);
      const targetId = enrichedProjects[midIndex]?.id;
      requestAnimationFrame(() => {
        setActiveHubProjectId(targetId);
      });
    }
  }, [enrichedProjects, activeHubProjectId]);

  // Context menu right click
  const handleContextMenu = useCallback((e, project) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX ?? 0, y: e.clientY ?? 0, project });
  }, []);

  // Select project and trigger transition
  const handleSelectProject = useCallback((project) => {
    dispatch(selectProject(project.id));
    dispatch(updateLastOpened(project.id));
    dispatch(setProject({ name: project.name, path: null }));
    dispatch(startProjectAnalysis({ projectId: project.id, project }));
    setLoading(project);
  }, [dispatch]);


  // Load Transition complete → navigate to Workspace Page
  const handleLoadComplete = useCallback(() => {
    setLoading(null);
    dispatch(setAppMode("workspace"));
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  }, [dispatch, navigate]);

  return (
    <div className="h-screen w-full relative overflow-hidden pointer-events-auto select-none text-slate-100 flex flex-col font-sans justify-between px-6 md:px-12 py-6" style={{ background: "#06070b" }}>
      
      {/* Canvas particles background */}
      <ParticleBg />

      {/* Ambient top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.04) 0%, transparent 70%)", zIndex: 1 }} 
      />

      {/* ── Top Header Row ── */}
      <div className="w-full flex items-center justify-between z-20 relative px-2">
        <div className="flex items-baseline gap-3 select-none">
          <span className="font-display text-white tracking-tightest text-xl md:text-2xl font-[800]">
            React<span className="text-accent">/</span>Architect
          </span>
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widestest text-ink-dim">
            v1.4
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ImportButton onClick={() => setShowImport(true)} label="Import Project" />
        </div>
      </div>

      {/* ── Main Side-by-Side Content Grid (Compact 100vh) ── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12 items-center my-auto px-2">
        <style>{`
          .btn-17,
          .btn-17 *,
          .btn-17 :after,
          .btn-17 :before,
          .btn-17:after,
          .btn-17:before {
            border: 0 solid;
            box-sizing: border-box;
          }
          .btn-17 {
            -webkit-tap-highlight-color: transparent;
            -webkit-appearance: button;
            background-color: transparent;
            background-image: none;
            color: #fff;
            cursor: pointer;
            font-family: 'JetBrains Mono', ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 0.75rem;
            font-weight: 900;
            line-height: 1.5;
            margin: 0;
            -webkit-mask-image: -webkit-radial-gradient(#000, #fff);
            text-transform: uppercase;
            letter-spacing: 0.12em;
            border-radius: 99rem;
            border: 1px solid rgba(255, 255, 255, 0.25);
            padding: 0.55rem 1.6rem;
            z-index: 0;
            overflow: hidden;
            position: relative;
            transition: border-color 0.3s ease;
          }
          .btn-17:hover {
            border-color: #ffffff;
          }
          .btn-17:disabled {
            cursor: default;
          }
          .btn-17 .text-container {
            overflow: hidden;
            position: relative;
            display: block;
            mix-blend-mode: difference;
          }
          .btn-17 .text {
            display: block;
            position: relative;
          }
          .btn-17:hover .text {
            -webkit-animation: move-up-alternate 0.3s forwards;
            animation: move-up-alternate 0.3s forwards;
          }
          @-webkit-keyframes move-up-alternate {
            0% { transform: translateY(0); }
            50% { transform: translateY(80%); }
            51% { transform: translateY(-80%); }
            to { transform: translateY(0); }
          }
          @keyframes move-up-alternate {
            0% { transform: translateY(0); }
            50% { transform: translateY(80%); }
            51% { transform: translateY(-80%); }
            to { transform: translateY(0); }
          }
          .btn-17:after,
          .btn-17:before {
            --skew: 0.2;
            background: #fff;
            content: "";
            display: block;
            height: 102%;
            left: calc(-50% - 50% * var(--skew));
            pointer-events: none;
            position: absolute;
            top: -104%;
            transform: skew(calc(150deg * var(--skew))) translateY(var(--progress, 0));
            transition: transform 0.2s ease;
            width: 100%;
          }
          .btn-17:after {
            --progress: 0%;
            left: calc(50% + 50% * var(--skew));
            top: 102%;
            z-index: -1;
          }
          .btn-17:hover:before {
            --progress: 100%;
          }
          .btn-17:hover:after {
            --progress: -102%;
          }
          .scroll-reveal {
            opacity: 1;
            transform: translateY(0);
            transition: opacity 800ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes folderBounce {
            0% { transform: rotateX(10deg) rotateY(-5deg) scale(1); }
            50% { transform: rotateX(18deg) rotateY(-8deg) scale(1.18); filter: brightness(1.25); }
            100% { transform: rotateX(10deg) rotateY(-5deg) scale(1); }
          }
          .folder-bounce {
            animation: folderBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* ── 3D Interactive Folder Card ── */
          .folder-card {
            width: 170px;
            height: 130px;
            perspective: 1200px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            -webkit-tap-highlight-color: transparent;
          }

          .folder-toggle {
            display: none;
          }

          .hint-wrapper {
            position: absolute;
            top: -40px;
            right: -50px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            z-index: 100;
            animation: floatHint 2.5s ease-in-out infinite;
          }

          .hint-text {
            font-family: "Inter", -apple-system, sans-serif;
            color: #e6f1ff;
            font-size: 10px;
            font-weight: 900;
            text-decoration: underline;
            letter-spacing: 0.5px;
            white-space: nowrap;
            position: relative;
            right: -25px;
            top: 10px;
            transform: rotate(45deg);
          }

          .hint-arrow {
            height: 35px;
            width: 35px;
          }

          @keyframes floatHint {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(6px); }
          }

          .folder-toggle:checked ~ .hint-wrapper {
            opacity: 0;
            transform: translateY(-10px);
          }

          .folder-container {
            position: relative;
            width: 100%;
            height: 100%;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
            backface-visibility: hidden;
            will-change: transform;
          }

          .folder-toggle:checked ~ .folder-container {
            transform: rotateX(10deg) rotateY(-5deg);
          }

          .folder-back {
            position: absolute;
            bottom: 0;
            width: 100%;
            filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4));
          }

          .folder-front-wrapper {
            position: absolute;
            bottom: -7px;
            width: 100%;
            z-index: 90;
            transform-origin: bottom;
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border-radius: 12px;
          }

          .folder-label {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 30px;
            height: 4px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 10px;
          }

          .counter {
            position: absolute;
            top: -95px;
            right: -75px;
            background-color: #00e6ff;
            padding: 4px 8px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2);
            transform: scale(0) translateY(20px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            z-index: 100;
            pointer-events: auto;
          }

          .folder-toggle:checked ~ .folder-container .counter {
            transform: scale(1) translateY(0);
            opacity: 1;
            transition-delay: 0.2s;
          }

          .status-dot {
            width: 6px;
            height: 6px;  
            background: #e26c1e;
            border-radius: 50%;
            position: relative;
            box-shadow: 0 0 10px #f46c12;
          }

          .status-dot::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #ee4b0b;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(3); opacity: 0; }
          }

          .counter-label {
            font-family: "Inter", sans-serif;
            font-size: 8px;
            font-weight: 800;
            color: black;
            text-transform: capitalize;
          }

          .counter-number {
            font-family: "Inter", sans-serif;
            font-size: 12px;
            font-weight: 900;
            color: #ffffff;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }

          .counter:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: #60a5fa;
            transform: scale(1.1) translateY(-5px) !important;
            cursor: help;
          }

          .counter:hover .counter-number {
            color: #60a5fa;
            transition: color 0.3s ease;
          }

          .file {
            position: absolute;
            bottom: 5px;
            left: 10%;
            width: 80%;
            height: 85px;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            z-index: 0;
          }

          .file-1 { background: #ff5f6d; z-index: 25; transition-delay: 0.15s; }
          .file-2 { background: #ffc371; z-index: 24; transition-delay: 0.1s; }
          .file-3 { background: #4facfe; z-index: 23; transition-delay: 0.05s; }
          .file-4 { background: #00f2fe; z-index: 22; transition-delay: 0.02s; }
          .file-5 { background: #a18cd1; z-index: 21; transition-delay: 0s; }

          .shine {
            position: absolute;
            top: 0;
            left: -100%;
            width: 50%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
            transform: skewX(-20deg);
            transition: none;
          }

          .folder-toggle:checked ~ .folder-container .shine {
            left: 150%;
            transition: left 0.8s ease-in-out;
            transition-delay: 0.3s;
          }

          .file-text {
            font-family: "Inter", sans-serif;
            font-size: 9px;
            color: white;
            padding: 12px;
            font-weight: 800;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transform: translateY(5px);
            transition: all 0.3s ease 0.4s;
          }

          .folder-toggle:checked ~ .folder-container .file-text {
            opacity: 1;
            transform: translateY(0);
          }

          .folder-toggle:checked ~ .folder-container .folder-front-wrapper {
            transform: rotateX(-50deg);
          }

          .folder-toggle:checked ~ .folder-container .file-1 { transform: translateY(-70px) rotate(-10deg) translateX(-15px) translateZ(20px); }
          .folder-toggle:checked ~ .folder-container .file-2 { transform: translateY(-55px) rotate(8deg) translateX(18px) translateZ(10px); }
          .folder-toggle:checked ~ .folder-container .file-3 { transform: translateY(-40px) rotate(-15deg) translateX(-8px); }
          .folder-toggle:checked ~ .folder-container .file-4 { transform: translateY(-25px) rotate(12deg) translateX(12px); }
          .folder-toggle:checked ~ .folder-container .file-5 { transform: translateY(-10px) rotate(-5deg); }

          .folder-toggle:checked ~ .folder-container .file:hover { cursor: pointer; filter: brightness(1.1); }
          .folder-toggle:checked ~ .folder-container .file-1:hover { transform: translateY(-80px) rotate(-10deg) translateX(-15px) translateZ(20px); }
          .folder-toggle:checked ~ .folder-container .file-2:hover { transform: translateY(-65px) rotate(8deg) translateX(18px) translateZ(10px); }
          .folder-toggle:checked ~ .folder-container .file-3:hover { transform: translateY(-50px) rotate(-15deg) translateX(-8px); }
          .folder-toggle:checked ~ .folder-container .file-4:hover { transform: translateY(-35px) rotate(12deg) translateX(12px); }
          .folder-toggle:checked ~ .folder-container .file-5:hover { transform: translateY(-20px) rotate(-5deg); }

          .file-icon {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 14px;
            height: 14px;
            color: rgba(255, 255, 255, 0.4);
            transition: color 0.3s ease;
          }

          .file-tag {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            color: rgba(255, 255, 255, 0.9);
            font-family: "Inter", -apple-system, sans-serif;
            font-size: 7px;
            font-weight: 700;
            padding: 3px 6px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transform: translateX(10px);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            pointer-events: none;
          }

          .folder-toggle:checked ~ .folder-container .file:hover .file-icon { color: rgba(255, 255, 255, 0.9); }
          .folder-toggle:checked ~ .folder-container .file-tag { opacity: 1; }

          .folder-search {
            position: absolute;
            top: -40px;
            left: 10%;
            width: 30px;
            height: 25px;
            background-color: #626363;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 20px;
            display: flex;
            align-items: center;
            padding: 0 8px;
            transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            opacity: 0;
            z-index: 100;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .search-icon { width: 12px; height: 12px; flex-shrink: 0; }
          .search-input {
            background: transparent;
            border: none;
            color: #ffffff;
            font-family: "Inter", sans-serif;
            font-size: 9px;
            margin-left: 8px;
            outline: none;
            transition: width 0.4s ease;
          }
          .search-input::placeholder { color: #ffffff; }

          .folder-toggle:checked ~ .folder-container .folder-search { opacity: 1; top: -80px; width: 80%; }
          .folder-toggle:checked ~ .folder-container .folder-search:focus-within { width: 90%; background-color: #eee5e5; }
          .folder-toggle:checked ~ .folder-container .folder-search:focus-within .search-input { width: 100%; }
        `}</style>

        {/* ── Left Column: Compact Headline, Subtitle & Quick Stats ── */}
        <div className="lg:col-span-6 flex flex-col text-left justify-center">
          <div ref={hubCopyRef}>
            <h1 className="font-display font-[850] tracking-tightest leading-[0.88] text-white text-5xl sm:text-6xl md:text-7xl lg:text-[5.6rem] xl:text-[6.2rem]">
              <span className="block">{splitText("Every project")}</span>
              <span className="block">
                {splitText("has an")}
                <span className="inline-block w-[0.35em]" />
                <span className="text-accent">{splitText("architecture.")}</span> 
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-ink-dim text-sm md:text-base leading-relaxed reveal-subtitle select-none">
              Choose a project to enter the React Architect Workspace. Select from your active libraries or import a folder build.
            </p>
          </div>
        </div>

        {/* ── Right Column: 3D Interactive Folder Vault ── */}
        <div className="lg:col-span-6 flex items-center justify-end pr-8 pt-8 relative min-h-[420px]">
          <ProjectFolderVault 
             projects={enrichedProjects}
             onLaunch={handleSelectProject}
             onContextMenu={handleContextMenu}
             importingProject={importingProject}
          />
        </div>

      </div>

      {/* ── Bottom Footer Row ── */}
      <div className="w-full flex items-center justify-between z-20 relative px-2 pt-2 border-t border-white/5">
        <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
          HUB — v1.4
        </span>
      </div>

      {/* Right click context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          project={ctxMenu.project}
          onRename={(p) => setRenameTarget(p)}
          onDelete={(p) => setDeleteTarget(p)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Modals & Animated Import Overlay */}
      {showImport && (
        <ImportProjectModal onClose={handleModalClose} />
      )}
      {importingProject && (
        <FlyingCardToFolder
          project={importingProject}
          onComplete={() => setImportingProject(null)}
        />
      )}
      {renameTarget && (
        <RenameModal project={renameTarget} onClose={() => setRenameTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal project={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}

      {/* Cinematic load transition */}
      {loadingProject && (
        <ProjectLoadTransition
          projectName={loadingProject.name}
          onComplete={handleLoadComplete}
        />
      )}

    </div>
  );
};

export default Hub;
