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
 * Stop words set for N-gram filtering to avoid matching generic query words as single 1-grams.
 */
const QUERY_STOP_WORDS = new Set([
  "how", "is", "are", "do", "does", "can", "would", "should", "what", "which", "where", "why", "who",
  "the", "a", "an", "this", "that", "these", "those", "my", "your", "its", "screen", "built", "composed",
  "used", "call", "calls", "called", "show", "me", "tell", "about", "to", "from", "in", "on", "at", "by",
  "and", "or", "not", "with", "for", "of", "get", "reach", "api", "apis"
]);

/**
 * Generic UI terms requiring explicit ambiguity confirmation unless 100% exact full string match.
 */
const GENERIC_UI_WORDS = new Set([
  "card", "list", "item", "button", "modal", "wrapper", "container", "provider", "layout"
]);

/**
 * Calculates Levenshtein Distance (edit distance) between two strings.
 * Used as a fallback when exact/substring n-gram matching returns 0 candidates.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Stage 1 — Deterministic Entity Resolver (100% Local, Zero AI).
 * Scans the entire user query using N-gram sliding windows (1-word, 2-word, 3-word),
 * evaluates Knowledge Graph indexes, computes confidence scores, and falls back to fuzzy edit distance.
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

  // Conversational filter
  if (/^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|who\s+are\s+you|what\s+can\s+you\s+do|thanks?|thank\s+you|how\s+are\s+you)\b/i.test(clean)) {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: true };
  }

  if (!graphEngine || !graphEngine.nodes || graphEngine.nodes.length === 0) {
    return { isAmbiguous: false, primaryEntity: null, secondaryEntity: null, candidates: [], isConversational: false };
  }

  // 0. Exact Node ID Direct Lookup Fast-Path (Guarantees unambiguous resolution for explicit candidate selection)
  const exactNodeById = graphEngine.nodes.find(n => n.id && n.id.toLowerCase() === clean.toLowerCase());
  if (exactNodeById) {
    const directCandidate = {
      id: exactNodeById.id,
      name: exactNodeById.name || exactNodeById.id,
      kind: exactNodeById.kind || "component",
      file: exactNodeById.file || "",
      confidence: 1.00
    };
    return {
      isAmbiguous: false,
      primaryEntity: directCandidate,
      secondaryEntity: null,
      candidates: [directCandidate],
      isConversational: false
    };
  }

  // 1. Tokenize query into words & generate sliding N-grams (1-word, 2-word, 3-word windows)
  const normalizedText = clean.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const words = normalizedText.split(/\s+/).filter(Boolean);

  const ngrams = new Set();
  for (let n = 1; n <= Math.min(3, words.length); n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(" ");
      ngrams.add(gram);
    }
  }

  // Map to collect candidate matches keyed by node.id (keeping maximum confidence per node)
  const candidateMap = new Map();

  for (const node of graphEngine.nodes) {
    // Ignore raw file nodes — component lookup operates on architectural entities
    if (node.kind === "file") continue;

    const nodeName = (node.name || "").toLowerCase();
    const nodeId = (node.id || "").toLowerCase();
    // Use file basename ONLY — do not match against full absolute folder paths
    const fileBasename = (node.file || "").split(/[/\\]/).pop().toLowerCase();

    for (const gram of ngrams) {
      // Skip single-word ngrams that are generic query stop words, unless exact match with node name
      if (QUERY_STOP_WORDS.has(gram) && gram !== nodeName) {
        continue;
      }

      let score = 0;
      if (nodeName === gram || nodeId === gram) {
        score = 0.98;
      } else if (nodeName.includes(gram) || gram.includes(nodeName)) {
        score = 0.82;
        if (nodeName.startsWith(gram)) score += 0.08;
      } else if (fileBasename && fileBasename.includes(gram)) {
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

        const existing = candidateMap.get(node.id);
        if (!existing || finalConfidence > existing.confidence) {
          candidateMap.set(node.id, {
            id: node.id,
            name: node.name || node.id,
            kind: node.kind || "component",
            file: node.file || "",
            confidence: finalConfidence,
          });
        }
      }
    }
  }

  let scoredCandidates = Array.from(candidateMap.values());

  // 2. FUZZY MATCH FALLBACK: Only run when exact/substring matching returns ZERO candidates
  if (scoredCandidates.length === 0) {
    for (const node of graphEngine.nodes) {
      // Fuzzy matching is strictly for architectural entities (components, pages, routes, hooks)
      if (node.kind === "file" || node.kind === "api" || node.id?.startsWith("api-")) continue;

      const nodeName = (node.name || "").toLowerCase();
      const nodeId = (node.id || "").toLowerCase();

      for (const gram of ngrams) {
        if (gram.length < 3 || QUERY_STOP_WORDS.has(gram)) continue;

        const distName = levenshteinDistance(gram, nodeName);
        const distId = levenshteinDistance(gram, nodeId);
        const minDist = Math.min(distName, distId);

        const maxLen = Math.max(gram.length, nodeName.length);
        const similarity = 1 - minDist / maxLen;

        // Strict typo recovery threshold: edit distance <= 2 AND similarity >= 0.70
        if (minDist <= 2 && similarity >= 0.70) {
          let score = 0.58;

          let bonus = 0;
          if (node.kind === "page" || node.kind === "route") bonus = 0.06;
          else if (node.kind === "component") bonus = 0.04;
          else if (node.kind === "context" || node.kind === "store") bonus = 0.03;
          else if (node.kind === "hook") bonus = 0.03;

          const finalConfidence = Math.min(0.65, Number((score + bonus).toFixed(2)));

          const existing = candidateMap.get(node.id);
          if (!existing || finalConfidence > existing.confidence) {
            candidateMap.set(node.id, {
              id: node.id,
              name: node.name || node.id,
              kind: node.kind || "component",
              file: node.file || "",
              confidence: finalConfidence,
            });
          }
        }
      }
    }
    scoredCandidates = Array.from(candidateMap.values());
  }

  // Sort by confidence descending
  scoredCandidates.sort((a, b) => b.confidence - a.confidence);

  // If candidate confidence is too weak (< 0.50), treat as zero match to display clean empty state + suggestions
  if (scoredCandidates.length === 0 || scoredCandidates[0].confidence < 0.50) {
    const suggestions = getFuzzyComponentSuggestions(clean, graphEngine);
    return {
      isAmbiguous: false,
      primaryEntity: null,
      secondaryEntity: null,
      candidates: [],
      suggestions,
      isConversational: false,
    };
  }

  const top = scoredCandidates[0];
  const second = scoredCandidates[1];

  // If there's only 1 matching candidate, resolve directly IF exact/high confidence match (>= 0.90), otherwise treat as ambiguous candidate selection
  if (scoredCandidates.length === 1) {
    if (top.confidence < 0.90) {
      return {
        isAmbiguous: true,
        primaryEntity: null,
        secondaryEntity: null,
        candidates: [top],
        isConversational: false,
      };
    }
    return {
      isAmbiguous: false,
      primaryEntity: top,
      secondaryEntity: null,
      candidates: [top],
      isConversational: false,
    };
  }

  // Multi-candidate ambiguity check: trigger ambiguity picker if top 2 candidates are close in confidence (diff < 0.15)
  if (scoredCandidates.length > 1 && second) {
    const diff = top.confidence - second.confidence;
    if (diff < 0.15 && top.confidence >= 0.75) {
      return {
        isAmbiguous: true,
        primaryEntity: null,
        secondaryEntity: null,
        candidates: scoredCandidates.slice(0, 4),
        isConversational: false,
      };
    }
  }

  // Otherwise, resolve to top candidate directly
  return {
    isAmbiguous: false,
    primaryEntity: top,
    secondaryEntity: null,
    candidates: [top],
    isConversational: false,
  };

  // Otherwise, resolve to top candidate directly
  return {
    isAmbiguous: false,
    primaryEntity: top,
    secondaryEntity: null,
    candidates: [top],
    isConversational: false,
  };
}

/**
 * Calculates top fuzzy component suggestions from extracted project component names.
 *
 * @param {string} userQuery
 * @param {object} graphEngine
 * @returns {Array<string>} List of suggested component names
 */
export function getFuzzyComponentSuggestions(userQuery, graphEngine) {
  if (!graphEngine || !graphEngine.nodes) return [];
  const query = (userQuery || "").toLowerCase().trim();

  // Filter for extracted components, pages, layouts, and lazy components
  const componentNodes = graphEngine.nodes.filter(
    (n) =>
      (n.kind === "component" || n.kind === "page" || n.kind === "layout" || n.subtype === "lazy") &&
      n.name
  );

  const uniqueNames = Array.from(new Set(componentNodes.map((n) => n.name)));

  if (uniqueNames.length === 0) return [];
  if (!query) return uniqueNames.slice(0, 3);

  const scored = uniqueNames.map((name) => {
    const lowerName = name.toLowerCase();
    let score = 0;

    if (lowerName === query) {
      score = 1.0;
    } else if (lowerName.startsWith(query) || query.startsWith(lowerName)) {
      score = 0.85;
    } else if (lowerName.includes(query) || query.includes(lowerName)) {
      score = 0.75;
    } else {
      const dist = levenshteinDistance(query, lowerName);
      const maxLen = Math.max(query.length, lowerName.length);
      score = 1 - dist / maxLen;
    }
    return { name, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((item) => item.name);
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

/**
 * Debug Telemetry Logger for Smart Search Pipeline.
 * Logs console.table telemetry gated behind DEV flag or ?debug=1 query param.
 * Never throws even if upstream fields are undefined.
 *
 * @param {object} data
 */
export function logSearchTelemetry(data) {
  try {
    const isDebug =
      typeof window !== "undefined" &&
      window.location &&
      window.location.search &&
      window.location.search.includes("debug=1");

    if (!isDebug) return;

    const row = {
      rawQuery: data?.rawQuery ?? "",
      stage1Entity: data?.stage1Entity ?? null,
      stage1Confidence: typeof data?.stage1Confidence === "number" ? data.stage1Confidence : 0,
      stage1Candidates: Array.isArray(data?.stage1Candidates) ? data.stage1Candidates : [],
      isAmbiguous: Boolean(data?.isAmbiguous),
      stage2CapabilitiesTrue: Array.isArray(data?.stage2CapabilitiesTrue) ? data.stage2CapabilitiesTrue : [],
      stage3RawGeminiJson: data?.stage3RawGeminiJson ?? null,
      resolvedBy: data?.resolvedBy ?? "fallback",
      finalTemplateId: data?.finalTemplateId ?? null,
      finalFocusTerm: data?.finalFocusTerm ?? null,
      executionMs: typeof data?.executionMs === "number" ? data.executionMs : 0,
    };

    console.group(`🔍 [Smart Search Telemetry] "${row.rawQuery}"`);
    console.table([row]);
    console.groupEnd();
  } catch (err) {
    // Never throw
    console.warn("Failed to log search telemetry:", err);
  }
}
