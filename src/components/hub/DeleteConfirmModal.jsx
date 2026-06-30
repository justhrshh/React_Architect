import React from "react";
import { useDispatch } from "react-redux";
import { deleteProject } from "@/redux/slices/hubSlice";

/**
 * Confirmation modal before deleting a project.
 * Props:
 *   project — the project object to delete
 *   onClose — callback to close the modal
 */
const DeleteConfirmModal = ({ project, onClose }) => {
  const dispatch = useDispatch();

  const handleDelete = () => {
    dispatch(deleteProject(project.id));
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
        <h2 className="font-display text-xl font-[800] text-white tracking-tightest mb-2">
          Delete Project?
        </h2>
        <p className="text-sm text-ink-dim mb-8 leading-relaxed">
          <span className="text-white font-semibold">{project.name}</span> will be permanently removed.
          This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-edge-subtle font-mono text-xs uppercase tracking-widestest text-ink-dim hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs uppercase tracking-widestest hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
