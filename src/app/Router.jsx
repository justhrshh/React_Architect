import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import LandingLayout from "../layouts/LandingLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import HubLayout from "../layouts/HubLayout.jsx";
import Landing from "../pages/Landing.jsx";
import ProjectHub from "../pages/ProjectHub.jsx";
import Workspace from "../pages/Workspace.jsx";
import { selectSelectedProjectId } from "../redux/slices/hubSlice.js";

/** Guard: redirect to /hub if no project is selected. */
function WorkspaceGuard() {
  const selectedProjectId = useSelector(selectSelectedProjectId);
  if (!selectedProjectId) {
    return <Navigate to="/hub" replace />;
  }
  return <WorkspaceLayout />;
}

function Router() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingLayout />}>
        <Route index element={<Landing />} />
      </Route>

      {/* Project Hub */}
      <Route path="/hub" element={<HubLayout />}>
        <Route index element={<ProjectHub />} />
      </Route>

      {/* Workspace — guarded: requires a selected project */}
      <Route path="/workspace" element={<WorkspaceGuard />}>
        <Route index element={<Workspace />} />
      </Route>
    </Routes>
  );
}

export default Router;
