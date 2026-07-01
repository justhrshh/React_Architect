import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeroBackground from "@/components/landing/HeroBackground";
import HeroCopy from "@/components/landing/HeroCopy";
import LaunchButton from "@/components/landing/LaunchButton";
import BootSequence from "@/components/BootSequence";
import { LANDING } from "@/constants/testIds";

const FootnoteRow = ({ k, label, delay }) => (
  <div 
    className="border-l border-edge-subtle pl-4 scroll-reveal" 
    style={{ transitionDelay: `${delay}ms` }}
  >
    <div className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint mb-1">{k}</div>
    <div className="text-ink text-sm">{label}</div>
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [booting, setBooting] = useState(false);

  const handleLaunch = () => setBooting(true);
  const handleBootComplete = () => navigate("/hub");

  // Intersection Observer scroll-trigger animation setup
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
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = document.querySelectorAll(".scroll-reveal");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div data-testid={LANDING.root} className="relative">
      
      {/* Scroll Reveal Style Injection */}
      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 1200ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* HERO */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <HeroBackground />

        <div className="relative z-10 max-w-[1800px] mx-auto px-6 md:px-12 pt-40 md:pt-44 pb-24 md:pb-32 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-12 lg:col-span-10">
            <HeroCopy />
            <div className="mt-12 md:mt-14 flex flex-wrap items-center gap-6">
              <LaunchButton onClick={handleLaunch} />
              <span className="font-mono text-[11px] uppercase tracking-widestest text-ink-dim">
                Press <kbd className="px-1.5 py-0.5 border border-edge-subtle rounded-md mx-1">↵</kbd> to enter the architect
              </span>
            </div>
          </div>
        </div>

        {/* Bottom whisper bar */}
        <div className="absolute bottom-6 md:bottom-8 inset-x-0 z-10 px-6 md:px-12 flex items-end justify-between font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
          <span data-testid={LANDING.scrollHint} className="flex items-center gap-3">
            <span className="inline-block w-6 h-px bg-ink-faint" /> Scroll
          </span>
          <span>50.0894&deg; N &middot; 14.4255&deg; E — studio/0</span>
        </div>
      </section>

      {/* PHILOSOPHY SECTION */}
      <section className="relative py-24 md:py-32 max-w-[1800px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4 scroll-reveal">
            <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim mb-6">
              /01 — Philosophy
            </p>
          </div>
          <div className="md:col-span-8 scroll-reveal" style={{ transitionDelay: "100ms" }}>
            <p className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tightest text-white text-balance">
              Developers spend more time <span className="text-ink-dim">understanding code</span> than writing it. Replace folder exploration with <span className="text-accent">architecture visualisation</span>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-20">
          <FootnoteRow k="01" label="Architecture first" delay={0} />
          <FootnoteRow k="02" label="Visual first" delay={80} />
          <FootnoteRow k="03" label="Premium UX" delay={160} />
          <FootnoteRow k="04" label="Every motion communicates" delay={240} />
        </div>
      </section>

      {/* MODULES PREVIEW */}
      <section className="relative pb-28 md:pb-40 max-w-[1800px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12 md:mb-16">
          <div className="md:col-span-4 scroll-reveal">
            <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim mb-6">
              /02 — Rooms
            </p>
          </div>
          <div className="md:col-span-8 scroll-reveal" style={{ transitionDelay: "100ms" }}>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05] tracking-tightest text-white text-balance">
              The workspace is one immersive environment. Modules feel like <span className="italic font-[500] text-ink-dim">rooms</span>.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-edge-subtle border border-edge-subtle">
          {[
            { idx: "01", name: "Architecture", desc: "Files, components, hooks orchestrated as a living graph." },
            { idx: "02", name: "Routes",        desc: "Trace navigation flows between every screen." },
            { idx: "03", name: "State",         desc: "Reveal Redux slices, contexts, and local state edges." },
            { idx: "04", name: "APIs",          desc: "Map every request, response, and endpoint surface." },
            { idx: "05", name: "Documentation", desc: "Interactive docs generated from your codebase." },
            { idx: "06", name: "Score",         desc: "Architecture health & refactor suggestions." },
          ].map((r, idx) => (
            <div 
              key={r.idx} 
              className="group relative bg-obsidian p-8 md:p-10 min-h-[220px] overflow-hidden scroll-reveal"
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                   style={{ background: "radial-gradient(60% 80% at 30% 0%, rgba(0,229,255,0.10), transparent 70%)" }} />
              <div className="relative">
                <div className="flex items-baseline justify-between mb-12">
                  <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">/{r.idx}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint group-hover:text-accent transition-colors">Room</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-tightest text-white">{r.name}</h3>
                <p className="mt-3 text-sm text-ink-dim max-w-[28ch]">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA TAIL */}
      <section className="relative pb-32 md:pb-40 max-w-[1800px] mx-auto px-6 md:px-12">
        <div className="border-t border-edge-subtle pt-16 md:pt-24 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="scroll-reveal">
            <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim mb-6">/03 — Enter</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-tightest leading-[0.95] text-white text-balance max-w-3xl">
              The architect is ready. <span className="text-ink-dim">Open the door.</span>
            </h2>
          </div>
          <div className="scroll-reveal" style={{ transitionDelay: "150ms" }}>
            <LaunchButton onClick={handleLaunch} />
          </div>
        </div>
        <div className="mt-16 flex items-center justify-between font-mono text-[10px] uppercase tracking-widestest text-ink-faint select-none">
          <span>&copy; React/Architect</span>
          <span>Studio &middot; Sprint 04</span>
        </div>
      </section>

      {booting && <BootSequence onComplete={handleBootComplete} />}
    </div>
  );
};

export default Landing;