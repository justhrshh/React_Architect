/**
 * architectureHealth.js
 *
 * A rule-based scoring engine. Each rule is an independent, pure function
 * that inspects the graph (and, where useful, results already computed by
 * other analysis modules) and returns its own findings + score deduction.
 *
 * Adding a new health rule never requires touching existing rules — just
 * append a new entry to the `rules` array at the bottom of this file.
 */

import { getNodesByKind, findCycles, buildReverseAdjacency } from "./metrics.js";

const STARTING_SCORE = 100;

/**
 * @param {object} graph
 * @param {object} [context] - optional pre-computed results from other modules
 *   ({ deadCode, validation }) to avoid recomputing the same structural scans.
 * @returns {object} { score, grade, errors, warnings, suggestions, ruleResults }
 */
export function analyze(graph, context = {}) {
  const errors = [];
  const warnings = [];
  const suggestions = [];
  const ruleResults = [];

  let score = STARTING_SCORE;

  rules.forEach(rule => {
    const result = rule.evaluate(graph, context) || {};
    const deduction = result.deduction || 0;
    score -= deduction;

    ruleResults.push({
      id: rule.id,
      label: rule.label,
      deduction,
      findingCount: (result.findings || []).length,
    });

    (result.findings || []).forEach(finding => {
      const bucket = finding.severity === "error" ? errors : finding.severity === "warning" ? warnings : suggestions;
      bucket.push({ type: rule.id, message: finding.message, file: finding.file });
    });
  });

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    grade: gradeFor(score),
    errors,
    warnings,
    suggestions,
    ruleResults,
  };
}

function gradeFor(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Rules — each one is independent and contributes its own deduction.
// evaluate(graph, context) => { deduction: number, findings: [{severity, message, file}] }
// ---------------------------------------------------------------------------

const largeComponentsRule = {
  id: "LARGE_COMPONENTS",
  label: "Large Components",
  evaluate(graph) {
    const components = getNodesByKind(graph.nodes, "component");
    const offenders = components.filter(c => (c.metadata?.loc || 0) > 250);
    return {
      deduction: offenders.length * 2,
      findings: offenders.map(c => ({
        severity: "warning",
        message: `Component "${c.name}" is large (${c.metadata.loc} lines).`,
        file: c.file,
      })),
    };
  },
};

const circularDependenciesRule = {
  id: "CIRCULAR_DEPENDENCIES",
  label: "Circular Dependencies",
  evaluate(graph) {
    const cycles = findCycles(graph.nodes, graph.edges, "RENDERS");
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    return {
      deduction: cycles.length * 5,
      findings: cycles.map(c => ({
        severity: "warning",
        message: `Circular rendering loop: "${nodeMap.get(c.source)?.name || c.source}" <-> "${nodeMap.get(c.target)?.name || c.target}".`,
        file: nodeMap.get(c.source)?.file,
      })),
    };
  },
};

const deadRoutesRule = {
  id: "DEAD_ROUTES",
  label: "Dead Routes",
  evaluate(graph, context) {
    const unusedRoutes = context.deadCode?.unusedRoutes ?? [];
    return {
      deduction: unusedRoutes.length * 3,
      findings: unusedRoutes.map(r => ({
        severity: "warning",
        message: `Route "${r.name}" has no resolvable target component.`,
        file: r.file,
      })),
    };
  },
};

const duplicateHooksRule = {
  id: "DUPLICATE_HOOKS",
  label: "Duplicate Hooks",
  evaluate(graph) {
    const components = getNodesByKind(graph.nodes, "component");
    const hookOwners = new Map(); // hookName -> Set(componentName)
    components.forEach(c => {
      (c.metadata?.hooks || []).forEach(hook => {
        if (!hookOwners.has(hook)) hookOwners.set(hook, new Set());
        hookOwners.get(hook).add(c.name);
      });
    });
    // A "duplicate hook" here means the same *custom* hook name is redeclared
    // (i.e. appears as its own component/file elsewhere) rather than imported once.
    const customHookNodes = getNodesByKind(graph.nodes, "component").filter(c =>
      /^use[A-Z]/.test(c.name)
    );
    const byName = new Map();
    customHookNodes.forEach(h => {
      if (!byName.has(h.name)) byName.set(h.name, []);
      byName.get(h.name).push(h);
    });
    const duplicates = Array.from(byName.values()).filter(group => group.length > 1);

    return {
      deduction: duplicates.length * 3,
      findings: duplicates.map(group => ({
        severity: "warning",
        message: `Hook "${group[0].name}" is declared in ${group.length} different files.`,
        file: group[0].file,
      })),
    };
  },
};

const orphanComponentsRule = {
  id: "ORPHAN_COMPONENTS",
  label: "Orphan Components",
  evaluate(graph) {
    const components = getNodesByKind(graph.nodes, "component");
    const rootLikeSubtypes = new Set(["page", "layout", "provider", "context"]);
    const renderIncoming = buildReverseAdjacency(graph.edges, "RENDERS");
    const importIncoming = buildReverseAdjacency(
      graph.edges.filter(e => e.type === "DEPENDENCY"),
      "DEPENDENCY"
    );
    const isEntryFile = file => /(^|\/)(main|index|App)\.[jt]sx?$/.test(file);
    const offenders = components.filter(c => {
      if (rootLikeSubtypes.has(c.subtype) || isEntryFile(c.file)) return false;
      const hasRenderParent = (renderIncoming.get(c.id) || []).length > 0;
      return !hasRenderParent;
    });
    return {
      deduction: Math.min(offenders.length, 10) * 1, // cap so one messy import doesn't tank the whole score
      findings: offenders.map(c => ({
        severity: "suggestion",
        message: `Component "${c.name}" is not rendered by any other component in the graph.`,
        file: c.file,
      })),
    };
  },
};

const unusedComponentsRule = {
  id: "UNUSED_COMPONENTS",
  label: "Unused Components",
  evaluate(graph, context) {
    const unused = context.deadCode?.unusedComponents ?? [];
    return {
      deduction: Math.min(unused.length, 15) * 1,
      findings: unused.map(c => ({
        severity: "suggestion",
        message: `Component "${c.name}" appears unused — consider removing it.`,
        file: c.file,
      })),
    };
  },
};

const excessiveNestingRule = {
  id: "EXCESSIVE_NESTING",
  label: "Excessive Nesting",
  evaluate(graph) {
    const components = getNodesByKind(graph.nodes, "component");
    const offenders = components.filter(c => (c.metadata?.children || []).length > 12);
    return {
      deduction: offenders.length * 2,
      findings: offenders.map(c => ({
        severity: "warning",
        message: `Component "${c.name}" renders ${c.metadata.children.length} children directly — consider decomposing.`,
        file: c.file,
      })),
    };
  },
};

const brokenImportsRule = {
  id: "BROKEN_IMPORTS",
  label: "Broken Imports",
  evaluate(graph, context) {
    const missingTargets = (context.validation?.errors ?? []).filter(e => e.type === "MISSING_TARGET");
    return {
      deduction: missingTargets.length * 4,
      findings: missingTargets.map(e => ({
        severity: "error",
        message: e.message,
        file: e.source,
      })),
    };
  },
};

const missingProvidersRule = {
  id: "MISSING_PROVIDERS",
  label: "Missing Providers",
  evaluate(graph) {
    const components = getNodesByKind(graph.nodes, "component");
    const providerNames = new Set(
      components.filter(c => c.subtype === "provider" || c.subtype === "context").map(c => c.name)
    );
    // Components that list a context in metadata.contexts with no matching provider node in the graph.
    const offenders = [];
    components.forEach(c => {
      (c.metadata?.contexts || []).forEach(ctxName => {
        if (!providerNames.has(ctxName)) {
          offenders.push({ component: c, ctxName });
        }
      });
    });
    return {
      deduction: offenders.length * 3,
      findings: offenders.map(({ component, ctxName }) => ({
        severity: "error",
        message: `Component "${component.name}" consumes context "${ctxName}" but no matching provider was found in the graph.`,
        file: component.file,
      })),
    };
  },
};

const rules = [
  largeComponentsRule,
  circularDependenciesRule,
  deadRoutesRule,
  duplicateHooksRule,
  orphanComponentsRule,
  unusedComponentsRule,
  excessiveNestingRule,
  brokenImportsRule,
  missingProvidersRule,
];