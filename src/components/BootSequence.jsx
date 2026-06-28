import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { BOOT } from "@/constants/testIds";

const BEATS = [
  { code: "01", label: "Setting up workspace" },
  { code: "02", label: "Creating environment" },
  { code: "03", label: "Loading tools" },
  { code: "04", label: "Architect online" },
];

/**
 * Cinematic BootSequence overlay.
 * - Auto-runs a GSAP timeline.
 * - Animates a progress bar from 0 -> 100%.
 * - Cycles log sequence steps to verify status checks.
 * - Calls onComplete() at the end, then dramatic exit.
 */
const BootSequence = ({ onComplete }) => {
  const overlayRef = useRef(null);
  const barRef = useRef(null);
  const titleRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      tl.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.from(titleRef.current, { y: 24, opacity: 0, duration: 0.8 }, "<");

      // Per-step progress animation
      for (let i = 0; i < BEATS.length; i++) {
        tl.call(() => setActiveIdx(i), null, `+=${i === 0 ? 0.3 : 0.6}`);
        tl.to(barRef.current, {
          width: `${((i + 1) / BEATS.length) * 100}%`,
          duration: 0.6,
          ease: "power2.out",
        }, "<");
      }

      // Exit
      tl.to(overlayRef.current, {
        opacity: 0,
        duration: 0.7,
        delay: 0.6,
        ease: "power2.inOut",
        onComplete,
      });
    }, overlayRef);
    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      data-testid={BOOT.overlay}
      className="fixed inset-0 z-[100] bg-obsidian flex flex-col justify-between p-6 md:p-12"
    >
      <div className="grid-bg absolute inset-0 opacity-60" />
      <div className="absolute inset-0 vignette" />

      <div className="relative z-10 flex items-start justify-between">
        <div ref={titleRef}>
          <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim mb-3 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse-glow" />
            Booting sequence
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-[800] tracking-tightest leading-[0.95]">
            Assembling your<br />
            <span className="text-accent">architecture</span>.
          </h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint hidden md:block">
          React/Architect &middot; v0.1.0
        </div>
      </div>

      <div className="relative z-10">
        <ul className="font-mono text-sm md:text-base space-y-2 md:space-y-3 mb-10 md:mb-12 max-w-2xl">
          {BEATS.map((b, i) => {
            const isDone = i < activeIdx;
            const isActive = i === activeIdx;
            const isPending = i > activeIdx;

            return (
              <li
                key={b.code}
                className={`flex items-baseline justify-between transition-colors duration-300 ${
                  isActive ? "text-white" : isDone ? "text-ink-dim" : "text-ink-faint"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className="text-[10px] text-ink-faint">{b.code}</span>
                  <span>{b.label}</span>
                </div>
                <span className="font-mono">
                  {isDone ? "OK" : isActive ? "..." : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        <div data-testid={BOOT.status} className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widestest text-ink-dim mb-3">
          <span>Progress</span>
          <span>{Math.round(((activeIdx + 1) / BEATS.length) * 100)}%</span>
        </div>
        <div data-testid={BOOT.progressBar} className="relative h-px w-full bg-white/10 overflow-hidden">
          <div ref={barRef} className="absolute inset-y-0 left-0 w-0 bg-white" style={{ boxShadow: "0 0 18px rgba(0,229,255,0.6)" }} />
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
