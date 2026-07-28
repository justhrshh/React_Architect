/**
 * index.js (src/engines/templates)
 *
 * Central Template Registry and Template Resolution entry point.
 */

import executionFlowTemplate from "./execution-flow.template.js";
import stateFlowTemplate from "./state-flow.template.js";
import componentHierarchyTemplate from "./component-hierarchy.template.js";
import navigationFlowTemplate from "./navigation-flow.template.js";
import requestLifecycleTemplate from "./request-lifecycle.template.js";
import { createQuery } from "../query/ArchitectureQuery.js";
import { resolveTemplateByAlias, resolveViaAI } from "./templateResolver.js";

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
  executionFlowTemplate,
  stateFlowTemplate,
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
 * @returns {Promise<{ templateId: string | null, focusTerm: string | null, resolvedBy: "alias" | "ai" | null }>}
 */
export async function resolveTemplate(input, graphEngine = null) {
  const aliasMatch = resolveTemplateByAlias(input);
  if (aliasMatch && aliasMatch.templateId) {
    return aliasMatch;
  }
  return await resolveViaAI(input, graphEngine);
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
