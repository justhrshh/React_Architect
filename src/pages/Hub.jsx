import { useState, useEffect, useRef, useCallback } from "react";
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

// Components
import ImportProjectModal from "@/components/hub/ImportProjectModal";
import CreateProjectWizard from "@/components/hub/CreateProjectWizard";
import ProjectLoadTransition from "@/components/hub/ProjectLoadTransition";
import RenameModal from "@/components/hub/RenameModal";
import DeleteConfirmModal from "@/components/hub/DeleteConfirmModal";

// Icons from lucide-react
import {
  Plus, Upload, Zap, ArrowUpRight
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
  const [showWizard, setShowWizard]   = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [ctxMenu, setCtxMenu]         = useState(null);

  // Clear selected project and ensure appMode is hub on mount
  useEffect(() => {
    dispatch(clearSelectedProject());
    dispatch(setAppMode("hub"));
  }, [dispatch]);



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
    setLoading(project);
  }, [dispatch]);

  // Wizard complete → trigger loading
  const handleWizardComplete = useCallback(({ projectId, projectName }) => {
    setShowWizard(false);
    setLoading({ id: projectId, name: projectName });
  }, []);

  // Load Transition complete → navigate to Workspace Page
  const handleLoadComplete = useCallback(() => {
    setLoading(null);
    dispatch(setAppMode("workspace"));
    dispatch(setActiveRoom("project-brain"));
    navigate("/workspace");
  }, [dispatch, navigate]);

  return (
    <div className="min-h-screen w-full relative overflow-y-auto pointer-events-auto select-none text-slate-100 flex flex-col font-sans" style={{ background: "#06070b" }}>
      
      {/* Canvas particles background */}
      <ParticleBg />

      {/* Ambient top glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,229,255,0.04) 0%, transparent 70%)", zIndex: 1 }} 
      />

      {/* Brand watermark / logo — top left */}
      <div className="fixed top-8 left-12 z-20 flex items-baseline gap-3 select-none">
        <span className="font-display text-white tracking-tightest text-xl md:text-2xl font-[800]">
          React<span className="text-accent">/</span>Architect
        </span>
        <span className="hidden md:inline font-mono text-[10px] uppercase tracking-widestest text-ink-dim">
          v1.4
        </span>
      </div>

      {/* Top Right Action Navigation Links — vertically stacked with New Project on top */}
      <div className="fixed top-8 right-12 z-20 flex flex-col items-end gap-3 select-none pointer-events-auto">
        <button 
          onClick={() => setShowWizard(true)} 
          className="nav-underline font-mono text-[10px] md:text-xs uppercase tracking-widestest text-ink-dim hover:text-white cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <Plus size={11} strokeWidth={2.5} />
          New Project
        </button>
        <button 
          onClick={() => setShowImport(true)} 
          className="nav-underline font-mono text-[10px] md:text-xs uppercase tracking-widestest text-ink-dim hover:text-white cursor-pointer transition-colors flex items-center gap-1.5"
        >
          <Upload size={11} strokeWidth={2.5} />
          Import
        </button>
      </div>

      {/* Bottom Right version badge */}
      <div className="fixed bottom-6 right-7 z-20 select-none">
        <span className="text-[10px] tracking-widest" style={{ fontFamily: "JetBrains Mono", color: "#2e3347", letterSpacing: "0.12em" }}>HUB — v1.4</span>
      </div>

      {/* ── Main content scroll wrapper ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-48 w-full">
        <style>{`
          .scroll-reveal {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 1200ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1);
            will-change: transform, opacity;
          }
          .scroll-reveal.revealed {
            opacity: 1;
            transform: translateY(0);
          }
        `}</style>

        {/* Hero Section copy with split text character slide-up animations */}
        <div ref={hubCopyRef} className="mb-20 text-left">
          <p className="font-mono text-[10px] md:text-xs uppercase tracking-widestest text-ink-dim mb-8 flex items-center gap-3 select-none">
            <span className="pill-dot" />
            Sprint 05 — Command Center
          </p>

          {/* Exact size, spacing, line height and character mask animations from the Landing page */}
          <h1 className="font-display font-[800] tracking-tightest leading-[0.88] text-balance text-white text-[14vw] md:text-[10.5vw] lg:text-[8.6vw]">
            <span className="block">{splitText("Every project")}</span>
            <span className="block">
              {splitText("has an")}
              <span className="inline-block w-[0.4em]" />
              <span className="text-accent">{splitText("architecture.")}</span>
            </span>
          </h1>

          <p className="mt-12 max-w-xl text-ink-dim text-base md:text-lg leading-relaxed reveal-subtitle select-none">
            Choose a project to enter the React Architect Workspace.
            Select from your active libraries or import a folder build.
          </p>
        </div>

        {/* ── Visual Projects Section: 3D Perspective Drag Carousel ── */}
        <div className="flex flex-col gap-8 items-center scroll-reveal delay-100 w-full">
          
          <div className="w-full flex items-center gap-3">
            <span className="text-[10px] tracking-widest uppercase" style={{ fontFamily: "JetBrains Mono", color: "#52525B", letterSpacing: "0.14em" }}>
              Interactive Architecture Console
            </span>
            <span className="h-px flex-1 bg-white/5" />
          </div>

          {/* 3D Perspective Carousel Container */}
          <div className="w-full flex items-center justify-center py-10" style={{ height: "520px" }}>
            {enrichedProjects.length > 0 ? (
              <PerspectiveCarousel 
                 projects={enrichedProjects}
                 activeId={activeHubProjectId}
                 onChangeActive={setActiveHubProjectId}
                 onLaunch={handleSelectProject}
                 onContextMenu={handleContextMenu}
              />
            ) : (
              <div className="py-24 w-full flex flex-col items-center justify-center gap-3 border border-dashed border-white/5 rounded-2xl bg-black/20">
                <Zap size={22} style={{ color: "#2e3347" }} />
                <span className="text-sm" style={{ fontFamily: "JetBrains Mono", color: "#2e3347" }}>No projects loaded</span>
              </div>
            )}
          </div>

          {/* Add New project button immediately below the carousel */}
          <button 
            onClick={() => setShowWizard(true)}
            className="mt-2 flex items-center gap-2 px-6 py-3 rounded-full border border-white/10 hover:border-white/20 bg-white/5 text-ink-dim hover:text-white transition-all text-xs tracking-wider uppercase font-semibold pointer-events-auto"
            style={{ fontFamily: "JetBrains Mono" }}
          >
            <Plus size={14} /> Create New Workspace
          </button>

        </div>

        {/* Stats Footer bar + Landing page Magnetic button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-24 pt-6 select-none border-t border-edge-subtle scroll-reveal delay-300 w-full">
          <div className="flex items-center gap-6">
            {[
              { label: "Projects", val: projects.length },
              { label: "Active", val: enrichedProjects.filter(p => p.status === "active").length },
              { color: "#f59e0b", label: "In Review", val: enrichedProjects.filter(p => p.status === "review").length },
              { label: "Starred", val: enrichedProjects.filter(p => p.starred).length },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <span style={{ fontFamily: "JetBrains Mono", fontSize: "1rem", color: "#00d4ff", fontWeight: 600 }}>{s.val}</span>
                <span className="text-[10px]" style={{ fontFamily: "JetBrains Mono", color: "#2e3347" }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Magnetic Landing Button placed at the very end of the page */}
          <MagneticButton 
            onClick={() => navigate("/")} 
            icon={ArrowUpRight} 
            label="Landing Page" 
          />
        </div>

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

      {/* Modals */}
      {showImport && (
        <ImportProjectModal onClose={() => setShowImport(false)} />
      )}
      {showWizard && (
        <CreateProjectWizard
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
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
