import { useRef } from "react";
import { LANDING } from "@/constants/testIds";
import { ArrowUpRight } from "lucide-react";

/**
 * Magnetic Launch Architect button.
 * The pill follows the cursor slightly when hovered.
 */
const LaunchButton = ({ onClick }) => {
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
    <div className="inline-flex" onMouseMove={onMove} onMouseLeave={onLeave}>
      <button
        ref={btnRef}
        data-testid={LANDING.launchButton}
        onClick={onClick}
        className="pill group transition-transform"
        style={{ transition: "transform 350ms cubic-bezier(0.2,0.7,0.1,1), background-color 500ms ease, color 500ms ease, box-shadow 500ms ease" }}
      >
        <span className="pill-dot" />
        <span>Launch Architect</span>
        <ArrowUpRight size={16} strokeWidth={1.5} className="-mr-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </button>
    </div>
  );
};

export default LaunchButton;
