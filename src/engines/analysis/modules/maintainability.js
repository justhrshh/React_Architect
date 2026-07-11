/**
 * maintainability.js
 *
 * Evaluates component-level architectural health and maintainability score
 * based on a weighted multi-signal scoring system.
 */

export function calculateMaintainability(node, graph) {
  if (!node || node.kind !== "component") return null;

  const meta = node.metadata || {};
  const loc = meta.loc || 0;
  const props = meta.props || [];
  const hooks = meta.hooks || [];
  const contexts = meta.contexts || [];
  const apiCalls = meta.apiCalls || [];
  const children = meta.children || [];
  const imports = meta.imports || [];

  // Query edges for child nodes, API calls, and redux states if graph is provided
  let childNodesCount = children.length;
  let apiCallsCount = apiCalls.length;
  let consumedStatesCount = 0;

  if (graph) {
    childNodesCount = graph.edges.filter(e => e.type === "RENDERS" && e.source === node.id).length;
    apiCallsCount = graph.edges.filter(e => e.type === "USES_API" && e.source === node.id).length;
    consumedStatesCount = graph.edges.filter(e => e.type === "STATE_CONSUMER" && e.target === node.id).length;
  }

  // Effect hooks & state hooks
  const effectHooks = hooks.filter(h => h === "useEffect").length;
  const stateHooks = hooks.filter(h => h === "useState" || h === "useReducer").length;
  
  // 1. Responsibilities (30%)
  // Group logic, styling/layout, side-effects, state-management, networking, context consumption
  const responsibilities = [];
  if (childNodesCount > 0 || loc > 50) responsibilities.push("layout & rendering");
  if (apiCallsCount > 0) responsibilities.push("networking");
  if (effectHooks > 0) responsibilities.push("side effects");
  if (stateHooks > 0 || consumedStatesCount > 0) responsibilities.push("state management");
  if (contexts.length > 0) responsibilities.push("context consumption");
  if (hooks.length - effectHooks - stateHooks > 0) responsibilities.push("custom hooks/timeline");

  let responsibilitiesScore = 100;
  if (responsibilities.length === 3) responsibilitiesScore = 75;
  else if (responsibilities.length === 4) responsibilitiesScore = 55;
  else if (responsibilities.length >= 5) responsibilitiesScore = 35;

  // 2. Cyclomatic Complexity Proxy (20%)
  const approxComplexity = 1 + (props.length * 0.4) + (hooks.length * 0.8) + (apiCallsCount * 1.5) + (contexts.length * 0.5) + (consumedStatesCount * 1.0);
  let complexityScore = 100;
  if (approxComplexity > 20) complexityScore = 40;
  else if (approxComplexity > 12) complexityScore = 65;
  else if (approxComplexity > 6) complexityScore = 80;
  else if (approxComplexity > 3) complexityScore = 90;

  // 3. Hook Complexity (15%)
  let hookScore = 100;
  let hookDeduction = 0;
  if (hooks.length > 6) hookDeduction += 20;
  if (effectHooks > 2) hookDeduction += 30;
  if (stateHooks > 4) hookDeduction += 20;
  hookScore = Math.max(30, hookScore - hookDeduction);

  // 4. JSX Nesting (10%)
  let nestingScore = 100;
  if (childNodesCount > 12) nestingScore = 50;
  else if (childNodesCount > 8) nestingScore = 70;
  else if (childNodesCount > 4) nestingScore = 85;

  // 5. Branching (10%)
  const approxBranches = 1 + props.length * 0.3 + stateHooks * 0.7;
  let branchingScore = 100;
  if (approxBranches > 8) branchingScore = 50;
  else if (approxBranches > 5) branchingScore = 75;
  else if (approxBranches > 3) branchingScore = 90;

  // 6. Component Size (LOC) (5%)
  let sizeScore = 100;
  if (loc > 500) sizeScore = 50;
  else if (loc > 350) sizeScore = 70;
  else if (loc > 250) sizeScore = 85;
  else if (loc > 150) sizeScore = 95;

  // 7. Import Graph Complexity (5%)
  let importScore = 100;
  if (imports.length > 20) importScore = 40;
  else if (imports.length > 12) importScore = 70;
  else if (imports.length > 6) importScore = 85;

  // 8. Dependency Count (5%)
  const depCount = childNodesCount + apiCallsCount + consumedStatesCount + contexts.length;
  let depScore = 100;
  if (depCount > 15) depScore = 45;
  else if (depCount > 8) depScore = 70;
  else if (depCount > 4) depScore = 85;

  const score = Math.round(
    (responsibilitiesScore * 0.30) +
    (complexityScore * 0.20) +
    (hookScore * 0.15) +
    (nestingScore * 0.10) +
    (branchingScore * 0.10) +
    (sizeScore * 0.05) +
    (importScore * 0.05) +
    (depScore * 0.05)
  );

  // Compile complexity drivers
  const drivers = [];
  if (node.subtype === "page" && loc > 250) {
    drivers.push({ type: "success", text: "Large page component (+acceptable)" });
  } else if (loc > 350) {
    drivers.push({ type: "warning", text: "Large component body size" });
  }

  if (childNodesCount > 8) {
    drivers.push({ type: "warning", text: "High JSX nesting" });
  }

  if (responsibilities.length >= 3) {
    drivers.push({ type: "warning", text: "Multiple responsibilities detected" });
  } else {
    drivers.push({ type: "success", text: "Well modularized" });
  }

  if (imports.length <= 10) {
    drivers.push({ type: "success", text: "Imports organized" });
  } else {
    drivers.push({ type: "warning", text: "High import complexity" });
  }

  if (effectHooks > 2) {
    drivers.push({ type: "warning", text: `High effect complexity (${effectHooks} effects)` });
  }
  if (stateHooks > 4) {
    drivers.push({ type: "warning", text: `State-heavy component (${stateHooks} state variables)` });
  }

  // Recommendations
  const recommendations = [];
  if (effectHooks > 3) {
    recommendations.push(`Component contains ${effectHooks} useEffect hooks. Consider separating side-effects or extracting custom hooks.`);
  }
  if (childNodesCount > 12) {
    recommendations.push(`Renders more than 12 child components directly. Group children into layout templates or decompose.`);
  }
  if (responsibilities.length >= 3) {
    recommendations.push(`Combines multiple responsibilities (${responsibilities.join(", ")}). Consider decomposing into layout/container/view components.`);
  }
  if (node.subtype === "page" && loc > 250 && responsibilities.length <= 2) {
    recommendations.push("Large page component detected. Current organization is acceptable since responsibilities are low.");
  } else if (loc > 300) {
    recommendations.push(`Component is large (${loc} LOC). Consider extracting independent child widgets or animation timelines.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("Component complies with project architecture standards and is highly maintainable.");
  }

  return {
    score,
    drivers,
    recommendations,
    loc,
    responsibilities
  };
}
