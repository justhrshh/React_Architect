import { parseFile } from "../parser/parser.js";
import { extractFileBasedRoutes } from "../extractors/frontend/react/fileRouteExtractor.js";
import { buildAliasMap } from "../resolvers/aliasResolver.js";
import { buildFileIndex, resolveModulePath, resolveComponentDeclaration } from "../resolvers/importResolver.js";
import { resolveRelationshipEdges } from "../resolvers/relationshipResolvers.js";
import { resolveExpressRelationships } from "../resolvers/expressResolvers.js";
import { createNode, createNodeId } from "./nodeFactory.js";
import { createEdge, createEdgeId } from "./edgeFactory.js";
import { validateGraph } from "./graphValidator.js";
import { buildFileManifest, createGraphLookupMaps } from "./incrementalTracker.js";

/**
 * Builds the centralized Knowledge Graph representing the entire project structure.
 *
 * @param {Array<{name: string, path: string, content: string, isConfig?: boolean}>} files
 * @param {object} project - project metadata details
 * @returns {object} knowledgeGraph
 */
export function buildKnowledgeGraph(files, project) {
  const nodes = [];
  const edges = [];
  const diagnostics = [];

  const aliasMap = buildAliasMap(files);
  const graphFiles = files.filter((f) => !f.isConfig);

  const fileMap = new Map();
  const componentMap = new Map();

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
      diagnostics.push({ type: "PARSE_ERROR", message: `Unexpected failure processing file: ${err.message}`, file: cleanPath });
    }
  });

  const fileIndex = buildFileIndex(parsedFiles.map((f) => f.path));

  parsedFiles.forEach((file) => {
    try {
      buildNodesForFile(file, nodes, edges);
    } catch (err) {
      diagnostics.push({ type: "GRAPH_BUILD_ERROR", message: `Failed to build graph nodes: ${err.message}`, file: file.path });
    }
  });

  resolveRelationshipEdges(nodes, edges, { fileMap, fileIndex, aliasMap, componentMap }, diagnostics);

  // Express Relationship Edge & Universal Schema Resolver
  resolveExpressRelationships(nodes, edges, fileMap, diagnostics);

  buildRouteGraph(parsedFiles, graphFiles, nodes, edges, project, { fileMap, fileIndex, aliasMap, componentMap });

  // seedFallbackGraphIfEmpty() was removed here.
  // Synthetic fallback nodes are now produced exclusively by DemoSourceProvider
  // in sourceProviders.js, making them unreachable for real imported projects.


  const uniqueEdgesMap = new Map();
  edges.forEach((e) => {
    const key = e.id || createEdgeId(e.type, e.source, e.target);
    if (!uniqueEdgesMap.has(key)) {
      uniqueEdgesMap.set(key, e);
    }
  });
  const uniqueEdges = Array.from(uniqueEdgesMap.values());

  const validation = validateGraph(nodes, uniqueEdges, diagnostics);

  const manifest = buildFileManifest(files);
  const incrementalLookups = createGraphLookupMaps({ nodes, edges: uniqueEdges });

  return {
    version: "2.0.0",
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
    edges: uniqueEdges,
    validation,
    manifest: Object.fromEntries(manifest),
    incremental: {
      fileToNodes: Object.fromEntries(
        Array.from(incrementalLookups.fileToNodes.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      nodeToEdges: Object.fromEntries(
        Array.from(incrementalLookups.nodeToEdges.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
    },
    files: files.map((f) => f.path),
    rawFiles: files,
  };
}

function buildNodesForFile(file, nodes, edges) {
  const summary = file.summary;
  const isMarkdown = file.path.endsWith(".md");

  nodes.push(
    createNode({
      id: createNodeId("file", file.path, file.name),
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
    const compId = createNodeId("component", file.path, comp.name);

    nodes.push(
      createNode({
        id: compId,
        kind: "component",
        subtype,
        name: comp.name,
        file: file.path,
        metadata: {
          props: comp.props,
          hooks: comp.hooks,
          contexts: comp.contexts,
          apiCalls: comp.apiCalls,
          reduxSlices: comp.reduxSlices || [],
          dispatchedActions: comp.dispatchedActions || [],
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
        source: compId,
        target: createNodeId("file", file.path, file.name),
        metadata: { reason: "declared_in" },
      })
    );
  });

  (summary.functions || []).forEach((fn) => {
    const fnId = createNodeId("function", file.path, fn.name);
    nodes.push(
      createNode({
        id: fnId,
        kind: "function",
        name: fn.name,
        file: file.path,
        metadata: {
          line: fn.line,
          loc: fn.loc,
          isExported: !!fn.isExported,
          isReferencedInFile: !!fn.isReferencedInFile,
          calledIdentifiers: fn.calledIdentifiers || [],
        },
      })
    );

    edges.push(
      createEdge({
        type: "DEPENDENCY",
        source: fnId,
        target: createNodeId("file", file.path, file.name),
        metadata: { reason: "declared_in" },
      })
    );
  });

  (summary.variables || []).forEach((v) => {
    const vId = createNodeId("variable", file.path, v.name);
    nodes.push(
      createNode({
        id: vId,
        kind: "variable",
        name: v.name,
        file: file.path,
        metadata: {
          line: v.line,
          loc: v.loc,
          isExported: !!v.isExported,
          isReferencedInFile: !!v.isReferencedInFile,
        },
      })
    );

    edges.push(
      createEdge({
        type: "DEPENDENCY",
        source: vId,
        target: createNodeId("file", file.path, file.name),
        metadata: { reason: "declared_in" },
      })
    );
  });

  summary.redux.forEach((rdx) => {
    if (rdx.type === "thunk") return;
    const nodeId = createNodeId("state", file.path, rdx.name, rdx.type);
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
          id: createNodeId("api", file.path, api.name, "gateway"),
          kind: "api",
          subtype: "gateway",
          name: api.name,
          file: file.path,
          metadata: { baseURL: api.baseURL, line: api.line, source: api.source || "axios" },
        })
      );
    } else if (api.type === "endpoint") {
      const endpointId = createNodeId("api", file.path, `${api.method}:${api.path}`, "endpoint");
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

  const isDataFile =
    /(constants?|data|configs?|mockData|schemas?|fixtures?)\.[jt]sx?$/i.test(file.path) ||
    /(^|\/)(constants?|data|configs?|mockData|schemas?|fixtures?)\//i.test(file.path);
  if (isDataFile) {
    const dataId = createNodeId("data", file.path, file.name);
    nodes.push(
      createNode({
        id: dataId,
        kind: "data",
        subtype: "module",
        name: file.name.replace(/\.[jt]sx?$/i, ""),
        file: file.path,
        metadata: {
          path: file.path,
        },
      })
    );

    edges.push(
      createEdge({
        type: "DEPENDENCY",
        source: dataId,
        target: createNodeId("file", file.path, file.name),
        metadata: { reason: "declared_in" },
      })
    );
  }
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

function buildRouteGraph(parsedFiles, graphFiles, nodes, edges, project, ctx) {
  parsedFiles.forEach((file) => {
    const summary = file.summary;
    if (!summary.routes || summary.routes.length === 0) return;

    const routerId = createNodeId("route", file.path, "core", "router");
    nodes.push(createNode({ id: routerId, kind: "route", subtype: "router", name: "Router", file: file.path }));

    summary.routes.forEach((route, index) => {
      addRouteNodeRecursive(route, routerId, file.path, `${index}`, nodes, edges, ctx);
    });
  });

  if (project?.framework === "Next.js") {
    const { pageRoutes, apiRoutes } = extractFileBasedRoutes(graphFiles);

    if (pageRoutes.length > 0) {
      const fileRouterId = createNodeId("route", "app/", "nextjs", "router");
      nodes.push(createNode({ id: fileRouterId, kind: "route", subtype: "router", name: "Next.js File Router", file: "app/" }));

      pageRoutes.forEach((route) => {
        const routeId = createNodeId("route", route.file, route.path, "endpoint");
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
      const gatewayId = createNodeId("api", "app/", "nextjs", "gateway");
      nodes.push(
        createNode({ id: gatewayId, kind: "api", subtype: "gateway", name: "Next.js API Routes", file: "app/", metadata: { baseURL: "/api", source: "nextjs" } })
      );
      apiRoutes.forEach((api) => {
        const endpointId = createNodeId("api", api.file, `${api.method}:${api.path}`, "endpoint");
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
  // Default assumption: the component is declared in the same file as the route config
  // (e.g. an inline `<Route element={<Home/>} />` where Home is a local declaration).
  // Overwritten below with the resolved declaration's file if componentName turns out to be
  // an imported symbol — this is what makes the ROUTE_RENDERS lookup below correct even when
  // two files declare a same-named component.
  let componentFile = filePath;

  const parentFileObj = fileMap.get(filePath);
  if (parentFileObj && componentName) {
    const matchedImport = parentFileObj.summary.imports.find((imp) => imp.name === componentName);
    if (matchedImport) {
      const resolvedPath = resolveModulePath(filePath, matchedImport.source, fileIndex, aliasMap);
      if (resolvedPath) {
        const symbolToResolve = matchedImport.kind === "default" ? "default" : matchedImport.importedName;
        const declaration = resolveComponentDeclaration(resolvedPath, symbolToResolve, fileMap, fileIndex, aliasMap);
        if (declaration) {
          componentName = declaration.name;
          componentFile = declaration.file;
        }
      }
    }
  }

  const routeId = createNodeId("route", filePath, route.path, "endpoint");
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

  // Route → rendered component edge (Phase 6 of the Blueprint Flow v2 refactor — see TASK.md).
  // `componentName`/`componentFile` above were already resolved via the same import/declaration
  // resolution used everywhere else in this file — this is not a new resolution mechanism, just
  // the first place that turns the result into an edge instead of discarding it into metadata.
  // `routeExtractor.js` uses the literal string "Component" as its own placeholder for "could
  // not determine a real name" (see its `elementVal || "Component"` fallbacks) — skip creating
  // an edge in that case rather than pointing at a matching-by-coincidence node named "Component".
  if (componentName && componentName !== "Component") {
    const renderedComponent = nodes.find(
      (n) => n.kind === "component" && n.name === componentName && n.file === componentFile
    );
    if (renderedComponent) {
      edges.push(createEdge({ type: "ROUTE_RENDERS", source: routeId, target: renderedComponent.id }));
    }
  }

  (route.children || []).forEach((child, i) => {
    addRouteNodeRecursive(child, routeId, filePath, `${positionKey}.${i}`, nodes, edges, ctx);
  });
}

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
    const routerId = "route:src/app/router.jsx:core";
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