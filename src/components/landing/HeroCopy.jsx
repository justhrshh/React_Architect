import { useEffect, useRef } from "react";
import gsap from "gsap";
import { LANDING } from "@/constants/testIds";

/**
 * Splits a string into per-character spans wrapped inside a "mask"
 * so each character can rise from below in a clip-path safe way.
 */
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

const HeroCopy = () => {
  const rootRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(".reveal-char", {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "expo.out",
        stagger: { each: 0.018, from: "start" },
        delay: 0.2,
      });
      gsap.from(`[data-testid="${LANDING.heroSubtitle}"]`, {
        y: 24, opacity: 0, duration: 1.1, ease: "expo.out", delay: 1.0,
      });
      gsap.from(`[data-testid="${LANDING.launchButton}"]`, {
        y: 18, opacity: 0, duration: 1, ease: "expo.out", delay: 1.25,
      });

      gsap.from(`[data-testid="${LANDING.scrollHint}"]`, {
        opacity: 0, y: 10, duration: 1, ease: "power2.out", delay: 1.8,
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="relative z-10">


      <h1
        data-testid={LANDING.heroTitle}
        className="font-display font-[800] tracking-tightest leading-[0.88] text-balance text-white text-[14vw] md:text-[10.5vw] lg:text-[8.6vw]"
      >
        <span className="block">{splitText("Don\u2019t just")}</span>
        <span className="block">
          {splitText("write")}
          <span className="inline-block w-[0.4em]" />
          <span className="italic font-[500] text-ink-dim">{splitText("React.")}</span>
        </span>
        <span className="block">
          {splitText("Architect")}
          <span className="inline-block w-[0.3em]" />
          <span className="text-accent">{splitText("it.")}</span>
        </span>
      </h1>

      <p
        data-testid={LANDING.heroSubtitle}
        className="mt-10 md:mt-12 max-w-xl text-ink-dim text-base md:text-lg leading-relaxed"
      >
        An immersive visual operating system for React applications.
        Navigate architecture, not folders. Understand any codebase in minutes.
      </p>
    </div>
  );
};

export default HeroCopy;
