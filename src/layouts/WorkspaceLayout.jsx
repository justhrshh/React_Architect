import { Outlet } from "react-router-dom";

function WorkspaceLayout() {
  return (
    <main className="min-h-screen overflow-hidden">
      <Outlet />
    </main>
  );
}

export default WorkspaceLayout;