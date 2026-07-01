import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingLayout from "../layouts/LandingLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import Landing from "../pages/Landing.jsx";
import Workspace from "../pages/Workspace.jsx";
import Hub from "../pages/Hub.jsx";

function Router() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingLayout />}>
        <Route index element={<Landing />} />
      </Route>

      {/* Workspace & Hub operating surfaces */}
      <Route path="/" element={<WorkspaceLayout />}>
        <Route path="hub" element={<Hub />} />
        <Route path="workspace" element={<Workspace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  );
}

export default Router;
