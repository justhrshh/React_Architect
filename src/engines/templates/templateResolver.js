/**
 * templateResolver.js
 *
 * Fast-path alias matching tokenizer and Gemini Architectural Copilot Intent Interpreter.
 */

import { ALIAS_REGISTRY } from "./index.js";
import { classifyIntent } from "../ai/intent.js";
import { getProviderSettings } from "../ai/provider/settings.js";
import { resolveEntity, buildProjectContext } from "../query/aiQueryAdapter.js";

/**
 * Conversational greetings & non-architectural query patterns
 */
const CONVERSATIONAL_REGEX = /^(hi|hello|hey|howdy|good\s*(morning|afternoon|evening)|what'?s\s*up|who\s+are\s+you|what\s+can\s+you\s+do|thanks?|thank\s+you|how\s+are\s+you)\b/i;

/**
 * Natural language intent to studio template mapping rules
 */
const INTENT_STUDIO_PATTERNS = [
  // 1. Multi-entity path queries: "Login to Database", "Path from X to Y"
  {
    regex: /\b(from|between)\b.*\b(to)\b/i,
    templateId: "execution-flow",
    intent: "multi_entity_path",
  },
  // 2. Component Hierarchy / Composition / Usage: "How is X composed?", "Where is X used?", "Component hierarchy of X"
  {
    regex: /\b(composed?|composition|hierarchy|tree|children|subcomponents|where\s+is\s+.*used|rendered\s+by|part\s+of)\b/i,
    templateId: "component-hierarchy",
    intent: "composition",
  },
  // 3. Navigation / Routes / User Reach: "How do users reach X?", "Routes to X", "Navigation flow"
  {
    regex: /\b(reach|navigat(e|ion)|routes?\s*(to|from)?|path\s+to|user\s+flow|get\s+to)\b/i,
    templateId: "navigation-flow",
    intent: "navigation",
  },
  // 4. State / Redux / Store / Props: "What state affects X?", "Redux flow", "Context"
  {
    regex: /\b(state|redux|store|context|slice|props?|affects?|subscribe)\b/i,
    templateId: "state-flow",
    intent: "state",
  },
  // 5. Request Lifecycle / Auth / Backend / Middleware: "How does request reach backend?", "Auth flow", "Security"
  {
    regex: /\b(request|lifecycle|auth(entication)?|backend|middleware|security|endpoint)\b/i,
    templateId: "request-lifecycle",
    intent: "request_lifecycle",
  },
  // 6. Execution Flow / APIs / Service Calls: "Which APIs does X call?", "Execution flow", "Calls"
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
- "component-hierarchy": Composition, hierarchy, parent-child, subcomponents, "how is X composed", "where is X used"
- "navigation-flow": Routing, navigation, user reachability, "how do users reach X", "path to X"
- "state-flow": Redux, context, state propagation, props, ownership, "what state affects X"
- "request-lifecycle": Endpoints, authentication, middleware, security, request pipeline, "auth flow"
- "execution-flow": API calls, service execution, function triggers, multi-entity paths ("X to Y"), "which APIs does X call"

JSON RESPONSE SCHEMA (Return strictly JSON without markdown formatting):
{
  "isArchitectural": boolean,
  "queryType": "architectural" | "conversational",
  "templateId": "component-hierarchy" | "navigation-flow" | "execution-flow" | "state-flow" | "request-lifecycle",
  "primaryEntity": string | null,
  "secondaryEntity": string | null,
  "intent": "composition" | "navigation" | "execution" | "state" | "request_lifecycle" | "multi_entity_path" | "general",
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
  text = text.replace(/^(how\s+(is|are|do|does|can|would|should)\s+(users?\s+)?(reach|get\s+to|call|affect|use|see)?\s*)/i, "");
  text = text.replace(/^(which\s+(apis?|services?|components?|routes?)\s+(does|do|is|are)\s*)/i, "");
  text = text.replace(/^(what\s+(state|component|route)\s+(affects?|used\s+in|calls?)\s*)/i, "");
  text = text.replace(/^(show\s+(me\s+)?(the\s+)?(critical\s+)?(path\s+)?(from\s+)?)/i, "");
  text = text.replace(/^(where\s+is\s+)/i, "");
  text = text.replace(/^(tell\s+me\s+about\s+)/i, "");

  // Strip trailing query suffixes
  text = text.replace(/\s+(composed\??|used\??|called\??|reached\??|flow\??|architecture\??|hierarchy\??|tree\??)$/i, "");
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

export function interpretIntentLocally(input) {
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

  const { primaryEntity, secondaryEntity } = extractEntities(cleanInput);

  for (const pattern of INTENT_STUDIO_PATTERNS) {
    if (pattern.regex.test(cleanInput)) {
      return {
        templateId: pattern.templateId,
        focusTerm: primaryEntity || cleanInput,
        secondaryTerm: secondaryEntity || null,
        isArchitectural: true,
        conversationalMessage: null,
        resolvedBy: "ai",
      };
    }
  }

  const classification = classifyIntent(cleanInput);
  let templateId = "execution-flow";

  if (classification.key === "architecture_query" || classification.key === "search") {
    if (/hierarchy|component/i.test(cleanInput)) templateId = "component-hierarchy";
    else if (/route|nav/i.test(cleanInput)) templateId = "navigation-flow";
    else if (/state|store/i.test(cleanInput)) templateId = "state-flow";
    else if (/api|request|lifecycle/i.test(cleanInput)) templateId = "request-lifecycle";
  }

  return {
    templateId,
    focusTerm: primaryEntity || cleanInput,
    secondaryTerm: secondaryEntity || null,
    isArchitectural: true,
    conversationalMessage: null,
    resolvedBy: "ai",
  };
}

/**
 * AI / Gemini Copilot Intent Resolver (Slow Path).
 * Invokes Gemini when API key is available, falling back to local structured interpreter.
 *
 * @param {string} input
 * @param {object} [graphEngine=null]
 * @returns {Promise<{ templateId: string, focusTerm: string | null, secondaryTerm: string | null, isArchitectural: boolean, isAmbiguous?: boolean, candidates?: Array<object>, conversationalMessage: string | null, resolvedBy: "ai" | "fallback" }>}
 */
export async function resolveViaAI(input, graphEngine = null) {
  if (!input || typeof input !== "string") {
    return interpretIntentLocally("");
  }

  const cleanInput = input.trim();

  // Fast check for conversational inputs
  if (CONVERSATIONAL_REGEX.test(cleanInput)) {
    return interpretIntentLocally(cleanInput);
  }

  // Stage 1: Deterministic Entity Resolution
  if (graphEngine) {
    const stage1Result = resolveEntity(cleanInput, graphEngine);
    if (stage1Result.isAmbiguous) {
      return {
        isAmbiguous: true,
        candidates: stage1Result.candidates,
        isArchitectural: true,
        templateId: "execution-flow",
        focusTerm: cleanInput,
        secondaryTerm: null,
        conversationalMessage: null,
        resolvedBy: "ai",
      };
    }
  }

  const settings = getProviderSettings();
  const apiKey = (settings.apiKey && settings.apiKey.trim() !== "")
    ? settings.apiKey.trim()
    : (import.meta.env.VITE_GEMINI_API_KEY ?? "");

  if (!apiKey || apiKey.trim() === "") {
    return interpretIntentLocally(cleanInput);
  }

  // Stage 2: Build Project Context if graphEngine and Stage 1 entity exist
  let projectContext = null;
  if (graphEngine) {
    const stage1Res = resolveEntity(cleanInput, graphEngine);
    if (stage1Res.primaryEntity) {
      projectContext = buildProjectContext(stage1Res.primaryEntity, graphEngine);
    }
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
          resolvedBy: "ai",
        };
      }

      return {
        templateId: parsed.templateId || "execution-flow",
        focusTerm: parsed.primaryEntity || projectContext?.entity?.name || extractEntities(cleanInput).primaryEntity || cleanInput,
        secondaryTerm: parsed.secondaryEntity || extractEntities(cleanInput).secondaryEntity || null,
        isArchitectural: true,
        conversationalMessage: null,
        resolvedBy: "ai",
      };
    }
  } catch (err) {
    console.warn("Gemini intent interpretation failed; falling back to local interpreter:", err.message);
  }

  return interpretIntentLocally(cleanInput);
}
