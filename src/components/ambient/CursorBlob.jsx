import { useEffect, useRef } from "react";

// Custom cursor blob — small dot + soft ring trailing the mouse
const CursorBlob = () => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${e.clientX - 3}px, ${e.clientY - 3}px, 0)`;
      }
    };
    const onDown = () => { if (ringRef.current) ringRef.current.style.transform += " scale(0.85)"; };
    const onUp = () => {};

    const onOver = (e) => {
      const interactive = e.target.closest('a, button, [role="button"], [data-cursor="hover"]');
      if (ringRef.current) {
        ringRef.current.style.width = interactive ? "56px" : "32px";
        ringRef.current.style.height = interactive ? "56px" : "32px";
        ringRef.current.style.borderColor = interactive ? "rgba(0,229,255,0.9)" : "rgba(255,255,255,0.6)";
        ringRef.current.style.background = interactive ? "rgba(0,229,255,0.08)" : "transparent";
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mouseover", onOver);

    let rafId;
    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.15;
      pos.current.y += (target.current.y - pos.current.y) * 0.15;
      if (ringRef.current) {
        const w = parseFloat(ringRef.current.style.width) || 32;
        ringRef.current.style.transform = `translate3d(${pos.current.x - w / 2}px, ${pos.current.y - w / 2}px, 0)`;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[90] w-1.5 h-1.5 rounded-full bg-white mix-blend-difference"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[90] rounded-full border transition-[width,height,background-color,border-color] duration-300 ease-out"
        style={{ width: 32, height: 32, borderColor: "rgba(255,255,255,0.6)" }}
      />
    </>
  );
};

export default CursorBlob;
