import React, { useState, useRef } from "react";
import RenameModal from "./RenameModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

const FRAMEWORK_COLORS = {
  "React":             "#61DAFB",
  "Next.js":           "#ffffff",
  "Create React App":  "#09D3AC",
  "Vite":              "#BD34FE",
  "Remix":             "#E8F2FF",
  "Gatsby":            "#663399",
  "Astro":             "#FF5D01",
  "Expo":              "#000020",
  "React Native":      "#61DAFB",
  "Other":             "#A1A1AA",
};

const IMPORT_METHOD_LABEL = {
  folder: "Local Folder",
  zip:    "ZIP Archive",
  github: "GitHub",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const TechPill = ({ label }) => (
  <span className="font-mono text-[8px] uppercase tracking-widestest px-1.5 py-0.5 rounded border border-white/8 text-ink-faint">
    {label}
  </span>
);

/**
 * Premium project card.
 * Props:
 *   project  — project object (from hubSlice)
 *   onOpen   — callback to open this project
 */
const ProjectCard = ({ project, onOpen }) => {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const menuRef = useRef();

  const frameworkColor = FRAMEWORK_COLORS[project.framework] ?? "#A1A1AA";

  // Collect active tech flags
  const techFlags = [
    project.hasTypeScript && "TS",
    project.hasTailwind   && "Tailwind",
    project.hasRedux      && "Redux",
    project.hasRouter     && "Router",
  ].filter(Boolean);

  return (
    <>
      <div
        className="group relative flex flex-col glass border border-edge-subtle rounded-2xl p-6 cursor-pointer hover:border-white/15 hover:-translate-y-1 transition-all duration-300"
        onClick={onOpen}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 36px -8px ${frameworkColor}22`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
          setMenuOpen(false);
        }}
      >
        {/* ── Top row ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          {/* Framework badge */}
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widestest px-2.5 py-1 rounded-full border"
            style={{
              color:           frameworkColor,
              borderColor:     `${frameworkColor}40`,
              backgroundColor: `${frameworkColor}10`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: frameworkColor }} />
            {project.framework}
          </span>

          {/* Context menu trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg border border-edge-subtle text-ink-dim hover:text-white hover:border-white/20 transition-all text-xs"
            >
              ···
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-9 z-20 w-36 glass border border-edge-subtle rounded-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widestest text-ink-dim hover:text-white hover:bg-white/5 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowRename(true); setMenuOpen(false); }}
                >
                  Rename
                </button>
                <button
                  className="w-full text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widestest text-red-400 hover:bg-red-500/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setShowDelete(true); setMenuOpen(false); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Project name ────────────────────────────────────── */}
        <h3 className="font-display text-xl font-[800] text-white tracking-tightest leading-none mb-1 group-hover:text-accent transition-colors duration-300">
          {project.name}
        </h3>
        {project.description && (
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed mt-1 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* ── Tech flag badges ─────────────────────────────────── */}
        {techFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {techFlags.map((t) => <TechPill key={t} label={t} />)}
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="my-4 h-px bg-white/5" />

        {/* ── Meta grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <MetaCell label="Last Opened" value={timeAgo(project.lastOpenedAt)} />
          <MetaCell label="React"        value={project.reactVersion ? `v${project.reactVersion}` : "—"} />
          <MetaCell label="Build Tool"   value={project.buildTool ?? "—"} />
          <MetaCell label="Arch. Score"  value={project.architectureScore ?? "—"} />
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="font-mono text-[9px] uppercase tracking-widestest text-accent">
            Open workspace →
          </span>
          {project.importMethod && (
            <span className="font-mono text-[8px] uppercase tracking-widestest text-ink-faint">
              {IMPORT_METHOD_LABEL[project.importMethod] ?? project.importMethod}
            </span>
          )}
        </div>
      </div>

      {showRename && <RenameModal project={project} onClose={() => setShowRename(false)} />}
      {showDelete && <DeleteConfirmModal project={project} onClose={() => setShowDelete(false)} />}
    </>
  );
};

const MetaCell = ({ label, value }) => (
  <div>
    <p className="font-mono text-[8px] uppercase tracking-widestest text-ink-faint mb-0.5">{label}</p>
    <p className="font-mono text-ink-dim">{value}</p>
  </div>
);

export default ProjectCard;
