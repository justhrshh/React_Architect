import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectSelectedProjectId } from "@/redux/slices/hubSlice";
import { purgeProjectData } from "@/services/projectCleanupService";

/**
 * Confirmation modal before deleting a project.
 * Performs full cascade deletion across storage, IndexedDB, and memory.
 *
 * Props:
 *   project — the project object to delete
 *   onClose — callback to close the modal
 */
const DeleteConfirmModal = ({ project, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedProjectId = useSelector(selectSelectedProjectId);

  const handleDelete = async () => {
    onClose();
    await purgeProjectData({
      projectId: project.id,
      dispatch,
      navigate,
      currentSelectedId: selectedProjectId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-sm bg-white border border-neutral-200 rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-[800] text-neutral-900 tracking-tightest mb-2">
          Delete Project?
        </h2>
        <p className="text-sm text-neutral-600 mb-8 leading-relaxed">
          <span className="text-neutral-900 font-semibold">{project.name}</span> will be permanently removed.
          All repository metadata, snapshots, analysis, and cached data will be completely erased. This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-neutral-200 font-mono text-xs uppercase tracking-widest text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-colors font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="flex-1 py-3 rounded-xl bg-red-600 text-white font-mono text-xs uppercase tracking-widest hover:bg-red-700 transition-colors font-bold shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
