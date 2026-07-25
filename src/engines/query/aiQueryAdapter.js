/**
 * AI Query Adapter
 *
 * Provides a high-level, natural-language-friendly interface for AI assistants
 * to answer architectural questions by querying the GraphQueryEngine.
 */
export class AIQueryAdapter {
  constructor(queryEngine) {
    this.engine = queryEngine;
  }

  /**
   * "What calls this service?"
   */
  whatCallsThisService(serviceIdentifier) {
    const serviceNode = this.engine.findNode(serviceIdentifier) || this.engine.findNodesByKind("service").find((n) => n.name.includes(serviceIdentifier));
    if (!serviceNode) return { found: false, callers: [] };

    const callers = this.engine.findDependents(serviceNode.id);
    return {
      found: true,
      targetService: serviceNode,
      callers,
    };
  }

  /**
   * "What depends on this component?"
   */
  whatDependsOnThisComponent(componentIdentifier) {
    const compNode = this.engine.findNode(componentIdentifier) || this.engine.findComponents().find((n) => n.name.includes(componentIdentifier));
    if (!compNode) return { found: false, dependents: [] };

    const dependents = this.engine.findDependents(compNode.id);
    const ancestors = this.engine.findAncestors(compNode.id);
    return {
      found: true,
      targetComponent: compNode,
      directDependents: dependents,
      allAncestors: ancestors,
    };
  }

  /**
   * "What request reaches this controller?"
   */
  whatRequestReachesController(controllerIdentifier) {
    const ctrlNode = this.engine.findNode(controllerIdentifier) || this.engine.findControllers().find((n) => n.name.includes(controllerIdentifier));
    if (!ctrlNode) return { found: false, routes: [] };

    const incomingEdges = this.engine.findIncomingEdges(ctrlNode.id);
    const routeIds = incomingEdges.filter((e) => e.type === "HANDLED_BY").map((e) => e.source);
    const routes = routeIds.map((id) => this.engine.findNode(id)).filter(Boolean);

    return {
      found: true,
      controller: ctrlNode,
      routes,
    };
  }

  /**
   * "What authentication protects this endpoint?"
   */
  whatAuthProtectsEndpoint(routeIdentifier) {
    const routeNode = this.engine.findNode(routeIdentifier) || this.engine.findRoutes().find((n) => n.name.includes(routeIdentifier));
    if (!routeNode) return { found: false, middleware: [] };

    const incoming = this.engine.findIncomingEdges(routeNode.id);
    const outgoing = this.engine.findOutgoingEdges(routeNode.id);
    const allEdges = [...incoming, ...outgoing];

    const middlewareEdges = allEdges.filter((e) => e.type === "AUTHORIZES" || e.type === "VALIDATES");
    const middlewareNodes = middlewareEdges
      .map((e) => (e.source === routeNode.id ? this.engine.findNode(e.target) : this.engine.findNode(e.source)))
      .filter((n) => n && n.kind === "middleware");

    return {
      found: true,
      route: routeNode,
      protectingMiddleware: middlewareNodes,
    };
  }

  /**
   * "What happens if this entity is removed?"
   */
  whatHappensIfRemoved(entityIdentifier) {
    const node = this.engine.findNode(entityIdentifier) || this.engine.search(entityIdentifier)[0];
    if (!node) return { found: false, impactRisk: "none", affected: [] };

    const dependents = this.engine.findDependents(node.id);
    const descendants = this.engine.findDescendants(node.id);
    const riskLevel = dependents.length > 5 ? "high" : dependents.length > 0 ? "medium" : "low";

    return {
      found: true,
      target: node,
      impactRisk: riskLevel,
      directDependents: dependents,
      totalAffectedDescendants: descendants,
    };
  }
}
