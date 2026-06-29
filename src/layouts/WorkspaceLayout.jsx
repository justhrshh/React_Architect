import { Outlet } from "react-router-dom";
import CursorBlob from "@/components/ambient/CursorBlob";
import Noise from "@/components/ambient/Noise";

function WorkspaceLayout() {
  return (
    <div className="relative min-h-screen bg-obsidian text-ink">
      <CursorBlob />
      <Noise />
      <main className="relative z-10 w-full h-full">
        <Outlet />
      </main>
    </div>
  );
}

export default WorkspaceLayout;