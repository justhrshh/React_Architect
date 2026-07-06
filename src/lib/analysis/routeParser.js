/**
 * routeParser.js
 *
 * Extracts route definitions (URL mappings) from scanned files for React Router
 * or Next.js folder routing.
 *
 * @param {Array<{path: string, content: string}>} files
 * @param {object} project - selected project metadata
 * @returns {{nodes: Array, edges: Array}}
 */
export function buildRouteGraph(files, project) {
  const nodes = [];
  const edges = [];

  // Determine if it is a Next.js project
  const isNext = project.framework === "Next.js";

  if (isNext) {
    // Next.js Folder-Based Routing
    files.forEach(file => {
      const cleanPath = file.path.replace(/\\/g, "/");
      if (cleanPath.startsWith("app/") && (cleanPath.endsWith("page.jsx") || cleanPath.endsWith("page.tsx"))) {
        // Derive URL path from folder structure
        let urlPath = "/";
        const parts = cleanPath.split("/");
        parts.shift(); // remove "app"
        parts.pop();   // remove "page.tsx"

        if (parts.length > 0) {
          // Filter out Next.js route groups like (marketing), (auth)
          const filteredParts = parts.filter(p => !p.startsWith("(") && !p.endsWith(")"));
          urlPath = "/" + filteredParts.join("/");
        }

        const componentName = parts.length > 0 
          ? parts[parts.length - 1].replace(/\b\w/g, c => c.toUpperCase()) + "Page"
          : "DashboardPage";

        nodes.push({
          id: `route-${urlPath}`,
          path: urlPath,
          componentName,
          filePath: cleanPath,
          type: "route",
          isPage: true,
        });
      }
    });
  } else {
    // React Router parsing (Regex AST signals)
    const jsxRouteRegex = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*element=\{<([A-Z]\w*)/g;
    const objectRouteRegex = /path:\s*["']([^"']+)["']\s*,\s*element:\s*<([A-Z]\w*)/g;

    const discoveredRoutes = new Map();

    files.forEach(file => {
      const content = file.content;
      
      // Look for JSX <Route path="/..." element={<Component />} />
      let match;
      while ((match = jsxRouteRegex.exec(content)) !== null) {
        const [, path, component] = match;
        discoveredRoutes.set(path, { path, component, file: file.path });
      }

      // Look for object path: "/...", element: <Component />
      while ((match = objectRouteRegex.exec(content)) !== null) {
        const [, path, component] = match;
        discoveredRoutes.set(path, { path, component, file: file.path });
      }
    });

    // Fallback: If no routes matched via regex (e.g. empty or complex router setup),
    // let's scan for files in pages/ and treat them as path names!
    if (discoveredRoutes.size === 0) {
      files.forEach(file => {
        const cleanPath = file.path.replace(/\\/g, "/");
        if (cleanPath.includes("src/pages/")) {
          const fileName = cleanPath.split("/").pop().replace(/\.[^/.]+$/, "");
          if (fileName !== "index") {
            const urlPath = fileName.toLowerCase() === "home" ? "/" : `/${fileName.toLowerCase()}`;
            discoveredRoutes.set(urlPath, {
              path: urlPath,
              component: fileName,
              file: cleanPath,
            });
          }
        }
      });
    }

    discoveredRoutes.forEach((val, path) => {
      nodes.push({
        id: `route-${path}`,
        path: path,
        componentName: val.component,
        filePath: val.file,
        type: "route",
        isPage: true,
      });
    });
  }

  // Fallback: If the project doesn't have files yet (e.g. default seed project fallbacks)
  if (nodes.length === 0) {
    if (project.framework === "Next.js") {
      nodes.push(
        { id: "route-root", path: "/", componentName: "DashboardPage", filePath: "app/dashboard/page.tsx", type: "route" },
        { id: "route-settings", path: "/settings", componentName: "SettingsPage", filePath: "app/settings/page.tsx", type: "route" },
        { id: "route-users", path: "/users", componentName: "UsersPage", filePath: "app/users/page.tsx", type: "route" }
      );
    } else if (project.hasRouter) {
      nodes.push(
        { id: "route-root", path: "/", componentName: "HomePage", filePath: "src/pages/HomePage.jsx", type: "route" },
        { id: "route-signup", path: "/signup", componentName: "SignupPage", filePath: "src/pages/SignupPage.jsx", type: "route" },
        { id: "route-dashboard", path: "/dashboard", componentName: "DashboardPage", filePath: "src/pages/DashboardPage.jsx", type: "route" }
      );
    } else {
      nodes.push(
        { id: "route-root", path: "/", componentName: "App", filePath: "src/App.jsx", type: "route" }
      );
    }
  }

  // Create layout coordinates
  // For routes, we can display them as a horizontal flow chart: e.g. Root Router -> Routes
  // Router node at the top
  const routerNode = {
    id: "router-core",
    path: "Router Core",
    componentName: "createBrowserRouter",
    filePath: isNext ? "NextJS File Router" : "src/router.jsx",
    type: "router",
    isPage: false,
    x: 888,
    y: 80,
  };

  const canvasWidth = 2100;
  const spacing = 320;
  const startX = (canvasWidth - (nodes.length * spacing)) / 2;

  // Add layout coordinate tags
  nodes.forEach((node, idx) => {
    node.x = startX + idx * spacing;
    node.y = 260;

    // Connect Router to every top level route page!
    edges.push({
      from: "router-core",
      to: node.id,
    });
  });

  return {
    nodes: [routerNode, ...nodes],
    edges,
  };
}

/**
 * Maps route nodes and edges to @xyflow/react format.
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string|null} selectedId
 * @returns {{rfNodes: Array, rfEdges: Array}}
 */
export function toReactFlowRoutes(nodes, edges, selectedId) {
  const connectedKeys = new Set();
  if (selectedId) {
    edges.forEach(e => {
      if (e.from === selectedId || e.to === selectedId) {
        connectedKeys.add(`${e.from}|${e.to}`);
        connectedKeys.add(e.from);
        connectedKeys.add(e.to);
      }
    });
  }

  const rfNodes = nodes.map(n => {
    const isSelected = selectedId === n.id;
    const isConnected = connectedKeys.has(n.id);
    
    return {
      id: n.id,
      type: "customRoute",
      position: { x: n.x, y: n.y },
      data: {
        node: n,
        isSelected,
        isConnected,
      },
      width: 240,
      height: 110,
    };
  });

  const rfEdges = edges.map(e => {
    const active = connectedKeys.has(`${e.from}|${e.to}`);
    return {
      id: `edge-${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      animated: active,
      style: {
        stroke: active ? "rgba(0, 229, 255, 0.7)" : "rgba(224, 227, 232, 0.5)",
        strokeWidth: active ? 2 : 1,
      },
    };
  });

  return { rfNodes, rfEdges };
}
