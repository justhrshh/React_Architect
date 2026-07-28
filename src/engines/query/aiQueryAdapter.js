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

/**
 * Stage 1 — Deterministic Entity Resolver (100% Local, Zero AI).
 * Tokenizes natural language queries, evaluates Knowledge Graph indexes, computes confidence scores,
 * and detects ambiguity.
 *
 * @param {string} userQuery
 * @param {object} graphEngine - GraphQueryEngine instance
 * @returns {{ isAmbiguous: boolean, primaryEntity: object|null, secondaryEntity: object|null, candidates: Array<object>, isConversational: boolean }}
 */
export function resolveEntity(userQuery, graphEngine) {
  if (!userQuery || typeof userQuery !== "string") {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: true };
  }

  const clean = userQuery.trim();

  // Multi-entity check (e.g., "from Login to Database")
  const fromToMatch = clean.match(/from\s+([A-Za-z0-9_-]+)\s+to\s+([A-Za-z0-9_-]+)/i);
  if (fromToMatch) {
    const srcName = fromToMatch[1];
    const tgtName = fromToMatch[2];
    const srcNode = graphEngine?.findNode(srcName) || graphEngine?.nodes.find((n) => n.name.toLowerCase().includes(srcName.toLowerCase()));
    const tgtNode = graphEngine?.findNode(tgtName) || graphEngine?.nodes.find((n) => n.name.toLowerCase().includes(tgtName.toLowerCase()));
    if (srcNode && tgtNode) {
      return {
        isAmbiguous: false,
        primaryEntity: { id: srcNode.id, name: srcNode.name, kind: srcNode.kind, confidence: 0.95 },
        secondaryEntity: { id: tgtNode.id, name: tgtNode.name, kind: tgtNode.kind, confidence: 0.95 },
        candidates: [],
        isConversational: false,
      };
    }
  }

  // Conversational filter
  if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|who\s+are\s+you|what\s+can\s+you\s+do|thanks?|thank\s+you|how\s+are\s+you)\b/i.test(clean)) {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: true };
  }

  // Tokenize & strip conversational preamble/suffixes
  let text = clean;
  text = text.replace(/^(how\s+(is|are|do|does|can|would|should)\s+(users?\s+)?(reach|get\s+to|call|affect|use|see)?\s*)/i, "");
  text = text.replace(/^(which\s+(apis?|services?|components?|routes?)\s+(does|do|is|are)\s*)/i, "");
  text = text.replace(/^(what\s+(state|component|route)\s+(affects?|used\s+in|calls?)\s*)/i, "");
  text = text.replace(/^(show\s+(me\s+)?(the\s+)?(critical\s+)?(path\s+)?(from\s+)?)/i, "");
  text = text.replace(/^(where\s+is\s+)/i, "");
  text = text.replace(/^(tell\s+me\s+about\s+)/i, "");

  text = text.replace(/\s+(composed\??|used\??|called\??|reached\??|flow\??|architecture\??|hierarchy\??|tree\??)$/i, "");
  text = text.replace(/\s+(call\??|affect\??|reach\??|backend\??)$/i, "");
  text = text.replace(/[?!.]+$/g, "").trim();

  if (!text || !graphEngine || !graphEngine.nodes) {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: false };
  }

  const targetTerm = text.toLowerCase();
  const scoredCandidates = [];

  for (const node of graphEngine.nodes) {
    const nodeName = (node.name || "").toLowerCase();
    const nodeId = (node.id || "").toLowerCase();
    const nodeFile = (node.file || "").toLowerCase();

    let score = 0;
    if (nodeName === targetTerm || nodeId === targetTerm) {
      score = 0.98;
    } else if (nodeName.includes(targetTerm) || nodeId.includes(targetTerm)) {
      score = 0.82;
      if (nodeName.startsWith(targetTerm)) score += 0.08;
    } else if (nodeFile.includes(targetTerm)) {
      score = 0.65;
    }

    if (score > 0) {
      // Kind weight bonus
      let bonus = 0;
      if (node.kind === "page" || node.kind === "route") bonus = 0.06;
      else if (node.kind === "component") bonus = 0.04;
      else if (node.kind === "context" || node.kind === "store") bonus = 0.03;
      else if (node.kind === "hook") bonus = 0.03;

      const finalConfidence = Math.min(0.99, Number((score + bonus).toFixed(2)));
      scoredCandidates.push({
        id: node.id,
        name: node.name || node.id,
        kind: node.kind || "component",
        file: node.file || "",
        confidence: finalConfidence,
      });
    }
  }

  // Sort by confidence descending
  scoredCandidates.sort((a, b) => b.confidence - a.confidence);

  if (scoredCandidates.length === 0) {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: false };
  }

  const top = scoredCandidates[0];
  const second = scoredCandidates[1];

  // Ambiguity Check: Multiple candidates with close confidence (gap < 0.12 or top confidence < 0.75)
  if (scoredCandidates.length > 1 && second) {
    const diff = top.confidence - second.confidence;
    if (diff < 0.12 || top.confidence < 0.75) {
      return {
        isAmbiguous: true,
        primaryEntity: null,
        secondaryEntity: null,
        candidates: scoredCandidates.slice(0, 3),
        isConversational: false,
      };
    }
  }

  return {
    isAmbiguous: false,
    primaryEntity: top,
    secondaryEntity: null,
    candidates: scoredCandidates.slice(0, 3),
    isConversational: false,
  };
}

/**
 * Stage 2 — Project Context Builder.
 * Dynamically extracts architectural capabilities & connected nodes from the Knowledge Graph.
 *
 * @param {object} resolvedEntity
 * @param {object} graphEngine - GraphQueryEngine instance
 * @returns {object} ProjectContext
 */
export function buildProjectContext(resolvedEntity, graphEngine) {
  if (!resolvedEntity || !graphEngine) {
    return {
      entity: { name: "Unknown", kind: "component", file: "" },
      capabilities: {},
      connectedNodes: { renders: [], hooks: [], contexts: [], reduxSlices: [], apis: [] },
      supportedIntents: ["component_breakdown", "execution", "navigation", "state"],
    };
  }

  const nodeId = resolvedEntity.id;
  const node = graphEngine.findNode(nodeId) || resolvedEntity;
  const outgoing = graphEngine.findOutgoingEdges(nodeId) || [];
  const incoming = graphEngine.findIncomingEdges(nodeId) || [];

  const renders = [];
  const hooks = [];
  const contexts = [];
  const reduxSlices = [];
  const apis = [];

  for (const edge of outgoing) {
    const targetNode = graphEngine.findNode(edge.target);
    if (!targetNode) continue;

    if (targetNode.kind === "component") renders.push(targetNode.name);
    else if (targetNode.kind === "hook") hooks.push(targetNode.name);
    else if (targetNode.kind === "context") contexts.push(targetNode.name);
    else if (targetNode.kind === "redux_slice" || targetNode.kind === "store") reduxSlices.push(targetNode.name);
    else if (targetNode.kind === "api" || targetNode.kind === "service") apis.push(targetNode.name);
  }

  const capabilities = {
    rendersComponents: renders.length > 0,
    usesHooks: hooks.length > 0,
    readsRedux: reduxSlices.length > 0,
    writesRedux: false,
    usesContext: contexts.length > 0,
    callsApi: apis.length > 0,
    definesRoutes: node.kind === "route",
  };

  return {
    entity: {
      name: node.name || resolvedEntity.name,
      kind: node.kind || resolvedEntity.kind,
      file: node.file || resolvedEntity.file || "",
    },
    capabilities,
    connectedNodes: {
      renders: Array.from(new Set(renders)),
      hooks: Array.from(new Set(hooks)),
      contexts: Array.from(new Set(contexts)),
      reduxSlices: Array.from(new Set(reduxSlices)),
      apis: Array.from(new Set(apis)),
    },
    supportedIntents: [
      "component_breakdown",
      "execution",
      "navigation",
      "state",
      "request_lifecycle",
      "dependency",
      "impact",
    ],
  };
}
