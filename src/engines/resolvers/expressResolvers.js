import { createEdge } from "../graph/edgeFactory.js";
import { createNode, createNodeId } from "../graph/nodeFactory.js";

/**
 * Express Relationship Resolver
 *
 * Connects Express route handlers, controllers, middleware, services, database models,
 * and frontend API clients into a unified full-stack software architecture graph:
 * - TARGETS_ROUTE  : Frontend API Client / Endpoint ──► Express Route
 * - HANDLED_BY     : Express Route ──► Controller
 * - AUTHORIZES / VALIDATES / USES : Express Route ──► Middleware
 * - CALLS_SERVICE  : Controller ──► Service
 * - USES_MODEL     : Service / Controller ──► Model
 * - ACCESSES_DB    : Model ──► Database (Logical Store)
 *
 * Runs in strict passes:
 * Pass 1: Collect router mount prefixes (e.g. app.use('/api/auth', authRouter)).
 * Pass 2: Instantiate all Express Nodes (Routes, Controllers, Middleware, Services, Models, Database).
 * Pass 3: Resolve all Full-Stack Relationship Edges across all Nodes.
 *
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @param {Map<string, object>} fileMap
 * @param {Array<object>} diagnostics
 */
export function resolveExpressRelationships(nodes, edges, fileMap, diagnostics = []) {
  // ── PASS 1: Collect Router Mount Prefixes ──────────────────────────────────
  const mountMap = new Map(); // file or routerName -> prefix
  for (const [filePath, fileObj] of fileMap.entries()) {
    const summary = fileObj.summary || {};
    const expressData = summary.express || {};
    const routesData = expressData.routes || [];

    routesData.forEach((rt) => {
      if (rt.entityType === "mount") {
        if (rt.prefix && rt.prefix !== "/") {
          mountMap.set(filePath, rt.prefix);
          if (rt.routerName) {
            mountMap.set(rt.routerName, rt.prefix);
          }
        }
      }
    });
  }

  // ── PASS 2: Node Instantiation ─────────────────────────────────────────────
  for (const [filePath, fileObj] of fileMap.entries()) {
    const summary = fileObj.summary || {};
    const expressData = summary.express || {};

    const routesData = expressData.routes || [];
    const middlewareData = expressData.middleware || [];
    const controllerData = expressData.controllers || [];
    const serviceData = expressData.services || [];

    // Controllers
    controllerData.forEach((ctrl) => {
      const ctrlId = createNodeId("controller", filePath, ctrl.name, ctrl.subtype);
      if (!nodes.some((n) => n.id === ctrlId)) {
        nodes.push(
          createNode({
            id: ctrlId,
            kind: "controller",
            subtype: ctrl.subtype || "function",
            name: ctrl.name,
            file: filePath,
            metadata: { responses: ctrl.responses || [], line: ctrl.line },
          })
        );
      }
    });

    // Middleware
    middlewareData.forEach((mw) => {
      const mwId = createNodeId("middleware", filePath, mw.name, mw.subtype);
      if (!nodes.some((n) => n.id === mwId)) {
        nodes.push(
          createNode({
            id: mwId,
            kind: "middleware",
            subtype: mw.subtype || "custom",
            name: mw.name,
            file: filePath,
            metadata: { scope: mw.scope || "global", line: mw.line },
          })
        );
      }
    });

    // Services & Models
    serviceData.forEach((item) => {
      if (item.entityType === "service") {
        const srvId = createNodeId("service", filePath, item.name, item.subtype);
        if (!nodes.some((n) => n.id === srvId)) {
          nodes.push(
            createNode({
              id: srvId,
              kind: "service",
              subtype: item.subtype || "business",
              name: item.name,
              file: filePath,
              metadata: { line: item.line },
            })
          );
        }
      } else if (item.entityType === "model") {
        const mdlId = createNodeId("model", filePath, item.name, item.subtype);
        if (!nodes.some((n) => n.id === mdlId)) {
          nodes.push(
            createNode({
              id: mdlId,
              kind: "model",
              subtype: item.subtype || "orm",
              name: item.name,
              file: filePath,
            })
          );
        }
      }
    });

    // Routes (with path prefix composition)
    routesData.forEach((rt) => {
      if (rt.entityType !== "route") return;

      const prefix = mountMap.get(filePath) || "";
      const fullPath = composePath(prefix, rt.path);

      const routeId = createNodeId("route", filePath, `${rt.method}:${fullPath}`, "endpoint");
      if (!nodes.some((n) => n.id === routeId)) {
        nodes.push(
          createNode({
            id: routeId,
            kind: "route",
            subtype: "endpoint",
            name: `${rt.method} ${fullPath}`,
            file: filePath,
            metadata: { method: rt.method, path: fullPath, rawPath: rt.path, line: rt.line },
          })
        );
      }
    });
  }

  // Logical Database Node
  const modelNodes = nodes.filter((n) => n.kind === "model");
  let dbNodeId = null;
  if (modelNodes.length > 0) {
    dbNodeId = "database:mongodb";
    if (!nodes.some((n) => n.id === dbNodeId)) {
      nodes.push(
        createNode({
          id: dbNodeId,
          kind: "database",
          subtype: "database",
          name: "Database (MongoDB)",
          file: modelNodes[0].file,
          metadata: { engine: "MongoDB / Mongoose" },
        })
      );
    }
    // Connect Models -> Database
    modelNodes.forEach((mdl) => {
      edges.push(createEdge({ type: "ACCESSES_DB", source: mdl.id, target: dbNodeId }));
    });
  }

  // ── PASS 3: Relationship Resolution ───────────────────────────────────────
  for (const [filePath, fileObj] of fileMap.entries()) {
    const summary = fileObj.summary || {};
    const expressData = summary.express || {};
    const routesData = expressData.routes || [];

    routesData.forEach((rt) => {
      if (rt.entityType !== "route") return;

      const prefix = mountMap.get(filePath) || "";
      const fullPath = composePath(prefix, rt.path);
      const routeId = createNodeId("route", filePath, `${rt.method}:${fullPath}`, "endpoint");

      (rt.handlers || []).forEach((handlerName) => {
        // Route -> Controller
        const matchedCtrl = nodes.find(
          (n) => n.kind === "controller" && (n.name === handlerName || n.name.endsWith(`.${handlerName}`) || handlerName.endsWith(`.${n.name}`))
        );
        if (matchedCtrl) {
          edges.push(createEdge({ type: "HANDLED_BY", source: routeId, target: matchedCtrl.id }));
        }

        // Route -> Middleware
        const matchedMw = nodes.find((n) => n.kind === "middleware" && n.name === handlerName);
        if (matchedMw) {
          const edgeType = matchedMw.subtype === "auth" ? "AUTHORIZES" : matchedMw.subtype === "validation" ? "VALIDATES" : "USES";
          edges.push(createEdge({ type: edgeType, source: routeId, target: matchedMw.id }));
        }
      });
    });
  }

  // Global & Router Middleware -> Route
  const globalMiddleware = nodes.filter((n) => n.kind === "middleware" && n.metadata.scope === "global");
  globalMiddleware.forEach((mwNode) => {
    nodes.filter((n) => n.kind === "route" && n.file === mwNode.file).forEach((routeNode) => {
      const edgeType = mwNode.subtype === "auth" ? "AUTHORIZES" : mwNode.subtype === "validation" ? "VALIDATES" : "USES";
      edges.push(createEdge({ type: edgeType, source: routeNode.id, target: mwNode.id }));
    });
  });

  // Controller -> Service & Controller -> Model
  nodes.filter((n) => n.kind === "controller").forEach((ctrlNode) => {
    const rootName = ctrlNode.name.split(".")[0].toLowerCase().replace(/controller|handler/i, "");
    
    // Controller -> Service
    const matchedService = nodes.find(
      (n) => n.kind === "service" && (n.name.toLowerCase().includes(rootName) || cleanMatch(n.name, rootName))
    );
    if (matchedService) {
      edges.push(createEdge({ type: "CALLS_SERVICE", source: ctrlNode.id, target: matchedService.id }));
    }

    // Controller -> Model (direct usage when no service exists)
    const matchedModel = nodes.find(
      (n) => n.kind === "model" && (n.name.toLowerCase().includes(rootName) || cleanMatch(n.name, rootName))
    );
    if (matchedModel) {
      edges.push(createEdge({ type: "USES_MODEL", source: ctrlNode.id, target: matchedModel.id }));
    }
  });

  // Service -> Model
  nodes.filter((n) => n.kind === "service").forEach((srvNode) => {
    const cleanSrvName = srvNode.name.toLowerCase().replace(/service/i, "");
    const matchedModel = nodes.find(
      (n) => n.kind === "model" && (n.name.toLowerCase().includes(cleanSrvName) || cleanMatch(n.name, cleanSrvName))
    );
    if (matchedModel) {
      edges.push(createEdge({ type: "USES_MODEL", source: srvNode.id, target: matchedModel.id }));
    }
  });

  // ── PASS 4: Frontend API Call ──► Backend Route Resolution ─────────────────
  const frontendApiNodes = nodes.filter((n) => n.kind === "api" && n.subtype === "endpoint");
  const backendRouteNodes = nodes.filter((n) => n.kind === "route" && n.subtype === "endpoint");

  frontendApiNodes.forEach((apiNode) => {
    const apiPath = apiNode.metadata?.path || apiNode.name;
    const apiMethod = apiNode.metadata?.method || "GET";

    const matchedBackendRoute = backendRouteNodes.find((rtNode) => {
      const rtPath = rtNode.metadata?.path || rtNode.name;
      const rtMethod = rtNode.metadata?.method || "GET";
      return isMatchingRoutePath(apiPath, apiMethod, rtPath, rtMethod);
    });

    if (matchedBackendRoute) {
      edges.push(createEdge({ type: "TARGETS_ROUTE", source: apiNode.id, target: matchedBackendRoute.id }));
    }
  });

  // Also connect Component -> Backend Route directly if component makes direct api call
  nodes.filter((n) => n.kind === "component").forEach((compNode) => {
    const apiCalls = compNode.metadata?.apiCalls || [];
    apiCalls.forEach((callStr) => {
      const matchedBackendRoute = backendRouteNodes.find((rtNode) => {
        const rtPath = rtNode.metadata?.path || rtNode.name;
        return isMatchingRoutePath(callStr, "GET", rtPath, "GET");
      });
      if (matchedBackendRoute) {
        edges.push(createEdge({ type: "TARGETS_ROUTE", source: compNode.id, target: matchedBackendRoute.id }));
      }
    });
  });
}

function composePath(prefix, routePath) {
  if (!prefix || prefix === "/") return routePath || "/";
  const cleanPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const cleanRoutePath = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${cleanPrefix}${cleanRoutePath}`;
}

function isMatchingRoutePath(apiPath, apiMethod, rtPath, rtMethod) {
  if (!apiPath || !rtPath) return false;

  const normApi = apiPath.replace(/^https?:\/\/[^\/]+/, "").split("?")[0].replace(/\/$/, "") || "/";
  const normRt  = rtPath.split("?")[0].replace(/\/$/, "") || "/";

  if (normApi === normRt) return true;

  // Pattern matching: /api/menu/:id matching /api/menu/123 or /api/menu/${id}
  const rtRegexPattern = normRt
    .replace(/:[a-zA-Z0-9_]+/g, "[^/]+")
    .replace(/\$\{[^}]+\}/g, "[^/]+");
  
  try {
    const re = new RegExp(`^${rtRegexPattern}$`, "i");
    return re.test(normApi);
  } catch {
    return false;
  }
}

function cleanMatch(a, b) {
  if (!a || !b) return false;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  return aLower.includes(bLower) || bLower.includes(aLower);
}
