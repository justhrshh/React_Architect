import { Outlet } from "react-router-dom";
import CursorBlob from "@/components/ambient/CursorBlob";
import Noise from "@/components/ambient/Noise";

function HubLayout() {
  return (
    <div className="relative min-h-screen bg-obsidian text-ink overflow-x-hidden">
      <CursorBlob />
      <Noise />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}

export default HubLayout;
