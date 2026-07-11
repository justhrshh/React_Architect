import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import LandingLayout from "../layouts/LandingLayout.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import Landing from "../pages/Landing.jsx";

const Hub = lazy(() => import("../pages/Hub.jsx"));
const Workspace = lazy(() => import("../pages/Workspace.jsx"));
const Architecture = lazy(() => import("../pages/Architecture.jsx"));
const RoutesPage = lazy(() => import("../pages/Routes.jsx"));
const StateFlow = lazy(() => import("../pages/StateFlow.jsx"));
const ApiFlow = lazy(() => import("../pages/ApiFlow.jsx"));
const Documentation = lazy(() => import("../pages/Documentation.jsx"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#05080E",
        color: "rgba(255,255,255,0.72)",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
      }}
    >
      Loading Architect Surface
    </div>
  );
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
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
      </Suspense>
    </>
  );
}

export default Router;
