import { parseFile } from "../parser/parser";
import { createNode } from "./nodeFactory";
import { createEdge } from "./edgeFactory";
import { validateGraph } from "./graphValidator";

// Helper to resolve relative and alias import paths
function resolveImportPath(currentFile, importPath) {
  if (!importPath.startsWith(".")) {
    if (importPath.startsWith("@/")) {
      return "src/" + importPath.substring(2);
    }
    if (importPath.startsWith("src/")) {
      return importPath;
    }
    return null; // External npm package
  }

  const fileDirParts = currentFile.split("/");
  fileDirParts.pop(); // remove filename

  const importParts = importPath.split("/");
  for (const part of importParts) {
    if (part === ".") continue;
    if (part === "..") {
      fileDirParts.pop();
    } else {
      fileDirParts.push(part);
    }
  }

  return fileDirParts.join("/");
}

/**
 * Builds the centralized Knowledge Graph representing the entire project structure.
 *
 * @param {Array<{name: string, path: string, content: string}>} files
 * @param {object} project - project metadata details
 * @returns {object} knowledgeGraph
 */
export function buildKnowledgeGraph(files, project) {
  const nodes = [];
  const edges = [];

  const fileMap = new Map();
  const componentMap = new Map();

  // 1. Run parser on all files
  const parsedFiles = files.map(file => {
    const cleanPath = file.path.replace(/\\/g, "/");
    const summary = parseFile(file.content, cleanPath);
    fileMap.set(cleanPath, { ...file, summary });
    
    // Register component declarations
    summary.components.forEach(comp => {
      componentMap.set(comp.name, cleanPath);
    });

    return { ...file, summary, path: cleanPath };
  });

  // 2. Create nodes (Factory orchestration)
  parsedFiles.forEach(file => {
    const summary = file.summary;
    const isMarkdown = file.path.endsWith(".md");

    // File Node
    nodes.push(
      createNode({
        id: `file:${file.path}`,
        kind: "file",
        subtype: isMarkdown ? "markdown" : "code",
        name: file.name,
        file: file.path,
        metadata: {
          loc: file.content.split("\n").length,
          content: isMarkdown ? file.content : undefined,
        },
      })
    );

    if (isMarkdown) return; // Skip parsing internal nodes for md docs

    // Component Nodes
    summary.components.forEach(comp => {
      // Determine subtype
      let subtype = "component";
      const pathLower = file.path.toLowerCase();
      const nameLower = comp.name.toLowerCase();

      if (pathLower.includes("/pages/") || pathLower.includes("/app/page") || nameLower.endsWith("page")) {
        subtype = "page";
      } else if (pathLower.includes("/layouts/") || nameLower.endsWith("layout")) {
        subtype = "layout";
      } else if (nameLower.endsWith("provider") || pathLower.includes("/providers/") || pathLower.includes("/contexts/")) {
        subtype = "provider";
      } else if (nameLower.endsWith("context")) {
        subtype = "context";
      }

      nodes.push(
        createNode({
          id: `component:${file.path}:${comp.name}`,
          kind: "component",
          subtype,
          name: comp.name,
          file: file.path,
          metadata: {
            props: comp.props,
            hooks: comp.hooks,
            contexts: comp.contexts,
            apiCalls: comp.apiCalls,
            children: comp.children,
            loc: comp.loc,
            line: comp.line,
          },
        })
      );

      // Edge from Component Node to its Declaring File Node
      edges.push(
        createEdge({
          type: "DEPENDENCY",
          source: `component:${file.path}:${comp.name}`,
          target: `file:${file.path}`,
          metadata: { reason: "declared_in" }
        })
      );
    });

    // Redux Slices / Store Nodes
    summary.redux.forEach(rdx => {
      const nodeId = `${rdx.type}:${file.path}:${rdx.name}`;
      nodes.push(
        createNode({
          id: nodeId,
          kind: "state",
          subtype: rdx.type, // "slice" | "store"
          name: rdx.name,
          file: file.path,
          metadata: {
            keys: rdx.keys || [],
            line: rdx.line,
          },
        })
      );
    });

    // Router and Route Nodes
    if (summary.routes.length > 0) {
      // Core Router Node
      const routerId = `router:${file.path}:core`;
      nodes.push(
        createNode({
          id: routerId,
          kind: "route",
          subtype: "router",
          name: "createBrowserRouter",
          file: file.path,
        })
      );

      // Route Path Nodes
      summary.routes.forEach(route => {
        const routeId = `route:${file.path}:${route.path}`;
        nodes.push(
          createNode({
            id: routeId,
            kind: "route",
            subtype: "endpoint",
            name: route.path,
            file: file.path,
            metadata: {
              componentName: route.component,
              line: route.line,
            },
          })
        );

        // ROUTE_PARENT edge connecting Core Router -> Route Endpoint
        edges.push(
          createEdge({
            type: "ROUTE_PARENT",
            source: routerId,
            target: routeId,
          })
        );
      });
    }

    // API Gateway & Endpoint Nodes
    summary.api.forEach(api => {
      if (api.type === "gateway") {
        nodes.push(
          createNode({
            id: `api:${file.path}:gateway`,
            kind: "api",
            subtype: "gateway",
            name: api.name,
            file: file.path,
            metadata: {
              baseURL: api.baseURL,
              line: api.line,
            },
          })
        );
      } else if (api.type === "endpoint") {
        const endpointId = `api:${file.path}:${api.method}:${api.path}`;
        nodes.push(
          createNode({
            id: endpointId,
            kind: "api",
            subtype: "endpoint",
            name: `${api.method} ${api.path}`,
            file: file.path,
            metadata: {
              method: api.method,
              path: api.path,
              line: api.line,
            },
          })
        );
      }
    });
  });

  // 3. Resolve imports & components rendering tree edges
  const componentNodes = nodes.filter(n => n.kind === "component");
  const fileNodes = nodes.filter(n => n.kind === "file");

  componentNodes.forEach(parentCompNode => {
    const parentFileObj = fileMap.get(parentCompNode.file);
    if (!parentFileObj) return;

    // Rendered children rendering link resolving
    const childComponentNames = parentCompNode.metadata.children || [];
    childComponentNames.forEach(childName => {
      let childFilePath = null;

      // Local declaration in the same file
      const localDecl = parentFileObj.summary.components.some(c => c.name === childName);
      if (localDecl) {
        childFilePath = parentCompNode.file;
      } else {
        // Find in imports
        const matchedImport = parentFileObj.summary.imports.find(imp => imp.name === childName);
        if (matchedImport) {
          const resolvedPath = resolveImportPath(parentCompNode.file, matchedImport.source);
          if (resolvedPath) {
            for (const filePath of fileMap.keys()) {
              const fileNoExt = filePath.replace(/\.[^/.]+$/, "");
              if (fileNoExt === resolvedPath || fileNoExt + "/index" === resolvedPath) {
                childFilePath = filePath;
                break;
              }
            }
          }
        }
      }

      // Global lookup fallback
      if (!childFilePath) {
        childFilePath = componentMap.get(childName);
      }

      // If resolved, create RENDERS edge
      if (childFilePath) {
        const childCompId = `component:${childFilePath}:${childName}`;
        edges.push(
          createEdge({
            type: "RENDERS",
            source: parentCompNode.id,
            target: childCompId,
          })
        );
      }
    });

    // Hook Consumers/API Calls edges
    const isAuth = parentCompNode.name.toLowerCase().includes("login") || parentCompNode.name.toLowerCase().includes("signup") || parentCompNode.name.toLowerCase().includes("auth");
    
    // Connect selector calls to redux slices
    const usesRedux = parentCompNode.metadata.hooks.some(h => h.includes("Selector") || h.includes("dispatch") || h.includes("Dispatch"));
    if (usesRedux) {
      const sliceNodeId = isAuth ? "slice-auth" : "slice-ui";
      // Find matching state slice nodes
      const matchedSlices = nodes.filter(n => n.kind === "state" && n.subtype === "slice");
      matchedSlices.forEach(sl => {
        const isAuthSlice = sl.name.toLowerCase().includes("auth");
        if ((isAuth && isAuthSlice) || (!isAuth && !isAuthSlice)) {
          edges.push(
            createEdge({
              type: "STATE_CONSUMER",
              source: sl.id,
              target: parentCompNode.id,
            })
          );
        }
      });
    }

    // Connect component API consumers to API endpoints
    const hasApiCall = parentCompNode.metadata.apiCalls.length > 0 || parentCompNode.metadata.hooks.some(h => h.toLowerCase().includes("fetch") || h.toLowerCase().includes("api"));
    if (hasApiCall) {
      const apiEndpoints = nodes.filter(n => n.kind === "api" && n.subtype === "endpoint");
      apiEndpoints.forEach(end => {
        const isAuthEnd = end.name.includes("login") || end.name.includes("signup") || end.name.includes("auth");
        if ((isAuth && isAuthEnd) || (!isAuth && !isAuthEnd)) {
          edges.push(
            createEdge({
              type: "USES_API",
              source: parentCompNode.id,
              target: end.id,
            })
          );
        }
      });
    }
  });

  // IMPORTS file edges mapping
  fileNodes.forEach(srcFileNode => {
    const srcFileObj = fileMap.get(srcFileNode.file);
    if (!srcFileObj) return;

    srcFileObj.summary.imports.forEach(imp => {
      const resolvedPath = resolveImportPath(srcFileNode.file, imp.source);
      if (resolvedPath) {
        for (const filePath of fileMap.keys()) {
          const fileNoExt = filePath.replace(/\.[^/.]+$/, "");
          if (fileNoExt === resolvedPath || fileNoExt + "/index" === resolvedPath) {
            edges.push(
              createEdge({
                type: "IMPORTS",
                source: srcFileNode.id,
                target: `file:${filePath}`,
                metadata: { line: imp.line }
              })
            );
            break;
          }
        }
      }
    });
  });

  // 4. Fallback seeding for empty projects or seed templates
  if (nodes.length === 0 || nodes.filter(n => n.kind === "component").length === 0) {
    // Generate default fallback components & routes
    nodes.push(
      createNode({ id: "component:src/App.jsx:App", kind: "component", subtype: "component", name: "App", file: "src/App.jsx" }),
      createNode({ id: "component:src/components/Sidebar.jsx:Sidebar", kind: "component", subtype: "component", name: "Sidebar", file: "src/components/Sidebar.jsx" }),
      createNode({ id: "component:src/components/FormInput.jsx:FormInput", kind: "component", subtype: "component", name: "FormInput", file: "src/components/FormInput.jsx" }),
      createNode({ id: "component:src/pages/Login.jsx:Login", kind: "component", subtype: "page", name: "Login", file: "src/pages/Login.jsx" }),
      createNode({ id: "component:src/pages/Signup.jsx:Signup", kind: "component", subtype: "page", name: "Signup", file: "src/pages/Signup.jsx" }),
      createNode({ id: "component:src/pages/Dashboard.jsx:Dashboard", kind: "component", subtype: "page", name: "Dashboard", file: "src/pages/Dashboard.jsx" }),
      createNode({ id: "component:src/components/AuthLayout.jsx:AuthLayout", kind: "component", subtype: "layout", name: "AuthLayout", file: "src/components/AuthLayout.jsx" })
    );

    edges.push(
      createEdge({ type: "RENDERS", source: "component:src/App.jsx:App", target: "component:src/components/AuthLayout.jsx:AuthLayout" }),
      createEdge({ type: "RENDERS", source: "component:src/components/AuthLayout.jsx:AuthLayout", target: "component:src/components/Sidebar.jsx:Sidebar" }),
      createEdge({ type: "RENDERS", source: "component:src/components/AuthLayout.jsx:AuthLayout", target: "component:src/pages/Login.jsx:Login" }),
      createEdge({ type: "RENDERS", source: "component:src/components/AuthLayout.jsx:AuthLayout", target: "component:src/pages/Signup.jsx:Signup" }),
      createEdge({ type: "RENDERS", source: "component:src/pages/Login.jsx:Login", target: "component:src/components/FormInput.jsx:FormInput" }),
      createEdge({ type: "RENDERS", source: "component:src/pages/Signup.jsx:Signup", target: "component:src/components/FormInput.jsx:FormInput" })
    );
  }

  // Ensure mock routers, slices, and endpoints also seed correctly for templates
  if (nodes.filter(n => n.kind === "route").length === 0) {
    const routerId = "router:src/app/router.jsx:core";
    nodes.push(
      createNode({ id: routerId, kind: "route", subtype: "router", name: "createBrowserRouter", file: "src/app/router.jsx" }),
      createNode({ id: "route:src/app/router.jsx:/", kind: "route", subtype: "endpoint", name: "/", file: "src/app/router.jsx", metadata: { componentName: "App" } }),
      createNode({ id: "route:src/app/router.jsx:/signup", kind: "route", subtype: "endpoint", name: "/signup", file: "src/app/router.jsx", metadata: { componentName: "Signup" } }),
      createNode({ id: "route:src/app/router.jsx:/dashboard", kind: "route", subtype: "endpoint", name: "/dashboard", file: "src/app/router.jsx", metadata: { componentName: "Dashboard" } })
    );
    edges.push(
      createEdge({ type: "ROUTE_PARENT", source: routerId, target: "route:src/app/router.jsx:/" }),
      createEdge({ type: "ROUTE_PARENT", source: routerId, target: "route:src/app/router.jsx:/signup" }),
      createEdge({ type: "ROUTE_PARENT", source: routerId, target: "route:src/app/router.jsx:/dashboard" })
    );
  }

  if (nodes.filter(n => n.kind === "state").length === 0) {
    const storeId = "store:src/redux/store.js:store";
    nodes.push(
      createNode({ id: storeId, kind: "state", subtype: "store", name: "ReduxStore", file: "src/redux/store.js" }),
      createNode({ id: "slice:src/redux/authSlice.js:auth", kind: "state", subtype: "slice", name: "authSlice", file: "src/redux/authSlice.js", metadata: { keys: ["currentUser", "users"] } }),
      createNode({ id: "slice:src/redux/uiSlice.js:ui", kind: "state", subtype: "slice", name: "uiSlice", file: "src/redux/uiSlice.js", metadata: { keys: ["appMode", "sidebarOpen"] } })
    );
    edges.push(
      createEdge({ type: "DEPENDENCY", source: storeId, target: "slice:src/redux/authSlice.js:auth" }),
      createEdge({ type: "DEPENDENCY", source: storeId, target: "slice:src/redux/uiSlice.js:ui" }),
      createEdge({ type: "STATE_CONSUMER", source: "slice:src/redux/authSlice.js:auth", target: "component:src/pages/Login.jsx:Login" }),
      createEdge({ type: "STATE_CONSUMER", source: "slice:src/redux/authSlice.js:auth", target: "component:src/pages/Signup.jsx:Signup" })
    );
  }

  if (nodes.filter(n => n.kind === "api").length === 0) {
    nodes.push(
      createNode({ id: "api:src/services/api.js:gateway", kind: "api", subtype: "gateway", name: "axiosClient", file: "src/services/api.js", metadata: { baseURL: "api.domain.com" } }),
      createNode({ id: "api:src/services/endpoints.js:POST:/auth/login", kind: "api", subtype: "endpoint", name: "POST /auth/login", file: "src/services/endpoints.js" }),
      createNode({ id: "api:src/services/endpoints.js:POST:/auth/signup", kind: "api", subtype: "endpoint", name: "POST /auth/signup", file: "src/services/endpoints.js" }),
      createNode({ id: "api:src/services/endpoints.js:GET:/projects", kind: "api", subtype: "endpoint", name: "GET /projects", file: "src/services/endpoints.js" })
    );
    edges.push(
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway", target: "api:src/services/endpoints.js:POST:/auth/login" }),
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway", target: "api:src/services/endpoints.js:POST:/auth/signup" }),
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway", target: "api:src/services/endpoints.js:GET:/projects" }),
      createEdge({ type: "USES_API", source: "component:src/pages/Login.jsx:Login", target: "api:src/services/endpoints.js:POST:/auth/login" }),
      createEdge({ type: "USES_API", source: "component:src/pages/Signup.jsx:Signup", target: "api:src/services/endpoints.js:POST:/auth/signup" })
    );
  }

  // 5. Run graph validation checks
  const validation = validateGraph(nodes, edges);

  return {
    version: "1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    projectId: project.id || "default-proj",
    project: {
      name: project.name || "Default Project",
      framework: project.framework || "React",
      language: project.language || "JavaScript",
      router: project.hasRouter ? "React Router" : "None",
      state: project.hasRedux ? "Redux Toolkit" : "Context API",
      buildTool: "Vite",
      packageManager: "npm",
      reactVersion: "19.0.0",
    },
    nodes,
    edges,
    validation,
    files: files.map(f => f.path),
    rawFiles: files,
  };
}
