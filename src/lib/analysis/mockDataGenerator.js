const NW = 224;
const NH = 110;

/**
 * Generates dynamic fallback mock nodes and edges for showcase seed projects.
 *
 * @param {object} project
 * @returns {{nodes: Array, edges: Array}}
 */
export function getGraphDataForProject(project) {
  if (!project) return { nodes: [], edges: [] };

  const ext = project.hasTypeScript ? "tsx" : "jsx";
  const scriptExt = project.hasTypeScript ? "ts" : "js";

  // Case 1: Next.js framework (e.g. SaaS Dashboard)
  if (project.framework === "Next.js") {
    const nodes = [
      {
        id: "root-layout", name: "RootLayout", type: "layout", filePath: `app/layout.${ext}`,
        hookCount: 1, childCount: 2, apiCount: 0,
        hooks: ["useTheme"], children: ["Header", "Sidebar", "providers"], props: [{ name: "children", type: "ReactNode", required: true }],
        deps: ["next-themes"], imports: ["Header", "Sidebar", "Providers"],
        x: 888, y: 80,
      },
      {
        id: "providers", name: "Providers", type: "provider", filePath: `app/providers.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: [], children: [], props: [{ name: "children", type: "ReactNode", required: true }],
        deps: ["@tanstack/react-query"], imports: ["QueryClientProvider", "ThemeProvider"],
        x: 1200, y: 200,
      },
      {
        id: "page-dashboard", name: "DashboardPage", type: "page", filePath: `app/dashboard/page.${ext}`,
        hookCount: 3, childCount: 3, apiCount: 2,
        hooks: ["useDashboardData", "useState", "useMemo"], children: ["MetricCards", "RevenueChart", "RecentSales"],
        props: [], deps: ["recharts", "date-fns"], imports: ["MetricCards", "RevenueChart", "RecentSales"],
        x: 888, y: 270,
      },
      {
        id: "header", name: "Header", type: "component", filePath: `components/Header.${ext}`,
        hookCount: 2, childCount: 1, apiCount: 0,
        hooks: ["usePathname", "useAuth"], children: ["UserDropdown"],
        props: [], deps: ["lucide-react"], imports: ["UserDropdown", "SearchInput"],
        x: 262, y: 460,
      },
      {
        id: "sidebar", name: "Sidebar", type: "component", filePath: `components/Sidebar.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: ["usePathname"], children: [],
        props: [{ name: "collapsed", type: "boolean", required: false }],
        deps: [], imports: ["Link", "Logo"],
        x: 1480, y: 460,
      },
      {
        id: "metric-cards", name: "MetricCards", type: "component", filePath: `components/MetricCards.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: ["useMemo"], children: [],
        props: [{ name: "data", type: "Metric[]", required: true }],
        deps: [], imports: ["Card", "TrendingUp"],
        x: 640, y: 460,
      },
      {
        id: "revenue-chart", name: "RevenueChart", type: "component", filePath: `components/RevenueChart.${ext}`,
        hookCount: 2, childCount: 0, apiCount: 1,
        hooks: ["useSalesData", "useEffect"], children: [],
        props: [{ name: "range", type: "string", required: true }],
        deps: ["recharts"], imports: ["ResponsiveContainer", "AreaChart", "XAxis"],
        x: 888, y: 460,
      },
      {
        id: "recent-sales", name: "RecentSales", type: "component", filePath: `components/RecentSales.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 1,
        hooks: ["useRecentOrders"], children: [],
        props: [], deps: [], imports: ["Table", "Avatar"],
        x: 1130, y: 460,
      },
      {
        id: "userdropdown", name: "UserDropdown", type: "component", filePath: `components/UserDropdown.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: ["useAuth"], children: [],
        props: [], deps: ["@radix-ui/react-dropdown-menu"], imports: ["DropdownMenu", "Avatar"],
        x: 262, y: 650,
      }
    ];

    const edges = [
      { from: "root-layout", to: "providers" },
      { from: "root-layout", to: "header" },
      { from: "root-layout", to: "sidebar" },
      { from: "root-layout", to: "page-dashboard" },
      { from: "page-dashboard", to: "metric-cards" },
      { from: "page-dashboard", to: "revenue-chart" },
      { from: "page-dashboard", to: "recent-sales" },
      { from: "header", to: "userdropdown" },
    ];

    return { nodes, edges };
  }

  // Case 2: Simple React Project with NO Routing (e.g. GSAP Creative Room)
  if (!project.hasRouter) {
    const nodes = [
      {
        id: "app", name: "App", type: "provider", filePath: `src/App.${ext}`,
        hookCount: 2, childCount: 3, apiCount: 0,
        hooks: ["useRef", "useEffect"], children: ["CreativeCanvas", "ControlsOverlay", "ProjectTimeline"],
        props: [], deps: ["gsap"], imports: ["React", "gsap", "CreativeCanvas", "ControlsOverlay"],
        x: 888, y: 80,
      },
      {
        id: "canvas", name: "CreativeCanvas", type: "component", filePath: `src/components/CreativeCanvas.${ext}`,
        hookCount: 3, childCount: 1, apiCount: 0,
        hooks: ["useRef", "useGSAP", "useWindowSize"], children: ["ParticleEmitter"],
        props: [{ name: "activeIndex", type: "number", required: true }],
        deps: ["gsap", "three"], imports: ["three", "gsap", "ParticleEmitter"],
        x: 550, y: 270,
      },
      {
        id: "timeline", name: "ProjectTimeline", type: "component", filePath: `src/components/ProjectTimeline.${ext}`,
        hookCount: 2, childCount: 0, apiCount: 0,
        hooks: ["useMemo", "useGSAP"], children: [],
        props: [{ name: "slides", type: "Slide[]", required: true }, { name: "onSlideChange", type: "(idx: number) => void", required: true }],
        deps: ["gsap"], imports: ["useGSAP", "SlideItem"],
        x: 888, y: 270,
      },
      {
        id: "controls", name: "ControlsOverlay", type: "component", filePath: `src/components/ControlsOverlay.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: ["useCallback"], children: [],
        props: [{ name: "onNext", type: "() => void", required: true }, { name: "onPrev", type: "() => void", required: true }],
        deps: ["lucide-react"], imports: ["ChevronLeft", "ChevronRight"],
        x: 1220, y: 270,
      },
      {
        id: "particles", name: "ParticleEmitter", type: "component", filePath: `src/components/ParticleEmitter.${ext}`,
        hookCount: 1, childCount: 0, apiCount: 0,
        hooks: ["useRef"], children: [],
        props: [{ name: "count", type: "number", required: false }],
        deps: [], imports: ["useFrame"],
        x: 550, y: 460,
      }
    ];

    const edges = [
      { from: "app", to: "canvas" },
      { from: "app", to: "timeline" },
      { from: "app", to: "controls" },
      { from: "canvas", to: "particles" }
    ];

    return { nodes, edges };
  }

  // Case 3: Complete React app with Router (e.g. Portfolio, Legacy App)
  const nodes = [
    {
      id: "app", name: "App", type: "provider", filePath: `src/App.${ext}`,
      hookCount: project.hasRedux ? 2 : 1, childCount: 1, apiCount: 0,
      hooks: project.hasRedux ? ["useEffect", "useDispatch"] : ["useEffect"], children: ["RouterProvider"], props: [],
      deps: project.hasRedux ? ["react-redux", "react-router-dom"] : ["react-router-dom"],
      imports: project.hasRedux ? ["React", "RouterProvider", "Provider"] : ["React", "RouterProvider"],
      x: 888, y: 80,
    },
    {
      id: "router", name: "RouterProvider", type: "provider", filePath: `src/app/Router.${ext}`,
      hookCount: 1, childCount: 1, apiCount: 0,
      hooks: ["useRoutes"], children: ["MainLayout"],
      props: [], deps: ["react-router-dom"], imports: ["createBrowserRouter", "Outlet"],
      x: 888, y: 270,
    },
    {
      id: "layout", name: "MainLayout", type: "layout", filePath: `src/layouts/MainLayout.${ext}`,
      hookCount: project.hasRedux ? 2 : 1, childCount: 3, apiCount: 0,
      hooks: project.hasRedux ? ["useSelector", "useTheme"] : ["useTheme"], children: ["Header", "Sidebar", "Outlet"],
      props: [], deps: [], imports: ["Header", "Sidebar", "Outlet"],
      x: 888, y: 460,
    },
    {
      id: "header", name: "Header", type: "component", filePath: `src/components/Header.${ext}`,
      hookCount: 1, childCount: 1, apiCount: 0,
      hooks: ["useLocation"], children: ["Navbar"],
      props: [], deps: [], imports: ["Navbar", "Logo"],
      x: 262, y: 650,
    },
    {
      id: "main-page", name: "HomePage", type: "page", filePath: `src/pages/HomePage.${ext}`,
      hookCount: 2, childCount: 2, apiCount: 1,
      hooks: ["useState", "useEffect"], children: ["ProjectGrid", "ContactForm"],
      props: [], deps: [], imports: ["ProjectGrid", "ContactForm"],
      x: 888, y: 650,
    },
    {
      id: "sidebar", name: "Sidebar", type: "component", filePath: `src/components/Sidebar.${ext}`,
      hookCount: 1, childCount: 0, apiCount: 0,
      hooks: ["useLocation"], children: [],
      props: [{ name: "visible", type: "boolean", required: true }],
      deps: [], imports: ["NavLink"],
      x: 1480, y: 650,
    },
    {
      id: "navbar", name: "Navbar", type: "component", filePath: `src/components/Navbar.${ext}`,
      hookCount: 0, childCount: 0, apiCount: 0,
      hooks: [], children: [],
      props: [{ name: "links", type: "string[]", required: false }],
      deps: [], imports: [],
      x: 82, y: 840,
    },
    {
      id: "grid", name: "ProjectGrid", type: "component", filePath: `src/components/ProjectGrid.${ext}`,
      hookCount: 2, childCount: 0, apiCount: 1,
      hooks: ["useMemo", "useFetchProjects"], children: [],
      props: [{ name: "featuredOnly", type: "boolean", required: false }],
      deps: [], imports: ["Card", "useFetchProjects"],
      x: 758, y: 840,
    },
    {
      id: "form", name: "ContactForm", type: "component", filePath: `src/components/ContactForm.${ext}`,
      hookCount: 2, childCount: 0, apiCount: 1,
      hooks: ["useState", "useCallback"], children: [],
      props: [{ name: "onSubmitSuccess", type: "() => void", required: false }],
      deps: [], imports: ["sendEmail"],
      x: 1062, y: 840,
    }
  ];

  if (project.hasRedux) {
    nodes.push({
      id: "redux-store", name: "ReduxProvider", type: "provider", filePath: `src/redux/store.${scriptExt}`,
      hookCount: 0, childCount: 0, apiCount: 0,
      hooks: [], children: [],
      props: [{ name: "store", type: "Store", required: true }],
      deps: ["@reduxjs/toolkit"], imports: ["configureStore", "hubSlice"],
      x: 1200, y: 180,
    });
  }

  const edges = [
    { from: "app", to: "router" },
    { from: "router", to: "layout" },
    { from: "layout", to: "header" },
    { from: "layout", to: "main-page" },
    { from: "layout", to: "sidebar" },
    { from: "header", to: "navbar" },
    { from: "main-page", to: "grid" },
    { from: "main-page", to: "form" },
  ];

  if (project.hasRedux) {
    edges.push({ from: "app", to: "redux-store" });
  }

  const uniqueFiles = [...new Set(nodes.map(n => n.filePath))];
  return { nodes, edges, files: uniqueFiles };
}
