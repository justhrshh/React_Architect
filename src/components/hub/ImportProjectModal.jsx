import React, { useState, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { addProject } from "@/redux/slices/hubSlice";
import {
  detectFromDirectoryHandle,
  detectFromZip,
} from "@/lib/projectDetector";

// ---------------------------------------------------------------------------
// Icon components (inline SVG — no extra dep)
// ---------------------------------------------------------------------------
const FolderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
  </svg>
);

const ZipIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6M12 18v-2M12 14v-2M12 10V8"/>
  </svg>
);

const GithubIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Feature flag badge
// ---------------------------------------------------------------------------
const TechBadge = ({ label, active }) => (
  active ? (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-widestest px-2 py-0.5 rounded-full border border-accent/30 bg-accent/10 text-accent">
      <CheckIcon /> {label}
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
  ERROR:     "error",     // show error
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
/**
 * ImportProjectModal — replaces the old AddProjectModal.
 * Supports three import paths: Local Folder, ZIP, GitHub (coming soon).
 *
 * Props:
 *   onClose  — callback to close the modal
 */
const ImportProjectModal = ({ onClose }) => {
  const dispatch = useDispatch();

  const [view, setView]           = useState(STATES.IDLE);
  const [detected, setDetected]   = useState(null);
  const [errorMsg, setErrorMsg]   = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const zipInputRef = useRef();

  // -------------------------------------------------------------------------
  // Local Folder — File System Access API
  // -------------------------------------------------------------------------
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
      setDetected(result);
      setView(STATES.REVIEW);
    } catch (err) {
      // User cancelled the picker — return to idle silently
      if (err.name === "AbortError") {
        setView(STATES.IDLE);
        return;
      }
      setErrorMsg(err.message ?? "Failed to read the selected folder.");
      setView(STATES.ERROR);
    }
  }, []);

  // -------------------------------------------------------------------------
  // ZIP import
  // -------------------------------------------------------------------------
  const processZip = useCallback(async (file) => {
    if (!file || !file.name.endsWith(".zip")) {
      setErrorMsg("Please select a valid .zip archive.");
      setView(STATES.ERROR);
      return;
    }
    setView(STATES.DETECTING);
    try {
      const result = await detectFromZip(file);
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

  // -------------------------------------------------------------------------
  // Confirm import
  // -------------------------------------------------------------------------
  const handleConfirm = () => {
    if (!detected) return;
    dispatch(addProject(detected));
    onClose();
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-obsidian/85 backdrop-blur-xl" />

      <div
        className="relative w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel */}
        <div className="glass border border-edge-subtle rounded-2xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-edge-subtle">
            <div>
              <h2 className="font-display text-2xl font-[800] text-white tracking-tightest leading-none">
                {view === STATES.REVIEW ? "Review Import" : "Import Project"}
              </h2>
              <p className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint mt-1.5">
                {view === STATES.REVIEW
                  ? "Confirm detected project details"
                  : "React Architect will discover your project automatically"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-edge-subtle text-ink-dim hover:text-white hover:border-white/20 transition-colors font-mono text-sm flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-7 py-6">
            {view === STATES.IDLE     && <IdleView onFolder={handleSelectFolder} onZip={() => setView(STATES.ZIP_DROP)} />}
            {view === STATES.ZIP_DROP && <ZipDropView zipInputRef={zipInputRef} isDragging={isDragging} setIsDragging={setIsDragging} onDrop={handleDrop} onInputChange={handleZipInputChange} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.DETECTING && <DetectingView />}
            {view === STATES.REVIEW   && <ReviewView detected={detected} onConfirm={handleConfirm} onBack={() => setView(STATES.IDLE)} />}
            {view === STATES.ERROR    && <ErrorView message={errorMsg} onBack={() => { setErrorMsg(""); setView(STATES.IDLE); }} />}
          </div>

          {/* Footer note */}
          {view === STATES.IDLE && (
            <div className="px-7 pb-6">
              <div className="border-t border-edge-subtle pt-5">
                <p className="font-mono text-[9px] uppercase tracking-widestest text-ink-faint mb-3">
                  Auto-detected from your project
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Project Name", "Framework", "React Version", "Build Tool", "TypeScript", "Tailwind", "Redux"].map((t) => (
                    <span key={t} className="font-mono text-[8px] uppercase tracking-widestest px-2 py-1 rounded border border-edge-subtle text-ink-faint">
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
  <div className="flex flex-col gap-3">
    {/* Local Folder — primary */}
    <ImportOption
      icon={<FolderIcon />}
      title="Select Local Folder"
      desc="Choose an existing React project on your machine"
      accent="#00E5FF"
      onClick={onFolder}
    />

    {/* ZIP Archive */}
    <ImportOption
      icon={<ZipIcon />}
      title="Import ZIP Archive"
      desc="Drop or select a zipped React project"
      accent="#BD34FE"
      onClick={onZip}
    />

    {/* GitHub — coming soon */}
    <ImportOption
      icon={<GithubIcon />}
      title="Connect GitHub Repository"
      desc="Clone directly from a GitHub URL"
      accent="#A1A1AA"
      comingSoon
    />
  </div>
);

const ImportOption = ({ icon, title, desc, accent, onClick, comingSoon }) => (
  <button
    onClick={comingSoon ? undefined : onClick}
    disabled={comingSoon}
    className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 group ${
      comingSoon
        ? "border-edge-subtle opacity-40 cursor-not-allowed"
        : "border-edge-subtle hover:border-white/15 hover:bg-white/3 cursor-pointer"
    }`}
    style={comingSoon ? undefined : {
      "--hover-glow": `${accent}15`,
    }}
    onMouseEnter={(e) => !comingSoon && (e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${accent}20`)}
    onMouseLeave={(e) => !comingSoon && (e.currentTarget.style.boxShadow = "none")}
  >
    <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg border border-edge-subtle text-ink-dim group-hover:text-white group-hover:border-white/15 transition-colors"
      style={!comingSoon ? { color: accent, borderColor: `${accent}30`, background: `${accent}08` } : undefined}
    >
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-display text-sm font-[700] text-white tracking-tightest">{title}</span>
        {comingSoon && (
          <span className="font-mono text-[8px] uppercase tracking-widestest px-1.5 py-0.5 rounded border border-white/10 text-ink-faint">
            Coming soon
          </span>
        )}
      </div>
      <p className="font-mono text-[10px] text-ink-faint mt-0.5">{desc}</p>
    </div>
    {!comingSoon && (
      <span className="text-ink-faint group-hover:text-white transition-colors text-lg">→</span>
    )}
  </button>
);

const ZipDropView = ({ zipInputRef, isDragging, setIsDragging, onDrop, onInputChange, onBack }) => (
  <div className="flex flex-col gap-4">
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
        isDragging ? "border-accent/60 bg-accent/5" : "border-edge-subtle hover:border-white/15"
      }`}
      onClick={() => zipInputRef.current?.click()}
    >
      <ZipIcon />
      <p className="font-display text-sm font-[700] text-white mt-3">Drop your ZIP here</p>
      <p className="font-mono text-[10px] text-ink-faint mt-1">or click to browse</p>
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
      className="font-mono text-[10px] uppercase tracking-widestest text-ink-dim hover:text-white transition-colors text-center"
    >
      ← Back
    </button>
  </div>
);

const DetectingView = () => (
  <div className="flex flex-col items-center justify-center py-12 gap-4">
    <SpinnerIcon />
    <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint">
      Analysing project…
    </p>
  </div>
);

const ReviewView = ({ detected, onConfirm, onBack }) => (
  <div className="flex flex-col gap-5">
    {/* Project identity */}
    <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
      <p className="font-mono text-[9px] uppercase tracking-widestest text-accent mb-1">
        Detected Project
      </p>
      <h3 className="font-display text-2xl font-[800] text-white tracking-tightest leading-none">
        {detected.name}
      </h3>
      {detected.description && (
        <p className="font-mono text-[10px] text-ink-dim mt-1 leading-relaxed">
          {detected.description}
        </p>
      )}
    </div>

    {/* Detected metadata grid */}
    <div className="grid grid-cols-2 gap-3">
      <MetaRow label="Framework"    value={detected.framework} />
      <MetaRow label="Build Tool"   value={detected.buildTool ?? "—"} />
      <MetaRow label="React"        value={detected.reactVersion ? `v${detected.reactVersion}` : "—"} />
      <MetaRow label="Package"      value={detected.packageVersion ? `v${detected.packageVersion}` : "—"} />
    </div>

    {/* Tech flag badges */}
    <div className="flex flex-wrap gap-2">
      <TechBadge label="TypeScript" active={detected.hasTypeScript} />
      <TechBadge label="Tailwind"   active={detected.hasTailwind} />
      <TechBadge label="Redux"      active={detected.hasRedux} />
      <TechBadge label="Router"     active={detected.hasRouter} />
    </div>

    {/* ZIP note */}
    {detected._zipParsePending && (
      <p className="font-mono text-[9px] text-ink-faint border border-edge-subtle rounded-lg px-3 py-2">
        Full ZIP analysis (dependencies, routes, components) will be available in Sprint 6.
      </p>
    )}

    {/* Actions */}
    <div className="flex gap-3 pt-1">
      <button
        onClick={onBack}
        className="flex-1 py-3 rounded-xl border border-edge-subtle font-mono text-xs uppercase tracking-widestest text-ink-dim hover:text-white hover:border-white/20 transition-colors"
      >
        ← Back
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-3 rounded-xl bg-accent text-obsidian font-mono text-xs uppercase tracking-widestest font-semibold hover:bg-accent/90 transition-colors"
      >
        Import Project
      </button>
    </div>
  </div>
);

const MetaRow = ({ label, value }) => (
  <div className="p-3 rounded-lg bg-white/3 border border-edge-subtle">
    <p className="font-mono text-[8px] uppercase tracking-widestest text-ink-faint mb-0.5">{label}</p>
    <p className="font-mono text-[11px] text-white">{value}</p>
  </div>
);

const ErrorView = ({ message, onBack }) => (
  <div className="flex flex-col items-center gap-5 py-6 text-center">
    <div className="w-10 h-10 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 text-lg">
      !
    </div>
    <div>
      <p className="font-display text-sm font-[700] text-white mb-1">Import Failed</p>
      <p className="font-mono text-[10px] text-ink-dim leading-relaxed max-w-xs mx-auto whitespace-pre-line">
        {message}
      </p>
    </div>
    <button
      onClick={onBack}
      className="px-6 py-2.5 rounded-xl border border-edge-subtle font-mono text-xs uppercase tracking-widestest text-ink-dim hover:text-white hover:border-white/20 transition-colors"
    >
      ← Try Again
    </button>
  </div>
);

export default ImportProjectModal;
