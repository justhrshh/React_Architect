import { useState } from "react";
import { useDispatch } from "react-redux";
import { renameProject } from "@/redux/slices/hubSlice";

/**
 * Modal for renaming an existing project.
 * Props:
 *   project — the project object to rename
 *   onClose — callback to close the modal
 */
const RenameModal = ({ project, onClose }) => {
  const dispatch = useDispatch();
  const [name, setName] = useState(project.name);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    if (name.trim() === project.name) {
      onClose();
      return;
    }
    dispatch(renameProject({ id: project.id, name }));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-obsidian/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-sm glass border border-edge-subtle rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-[800] text-white tracking-tightest mb-6">
          Rename Project
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            autoFocus
            className="w-full bg-white/5 border border-edge-subtle rounded-xl px-4 py-3 text-white text-sm font-sans placeholder:text-ink-faint focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-colors"
          />
          {error && (
            <p className="text-[10px] font-mono text-red-400">{error}</p>
          )}

          <div className="flex gap-3 mt-1">
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameModal;
