/**
 * composed-architecture.composer.js
 *
 * Composer for the "Composed Architecture" Lens.
 * Answers: "What is [Page/Component] composed of?"
 *
 * Accuracy rule: ONLY extract what is directly owned/used/called by the center node.
 *   - Read centerNode.metadata.* (hooks, children, contexts, apiCalls) for inline data
 *   - Follow ONLY outbound edges of semantic types (RENDERS, USES_HOOK, CALLS_API,
 *     USES_CONTEXT, IMPORTS) from the center node — never walk the whole subgraph
 *   - Never show parent components or project-wide nodes
 */

import {
  COMPOSED_CATEGORIES,
  classifyCategory,
  isNoiseEntity,
  buildComposedArchitectureGraph,
} from "../graph/composedArchitectureBuilder.js";

// ─── Edge types that mean "Dashboard owns/uses this" ──────────────────────────
const OWNERSHIP_EDGE_TYPES = new Set([
  "RENDERS", "USES_HOOK", "CALLS_API", "USES_API", "USES_CONTEXT",
  "STATE_CONSUMER", "IMPORTS", "USES", "CALLS", "CALLS_SERVICE",
  "DEPENDENCY",   // used for same-file references
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read from node.metadata.field OR node.field (real graph vs mock) */
function meta(node, field) {
  if (!node) return undefined;
  if (node.metadata && node.metadata[field] !== undefined) return node.metadata[field];
  return node[field];
}

function toName(item) {
  if (typeof item === "string") return item;
  return item.name || item.path || item.id || "";
}

function pushToCategory(map, catId, item) {
  const bucket = map.get(catId);
  if (!bucket) return;
  const key = item.name;
  const dup = bucket.find((e) => e.name === key);
  if (dup) { dup.count = (dup.count || 1) + (item.count || 1); }
  else { bucket.push({ ...item, count: item.count || 1 }); }
}

function isContextHook(lower) {
  return lower.includes("auth") || lower.includes("theme") || lower.includes("user") ||
    lower.includes("cart") || lower.includes("toast") || lower.includes("modal") ||
    lower.includes("context") || lower.includes("provider");
}

function isReduxHook(lower) {
  return lower === "useselector" || lower === "usedispatch" || lower === "usestore";
}

function isApiHook(lower) {
  return lower.startsWith("usefetch") || lower.startsWith("useget") ||
    lower.startsWith("usepost") || lower.startsWith("usequery") ||
    lower.startsWith("usemutation");
}

// ─── Main Composer ────────────────────────────────────────────────────────────

export function composeComposedArchitecture(subgraph, template, queryMeta = {}) {
  const { nodes = [], edges = [] } = subgraph || {};

  // ── 1. Resolve Center Node ─────────────────────────────────────────────────
  let centerNode = null;
  const focusTerm = (
    queryMeta.focusTerm ||
    queryMeta.focus ||
    queryMeta.resolvedTarget?.name ||
    queryMeta.primaryEntity ||
    ""
  ).toString().toLowerCase();

  if (focusTerm) {
    // 1st pass: Exact name match
    centerNode = nodes.find(
      (n) => (n.name || "").toLowerCase() === focusTerm
    );
    // 2nd pass: ID or label match
    if (!centerNode) {
      centerNode = nodes.find(
        (n) =>
          (n.id || "").toLowerCase().includes(focusTerm) ||
          (n.label || "").toLowerCase() === focusTerm ||
          (n.file || "").toLowerCase().includes(focusTerm)
      );
    }
  }

  if (!centerNode) {
    centerNode =
      nodes.find((n) => n.subtype === "page" || n.kind === "page" || n.type === "page" || n.kind === "layout") ||
      nodes.find((n) => n.kind === "component" || n.type === "component") ||
      nodes[0];
  }

  if (!centerNode) {
    // Pure fallback — no real data
    centerNode = {
      id: "center",
      name: "Component",
      kind: "component",
      metadata: { hooks: [], children: [], contexts: [], apiCalls: [] },
    };
  }

  // ── 2. Build sets for fast lookup ──────────────────────────────────────────
  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  // Direct OUTBOUND edges only — center node is source
  const directOutEdges = edges.filter(
    (e) => (e.source === centerNode.id || e.from === centerNode.id) &&
      (OWNERSHIP_EDGE_TYPES.has(e.type) || !e.type) // untyped edges are also ok
  );

  // IDs directly owned by center node via edges
  const ownedIds = new Set(directOutEdges.map((e) => e.target || e.to).filter(Boolean));

  // Build set of names that are actual project components (not Lucide icons, not externals)
  // Only names appearing as kind:"component" nodes in the graph are real project components
  const projectComponentNames = new Set(
    nodes.filter((n) => n.kind === "component").map((n) => n.name).filter(Boolean)
  );

  // ── 3. Category map ────────────────────────────────────────────────────────
  const categoryItemsMap = new Map();
  COMPOSED_CATEGORIES.forEach((cat) => categoryItemsMap.set(cat.id, []));

  // ── 4A. Hooks (from centerNode.metadata.hooks) ─────────────────────────────
  const rawHooks = meta(centerNode, "hooks") || [];
  rawHooks.forEach((h) => {
    const name = toName(h);
    if (!name || isNoiseEntity(name)) return;
    const lower = name.toLowerCase();

    if (isReduxHook(lower)) {
      pushToCategory(categoryItemsMap, "redux", { name, kind: "redux-hook" });
    } else if (isContextHook(lower) && lower.startsWith("use")) {
      pushToCategory(categoryItemsMap, "context", { name, kind: "context-hook" });
    } else if (isApiHook(lower)) {
      pushToCategory(categoryItemsMap, "apis", { name, kind: "data-hook" });
    } else {
      pushToCategory(categoryItemsMap, "hooks", { name, kind: "hook" });
    }
  });

  // ── 4B. Contexts (from metadata.contexts = useContext() args) ──────────────
  const rawContexts = meta(centerNode, "contexts") || meta(centerNode, "contextHooks") || [];
  rawContexts.forEach((c) => {
    const name = toName(c);
    if (name && !isNoiseEntity(name)) {
      pushToCategory(categoryItemsMap, "context", { name, kind: "context" });
    }
  });

  // ── 4C. API caller variable names (metadata.apiCalls) ──────────────────────────
  // metadata.apiCalls contains names of identifiers whose name includes "fetch","api","axios".
  // That includes internal async functions like "fetchData" — we must filter those out.
  // Only include known gateway variable names (api, axios, http, client, fetch).
  const GATEWAY_PATTERNS = /^(api|axios|http|https|client|apiClient|httpClient|axiosClient|fetch|request)$/i;
  const rawApiCalls = meta(centerNode, "apiCalls") || [];
  rawApiCalls.forEach((a) => {
    const name = toName(a);
    if (!name || !GATEWAY_PATTERNS.test(name)) return; // skip fetchData, fetchUser, etc.
    pushToCategory(categoryItemsMap, "services", { name, kind: "service" });
  });

  // ── 4D. State variables (explicit enrichment or count inference) ───────────
  const rawStateVars = meta(centerNode, "stateVariables") || [];
  if (rawStateVars.length > 0) {
    rawStateVars.forEach((s) => {
      const name = toName(s);
      if (name && !isNoiseEntity(name)) {
        pushToCategory(categoryItemsMap, "local-state", { name, kind: "state" });
      }
    });
  } else {
    // Infer: count useState occurrences in hooks
    const stateCount = rawHooks.filter((h) => toName(h).toLowerCase() === "usestate").length;
    if (stateCount > 0) {
      pushToCategory(categoryItemsMap, "local-state", {
        name: "useState vars",
        kind: "state",
        count: stateCount,
      });
    }
  }

  // ── 4E. Explicit APIs and routes (from mock enrichment) ───────────────────
  (meta(centerNode, "apis") || []).forEach((api) => {
    const name = toName(api);
    if (name) pushToCategory(categoryItemsMap, "apis", { name, kind: "endpoint" });
  });

  (meta(centerNode, "routes") || []).forEach((r) => {
    const name = toName(r);
    if (name) pushToCategory(categoryItemsMap, "navigation", { name, kind: "route" });
  });

  (meta(centerNode, "services") || []).forEach((svc) => {
    const name = toName(svc);
    if (name) pushToCategory(categoryItemsMap, "services", { name, kind: "service" });
  });

  // ── 4F. Same-file API endpoint nodes ────────────────────────────────────────
  // buildKnowledgeGraph creates kind:"api", subtype:"endpoint" nodes per file.
  // Match by file AND subtype (NOT metadata.type which doesn't exist on these nodes).
  // Count duplicates (same method+path called multiple times) with ×N.
  if (centerNode.file) {
    const fileApiNodes = nodes.filter(
      (n) =>
        n.kind === "api" &&
        n.subtype === "endpoint" &&   // ← correct field (not metadata.type)
        n.file === centerNode.file &&
        n.metadata?.path
    );
    const apiAgg = new Map();
    fileApiNodes.forEach((n) => {
      const method = (n.metadata?.method || "GET").toUpperCase();
      const path = n.metadata.path;
      const label = `${method} ${path}`;
      if (!apiAgg.has(label)) {
        apiAgg.set(label, { name: label, kind: "endpoint", count: 0 });
      }
      apiAgg.get(label).count += 1;
    });
    apiAgg.forEach((item) => pushToCategory(categoryItemsMap, "apis", item));
  }

  // Also capture via USES_API outbound edges (resolver may link component → endpoint)

  // This is the precise, type-safe extraction. Only 1 hop from center.
  const navImports = new Set(["Link", "NavLink", "Navigate", "useNavigate", "useLocation"]);

  directOutEdges.forEach((e) => {
    const targetId = e.target || e.to;
    const target = nodesById.get(targetId);
    if (!target) return;
    const targetName = target.name || target.label || "";
    if (!targetName || isNoiseEntity(targetName)) return;

    const edgeType = e.type || "";
    const targetKind = target.kind || target.subtype || target.type || "";

    // API endpoint nodes
    if (targetKind === "api" || edgeType === "CALLS_API" || edgeType === "USES_API") {
      const method = target.metadata?.method || "";
      const path = target.metadata?.path || targetName;
      const label = method ? `${method} ${path}` : path;
      pushToCategory(categoryItemsMap, "apis", {
        name: label, kind: "endpoint", id: target.id, filePath: target.file, line: target.metadata?.line
      });
      return;
    }

    // Route nodes
    if (targetKind === "route" || edgeType === "TARGETS_ROUTE") {
      const path = target.metadata?.path || targetName;
      pushToCategory(categoryItemsMap, "navigation", {
        name: path, kind: "route", id: target.id, filePath: target.file, line: target.metadata?.line
      });
      return;
    }

    // Context/State nodes
    if (targetKind === "state") {
      const payload = { name: targetName, id: target.id, filePath: target.file, line: target.metadata?.line };
      if (target.subtype === "context") {
        pushToCategory(categoryItemsMap, "context", { ...payload, kind: "context" });
      } else if (target.subtype === "slice" || target.subtype === "zustand-store") {
        pushToCategory(categoryItemsMap, "redux", { ...payload, kind: "slice" });
      } else {
        pushToCategory(categoryItemsMap, "local-state", { ...payload, kind: "state" });
      }
      return;
    }

    // Custom hook nodes
    if (targetKind === "hook" || edgeType === "USES_HOOK") {
      const lower = targetName.toLowerCase();
      const payload = { name: targetName, id: target.id, filePath: target.file, line: target.metadata?.line || target.line };
      if (isContextHook(lower)) {
        pushToCategory(categoryItemsMap, "context", { ...payload, kind: "context-hook" });
      } else {
        pushToCategory(categoryItemsMap, "hooks", { ...payload, kind: "hook" });
      }
      return;
    }

    // Rendered child components (RENDERS edge or IMPORTS where target is component)
    if (edgeType === "RENDERS" || targetKind === "component") {
      const payload = { name: targetName, id: target.id, filePath: target.file, line: target.metadata?.line || target.line };
      if (navImports.has(targetName)) {
        pushToCategory(categoryItemsMap, "navigation", { ...payload, kind: "navigator" });
      } else {
        const catId = classifyCategory({ name: targetName, kind: "component" });
        pushToCategory(categoryItemsMap, catId, { ...payload, kind: "component" });
      }
      return;
    }

    // Skip file nodes and other non-semantic types
    if (targetKind === "file") return;
  });

  // ── 6. Classify centerNode.metadata.children — PROJECT components only ─────
  // metadata.children = ALL PascalCase JSX names: real components + icon imports.
  // We filter out external library icons (lucide-react, react-icons) and dynamic variables.
  const projectComponentSet = new Set(
    nodes.filter((n) => n.kind === "component" || n.subtype === "page" || n.subtype === "layout").map((n) => n.name).filter(Boolean)
  );

  const KNOWN_ICON_NAMES = new Set([
    "User", "ShoppingBag", "Calendar", "Heart", "MapPin", "Settings", "LogOut", "Package",
    "Search", "Plus", "Minus", "Edit", "Trash", "Check", "X", "ChevronRight", "ChevronLeft",
    "ChevronDown", "ChevronUp", "ArrowRight", "ArrowLeft", "Sparkles", "Info", "AlertTriangle",
    "FileCode", "Box", "Layers", "Clock", "Mail", "Phone", "Lock", "Eye", "EyeOff", "Menu", "Filter"
  ]);

  const rawChildren = meta(centerNode, "children") || [];
  rawChildren.forEach((child) => {
    const name = toName(child);
    if (!name || isNoiseEntity(name)) return;

    // Filter out dynamic icon variable or external icon component imports
    if (name === "Icon" || name.startsWith("Icon")) return;
    if (KNOWN_ICON_NAMES.has(name) && !projectComponentSet.has(name)) return;

    // Only add if NOT already in any category
    const alreadyCaptured = [...categoryItemsMap.values()].flat().some((it) => it.name === name);
    if (alreadyCaptured) return;

    if (navImports.has(name)) {
      pushToCategory(categoryItemsMap, "navigation", { name, kind: "navigator" });
    } else {
      const catId = classifyCategory({ name, kind: "component" });
      pushToCategory(categoryItemsMap, catId, { name, kind: "component" });
    }
  });

  // ── 7. Build tree layout ───────────────────────────────────────────────────
  const allCategoryIds = COMPOSED_CATEGORIES.map((c) => c.id);
  const expandedCategoryIds = new Set(queryMeta.expandedCategoryIds || allCategoryIds);

  const { nodes: treeNodes, edges: treeEdges } = buildComposedArchitectureGraph(
    centerNode,
    categoryItemsMap,
    expandedCategoryIds,
    210
  );

  return {
    nodes: treeNodes,
    edges: treeEdges,
    centerNode,
    categoryItemsMap,
    layoutHints: { style: "radial-blueprint", ringRadius: 210 },
    queryMeta: {
      ...queryMeta,
      graphType: "composed-architecture",
      composerName: "composed-architecture",
    },
  };
}
