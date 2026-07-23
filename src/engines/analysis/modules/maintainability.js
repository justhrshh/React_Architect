/**
 * maintainability.js
 *
 * React Architect — Weighted Architectural Assessment Engine
 *
 * Evaluates component-level architectural health and maintainability score
 * using role-aware multi-signal assessment rather than simple rule heuristics.
 *
 * Exposes developer-friendly, human-readable terminology (Project Impact, Dependency Level, Usage Level).
 * Keeps internal graph calculations (blastRadius, fanIn, fanOut) private.
 */

/**
 * Classifies a node into its primary architectural role.
 * @param {object} node
 * @returns {"page" | "layout" | "container" | "presentational" | "provider" | "custom-hook"}
 */
export function classifyComponentRole(node) {
  if (!node) return "presentational";
  
  const name = node.name || "";
  const file = node.file || "";
  const subtype = node.subtype || "";
  const meta = node.metadata || {};

  if (subtype === "page" || /Page\.[jt]sx?$/i.test(file) || /(^|\/)pages\//i.test(file)) {
    return "page";
  }
  if (subtype === "layout" || /Layout\.[jt]sx?$/i.test(file) || /Template\.[jt]sx?$/i.test(file)) {
    return "layout";
  }
  if (subtype === "provider" || subtype === "context" || /Provider\.[jt]sx?$/i.test(file) || /Context\.[jt]sx?$/i.test(file)) {
    return "provider";
  }
  if (/^use[A-Z]/.test(name) || /hooks\//i.test(file)) {
    return "custom-hook";
  }

  // Distinguish Container vs Presentational
  const childCount = (meta.children || []).length;
  const stateHooksCount = (meta.hooks || []).filter(h => h === "useState" || h === "useReducer").length;
  const apiCallsCount = (meta.apiCalls || []).length;

  if (apiCallsCount > 0 || stateHooksCount >= 2 || (childCount >= 3 && stateHooksCount >= 1)) {
    return "container";
  }

  return "presentational";
}

/**
 * Calculates a comprehensive architectural maintainability evaluation for a component node.
 * @param {object} node
 * @param {object} [graph]
 * @returns {object} { score, role, metrics, drivers, recommendations, loc, responsibilities }
 */
export function calculateMaintainability(node, graph) {
  if (!node || node.kind !== "component") return null;

  const meta = node.metadata || {};
  const loc = meta.loc || 45;
  const props = meta.props || [];
  const hooks = meta.hooks || [];
  const contexts = meta.contexts || [];
  const apiCalls = meta.apiCalls || [];
  const children = meta.children || [];
  const imports = meta.imports || [];

  // Determine Knowledge Graph relationships (Fan-In / Fan-Out)
  let childNodesCount = children.length;
  let apiCallsCount = apiCalls.length;
  let consumedStatesCount = 0;
  let fanIn = 0;
  let fanOut = 0;

  if (graph && graph.edges) {
    const parentEdges = graph.edges.filter(e => e.type === "RENDERS" && e.target === node.id);
    const childEdges = graph.edges.filter(e => e.type === "RENDERS" && e.source === node.id);
    const apiEdges = graph.edges.filter(e => e.type === "USES_API" && e.source === node.id);
    const stateEdges = graph.edges.filter(e => e.type === "STATE_CONSUMER" && e.target === node.id);

    fanIn = parentEdges.length;
    childNodesCount = childEdges.length;
    apiCallsCount = apiEdges.length;
    consumedStatesCount = stateEdges.length;
    fanOut = childNodesCount + apiCallsCount + consumedStatesCount + contexts.length;
  } else {
    fanOut = childNodesCount + apiCallsCount + contexts.length;
  }

  // Hook Metrics
  const effectHooks = hooks.filter(h => h === "useEffect" || h === "useLayoutEffect").length;
  const stateHooks = hooks.filter(h => h === "useState" || h === "useReducer").length;
  const customHooksCount = Math.max(0, hooks.length - effectHooks - stateHooks);

  const totalHooks = hooks.length;
  const hookDensity = parseFloat((totalHooks / Math.max(loc / 50, 1)).toFixed(2));
  const effectDensity = totalHooks > 0 ? parseFloat((effectHooks / totalHooks).toFixed(2)) : 0;

  // Component Role & Expectations
  const role = classifyComponentRole(node);

  // Group active responsibilities
  const responsibilities = [];
  if (childNodesCount > 0 || loc > 40) responsibilities.push("layout & rendering");
  if (apiCallsCount > 0) responsibilities.push("networking");
  if (effectHooks > 0) responsibilities.push("side effects");
  if (stateHooks > 0 || consumedStatesCount > 0) responsibilities.push("state management");
  if (contexts.length > 0) responsibilities.push("context consumption");
  if (customHooksCount > 0) responsibilities.push("custom hooks/timeline");

  // Cyclomatic & Structural Complexity Proxies
  const cyclomaticProxy = parseFloat(
    (1 + (props.length * 0.35) + (totalHooks * 0.75) + (apiCallsCount * 1.4) + (contexts.length * 0.5) + (consumedStatesCount * 0.9)).toFixed(1)
  );

  const orchestrationIndex = parseFloat((childNodesCount / Math.max(loc / 80, 1)).toFixed(2));
  const blastRadius = fanIn + fanOut;

  // Human-Readable Impact & Dependency Rating
  const projectImpactRating = blastRadius > 12 ? "High Impact" : blastRadius > 5 ? "Moderate Impact" : "Low Impact";
  const dependencyLevel = fanOut > 8 ? "High Dependency" : fanOut > 3 ? "Moderate Dependency" : "Self-Contained";

  // ---------------------------------------------------------------------------
  // Weighted Multi-Factor Scoring (0 - 100)
  // ---------------------------------------------------------------------------

  // 1. Responsibility Cohesion Score (Weighted by Role)
  let responsibilityDeduction = 0;
  if (role === "presentational") {
    if (responsibilities.includes("networking")) responsibilityDeduction += 25;
    if (effectHooks >= 2) responsibilityDeduction += 20;
    if (responsibilities.length >= 3) responsibilityDeduction += 15;
  } else if (role === "container") {
    if (responsibilities.length >= 4) responsibilityDeduction += 15;
  } else if (role === "page" || role === "layout") {
    if (responsibilities.length >= 5 && loc > 300) responsibilityDeduction += 15;
  }
  const cohesionScore = Math.max(40, 100 - responsibilityDeduction);

  // 2. Cyclomatic Complexity Score
  let complexityScore = 100;
  if (cyclomaticProxy > 18) complexityScore = 45;
  else if (cyclomaticProxy > 12) complexityScore = 65;
  else if (cyclomaticProxy > 7) complexityScore = 82;
  else if (cyclomaticProxy > 4) complexityScore = 92;

  // 3. Hook Health & Density Score
  let hookScore = 100;
  if (effectHooks > 3) hookScore -= 25;
  if (stateHooks > 5) hookScore -= 20;
  if (hookDensity > 4.0) hookScore -= 15;
  hookScore = Math.max(35, hookScore);

  // 4. Structural Size Score
  let sizeScore = 100;
  if (role === "presentational" && loc > 180) sizeScore = 65;
  else if (role === "container" && loc > 320) sizeScore = 75;
  else if (role === "page" && loc > 450) sizeScore = 80;
  else if (loc > 300) sizeScore = 85;

  // 5. Dependency & Usage Score
  let depScore = 100;
  if (blastRadius > 16) depScore = 50;
  else if (blastRadius > 10) depScore = 70;
  else if (blastRadius > 5) depScore = 88;

  // Composite Weighted Score
  const score = Math.round(
    cohesionScore * 0.28 +
    complexityScore * 0.24 +
    hookScore * 0.20 +
    sizeScore * 0.14 +
    depScore * 0.14
  );

  // ---------------------------------------------------------------------------
  // Architectural Drivers (Strengths & Warnings in Clean Human Developer Terms)
  // ---------------------------------------------------------------------------
  const drivers = [];

  if (role === "page" || role === "layout") {
    drivers.push({ type: "success", text: `Page Orchestrator (${childNodesCount} child components)` });
  } else if (role === "presentational" && responsibilities.length <= 2 && apiCallsCount === 0) {
    drivers.push({ type: "success", text: "Pure UI component" });
  }

  if (cyclomaticProxy <= 5) {
    drivers.push({ type: "success", text: "Low logic complexity" });
  } else if (cyclomaticProxy > 12) {
    drivers.push({ type: "warning", text: "High logic complexity" });
  }

  if (loc > 350) {
    drivers.push({ type: "warning", text: `Large component body (${loc} Lines)` });
  } else if (loc <= 150) {
    drivers.push({ type: "success", text: "Compact code footprint" });
  }

  if (effectHooks > 2) {
    drivers.push({ type: "warning", text: `Multiple side-effects (${effectHooks} useEffects)` });
  }

  if (fanIn > 5) {
    drivers.push({ type: "warning", text: `Referenced by ${fanIn} components` });
  }

  // ---------------------------------------------------------------------------
  // Developer-Friendly 3-Part Recommendations & Architectural Advice
  // ---------------------------------------------------------------------------
  const rawRecommendations = [];

  const createRec = (title, whyItMatters, confidence, severity, triggeringMetrics, suggestionText) => {
    return {
      title,
      description: whyItMatters,
      whyItMatters,
      confidence,
      severity,
      metrics: triggeringMetrics,
      refactoringSuggestion: suggestionText,
      toString() {
        return `${this.title}: ${this.whyItMatters} ${this.refactoringSuggestion}`;
      },
    };
  };

  // Rule 1: Presentational Component mixing side-effects & network calls
  if (role === "presentational" && (apiCallsCount > 0 || effectHooks >= 2)) {
    const confidence = parseFloat(Math.min(0.96, 0.75 + effectHooks * 0.08 + apiCallsCount * 0.1).toFixed(2));
    rawRecommendations.push(
      createRec(
        "UI Purity Notice",
        `This UI component executes network calls (${apiCallsCount}) and multiple side-effects (${effectHooks} useEffects). Mixing data fetching into UI components makes them harder to reuse and test in isolation.`,
        confidence,
        "high",
        { loc, role: "Presentational UI", apiCallsCount, effectHooks, totalHooks },
        `Extract network fetching and side-effects into a parent Container component or custom hook (e.g. \`use${node.name}Data()\`), keeping this component purely presentational.`
      )
    );
  }

  // Rule 2: Container or Page experiencing Hook Sprawl
  if (effectHooks >= 3 || (totalHooks >= 6 && effectDensity > 0.4)) {
    const confidence = parseFloat(Math.min(0.95, 0.70 + effectHooks * 0.07).toFixed(2));
    rawRecommendations.push(
      createRec(
        "Side-Effect Density Warning",
        `Component contains ${effectHooks} useEffect hooks (${Math.round(effectDensity * 100)}% of total hooks). Having multiple uncoordinated side-effects can cause subtle re-render loops and race conditions.`,
        confidence,
        effectHooks >= 4 ? "high" : "medium",
        { loc, effectHooks, totalHooks, effectDensity },
        `Group related state synchronizations into dedicated custom hooks (e.g. \`use${node.name}Sync()\`) or derive state directly during rendering.`
      )
    );
  }

  // Rule 3: Heavy Container/Page mixing rendering & heavy state logic
  if ((role === "container" || role === "page") && loc > 260 && responsibilities.length >= 4 && stateHooks >= 4) {
    const confidence = parseFloat(Math.min(0.94, 0.65 + (loc / 500) * 0.2).toFixed(2));
    rawRecommendations.push(
      createRec(
        "Component Responsibility Overload",
        `Component handles ${responsibilities.length} responsibilities (${responsibilities.join(", ")}) across ${loc} lines of code and ${stateHooks} state variables. Combining too many features in one file makes debugging difficult.`,
        confidence,
        loc > 350 ? "high" : "medium",
        { loc, responsibilitiesCount: responsibilities.length, stateHooks },
        `Break down this component: move UI sub-sections into smaller presentational widgets and move complex state into a custom hook or store slice.`
      )
    );
  }

  // Rule 4: High Child Component Count
  if (childNodesCount > 8) {
    const confidence = parseFloat(Math.min(0.92, 0.65 + childNodesCount * 0.02).toFixed(2));
    rawRecommendations.push(
      createRec(
        "High Component Density",
        `Renders ${childNodesCount} child components directly in a single template. Large render trees make layout components harder to read and maintain.`,
        confidence,
        childNodesCount > 12 ? "high" : "medium",
        { childNodesCount, loc },
        `Group related UI elements into composite sub-views or layout templates to simplify the component tree.`
      )
    );
  }

  // Rule 5: High Project Impact / Widely Used Component
  if (blastRadius > 12) {
    const confidence = parseFloat(Math.min(0.90, 0.60 + blastRadius * 0.02).toFixed(2));
    rawRecommendations.push(
      createRec(
        "High Project Impact",
        `Used by ${fanIn > 0 ? `${fanIn} components` : 'multiple features'} across your application (${blastRadius} total connected items). Changes here are likely to affect multiple screens.`,
        confidence,
        "medium",
        { blastRadius, fanIn, fanOut, projectImpactRating },
        `Keep the props API stable and extract shared logic into reusable utility modules to minimize regression risk across dependent features.`
      )
    );
  }

  // Default recommendation if component is well-architected
  if (rawRecommendations.length === 0) {
    rawRecommendations.push(
      createRec(
        "Architectural Compliance",
        `Component follows React best practices for a ${role.toUpperCase()} component with clean separation of concerns and clear modular boundaries.`,
        0.98,
        "low",
        { loc, totalHooks, fanOut },
        "Maintain current modular structure and write unit tests to lock in behavior."
      )
    );
  }

  // Return comprehensive architectural result object
  return {
    score,
    role,
    metrics: {
      loc,
      totalHooks,
      effectHooks,
      stateHooks,
      customHooksCount,
      hookDensity,
      effectDensity,
      cyclomaticProxy,
      orchestrationIndex,
      fanIn,
      fanOut,
      blastRadius,
      projectImpactRating,
      dependencyLevel,
      childNodesCount,
      apiCallsCount,
      consumedStatesCount,
      responsibilitiesCount: responsibilities.length,
    },
    drivers,
    recommendations: rawRecommendations,
    loc,
    responsibilities,
  };
}
