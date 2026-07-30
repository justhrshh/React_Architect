/**
 * templateResolver.js
 *
 * Fast-path alias matching tokenizer and Gemini Architectural Copilot Intent Interpreter.
 */

import { ALIAS_REGISTRY } from "./index.js";
import { classifyIntent } from "../ai/intent.js";
import { getProviderSettings } from "../ai/provider/settings.js";
import { resolveEntity, buildProjectContext, getFuzzyComponentSuggestions } from "../query/aiQueryAdapter.js";
import { complete as geminiComplete, isGeminiQuotaExceeded } from "../ai/provider/gemini.js";

// ─── Speculative Pre-Fetch Cache ─────────────────────────────────────────────
// Maps queryId → { templateId, resolvedAt } for in-flight or completed pre-fetches.
// One entry per ambiguous query; entries older than SPECULATIVE_TTL_MS are evicted.
const SPECULATIVE_CACHE = new Map();
const SPECULATIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Evicts stale entries from SPECULATIVE_CACHE that are older than TTL.
 */
function evictStalePrefetches() {
  const now = Date.now();
  for (const [id, entry] of SPECULATIVE_CACHE.entries()) {
    if (now - entry.resolvedAt > SPECULATIVE_TTL_MS) {
      SPECULATIVE_CACHE.delete(id);
    }
  }
}

/**
 * Fires ONE Gemini intent classification for an ambiguous query, keyed by queryId.
 * Results are cached so whichever candidate the user eventually picks reuses the same call.
 * If queryId does not match at apply-time (abandoned query), callers MUST discard the result.
 *
 * Called unconditionally when ambiguity is detected — whether or not the user ever picks a
 * candidate. This is the documented, accepted tradeoff for getting accurate Gemini intent
 * on ambiguous queries without blocking the ambiguity picker UI.
 *
 * @param {string} queryId   - Unique token for this ambiguous query (e.g. crypto.randomUUID())
 * @param {string} input     - The raw user query string
 * @param {object|null} graphEngine - Optional GraphQueryEngine for entity grounding
 * @returns {Promise<{ queryId: string, templateId: string | null, resolvedBy: 'ai'|'cache'|'error' }>}
 */
export async function speculativeClassify(queryId, input, graphEngine = null) {
  evictStalePrefetches();

  // Cache hit — already resolved for this queryId, return immediately
  if (SPECULATIVE_CACHE.has(queryId)) {
    const cached = SPECULATIVE_CACHE.get(queryId);
    return { queryId, templateId: cached.templateId, resolvedBy: "cache" };
  }

  if (isGeminiQuotaExceeded()) {
    SPECULATIVE_CACHE.set(queryId, { templateId: null, resolvedAt: Date.now() });
    return { queryId, templateId: null, resolvedBy: "error" };
  }

  const settings = getProviderSettings();
  const apiKey = (settings.apiKey && settings.apiKey.trim() !== "")
    ? settings.apiKey.trim()
    : ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY)
        ? import.meta.env.VITE_GEMINI_API_KEY
        : "");

  if (!apiKey || apiKey.trim() === "") {
    // No API key — store null so callers use local classification
    SPECULATIVE_CACHE.set(queryId, { templateId: null, resolvedAt: Date.now() });
    return { queryId, templateId: null, resolvedBy: "error" };
  }

  // Build project context from graphEngine if available
  let projectContext = null;
  if (graphEngine) {
    const stage1 = resolveEntity(input, graphEngine);
    if (stage1?.primaryEntity && !stage1.isAmbiguous) {
      projectContext = buildProjectContext(stage1.primaryEntity, graphEngine);
    }
  }

  try {
    const promptText = projectContext
      ? `${input}\n\nProject Context:\n${JSON.stringify(projectContext, null, 2)}`
      : input;

    const contents = [{ role: "user", parts: [{ text: promptText }] }];
    const responseText = await geminiComplete(GEMINI_INTENT_SYSTEM_PROMPT, contents);
    const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const templateId = (parsed?.isArchitectural && parsed?.templateId) ? parsed.templateId : null;
    SPECULATIVE_CACHE.set(queryId, { templateId, resolvedAt: Date.now() });
    return { queryId, templateId, resolvedBy: "ai" };
  } catch (err) {
    if (!err.isQuotaExceeded) {
      console.warn("[speculativeClassify] Gemini call failed; will use local classification on candidate selection:", err.message);
    }
    SPECULATIVE_CACHE.set(queryId, { templateId: null, resolvedAt: Date.now() });
    return { queryId, templateId: null, resolvedBy: "error" };
  }
}

/**
 * Returns a cached speculative result for the given queryId WITHOUT triggering a new call.
 * Returns null if not yet resolved or already evicted.
 *
 * @param {string} queryId
 * @returns {{ templateId: string | null } | null}
 */
export function getSpeculativeResult(queryId) {
  return SPECULATIVE_CACHE.get(queryId) ?? null;
}

/**
 * Conversational greetings & non-architectural query patterns
 */
const CONVERSATIONAL_REGEX = /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|who\s+are\s+you|what\s+can\s+you\s+do|thanks?|thank\s+you|how\s+are\s+you)\b/i;

/**
 * Natural language intent to studio template mapping rules
 */
const INTENT_STUDIO_PATTERNS = [
  // 1. Composed Architecture / Building Blocks: "What is Dashboard composed of?", "What is X made of?", "Building blocks of X"
  {
    regex: /\b(composed\s+of|made\s+of|building\s+blocks|composed-architecture|page\s+composition|blueprint\s+of)\b/i,
    templateId: "composed-architecture",
    intent: "composed_architecture",
  },
  // 2. Multi-entity path queries: "Login to Database", "Path from X to Y"
  {
    regex: /\b(from|between)\b.*\b(to)\b/i,
    templateId: "execution-flow",
    intent: "multi_entity_path",
  },
  // 3. Component Hierarchy / Composition / Usage: "Hierarchy of X", "Where is X used?", "Component hierarchy of X"
  {
    regex: /\b(composed?|composition|hierarchy|tree|children|subcomponents|where\s+is\s+.*used|rendered\s+by|part\s+of)\b/i,
    templateId: "component-hierarchy",
    intent: "composition",
  },
  // 4. Navigation / Routes / User Reach: "How do users reach X?", "Routes to X", "Navigation flow"
  {
    regex: /\b(reach|navigat(e|ion)|routes?\s*(to|from)?|path\s+to|user\s+flow|get\s+to)\b/i,
    templateId: "navigation-flow",
    intent: "navigation",
  },
  // 5. State / Redux / Store / Props: "What state affects X?", "Redux flow", "Context"
  {
    regex: /\b(state|redux|store|context|slice|props?|affects?|subscribe)\b/i,
    templateId: "composed-architecture",
    intent: "composed_architecture",
  },
  // 6. Request Lifecycle / Auth / Backend / Middleware: "How does request reach backend?", "Auth flow", "Security"
  {
    regex: /\b(request|lifecycle|auth(entication)?|backend|middleware|security|endpoint)\b/i,
    templateId: "request-lifecycle",
    intent: "request_lifecycle",
  },
  // 7. Execution Flow / APIs / Service Calls: "Which APIs does X call?", "Execution flow", "Calls"
  {
    regex: /\b(call|apis?|services?|execution|triggers?|dependencies)\b/i,
    templateId: "execution-flow",
    intent: "execution",
  },
];

/**
 * System prompt instructing Gemini to act as the Architectural Copilot Intent Interpreter.
 */
const GEMINI_INTENT_SYSTEM_PROMPT = `
You are the Architectural Intent Interpreter for React Architect.
Your sole job is to interpret user natural language queries into a structured JSON ArchitecturalIntent object.

RULES:
1. You MUST NOT generate graph nodes, edges, or code relationships. The Knowledge Graph is the sole source of truth.
2. For NON-ARCHITECTURAL or CONVERSATIONAL inputs (e.g. "Hello", "Hi", "How are you?", "Who are you?", "Thanks"), return isArchitectural: false and a friendly conversationalMessage.
3. For ARCHITECTURAL inputs, select the most appropriate studio (templateId) and extract the primary and optional secondary entity.

STUDIO MAPPING:
- "composed-architecture": Architectural building block inventory, "what is X composed of", "what is X made of", building blocks, state/context inventory
- "component-hierarchy": Composition, hierarchy, parent-child, subcomponents, render tree, "where is X used"
- "navigation-flow": Routing, navigation, user reachability, "how do users reach X", "path to X"
- "request-lifecycle": Endpoints, authentication, middleware, security, request pipeline, "auth flow"
- "execution-flow": API calls, service execution, function triggers, multi-entity paths ("X to Y"), "which APIs does X call"

JSON RESPONSE SCHEMA (Return strictly JSON without markdown formatting):
{
  "isArchitectural": boolean,
  "queryType": "architectural" | "conversational",
  "templateId": "composed-architecture" | "component-hierarchy" | "navigation-flow" | "execution-flow" | "request-lifecycle",
  "primaryEntity": string | null,
  "secondaryEntity": string | null,
  "intent": "composed_architecture" | "composition" | "navigation" | "execution" | "request_lifecycle" | "multi_entity_path" | "general",
  "conversationalMessage": string | null
}
`;

/**
 * Extract clean focus entity from natural language question.
 */
export function extractEntities(input) {
  if (!input || typeof input !== "string") return { primaryEntity: null, secondaryEntity: null };
  const clean = input.trim();

  // Multi-entity path check: "path from Login to Database"
  const fromToMatch = clean.match(/from\s+([A-Za-z0-9_-]+)\s+to\s+([A-Za-z0-9_-]+)/i);
  if (fromToMatch) {
    return {
      primaryEntity: fromToMatch[1],
      secondaryEntity: fromToMatch[2],
    };
  }

  // Handle conversational special cases
  if (clean.toLowerCase() === "this request reach the backend" || clean.toLowerCase().includes("request reach")) {
    return { primaryEntity: "auth", secondaryEntity: null };
  }

  // Strip conversational prefix phrases
  let text = clean;
  text = text.replace(/^(what\s*(is|are|'s)?\s*)/i, "");
  text = text.replace(/^(how\s+(is|are|do|does|can|would|should)\s+(users?\s+)?(reach|get\s+to|call|affect|use|see|built)?\s*)/i, "");
  text = text.replace(/^(which\s+(apis?|services?|components?|routes?)\s+(does|do|is|are)\s*)/i, "");
  text = text.replace(/^(what\s+(state|component|route)\s+(affects?|used\s+in|calls?)\s*)/i, "");
  text = text.replace(/^(show\s+(me\s+)?(the\s+)?(critical\s+)?(path\s+)?(from\s+)?)/i, "");
  text = text.replace(/^(where\s+is\s+)/i, "");
  text = text.replace(/^(tell\s+me\s+about\s+)/i, "");

  // Strip trailing query suffixes
  text = text.replace(/\s+(composed\s+of\??|made\s+of\??|composed\??|used\??|called\??|reached\??|flow\??|architecture\??|hierarchy\??|tree\??)$/i, "");
  text = text.replace(/\s+(call\??|affect\??|reach\??|backend\??)$/i, "");
  text = text.replace(/[?!.]+$/g, "").trim();

  return { primaryEntity: text || null, secondaryEntity: null };
}

/**
 * Tokenizes user input and matches against ALIAS_REGISTRY (Fast Path).
 */
export function resolveTemplateByAlias(input) {
  if (!input || typeof input !== "string") {
    return { templateId: null, focusTerm: null, resolvedBy: null };
  }

  const cleanInput = input.trim().toLowerCase();
  if (!cleanInput) {
    return { templateId: null, focusTerm: null, resolvedBy: null };
  }

  // Natural language question prompts (e.g. "How is Dashboard composed?", "Which APIs does ProductList call?")
  // must NOT be intercepted by alias substring matching.
  // They MUST pass through Stage 1 Entity Resolver & Stage 3 Copilot Intent Resolver.
  if (/^(how|what|which|where|why|show|explain|tell)\b/i.test(cleanInput)) {
    return { templateId: null, focusTerm: null, secondaryTerm: null, isArchitectural: true, resolvedBy: null };
  }

  // Direct exact alias match (e.g. "sitemap", "component hierarchy", "execution flow", "state flow")
  if (ALIAS_REGISTRY.has(cleanInput)) {
    return {
      templateId: ALIAS_REGISTRY.get(cleanInput),
      focusTerm: null,
      secondaryTerm: null,
      isArchitectural: true,
      resolvedBy: "alias",
    };
  }

  return { templateId: null, focusTerm: null, secondaryTerm: null, isArchitectural: true, resolvedBy: null };
}

/**
 * Local fallback structured intent classification.
 */

export function interpretIntentLocally(input, graphEngine = null) {
  const cleanInput = (input || "").trim();
  if (!cleanInput || CONVERSATIONAL_REGEX.test(cleanInput)) {
    return {
      templateId: "execution-flow",
      focusTerm: null,
      secondaryTerm: null,
      isArchitectural: false,
      conversationalMessage:
        "This query doesn't describe an architectural exploration. Try asking about components, execution, navigation, state, APIs, or request flow.",
      resolvedBy: "fallback",
    };
  }

  // 1. Stage 1 Grounding Check against Knowledge Graph
  let stage1Res = null;
  if (graphEngine) {
    stage1Res = resolveEntity(cleanInput, graphEngine);
  }

  if (stage1Res && stage1Res.isAmbiguous) {
    let intendedTemplateId = "execution-flow";
    if (/hierarchy|component/i.test(cleanInput)) intendedTemplateId = "component-hierarchy";
    else if (/route|nav/i.test(cleanInput)) intendedTemplateId = "navigation-flow";
    else if (/state|store/i.test(cleanInput)) intendedTemplateId = "composed-architecture";
    else if (/api|request|lifecycle/i.test(cleanInput)) intendedTemplateId = "request-lifecycle";

    return {
      templateId: null,
      intendedTemplateId,
      focusTerm: cleanInput,
      isArchitectural: true,
      isAmbiguous: true,
      candidates: stage1Res.candidates,
      resolvedBy: "ambiguity",
    };
  }

  const groundedFocus = stage1Res?.primaryEntity?.name || null;
  const extracted = extractEntities(cleanInput);
  const targetName = extracted?.primaryEntity || cleanInput;
  const suggestions = stage1Res?.suggestions || (graphEngine ? getFuzzyComponentSuggestions(cleanInput, graphEngine) : []);

  for (const pattern of INTENT_STUDIO_PATTERNS) {
    if (pattern.regex.test(cleanInput)) {
      const resolutionFailed = !groundedFocus;
      return {
        templateId: pattern.templateId,
        focusTerm: resolutionFailed ? null : (groundedFocus || targetName),
        secondaryTerm: extracted?.secondaryEntity || null,
        isArchitectural: true,
        resolutionFailed,
        suggestions: resolutionFailed ? suggestions : [],
        conversationalMessage: resolutionFailed
          ? `No component named "${targetName}" was found.`
          : null,
        rawGeminiJson: null,
        resolvedBy: "fallback",
      };
    }
  }

  const classification = classifyIntent(cleanInput);
  let templateId = "execution-flow";

  if (classification.key === "architecture_query" || classification.key === "search") {
    if (/hierarchy|component/i.test(cleanInput)) templateId = "component-hierarchy";
    else if (/route|nav/i.test(cleanInput)) templateId = "navigation-flow";
    else if (/state|store/i.test(cleanInput)) templateId = "composed-architecture";
    else if (/api|request|lifecycle/i.test(cleanInput)) templateId = "request-lifecycle";
  }

  const resolutionFailed = !groundedFocus;

  return {
    templateId,
    focusTerm: resolutionFailed ? null : (groundedFocus || targetName),
    secondaryTerm: extracted?.secondaryEntity || null,
    isArchitectural: true,
    resolutionFailed,
    suggestions: resolutionFailed ? suggestions : [],
    conversationalMessage: resolutionFailed
      ? `No component named "${targetName}" was found.`
      : null,
    rawGeminiJson: null,
    resolvedBy: "fallback",
  };
}

/**
 * AI / Gemini Copilot Intent Resolver (Slow Path).
 * Invokes Gemini when API key is available, falling back to local structured interpreter.
 *
 * @param {string} input
 * @param {object} [graphEngine=null]
 * @returns {Promise<{ templateId: string, focusTerm: string | null, secondaryTerm: string | null, isArchitectural: boolean, isAmbiguous?: boolean, candidates?: Array<object>, conversationalMessage: string | null, rawGeminiJson?: string | null, resolvedBy: "ai" | "fallback" }>}
 */
export async function resolveViaAI(input, graphEngine = null) {
  if (!input || typeof input !== "string") {
    return { templateId: "execution-flow", focusTerm: null, secondaryTerm: null, isArchitectural: false, conversationalMessage: null, rawGeminiJson: null, resolvedBy: "fallback" };
  }

  const cleanInput = input.trim();
  if (!cleanInput) {
    return { templateId: "execution-flow", focusTerm: null, secondaryTerm: null, isArchitectural: false, conversationalMessage: null, rawGeminiJson: null, resolvedBy: "fallback" };
  }

  // Fast check for conversational inputs
  if (CONVERSATIONAL_REGEX.test(cleanInput)) {
    return interpretIntentLocally(cleanInput, graphEngine);
  }

  // Stage 1: Deterministic Entity Resolution
  let stage1Result = null;
  if (graphEngine) {
    stage1Result = resolveEntity(cleanInput, graphEngine);
    if (stage1Result.isAmbiguous) {
      let intendedTemplateId = "execution-flow";
      for (const pattern of INTENT_STUDIO_PATTERNS) {
        if (pattern.regex.test(cleanInput)) {
          intendedTemplateId = pattern.templateId;
          break;
        }
      }
      if (intendedTemplateId === "execution-flow") {
        const classification = classifyIntent(cleanInput);
        if (classification.key === "architecture_query" || classification.key === "search") {
          if (/hierarchy|component/i.test(cleanInput)) intendedTemplateId = "component-hierarchy";
          else if (/route|nav/i.test(cleanInput)) intendedTemplateId = "navigation-flow";
          else if (/state|store/i.test(cleanInput)) intendedTemplateId = "composed-architecture";
          else if (/api|request|lifecycle/i.test(cleanInput)) intendedTemplateId = "request-lifecycle";
        }
      }

      return {
        isAmbiguous: true,
        candidates: stage1Result.candidates,
        isArchitectural: true,
        templateId: null,
        intendedTemplateId,
        rawInput: cleanInput,
        focusTerm: null,
        secondaryTerm: null,
        conversationalMessage: null,
        rawGeminiJson: null,
        resolvedBy: "fallback",
      };
    }
  }

  if (isGeminiQuotaExceeded()) {
    return interpretIntentLocally(cleanInput, graphEngine);
  }

  const settings = getProviderSettings();
  const apiKey = (settings.apiKey && settings.apiKey.trim() !== "")
    ? settings.apiKey.trim()
    : ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ? import.meta.env.VITE_GEMINI_API_KEY : "");

  if (!apiKey || apiKey.trim() === "") {
    return interpretIntentLocally(cleanInput, graphEngine);
  }

  // Stage 2: Build Project Context if graphEngine and Stage 1 entity exist
  let projectContext = null;
  if (stage1Result?.primaryEntity) {
    projectContext = buildProjectContext(stage1Result.primaryEntity, graphEngine);
  }

  try {
    const promptText = projectContext
      ? `${cleanInput}\n\nProject Context:\n${JSON.stringify(projectContext, null, 2)}`
      : cleanInput;

    const contents = [{ role: "user", parts: [{ text: promptText }] }];
    const responseText = await geminiComplete(GEMINI_INTENT_SYSTEM_PROMPT, contents);
    
    const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && typeof parsed.isArchitectural === "boolean") {
      if (!parsed.isArchitectural) {
        return {
          templateId: "execution-flow",
          focusTerm: null,
          secondaryTerm: null,
          isArchitectural: false,
          conversationalMessage:
            parsed.conversationalMessage ||
            "This query doesn't describe an architectural exploration. Try asking about components, execution, navigation, state, APIs, or request flow.",
          rawGeminiJson: responseText,
          resolvedBy: "ai",
        };
      }

      // Grounding step: Verify extracted primaryEntity against Knowledge Graph
      let groundedFocusTerm = stage1Result?.primaryEntity?.name || null;
      if (!groundedFocusTerm && parsed.primaryEntity && graphEngine) {
        const reRes = resolveEntity(parsed.primaryEntity, graphEngine);
        if (reRes.primaryEntity && !reRes.isAmbiguous) {
          groundedFocusTerm = reRes.primaryEntity.name;
        }
      }

      const resolutionFailed = !groundedFocusTerm;

      return {
        templateId: parsed.templateId || "execution-flow",
        focusTerm: groundedFocusTerm,
        secondaryTerm: parsed.secondaryEntity || null,
        isArchitectural: true,
        resolutionFailed,
        conversationalMessage: resolutionFailed
          ? "Could not find a component matching that in this project. Try rephrasing or check the spelling."
          : null,
        rawGeminiJson: responseText,
        resolvedBy: "ai",
      };
    }
  } catch (err) {
    if (!err.isQuotaExceeded) {
      console.warn("Gemini intent interpretation failed; falling back to local interpreter:", err.message);
    }
  }

  return interpretIntentLocally(cleanInput, graphEngine);
}
