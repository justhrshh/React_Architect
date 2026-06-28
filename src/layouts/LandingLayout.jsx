import React, { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import Nav from "@/components/Nav";
import Noise from "@/components/ambient/Noise";
import CursorBlob from "@/components/ambient/CursorBlob";

function LandingLayout() {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;
    let rafId;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen bg-obsidian text-ink">
      <CursorBlob />
      <Noise />
      <Nav />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default LandingLayout;