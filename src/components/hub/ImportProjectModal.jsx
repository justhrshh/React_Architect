import { useState, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { addProject } from "@/redux/slices/hubSlice";
import {
  detectFromDirectoryHandle,
  detectFromZip,
} from "@/lib/projectDetector";
import { saveProjectHandle } from "@/lib/analysis/projectStore";

// ---------------------------------------------------------------------------
// Icon components (inline SVG — no extra dep)
// ---------------------------------------------------------------------------
const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
  </svg>
);

const ZipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6M12 18v-2M12 14v-2M12 10V8"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin text-neutral-850">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Tech badges
// ---------------------------------------------------------------------------
const TechBadge = ({ label, active }) => (
  active ? (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widestest px-3 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-sm">
      <span className="text-neutral-500"><CheckIcon /></span> {label}
    </span>
  ) : null
);

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------
const STATES = {
  IDLE:      "idle",       // show option tiles
  ZIP_DROP:  "zip-drop",  // show ZIP dropzone
  DETECTING: "detecting", // reading + analysing
  REVIEW:    "review",    // show detected summary, confirm
  IMPORTING: "importing", // simulated fetching/processing
  ERROR:     "error",     // show error
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
const ImportProjectModal = ({ onClose }) => {
  const dispatch = useDispatch();

  const [view, setView]           = useState(STATES.IDLE);
  const [detected, setDetected]   = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const zipInputRef = useRef();

  // Folder selection
  const handleSelectFolder = useCallback(async () => {
    if (!("showDirectoryPicker" in window)) {
      setErrorMsg(
        "Your browser does not support the File System Access API.\n" +
        "Please use Chrome or Edge 86+ to import a local folder."
      );
      setView(STATES.ERROR);
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "read" });
      setView(STATES.DETECTING);
      const result = await detectFromDirectoryHandle(dirHandle);
      
      const projectId = crypto.randomUUID();
      result.id = projectId;

      if (!window.projectHandles) window.projectHandles = {};
      window.projectHandles[projectId] = dirHandle;
      await saveProjectHandle(projectId, dirHandle);

      setDetected(result);
      setView(STATES.REVIEW);
    } catch (err) {
      if (err.name === "AbortError") {
        setView(STATES.IDLE);
        return;
      }
      setErrorMsg(err.message ?? "Failed to read the selected folder.");
      setView(STATES.ERROR);
    }
  }, []);

  // ZIP import
  const processZip = useCallback(async (file) => {
    if (!file || !file.name.endsWith(".zip")) {
      setErrorMsg("Please select a valid .zip archive.");
      setView(STATES.ERROR);
      return;
    }
    setView(STATES.DETECTING);
    try {
      const result = await detectFromZip(file);
      
      const projectId = crypto.randomUUID();
      result.id = projectId;

      if (!window.projectZipFiles) window.projectZipFiles = {};
      window.projectZipFiles[projectId] = file;
      await saveProjectHandle(projectId, file);

      setDetected(result);
      setView(STATES.REVIEW);
    } catch (err) {
      setErrorMsg(err.message ?? "Failed to process ZIP archive.");
      setView(STATES.ERROR);
    }
  }, []);

  const handleZipInputChange = (e) => processZip(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processZip(e.dataTransfer.files?.[0]);
  };

  // Confirm import
  const handleConfirm = () => {
    if (!detected) return;
    setView(STATES.IMPORTING);
    setTimeout(() => {
      dispatch(addProject(detected));
      onClose();
    }, 1800); // 1.8 seconds fetch simulation
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" onClick={onClose}>
      <style>{`
        @keyframes modal3dEnter {
          0% {
            opacity: 0;
            transform: perspective(1400px) rotateX(12deg) translateY(35px) translateZ(-100px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: perspective(1400px) rotateX(0deg) translateY(0) translateZ(0) scale(1);
          }
        }
        .modal-3d-enter {
          animation: modal3dEnter 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
      `}</style>

      {/* Dark overlay backdrop to emphasize the light premium modal */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm transition-opacity duration-300" />

      <div
        className="relative w-full max-w-lg modal-3d-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Panel - Pure White header, off-white body for color depth layering */}
        <div className="bg-white border border-neutral-200/80 rounded-[28px] overflow-hidden shadow-[0_40px_90px_rgba(0,0,0,0.5)]">

          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-neutral-100 bg-white">
            <div>
              <h2 className="font-display text-2xl font-[900] text-neutral-900 tracking-tightest leading-none">
                {view === STATES.REVIEW ? "Review Import" : "Import Project"}
              </h2>
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400 mt-2">
                {view === STATES.REVIEW
                  ? "Confirm detected project details"
                  : "React Architect will discover your project automatically"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 bg-neutral-50 transition-colors font-mono text-[11px] flex-shrink-0 font-bold"
            >
              ✕
            </button>
          </div>

          {/* Body - Soft grey background to make option cards POP */}
          <div className="px-8 py-7 bg-neutral-50/65">
            {view === STATES.IDLE     && <IdleView onFolder={handleSelectFolder} onZip={() => setView(STATES.ZIP_DROP)} />}
            {view === STATES.ZIP_DROP && <ZipDropView zipInputRef={zipInputRef} isDragging={isDragging} setIsDragging={setIsDragging} onDrop={handleDrop} onInputChange={handleZipInputChange} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.DETECTING && <DetectingView />}
            {view === STATES.IMPORTING && <ImportingView />}
            {view === STATES.REVIEW   && <ReviewView detected={detected} onConfirm={handleConfirm} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.ERROR    && <ErrorView message={errorMsg} onBack={() => { setErrorMsg(""); setView(STATES.IDLE); }} />}
          </div>

          {/* Footer note - Soft grey backdrop matching body */}
          {view === STATES.IDLE && (
            <div className="px-8 pb-8 bg-neutral-50/65">
              <div className="border-t border-neutral-200/80 pt-6">
                <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-950 font-[900] mb-3">
                  Auto-detect from your project
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Project Name", "Framework", "React Version", "Build Tool", "TypeScript", "Tailwind", "Redux"].map((t) => (
                    <span key={t} className="font-mono text-[8px] uppercase tracking-widest px-2.5 py-1 rounded border border-neutral-250 bg-white text-neutral-500 font-bold shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

const IdleView = ({ onFolder, onZip }) => (
  <div className="flex flex-col gap-4">
    <ImportOption
      icon={<FolderIcon />}
      title="Select Local Folder"
      desc="Choose an existing React project on your machine"
      accent="#00B8D9"
      onClick={onFolder}
    />

    <ImportOption
      icon={<ZipIcon />}
      title="Import ZIP Archive"
      desc="Drop or select a zipped React project"
      accent="#7F56D9"
      onClick={onZip}
    />

    <ImportOption
      icon={<GithubIcon />}
      title="Connect GitHub Repository"
      desc="Clone directly from a GitHub URL"
      accent="#98A2B3"
      comingSoon
    />
  </div>
);

const ImportOption = ({ icon, title, desc, accent, onClick, comingSoon }) => {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (comingSoon || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Smooth 3D tilt mapping: max 10 degrees rotation
    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;
    
    setCoords({ x: rotateY, y: rotateX });
  };

  const getStyle = () => {
    if (comingSoon) {
      return {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)",
        boxShadow: "none",
        transformStyle: "preserve-3d",
      };
    }

    if (isHovered) {
      return {
        transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg) scale3d(1.025, 1.025, 1.025) translateY(-8px) translateZ(24px)`,
        boxShadow: "0 30px 60px rgba(0, 0, 0, 0.08), 0 5px 15px rgba(0, 0, 0, 0.02)",
        transition: "transform 100ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms ease-out",
        transformStyle: "preserve-3d",
      };
    }

    return {
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(-3px) translateZ(6px)",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.01)",
      transition: "transform 500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 500ms ease-out",
      transformStyle: "preserve-3d",
    };
  };

  return (
    <button
      ref={cardRef}
      onClick={comingSoon ? undefined : onClick}
      disabled={comingSoon}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => !comingSoon && setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setCoords({ x: 0, y: 0 }); }}
      style={getStyle()}
      className={`w-full flex items-center gap-4.5 p-5.5 rounded-2xl border text-left group select-none ${
        comingSoon
          ? "border-neutral-150 opacity-40 bg-neutral-100/50 cursor-not-allowed"
          : "border-neutral-200/80 bg-white hover:border-neutral-350 cursor-pointer"
      }`}
    >
      <span 
        className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl border transition-all duration-300"
        style={!comingSoon ? { 
          color: accent, 
          borderColor: `${accent}35`, 
          background: `${accent}08`, 
          transform: isHovered ? "translateZ(20px)" : "translateZ(0px)" 
        } : { color: "#98A2B3", borderColor: "#E4E7EC", background: "#F2F4F7" }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0" style={{ transform: isHovered ? "translateZ(12px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[15px] font-[800] text-neutral-900 tracking-tightest">{title}</span>
          {comingSoon && (
            <span className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 rounded border border-neutral-200 bg-neutral-100 text-neutral-400">
              Coming soon
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-neutral-400 mt-1">{desc}</p>
      </div>
      {!comingSoon && (
        <span 
          className="text-neutral-300 group-hover:text-neutral-700 transition-all text-base font-semibold ml-1"
          style={{ transform: isHovered ? "translateZ(25px)" : "translateZ(0px)", transition: "transform 300ms ease" }}
        >
          →
        </span>
      )}
    </button>
  );
};

const ZipDropView = ({ zipInputRef, isDragging, setIsDragging, onDrop, onInputChange, onBack }) => {
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 8;
    const rotateY = (x / (rect.width / 2)) * 8;
    setCoords({ x: rotateY, y: rotateX });
  };

  const style = isHovered
    ? {
        transform: `perspective(1000px) rotateX(${coords.y}deg) rotateY(${coords.x}deg) scale3d(1.015, 1.015, 1.015) translateZ(8px)`,
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05)",
        transition: "transform 100ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 300ms ease-out",
        transformStyle: "preserve-3d",
      }
    : {
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)",
        boxShadow: "none",
        transition: "transform 500ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 500ms ease-out",
        transformStyle: "preserve-3d",
      };

  return (
    <div className="flex flex-col gap-4.5">
      <div
        ref={containerRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); setCoords({ x: 0, y: 0 }); }}
        style={style}
        className={`border border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging 
            ? "border-neutral-900 bg-white shadow-[inset_0_0_15px_rgba(0,0,0,0.02)]" 
            : "border-neutral-250 hover:border-neutral-350 bg-white hover:shadow-sm"
        }`}
        onClick={() => zipInputRef.current?.click()}
      >
        <span className="text-neutral-400" style={{ transform: isHovered ? "translateZ(15px)" : "translateZ(0px)", transition: "transform 300ms ease" }}><ZipIcon /></span>
        <p className="font-display text-sm font-[800] text-neutral-900 mt-4.5" style={{ transform: isHovered ? "translateZ(10px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>Drop your ZIP here</p>
        <p className="font-mono text-[10px] text-neutral-400 mt-1" style={{ transform: isHovered ? "translateZ(5px)" : "translateZ(0px)", transition: "transform 300ms ease" }}>or click to browse</p>
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      <button
        onClick={onBack}
        className="py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-300 text-center font-bold"
      >
        ← Back
      </button>
    </div>
  );
};

const DetectingView = () => (
  <div className="flex flex-col items-center justify-center py-14 gap-4.5">
    <SpinnerIcon />
    <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400">
      Analysing project structure…
    </p>
  </div>
);

const ImportingView = () => (
  <div className="flex flex-col items-center justify-center py-14 gap-4.5">
    <SpinnerIcon />
    <p className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-500 font-bold animate-pulse">
      Fetching & indexing project source…
    </p>
  </div>
);

const ReviewView = ({ detected, onConfirm, onBack }) => (
  <div className="flex flex-col gap-6">
    <div className="p-5 rounded-2xl border border-neutral-200/80 bg-white shadow-sm">
      <p className="font-mono text-[9px] uppercase tracking-wider text-neutral-400 mb-1">
        Detected Identity
      </p>
      <h3 className="font-display text-2xl font-[900] text-neutral-900 tracking-tightest leading-none">
        {detected.name}
      </h3>
      {detected.description && (
        <p className="font-mono text-[10px] text-neutral-500 mt-2 leading-relaxed">
          {detected.description}
        </p>
      )}
    </div>

    <div className="grid grid-cols-2 gap-3.5">
      <MetaRow label="Framework"    value={detected.framework} />
      <MetaRow label="Build Tool"   value={detected.buildTool ?? "—"} />
      <MetaRow label="React Version" value={detected.reactVersion ? `v${detected.reactVersion}` : "—"} />
      <MetaRow label="Package Version" value={detected.packageVersion ? `v${detected.packageVersion}` : "—"} />
    </div>

    <div className="flex flex-wrap gap-2 pt-1">
      <TechBadge label="TypeScript" active={detected.hasTypeScript} />
      <TechBadge label="Tailwind"   active={detected.hasTailwind} />
      <TechBadge label="Redux"      active={detected.hasRedux} />
      <TechBadge label="Router"     active={detected.hasRouter} />
    </div>

    {detected._zipParsePending && (
      <p className="font-mono text-[9px] text-neutral-400 border border-neutral-200 rounded-xl px-4 py-3 bg-white">
        Full ZIP analysis (dependencies, routes, components) will be available in Sprint 6.
      </p>
    )}

    <div className="flex gap-3.5 pt-2">
      <button
        onClick={onBack}
        className="flex-1 py-3.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-300 font-bold"
      >
        ← Back
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-3.5 rounded-xl bg-neutral-950 text-white font-mono text-xs uppercase tracking-wider font-bold hover:bg-neutral-850 hover:shadow-md transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      >
        Import Project
      </button>
    </div>
  </div>
);

const MetaRow = ({ label, value }) => (
  <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 shadow-sm">
    <p className="font-mono text-[8px] uppercase tracking-wider text-neutral-400 mb-0.5">{label}</p>
    <p className="font-mono text-[12px] text-neutral-900 font-bold">{value}</p>
  </div>
);

const ErrorView = ({ message, onBack }) => (
  <div className="flex flex-col items-center gap-5 py-8 text-center">
    <div className="w-11 h-11 rounded-full border border-red-200 bg-red-50 flex items-center justify-center text-red-500 text-lg font-bold">
      !
    </div>
    <div>
      <p className="font-display text-sm font-[800] text-neutral-900 mb-1">Import Failed</p>
      <p className="font-mono text-[10px] text-neutral-500 leading-relaxed max-w-xs mx-auto whitespace-pre-line">
        {message}
      </p>
    </div>
    <button
      onClick={onBack}
      className="px-6 py-2.5 rounded-xl border border-neutral-200 bg-white font-mono text-xs uppercase tracking-wider text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm transition-all duration-300 font-bold"
    >
      ← Try Again
    </button>
  </div>
);

export default ImportProjectModal;
