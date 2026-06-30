import React, { useRef, useEffect } from "react";
import gsap from "gsap";

/**
 * Cinematic fullscreen overlay that plays when a project is opened.
 * Sequences text lines then calls onComplete to trigger navigation.
 */
const ProjectLoadTransition = ({ projectName, onComplete }) => {
  const overlayRef = useRef();
  const line1Ref = useRef();
  const line2Ref = useRef();
  const line3Ref = useRef();
  const barRef = useRef();

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });

    // Fade overlay in
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.4, ease: "power2.out" }
    );

    // Progress bar fill
    tl.fromTo(barRef.current,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: 2.2, ease: "power1.inOut" },
      0.3
    );

    // Line 1
    tl.fromTo(line1Ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      0.3
    );

    // Line 2
    tl.fromTo(line2Ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      0.9
    );

    // Line 3
    tl.fromTo(line3Ref.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
      1.6
    );

    // Hold briefly, then fade out
    tl.to(overlayRef.current, {
      opacity: 0,
      duration: 0.45,
      ease: "power2.in",
    }, 2.7);

    return () => tl.kill();
  }, [onComplete]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-obsidian flex flex-col items-center justify-center"
      style={{ opacity: 0 }}
    >
      {/* Project name */}
      <div className="mb-10 text-center">
        <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint block mb-2">
          Opening Project
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-[800] text-white tracking-tightest">
          {projectName}
        </h2>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-px bg-white/8 relative mb-10 overflow-hidden rounded-full">
        <div
          ref={barRef}
          className="absolute inset-0 bg-accent rounded-full"
          style={{ transform: "scaleX(0)", transformOrigin: "left center" }}
        />
      </div>

      {/* Sequenced status lines */}
      <div className="flex flex-col items-center gap-3">
        <p
          ref={line1Ref}
          className="font-mono text-[11px] uppercase tracking-widestest text-ink-dim"
          style={{ opacity: 0 }}
        >
          Initialising project...
        </p>
        <p
          ref={line2Ref}
          className="font-mono text-[11px] uppercase tracking-widestest text-ink-dim"
          style={{ opacity: 0 }}
        >
          Loading workspace...
        </p>
        <p
          ref={line3Ref}
          className="font-mono text-[11px] uppercase tracking-widestest text-accent"
          style={{ opacity: 0 }}
        >
          Architect online
        </p>
      </div>
    </div>
  );
};

export default ProjectLoadTransition;
