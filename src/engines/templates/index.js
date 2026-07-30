/**
 * index.js (src/engines/templates)
 *
 * Central Template Registry and Template Resolution entry point.
 */

import executionFlowTemplate from "./execution-flow.template.js";
import componentHierarchyTemplate from "./component-hierarchy.template.js";
import navigationFlowTemplate from "./navigation-flow.template.js";
import requestLifecycleTemplate from "./request-lifecycle.template.js";
import composedArchitectureTemplate from "./composed-architecture.template.js";
import { resolveTemplateByAlias, resolveViaAI, speculativeClassify, getSpeculativeResult } from "./templateResolver.js";
import { resolveEntity, buildProjectContext, logSearchTelemetry } from "../query/aiQueryAdapter.js";
import { createQuery } from "../query/ArchitectureQuery.js";

/**
 * @typedef {object} Template
 * @property {string} id
 * @property {string} displayName
 * @property {string} description
 * @property {string} icon
 * @property {string} chipColor
 * @property {string[]} aliases
 * @property {object} query
 * @property {object} emptyState
 * @property {(focus: string|null) => string} historyLabel
 */

export const ALL_TEMPLATES = [
  composedArchitectureTemplate,
  executionFlowTemplate,
  componentHierarchyTemplate,
  navigationFlowTemplate,
  requestLifecycleTemplate,
];

export const TEMPLATE_REGISTRY = new Map(ALL_TEMPLATES.map((t) => [t.id, t]));

export const ALIAS_REGISTRY = new Map();

// Build ALIAS_REGISTRY
ALL_TEMPLATES.forEach((template) => {
  template.aliases.forEach((alias) => {
    ALIAS_REGISTRY.set(alias.toLowerCase().trim(), template.id);
  });
});

/**
 * Resolves user text input to a template ID using fast-path alias matching,
 * falling back to rule-based and AI intent classification.
 *
 * @param {string} input
 * @param {object} [graphEngine=null]
 * @returns {Promise<{ templateId: string | null, focusTerm: string | null, resolvedBy: "alias" | "ai" | null }>}
 */
export async function resolveTemplate(input, graphEngine = null) {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  let result = null;
  let stage1Res = null;
  let projectContext = null;

  try {
    const aliasMatch = resolveTemplateByAlias(input);
    if (aliasMatch && aliasMatch.templateId) {
      result = aliasMatch;
    } else {
      result = await resolveViaAI(input, graphEngine);
    }
  } catch (err) {
    console.warn("Template resolution failed:", err);
  }

  const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const executionMs = Math.round(endTime - startTime);

  if (graphEngine && input) {
    try {
      stage1Res = resolveEntity(input, graphEngine);
      if (stage1Res?.primaryEntity) {
        projectContext = buildProjectContext(stage1Res.primaryEntity, graphEngine);
      }
    } catch { /* ignore telemetry extraction error */ }
  }

  const capabilities = projectContext?.capabilities || {};
  const stage2CapabilitiesTrue = Object.keys(capabilities).filter((k) => capabilities[k] === true);

  logSearchTelemetry({
    rawQuery: input || "",
    stage1Entity: stage1Res?.primaryEntity?.name || null,
    stage1Confidence: stage1Res?.primaryEntity?.confidence || 0,
    stage1Candidates: (stage1Res?.candidates || []).map((c) => ({ name: c.name, kind: c.kind, confidence: c.confidence })),
    isAmbiguous: Boolean(stage1Res?.isAmbiguous),
    stage2CapabilitiesTrue,
    stage3RawGeminiJson: result?.rawGeminiJson || null,
    resolvedBy: result?.resolvedBy || "fallback",
    finalTemplateId: result?.templateId || null,
    finalFocusTerm: result?.focusTerm || null,
    executionMs,
  });

  return result || { templateId: "execution-flow", focusTerm: input, resolvedBy: "fallback" };
}

/**
 * Instantiates an ArchitectureQuery object from a template ID and optional focus term.
 *
 * @param {string} templateId
 * @param {string | null} focusTerm
 * @returns {object} ArchitectureQuery
 */
export function instantiateTemplate(templateId, focusTerm = null, secondaryTerm = null) {
  const template = TEMPLATE_REGISTRY.get(templateId) || executionFlowTemplate;

  const queryPartial = {
    graphType: template.query.graphType,
    focus: {
      term: focusTerm || null,
      secondaryTerm: secondaryTerm || null,
      strategy: template.query.focus.strategy || "name-match",
      seeds: [],
    },
    traversal: { ...template.query.traversal },
    composition: { ...template.query.composition },
    layout: { ...template.query.layout },
    presentation: { ...template.query.presentation },
    emptyState: { ...template.emptyState },
    meta: {
      templateId: template.id,
      displayName: template.historyLabel(focusTerm),
      timestamp: Date.now(),
    },
  };

  return createQuery(queryPartial);
}

// Re-export speculative pre-fetch helpers for use by Architecture.jsx
export { speculativeClassify, getSpeculativeResult };
