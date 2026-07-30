/**
 * laneClassifier.js
 *
 * Single, authoritative architectural lane classification module for React Architect.
 * Maps Knowledge Graph nodes into their semantic column lanes (Entry, Routing, Pages,
 * UI Components, Hooks & State, API Clients, Backend Routes, Controllers & Services,
 * Data Models, Database Storage).
 */

export const ARCHITECTURAL_NODE_KINDS = new Set([
  "component", "route", "controller", "middleware",
  "service", "model", "database", "api", "hook", "state",
]);

export const ARCHITECTURAL_EDGE_TYPES = new Set([
  "RENDERS", "USES_HOOK", "HOOK_CALLS_HOOK", "USES_CONTEXT",
  "STATE_CONSUMER", "DISPATCHES_ACTION", "ASYNC_THUNK", "SUBSCRIBES_TO",
  "USES_API", "CALLS_API", "TARGETS_ROUTE", "ROUTE_PARENT", "ROUTE_RENDERS",
  "HANDLED_BY", "AUTHORIZES", "VALIDATES", "USES",
  "CALLS_SERVICE", "USES_MODEL", "ACCESSES_DB", "LAZY_LOADS",
  "EXECUTION_FLOW",
]);

export const BRIDGED_EDGE_TYPE = "EXECUTION_FLOW";

/**
 * Classifies a Knowledge Graph node into its semantic architectural lane.
 *
 * @param {object} node
 * @returns {string} laneId
 */
export function classifyArchitecturalUnit(node) {
  if (!node) return "components";

  const { kind, subtype, file = "", name = "" } = node;
  const lowerFile = file.toLowerCase();
  const lowerName = name.toLowerCase();

  // 9. Database Storage
  if (kind === "database") return "database";

  // 8. Data Models
  if (kind === "model" || subtype === "orm" || lowerFile.includes("models/")) return "models";

  // 7. Controllers & Services
  if (
    kind === "controller" ||
    kind === "service" ||
    lowerFile.includes("controllers/") ||
    lowerFile.includes("services/")
  ) {
    return "business_logic";
  }

  // 6. Backend Routes & Middleware
  if (kind === "middleware" || lowerFile.includes("middleware/")) return "backend_routes";
  if (kind === "route") {
    const source = node.metadata?.source || "";
    if (source === "express" || source === "nestjs" || source === "fastify" || source === "koa") {
      return "backend_routes";
    }
    if (!source && lowerFile.includes("routes/")) return "backend_routes";
  }

  // 5. API Clients & Endpoints
  if (kind === "api" || lowerName.includes("api") || lowerFile.includes("api/")) {
    return "api_clients";
  }

  // 4. Hooks & State
  if (
    kind === "hook" ||
    kind === "state" ||
    subtype === "slice" ||
    subtype === "context" ||
    subtype === "provider" ||
    /^use[A-Z]/.test(name)
  ) {
    return "hooks_state";
  }

  // 0. Application Entry
  if (
    (kind === "file" && /(^|\/)(main|index|App|server|app|_app|_document)\.[jt]sx?$/i.test(file)) ||
    (kind === "component" && (name === "App" || name === "main" || subtype === "root"))
  ) {
    return "entry";
  }

  // 1. Routing Layer (Frontend Routes)
  if (
    kind === "route" ||
    subtype === "router" ||
    subtype === "route" ||
    name === "Router" ||
    lowerName.includes("route")
  ) {
    return "routing";
  }

  // 2. Pages & Views
  if (
    subtype === "page" ||
    lowerFile.includes("pages/") ||
    lowerFile.includes("views/") ||
    lowerName.endsWith("page")
  ) {
    return "pages";
  }

  // 3. UI Components (Default)
  return "components";
}
