

// Animated grain overlay — passive CSS-only
const Noise = () => (
  <>
    <div className="noise-overlay animate-grain" aria-hidden="true" />
    {/* slow vertical scanline for cinematic feel */}
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden mix-blend-screen opacity-[0.07]" aria-hidden="true">
      <div
        className="absolute left-0 right-0 h-[160px] animate-scanline"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,229,255,0.45) 45%, rgba(255,255,255,0.5) 50%, rgba(0,229,255,0.45) 55%, transparent 100%)",
          filter: "blur(8px)",
        }}
      />
    </div>
  </>
);

export default Noise;
