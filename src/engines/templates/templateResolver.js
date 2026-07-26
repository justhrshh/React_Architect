/**
 * templateResolver.js
 *
 * Fast-path alias matching tokenizer and AI slow-path invocation wrapper.
 */

import { ALIAS_REGISTRY } from "./index.js";

/**
 * Tokenizes user input and matches against ALIAS_REGISTRY.
 *
 * @param {string} input
 * @returns {{ templateId: string | null, focusTerm: string | null, resolvedBy: "alias" | "ai" | null }}
 */
export function resolveTemplateByAlias(input) {
  if (!input || typeof input !== "string") {
    return { templateId: null, focusTerm: null, resolvedBy: null };
  }

  const cleanInput = input.trim().toLowerCase();
  if (!cleanInput) {
    return { templateId: null, focusTerm: null, resolvedBy: null };
  }

  // 1. Direct match or substring multi-word alias check
  for (const [alias, templateId] of ALIAS_REGISTRY.entries()) {
    if (cleanInput === alias || cleanInput.includes(alias)) {
      // Extract potential focus term by removing the alias
      let focus = cleanInput.replace(alias, "").trim();
      // Remove common prefix words like "show", "me", "how", "does", "the"
      focus = focus.replace(/^(show|me|how|does|the|a|an|for)\s+/, "").trim();
      return {
        templateId,
        focusTerm: focus || null,
        resolvedBy: "alias",
      };
    }
  }

  // 2. Token match
  const tokens = cleanInput.split(/[\s,._\-?!]+/);
  for (const token of tokens) {
    if (ALIAS_REGISTRY.has(token)) {
      return {
        templateId: ALIAS_REGISTRY.get(token),
        focusTerm: null,
        resolvedBy: "alias",
      };
    }
  }

  return { templateId: null, focusTerm: null, resolvedBy: null };
}

/**
 * AI slow path fallback (Phase 9 placeholder stub, resolved via Gemini API in Phase 9).
 *
 * @param {string} input
 * @param {string} kindDistribution
 * @param {object} geminiClient
 * @returns {Promise<{ templateId: string, focusTerm: string | null, resolvedBy: "ai" | "fallback" }>}
 */
export async function resolveViaAI(input, kindDistribution = "", geminiClient = null) {
  // Phase 9 will implement the real Gemini prompt call here.
  // For Phase 2-8, safe fallback is execution-flow with focusTerm extracted if available.
  const cleanInput = (input || "").trim();
  return {
    templateId: "execution-flow",
    focusTerm: cleanInput || null,
    resolvedBy: "fallback",
  };
}
