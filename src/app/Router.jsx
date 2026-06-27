import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingLayout from "../layouts/LandingLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import Landing from "../pages/Landing.jsx";
import Workspace from "../pages/Workspace.jsx";

function Router() {
  return (
    <Routes>
      <Route path="/" element={<LandingLayout />}>
        <Route index element={<Landing />} />
      </Route>

      <Route path="/workspace" element={<WorkspaceLayout />}>
        <Route index element={<Workspace />} />
      </Route>
    </Routes>
  );
}

export default Router;
