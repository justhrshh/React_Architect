import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addProject } from "@/redux/slices/hubSlice";

const FRAMEWORKS = ["React", "Next.js", "Vite", "Remix", "Other"];

/**
 * Modal for creating a new project.
 * Props:
 *   onClose — callback to close the modal
 */
const AddProjectModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("React");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    dispatch(addProject({ name, framework }));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />

      {/* Modal panel */}
      <div
        className="relative w-full max-w-md glass border border-edge-subtle rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-[800] text-white tracking-tightest leading-none">
              New Project
            </h2>
            <p className="font-mono text-[10px] uppercase tracking-widestest text-ink-faint mt-1">
              Create a workspace
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-edge-subtle text-ink-dim hover:text-white hover:border-white/20 transition-colors font-mono text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Project Name */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widestest text-ink-faint mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="My Awesome App"
              autoFocus
              className="w-full bg-white/5 border border-edge-subtle rounded-xl px-4 py-3 text-white text-sm font-sans placeholder:text-ink-faint focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-colors"
            />
            {error && (
              <p className="mt-1.5 text-[10px] font-mono text-red-400">{error}</p>
            )}
          </div>

          {/* Framework */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widestest text-ink-faint mb-2">
              Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full bg-white/5 border border-edge-subtle rounded-xl px-4 py-3 text-white text-sm font-sans focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-colors appearance-none cursor-pointer"
            >
              {FRAMEWORKS.map((f) => (
                <option key={f} value={f} className="bg-surface text-white">
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-edge-subtle font-mono text-xs uppercase tracking-widestest text-ink-dim hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-accent text-obsidian font-mono text-xs uppercase tracking-widestest font-semibold hover:bg-accent/90 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
