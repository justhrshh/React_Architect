import { createEdge } from "../graph/edgeFactory.js";
import { createNode, createNodeId } from "../graph/nodeFactory.js";

/**
 * Express Relationship Resolver
 *
 * Connects Express route handlers, controllers, middleware, services, and database models
 * using Universal Software Architecture edges:
 * - HANDLED_BY
 * - AUTHORIZES / VALIDATES / USES
 * - USES
 * - READS / WRITES
 *
 * Runs in 2 strict passes:
 * Pass 1: Instantiate all Express Nodes across all files.
 * Pass 2: Resolve all Relationship Edges across all created Nodes.
 *
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @param {Map<string, object>} fileMap
 * @param {Array<object>} diagnostics
 */
export function resolveExpressRelationships(nodes, edges, fileMap, diagnostics = []) {
  // PASS 1: Node Instantiation across all files
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

    // Routes
    routesData.forEach((rt) => {
      if (rt.entityType !== "route") return;

      const routeId = createNodeId("route", filePath, `${rt.method}:${rt.path}`, "endpoint");
      if (!nodes.some((n) => n.id === routeId)) {
        nodes.push(
          createNode({
            id: routeId,
            kind: "route",
            subtype: "endpoint",
            name: `${rt.method} ${rt.path}`,
            file: filePath,
            metadata: { method: rt.method, path: rt.path, line: rt.line },
          })
        );
      }
    });
  }

  // PASS 2: Edge Resolution across all instantiated Nodes
  for (const [filePath, fileObj] of fileMap.entries()) {
    const summary = fileObj.summary || {};
    const expressData = summary.express || {};
    const routesData = expressData.routes || [];

    routesData.forEach((rt) => {
      if (rt.entityType !== "route") return;

      const routeId = createNodeId("route", filePath, `${rt.method}:${rt.path}`, "endpoint");

      (rt.handlers || []).forEach((handlerName) => {
        // Try matching Controller
        const matchedCtrl = nodes.find(
          (n) => n.kind === "controller" && (n.name === handlerName || n.name.endsWith(`.${handlerName}`) || handlerName.endsWith(`.${n.name}`))
        );
        if (matchedCtrl) {
          edges.push(createEdge({ type: "HANDLED_BY", source: routeId, target: matchedCtrl.id }));
        }

        // Try matching Middleware
        const matchedMw = nodes.find((n) => n.kind === "middleware" && n.name === handlerName);
        if (matchedMw) {
          const edgeType = matchedMw.subtype === "auth" ? "AUTHORIZES" : matchedMw.subtype === "validation" ? "VALIDATES" : "USES";
          edges.push(createEdge({ type: edgeType, source: routeId, target: matchedMw.id }));
        }
      });
    });
  }

  // Global & Router Middleware -> Route Resolution
  const globalMiddleware = nodes.filter((n) => n.kind === "middleware" && n.metadata.scope === "global");
  globalMiddleware.forEach((mwNode) => {
    nodes.filter((n) => n.kind === "route" && n.file === mwNode.file).forEach((routeNode) => {
      const edgeType = mwNode.subtype === "auth" ? "AUTHORIZES" : mwNode.subtype === "validation" ? "VALIDATES" : "USES";
      edges.push(createEdge({ type: edgeType, source: routeNode.id, target: mwNode.id }));
    });
  });

  // Controller -> Service resolution
  nodes.filter((n) => n.kind === "controller").forEach((ctrlNode) => {
    const rootName = ctrlNode.name.split(".")[0].toLowerCase().replace(/controller|handler/i, "");
    const matchedService = nodes.find(
      (n) => n.kind === "service" && (n.name.toLowerCase().includes(rootName) || cleanMatch(n.name, rootName))
    );
    if (matchedService) {
      edges.push(createEdge({ type: "USES", source: ctrlNode.id, target: matchedService.id }));
    }
  });

  // Service -> Model resolution
  nodes.filter((n) => n.kind === "service").forEach((srvNode) => {
    const cleanSrvName = srvNode.name.toLowerCase().replace(/service/i, "");
    const matchedModel = nodes.find(
      (n) => n.kind === "model" && (n.name.toLowerCase().includes(cleanSrvName) || cleanMatch(n.name, cleanSrvName))
    );
    if (matchedModel) {
      edges.push(createEdge({ type: "READS", source: srvNode.id, target: matchedModel.id }));
    }
  });
}

function cleanMatch(a, b) {
  if (!a || !b) return false;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  return aLower.includes(bLower) || bLower.includes(aLower);
}
