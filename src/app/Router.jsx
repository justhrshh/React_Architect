import { Routes, Route, Navigate } from "react-router-dom";
import LandingLayout from "../layouts/LandingLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import Landing from "../pages/Landing.jsx";
import Workspace from "../pages/Workspace.jsx";
import Hub from "../pages/Hub.jsx";
import Architecture from "../pages/Architecture.jsx";
import RoutesPage from "../pages/Routes.jsx";
import StateFlow from "../pages/StateFlow.jsx";
import ApiFlow from "../pages/ApiFlow.jsx";
import Documentation from "../pages/Documentation.jsx";

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
        <Route path="architecture" element={<Architecture />} />
        <Route path="routes" element={<RoutesPage />} />
        <Route path="state" element={<StateFlow />} />
        <Route path="api" element={<ApiFlow />} />
        <Route path="docs" element={<Documentation />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  );
}

export default Router;
