import { parseFile } from "../parser/parser.js";
import { extractFileBasedRoutes } from "../parser/extractors/fileRouteExtractor.js";
import { buildAliasMap } from "../parser/aliasResolver.js";
import { buildFileIndex, resolveModulePath, resolveComponentDeclaration } from "./importResolver.js";
import { createNode } from "./nodeFactory.js";
import { createEdge } from "./edgeFactory.js";
import { validateGraph } from "./graphValidator.js";

/**
 * Builds the centralized Knowledge Graph representing the entire project structure.
 *
 * Sprint 9.1 (Parser Accuracy) changes, at a glance:
 * - Path aliases are discovered from the project's own tsconfig/jsconfig/vite
 *   config instead of a hardcoded "@/ -> src/" guess (aliasResolver.js).
 * - Import/child-component resolution goes through a single shared resolver
 *   (importResolver.js) that understands extension-less imports, directory
 *   (index file) imports, and follows barrel re-exports to their real
 *   declaration - replacing three slightly-different ad hoc implementations
 *   that lived inline here before.
 * - Component nodes now include class components and `lazy()` placeholders;
 *   lazy components get a LAZY_LOADS edge to whatever they actually load.
 * - Dynamic `import()` calls produce IMPORTS edges flagged `dynamic: true`.
 * - Nested route configs (`children: [...]`) are preserved as a hierarchy
 *   with composed paths, and Next.js file-based routes/api-routes are
 *   merged in alongside explicitly-coded routes.
 * - Per-file processing is isolated with try/catch so one malformed file
 *   can't take down analysis of the rest of the project; collected issues
 *   are surfaced through graphValidator as PARSE_ERROR warnings instead of
 *   only going to the console.
 *
 * @param {Array<{name: string, path: string, content: string, isConfig?: boolean}>} files
 * @param {object} project - project metadata details
 * @returns {object} knowledgeGraph
 */
export function buildKnowledgeGraph(files, project) {
  const nodes = [];
  const edges = [];
  const diagnostics = []; // { type, message, file } - surfaced via graphValidator as warnings

  // Config files (tsconfig.json, vite.config.js, package.json) are used for
  // alias resolution but are not part of the architecture graph itself.
  const aliasMap = buildAliasMap(files);
  const graphFiles = files.filter((f) => !f.isConfig);

  const fileMap = new Map();
  const componentMap = new Map(); // legacy global fallback: component name -> declaring file

  // 1. Parse every source file. Each file is isolated so a single bad file
  //    can't abort the whole project scan.
  const parsedFiles = [];
  graphFiles.forEach((file) => {
    const cleanPath = file.path.replace(/\\/g, "/");
    try {
      const summary = parseFile(file.content, cleanPath);
      fileMap.set(cleanPath, { ...file, summary, path: cleanPath });
      parsedFiles.push({ ...file, summary, path: cleanPath });

      summary.components.forEach((comp) => componentMap.set(comp.name, cleanPath));

      (summary.parseErrors || []).forEach((err) => {
        diagnostics.push({ type: "PARSE_ERROR", message: `[${err.stage}] ${err.message}`, file: cleanPath });
      });
    } catch (err) {
      // Should be unreachable (parseFile already catches internally), but a
      // corrupt file object or unexpected throw here must still not abort
      // the rest of the project.
      diagnostics.push({ type: "PARSE_ERROR", message: `Unexpected failure processing file: ${err.message}`, file: cleanPath });
    }
  });

  const fileIndex = buildFileIndex(parsedFiles.map((f) => f.path));

  // 2. Create nodes (Factory orchestration)
  parsedFiles.forEach((file) => {
    try {
      buildNodesForFile(file, nodes, edges);
    } catch (err) {
      diagnostics.push({ type: "GRAPH_BUILD_ERROR", message: `Failed to build graph nodes: ${err.message}`, file: file.path });
    }
  });

  // 3. Resolve imports & component rendering-tree edges
  const componentNodes = nodes.filter((n) => n.kind === "component");
  const fileNodes = nodes.filter((n) => n.kind === "file");

  componentNodes.forEach((parentCompNode) => {
    try {
      resolveComponentEdges(parentCompNode, { fileMap, fileIndex, aliasMap, componentMap, nodes, edges });
    } catch (err) {
      diagnostics.push({ type: "GRAPH_BUILD_ERROR", message: `Failed to resolve edges for component: ${err.message}`, file: parentCompNode.file });
    }
  });

  // 4. Lazy component loading edges (React.lazy -> its dynamically imported target)
  componentNodes
    .filter((n) => n.subtype === "lazy" && n.metadata.lazyImportSource)
    .forEach((lazyNode) => {
      const resolvedPath = resolveModulePath(lazyNode.file, lazyNode.metadata.lazyImportSource, fileIndex, aliasMap);
      if (!resolvedPath) {
        diagnostics.push({
          type: "UNRESOLVED_IMPORT",
          message: `lazy() import "${lazyNode.metadata.lazyImportSource}" could not be resolved to a file.`,
          file: lazyNode.file,
        });
        return;
      }
      const resolvedComponent = resolveComponentDeclaration(resolvedPath, "default", fileMap, fileIndex, aliasMap);
      const targetId = resolvedComponent ? `component:${resolvedComponent.file}:${resolvedComponent.name}` : `file:${resolvedPath}`;
      edges.push(createEdge({ type: "LAZY_LOADS", source: lazyNode.id, target: targetId, metadata: { dynamic: true } }));
    });

  // 5. File-level IMPORTS edges (static + dynamic)
  fileNodes.forEach((srcFileNode) => {
    const srcFileObj = fileMap.get(srcFileNode.file);
    if (!srcFileObj) return;

    srcFileObj.summary.imports.forEach((imp) => {
      const resolvedPath = resolveModulePath(srcFileNode.file, imp.source, fileIndex, aliasMap);
      if (resolvedPath && fileMap.has(resolvedPath)) {
        edges.push(
          createEdge({
            type: "IMPORTS",
            source: srcFileNode.id,
            target: `file:${resolvedPath}`,
            metadata: { line: imp.line, dynamic: !!imp.dynamic },
          })
        );
      }
    });
  });

  // 6. Route hierarchy (JSX / object-based, including nested `children`) + Next.js file-based routing
  buildRouteGraph(parsedFiles, graphFiles, nodes, edges, project, { fileMap, fileIndex, aliasMap, componentMap });

  // 7. Fallback seeding for empty projects or seed templates
  seedFallbackGraphIfEmpty(nodes, edges);

  // 8. Run graph validation checks (parser/graph-build diagnostics are folded in as warnings)
  const validation = validateGraph(nodes, edges, diagnostics);

  return {
    version: "1.1.0",
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
    files: files.map((f) => f.path),
    rawFiles: files,
  };
}

// ---------------------------------------------------------------------------
// Node construction for a single parsed file
// ---------------------------------------------------------------------------

function buildNodesForFile(file, nodes, edges) {
  const summary = file.summary;
  const isMarkdown = file.path.endsWith(".md");

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

  if (isMarkdown) return;

  summary.components.forEach((comp) => {
    const subtype = deriveComponentSubtype(file.path, comp);

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
          isDefaultExport: !!comp.isDefaultExport,
          isClassComponent: !!comp.isClassComponent,
          lifecycleMethods: comp.lifecycleMethods || [],
          lazyImportSource: comp.lazyImportSource || null,
        },
      })
    );

    edges.push(
      createEdge({
        type: "DEPENDENCY",
        source: `component:${file.path}:${comp.name}`,
        target: `file:${file.path}`,
        metadata: { reason: "declared_in" },
      })
    );
  });

  summary.redux.forEach((rdx) => {
    if (rdx.type === "thunk") {
      // Thunks are metadata on their owning slice rather than a standalone
      // node - most projects have far more thunks than slices, and a
      // separate node per thunk would clutter the State studio without
      // adding a distinct architectural relationship.
      return;
    }
    const nodeId = `${rdx.type}:${file.path}:${rdx.name}`;
    nodes.push(
      createNode({
        id: nodeId,
        kind: "state",
        subtype: rdx.type,
        name: rdx.name,
        file: file.path,
        metadata: { keys: rdx.keys || [], line: rdx.line },
      })
    );
  });

  summary.api.forEach((api) => {
    if (api.type === "gateway") {
      nodes.push(
        createNode({
          id: `api:${file.path}:gateway:${api.name}`,
          kind: "api",
          subtype: "gateway",
          name: api.name,
          file: file.path,
          metadata: { baseURL: api.baseURL, line: api.line, source: api.source || "axios" },
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
          metadata: { method: api.method, path: api.path, line: api.line, source: api.source || "unknown" },
        })
      );
    }
  });
}

function deriveComponentSubtype(filePath, comp) {
  if (comp.subtypeHint === "lazy") return "lazy";

  const pathLower = filePath.toLowerCase();
  const nameLower = comp.name.toLowerCase();

  if (pathLower.includes("/pages/") || pathLower.includes("/app/page") || nameLower.endsWith("page")) return "page";
  if (pathLower.includes("/layouts/") || nameLower.endsWith("layout")) return "layout";
  if (nameLower.endsWith("provider") || pathLower.includes("/providers/") || pathLower.includes("/contexts/")) return "provider";
  if (nameLower.endsWith("context")) return "context";
  return "component";
}

// ---------------------------------------------------------------------------
// Component relationship resolution (RENDERS, STATE_CONSUMER, USES_API)
// ---------------------------------------------------------------------------

function resolveComponentEdges(parentCompNode, ctx) {
  const { fileMap, fileIndex, aliasMap, nodes, edges } = ctx;
  const parentFileObj = fileMap.get(parentCompNode.file);
  if (!parentFileObj) return;

  const childComponentNames = parentCompNode.metadata.children || [];
  childComponentNames.forEach((childName) => {
    const resolved = resolveChildComponent(childName, parentCompNode, parentFileObj, fileMap, fileIndex, aliasMap, nodes);
    if (resolved) {
      edges.push(
        createEdge({
          type: "RENDERS",
          source: parentCompNode.id,
          target: `component:${resolved.file}:${resolved.name}`,
        })
      );
    }
  });

  const isAuth = /login|signup|auth/.test(parentCompNode.name.toLowerCase());

  const usesRedux = parentCompNode.metadata.hooks.some((h) => h.includes("Selector") || h.includes("dispatch") || h.includes("Dispatch"));
  if (usesRedux) {
    const matchedSlices = nodes.filter((n) => n.kind === "state" && n.subtype === "slice");
    matchedSlices.forEach((sl) => {
      const isAuthSlice = sl.name.toLowerCase().includes("auth");
      if ((isAuth && isAuthSlice) || (!isAuth && !isAuthSlice)) {
        edges.push(createEdge({ type: "STATE_CONSUMER", source: sl.id, target: parentCompNode.id }));
      }
    });
  }

  const hasApiCall =
    parentCompNode.metadata.apiCalls.length > 0 ||
    parentCompNode.metadata.hooks.some((h) => h.toLowerCase().includes("fetch") || h.toLowerCase().includes("api"));
  if (hasApiCall) {
    const apiEndpoints = nodes.filter((n) => n.kind === "api" && n.subtype === "endpoint");
    apiEndpoints.forEach((end) => {
      const isAuthEnd = /login|signup|auth/.test(end.name);
      if ((isAuth && isAuthEnd) || (!isAuth && !isAuthEnd)) {
        edges.push(createEdge({ type: "USES_API", source: parentCompNode.id, target: end.id }));
      }
    });
  }
}

function resolveChildComponent(childName, parentCompNode, parentFileObj, fileMap, fileIndex, aliasMap, nodes) {
  // 1. Declared in the same file
  const localDecl = parentFileObj.summary.components.some((c) => c.name === childName);
  if (localDecl) return { file: parentCompNode.file, name: childName };

  // 2. Traceable to a specific import (handles aliases, directories, and barrel re-exports)
  const matchedImport = parentFileObj.summary.imports.find((imp) => imp.name === childName);
  if (matchedImport) {
    const resolvedPath = resolveModulePath(parentCompNode.file, matchedImport.source, fileIndex, aliasMap);
    if (resolvedPath) {
      const symbolToResolve = matchedImport.kind === "default" ? "default" : matchedImport.importedName;
      const declaration = resolveComponentDeclaration(resolvedPath, symbolToResolve, fileMap, fileIndex, aliasMap);
      if (declaration) return declaration;
      // Import resolved to a real file, but we couldn't pin down the exact
      // export (e.g. re-exported via a dynamic pattern we don't model).
      // Fall through to the global name-based fallback below rather than
      // silently dropping the relationship.
    }
  }

  // 3. Last-resort global fallback: match by component name anywhere in the project.
  //    This preserves pre-Sprint-9.1 behavior for import patterns we can't
  //    statically resolve, at the cost of occasionally linking to a
  //    same-named component in an unrelated file (documented limitation).
  const fallbackComp = nodes.find(n => n.kind === "component" && n.subtype !== "lazy" && n.name === childName);
  if (fallbackComp) return { file: fallbackComp.file, name: childName };

  return null;
}

// ---------------------------------------------------------------------------
// Route graph construction (nested hierarchy + Next.js file-based routing)
// ---------------------------------------------------------------------------

function buildRouteGraph(parsedFiles, graphFiles, nodes, edges, project, ctx) {
  parsedFiles.forEach((file) => {
    const summary = file.summary;
    if (!summary.routes || summary.routes.length === 0) return;

    const routerId = `router:${file.path}:core`;
    nodes.push(createNode({ id: routerId, kind: "route", subtype: "router", name: "Router", file: file.path }));

    summary.routes.forEach((route, index) => {
      addRouteNodeRecursive(route, routerId, file.path, `${index}`, nodes, edges, ctx);
    });
  });

  if (project?.framework === "Next.js") {
    const { pageRoutes, apiRoutes } = extractFileBasedRoutes(graphFiles);

    if (pageRoutes.length > 0) {
      const fileRouterId = "router:file-based:nextjs";
      nodes.push(createNode({ id: fileRouterId, kind: "route", subtype: "router", name: "Next.js File Router", file: "app/" }));

      pageRoutes.forEach((route) => {
        const routeId = `route:${route.file}:${route.path}`;
        nodes.push(
          createNode({
            id: routeId,
            kind: "route",
            subtype: "endpoint",
            name: route.path,
            file: route.file,
            metadata: { componentName: route.component, source: route.source },
          })
        );
        edges.push(createEdge({ type: "ROUTE_PARENT", source: fileRouterId, target: routeId }));
      });
    }

    if (apiRoutes.length > 0) {
      const gatewayId = "api:file-based:nextjs:gateway";
      nodes.push(
        createNode({ id: gatewayId, kind: "api", subtype: "gateway", name: "Next.js API Routes", file: "app/", metadata: { baseURL: "/api", source: "nextjs" } })
      );
      apiRoutes.forEach((api) => {
        const endpointId = `api:${api.file}:${api.method}:${api.path}`;
        nodes.push(
          createNode({
            id: endpointId,
            kind: "api",
            subtype: "endpoint",
            name: `${api.method} ${api.path}`,
            file: api.file,
            metadata: { method: api.method, path: api.path, source: api.source },
          })
        );
        edges.push(createEdge({ type: "DEPENDENCY", source: gatewayId, target: endpointId }));
      });
    }
  }
}

function addRouteNodeRecursive(route, parentId, filePath, positionKey, nodes, edges, ctx) {
  const { fileMap, fileIndex, aliasMap } = ctx;
  let componentName = route.component;

  // Resolve componentName if it matches an import alias in the router file
  const parentFileObj = fileMap.get(filePath);
  if (parentFileObj && componentName) {
    const matchedImport = parentFileObj.summary.imports.find((imp) => imp.name === componentName);
    if (matchedImport) {
      const resolvedPath = resolveModulePath(filePath, matchedImport.source, fileIndex, aliasMap);
      if (resolvedPath) {
        const symbolToResolve = matchedImport.kind === "default" ? "default" : matchedImport.importedName;
        const declaration = resolveComponentDeclaration(resolvedPath, symbolToResolve, fileMap, fileIndex, aliasMap);
        if (declaration) {
          componentName = declaration.name; // Use the actual declared component name!
        }
      }
    }
  }

  const routeId = `route:${filePath}:${positionKey}:${route.path}`;
  nodes.push(
    createNode({
      id: routeId,
      kind: "route",
      subtype: "endpoint",
      name: route.path,
      file: filePath,
      metadata: { componentName, line: route.line, index: !!route.index },
    })
  );
  edges.push(createEdge({ type: "ROUTE_PARENT", source: parentId, target: routeId }));

  (route.children || []).forEach((child, i) => {
    addRouteNodeRecursive(child, routeId, filePath, `${positionKey}.${i}`, nodes, edges, ctx);
  });
}

// ---------------------------------------------------------------------------
// Fallback seed graph (unchanged behavior: used for empty/template projects
// so the workspace never renders a completely blank void)
// ---------------------------------------------------------------------------

function seedFallbackGraphIfEmpty(nodes, edges) {
  if (nodes.length === 0 || nodes.filter((n) => n.kind === "component").length === 0) {
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

  if (nodes.filter((n) => n.kind === "route").length === 0) {
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

  if (nodes.filter((n) => n.kind === "state").length === 0) {
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

  if (nodes.filter((n) => n.kind === "api").length === 0) {
    nodes.push(
      createNode({ id: "api:src/services/api.js:gateway:axiosClient", kind: "api", subtype: "gateway", name: "axiosClient", file: "src/services/api.js", metadata: { baseURL: "api.domain.com" } }),
      createNode({ id: "api:src/services/endpoints.js:POST:/auth/login", kind: "api", subtype: "endpoint", name: "POST /auth/login", file: "src/services/endpoints.js" }),
      createNode({ id: "api:src/services/endpoints.js:POST:/auth/signup", kind: "api", subtype: "endpoint", name: "POST /auth/signup", file: "src/services/endpoints.js" }),
      createNode({ id: "api:src/services/endpoints.js:GET:/projects", kind: "api", subtype: "endpoint", name: "GET /projects", file: "src/services/endpoints.js" })
    );
    edges.push(
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway:axiosClient", target: "api:src/services/endpoints.js:POST:/auth/login" }),
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway:axiosClient", target: "api:src/services/endpoints.js:POST:/auth/signup" }),
      createEdge({ type: "DEPENDENCY", source: "api:src/services/api.js:gateway:axiosClient", target: "api:src/services/endpoints.js:GET:/projects" }),
      createEdge({ type: "USES_API", source: "component:src/pages/Login.jsx:Login", target: "api:src/services/endpoints.js:POST:/auth/login" }),
      createEdge({ type: "USES_API", source: "component:src/pages/Signup.jsx:Signup", target: "api:src/services/endpoints.js:POST:/auth/signup" })
    );
  }
}
