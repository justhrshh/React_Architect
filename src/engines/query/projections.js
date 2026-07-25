/**
 * Graph Projection Views
 *
 * Provides specialized, domain-focused graph projections derived from the single Knowledge Graph:
 * 1. Architecture View
 * 2. Dependency View
 * 3. Request Flow View
 * 4. Network View
 * 5. State View
 * 6. Security View
 * 7. Database View
 */

/**
 * Architecture View
 * Includes components, routes, controllers, services, models, and database entities.
 */
export function getArchitectureView(engine) {
  const allowedKinds = new Set(["component", "route", "controller", "service", "model", "database", "data"]);
  const allowedEdges = new Set(["RENDERS", "HANDLED_BY", "USES", "READS", "WRITES", "DEPENDS_ON"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "ArchitectureView", nodes, edges };
}

/**
 * Dependency View
 * Includes structural dependency and render relationships across all nodes.
 */
export function getDependencyView(engine) {
  const allowedEdges = new Set(["DEPENDENCY", "IMPORTS", "EXPORTS", "CONTAINS", "RENDERS"]);

  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type));
  const nodeIds = new Set();
  edges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });
  const nodes = engine.getNodes().filter((n) => nodeIds.has(n.id));

  return { viewName: "DependencyView", nodes, edges };
}

/**
 * Request Flow View
 * Traces full execution chain: Frontend (component/api) -> Route -> Middleware -> Controller -> Service -> Model.
 */
export function getRequestFlowView(engine) {
  const allowedKinds = new Set(["component", "api", "route", "middleware", "controller", "service", "model"]);
  const allowedEdges = new Set(["FETCHES", "USES_API", "HANDLED_BY", "AUTHORIZES", "VALIDATES", "USES", "READS", "WRITES"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "RequestFlowView", nodes, edges };
}

/**
 * Network View
 * Includes API gateways, endpoints, routes, and controllers.
 */
export function getNetworkView(engine) {
  const allowedKinds = new Set(["api", "route", "controller"]);
  const allowedEdges = new Set(["FETCHES", "USES_API", "HANDLED_BY", "DEPENDENCY"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "NetworkView", nodes, edges };
}

/**
 * State View
 * Includes Redux slices, stores, Context providers, custom hooks, and subscriber components.
 */
export function getStateView(engine) {
  const allowedKinds = new Set(["state", "context", "hook", "component"]);
  const allowedEdges = new Set(["PROVIDES", "CONSUMES", "STATE_CONSUMER", "DISPATCHES_ACTION"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "StateView", nodes, edges };
}

/**
 * Security View
 * Includes authentication/authorization middleware, protected routes, and controllers.
 */
export function getSecurityView(engine) {
  const allowedKinds = new Set(["middleware", "route", "controller"]);
  const allowedEdges = new Set(["AUTHORIZES", "VALIDATES", "HANDLED_BY", "USES"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "SecurityView", nodes, edges };
}

/**
 * Database View
 * Includes services, ORM models, SQL queries, and database nodes.
 */
export function getDatabaseView(engine) {
  const allowedKinds = new Set(["service", "model", "database", "repository", "data"]);
  const allowedEdges = new Set(["READS", "WRITES", "QUERIES_DB", "USES"]);

  const nodes = engine.getNodes().filter((n) => allowedKinds.has(n.kind));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = engine.getEdges().filter((e) => allowedEdges.has(e.type) && nodeIds.has(e.source) && nodeIds.has(e.target));

  return { viewName: "DatabaseView", nodes, edges };
}
