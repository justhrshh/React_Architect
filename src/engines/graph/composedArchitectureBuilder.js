/**
 * composedArchitectureBuilder.js
 *
 * Inventory Projection Engine for the "Composed Architecture" Lens.
 * Answers: "What is [Page/Component] composed of?"
 *
 * Builds a radial architectural blueprint centered around a single target page/component.
 * Classifies all connected/used entities into 12 fixed category nodes.
 * Enforces noise filtering, multiplicity aggregation (e.g. Card ×5), and layout positioning.
 */

// The 12 fixed category definitions
export const COMPOSED_CATEGORIES = [
  { id: "ui-components", name: "UI Components", icon: "Layout",   color: "#3B82F6", order: 0 },
  { id: "local-state",   name: "Local State",   icon: "Sliders",  color: "#10B981", order: 1 },
  { id: "context",       name: "Context",       icon: "Layers",   color: "#8B5CF6", order: 2 },
  { id: "redux",         name: "Redux / Store", icon: "Database", color: "#EF4444", order: 3 },
  { id: "hooks",         name: "Hooks",         icon: "Zap",      color: "#F59E0B", order: 4 },
  { id: "apis",          name: "APIs",          icon: "Globe",    color: "#06B6D4", order: 5 },
  { id: "navigation",    name: "Navigation",    icon: "Compass",  color: "#EC4899", order: 6 },
  { id: "child-views",   name: "Child Views",   icon: "Grid",     color: "#6366F1", order: 7 },
  { id: "services",      name: "Services",      icon: "Server",   color: "#14B8A6", order: 8 },
  { id: "utilities",     name: "Utilities",     icon: "Wrench",   color: "#64748B", order: 9 },
  { id: "forms",         name: "Forms",         icon: "FileText", color: "#F97316", order: 10 },
  { id: "animations",    name: "Animations",    icon: "Activity", color: "#A855F7", order: 11 },
];

const NOISE_TAGS = new Set([
  "div", "span", "section", "input", "label", "button", "p", "a", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "form", "header", "footer", "main", "nav", "article", "aside", "img", "svg", "path",
  "fragment", "react.fragment", "<>", "br", "hr", "td", "tr", "table", "tbody", "thead", "th"
]);

/**
 * Filter out low-level HTML tags and internal noise wrappers.
 */
export function isNoiseEntity(name) {
  if (!name || typeof name !== "string") return true;
  const raw = name.trim();
  const clean = raw.toLowerCase();
  
  // HTML tags in JSX are strictly lowercase (e.g. <button>, <div>, <input>).
  // Capitalized names (e.g. <Button>, <Input>, <Header>) are React Components, NOT HTML tags!
  const isPascalCase = /^[A-Z]/.test(raw);
  if (!isPascalCase && NOISE_TAGS.has(clean)) return true;
  
  if (/^(anonymous|temp|wrapper|jsxwrapper|callback|_|ref|props|children)/i.test(clean)) return true;
  return false;
}

/**
 * Classifies an item into one of the 12 architectural categories.
 */
export function classifyCategory(item) {
  const kind = (item.kind || item.type || "").toLowerCase();
  const name = (item.name || item.id || "").trim();
  const lowerName = name.toLowerCase();

  // 1. Hooks
  if (kind === "hook" || lowerName.startsWith("use") || /^use[A-Z]/.test(name)) {
    return "hooks";
  }

  // 2. Local State
  if (kind === "state" || kind === "variable" || item.isState || lowerName.includes("state")) {
    return "local-state";
  }

  // 3. Context
  if (kind === "context" || kind === "provider" || lowerName.includes("context") || lowerName.includes("provider")) {
    return "context";
  }

  // 4. Redux / Store
  if (kind === "redux" || kind === "slice" || kind === "selector" || lowerName.includes("slice") || lowerName.includes("redux") || lowerName.includes("store") || lowerName.includes("dispatch")) {
    return "redux";
  }

  // 5. APIs / Endpoints
  if (kind === "api" || kind === "endpoint" || /^(get|post|put|delete|patch|fetch)\s/i.test(name) || lowerName.includes("api") || lowerName.includes("endpoint")) {
    return "apis";
  }

  // 6. Navigation
  if (kind === "route" || kind === "navigation" || ["link", "navlink", "route", "navigate"].includes(lowerName) || lowerName.includes("nav") || lowerName.includes("route")) {
    return "navigation";
  }

  // 7. Services
  if (kind === "service" || lowerName.includes("service") || lowerName.includes("client") || lowerName.includes("storage") || lowerName.includes("analytics")) {
    return "services";
  }

  // 8. Utilities
  if (kind === "utility" || kind === "util" || kind === "helper" || lowerName.includes("util") || lowerName.includes("helper") || lowerName.includes("format") || lowerName.includes("constant")) {
    return "utilities";
  }

  // 9. Forms
  if (kind === "form" || lowerName.includes("form") || lowerName.includes("validation") || lowerName.includes("schema")) {
    return "forms";
  }

  // 10. Animations
  if (kind === "animation" || lowerName.includes("motion") || lowerName.includes("animation") || lowerName.includes("transition") || lowerName.includes("gsap")) {
    return "animations";
  }

  // 11. Child Views / Sections
  if (kind === "page" || kind === "view" || kind === "section" || item.isView || (item.childCount && item.childCount > 2)) {
    return "child-views";
  }

  // 12. UI Components (Default fallback for capitalized components)
  if (kind === "component" || kind === "ui" || /^[A-Z]/.test(name)) {
    return "ui-components";
  }

  return "utilities";
}

/**
 * Computes layout positions for Center Node (0,0), Category ring nodes, and expanded child items.
 *
 * @param {object} centerNode
 * @param {Map<string, Array<object>>} categoryItemsMap Map of categoryId -> items array
 * @param {Set<string>} expandedCategoryIds
 * @param {number} ringRadius Default 210px
 * @returns {{ nodes: Array<object>, edges: Array<object> }}
 */
export function buildComposedArchitectureGraph(centerNode, categoryItemsMap, expandedCategoryIds = new Set(), ringRadius = 210) {
  const nodes = [];
  const edges = [];

  // 1. Center Target Node Card (Top Center: y = -160)
  const centerId = centerNode.id || "center-target";
  const formattedCenter = {
    id: centerId,
    canonicalId: centerNode.canonicalId || centerNode.id,
    name: centerNode.name || centerNode.label || "Page / Component",
    kind: centerNode.kind || centerNode.type || "page",
    filePath: centerNode.filePath || centerNode.file || `src/components/${centerNode.name || "Target"}.jsx`,
    line: centerNode.line || centerNode.metadata?.line || 1,
    loc: centerNode.loc || centerNode.linesOfCode || 240,
    health: centerNode.health || (centerNode.complexity === "high" ? "Needs Review" : "Excellent"),
    complexity: centerNode.complexity || "Medium",
    depsCount: centerNode.depsCount || (centerNode.deps ? centerNode.deps.length : 8),
    isCenterNode: true,
    w: 230,
    h: 110,
    x: -115,
    y: -160,
  };
  nodes.push(formattedCenter);

  // 2. Filter active non-empty categories dynamically
  const activeCategoryList = [];

  COMPOSED_CATEGORIES.forEach((cat) => {
    const rawItems = categoryItemsMap.get(cat.id) || [];

    // Aggregating multiplicity (e.g. Card ×5)
    const aggregated = new Map();
    rawItems.forEach((item) => {
      if (isNoiseEntity(item.name || item.id)) return;
      const key = item.name || item.id;
      if (!aggregated.has(key)) {
        aggregated.set(key, { ...item, name: key, count: item.count || 1 });
      } else {
        const existing = aggregated.get(key);
        existing.count += item.count || 1;
        if (!existing.id && item.id) existing.id = item.id;
        if (!existing.filePath && item.filePath) existing.filePath = item.filePath;
        if (!existing.line && item.line) existing.line = item.line;
      }
    });

    const items = Array.from(aggregated.values());
    const totalCount = items.reduce((acc, curr) => acc + curr.count, 0);

    if (totalCount > 0) {
      activeCategoryList.push({ cat, items, totalCount });
    }
  });

  // Fallback: If no category has items, include top 4 default categories
  if (activeCategoryList.length === 0) {
    ["ui-components", "hooks", "navigation", "services"].forEach((catId) => {
      const cat = COMPOSED_CATEGORIES.find((c) => c.id === catId);
      if (cat) {
        activeCategoryList.push({ cat, items: [], totalCount: 0 });
      }
    });
  }

  // 3. Level 1: Categories Row (y = 0) arranged horizontally under Dashboard
  const numCategories = activeCategoryList.length;
  const colSpacing = Math.max(190, Math.min(240, 800 / Math.max(1, numCategories)));
  const totalCatWidth = (numCategories - 1) * colSpacing;
  const startCatX = -totalCatWidth / 2;

  activeCategoryList.forEach(({ cat, items, totalCount }, index) => {
    const catCx = numCategories === 1 ? 0 : Math.round(startCatX + index * colSpacing);
    const catCy = 0;

    const categoryNodeId = `category-${cat.id}`;
    const isExpanded = expandedCategoryIds.has(cat.id);

    const categoryNode = {
      id: categoryNodeId,
      canonicalId: null,
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      itemCount: totalCount,
      uniqueItemCount: items.length,
      isCategoryNode: true,
      isExpanded,
      w: 160,
      h: 44,
      x: catCx - 80,
      y: catCy - 22,
    };
    nodes.push(categoryNode);

    // Edge: Dashboard (top) -> Category Node (middle)
    edges.push({
      id: `edge-${centerId}-${categoryNodeId}`,
      source: centerId,
      target: categoryNodeId,
      label: totalCount > 0 ? `${totalCount} items` : "contains",
      type: "CONTAINS",
      color: cat.color,
    });

    // 4. Level 2: Children Branching (y = 130+) arranged under parent category
    if (isExpanded && items.length > 0) {
      const numChildren = items.length;
      const childSpacing = 160;
      const childTotalWidth = (numChildren - 1) * childSpacing;
      const childStartX = catCx - childTotalWidth / 2;

      items.forEach((childItem, cIdx) => {
        const childCx = numChildren === 1 ? catCx : Math.round(childStartX + cIdx * childSpacing);
        const childCy = 130 + (cIdx % 2) * 44; // Gentle stagger if multiple items

        const childNodeId = `child-${cat.id}-${cIdx}-${childItem.name.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const multiplicityLabel = childItem.count > 1 ? `${childItem.name} ×${childItem.count}` : childItem.name;

        nodes.push({
          id: childNodeId,
          canonicalId: childItem.id || childItem.name || null,
          categoryId: cat.id,
          name: childItem.name,
          displayName: multiplicityLabel,
          count: childItem.count,
          kind: childItem.kind || cat.id,
          filePath: childItem.filePath || childItem.file || null,
          line: childItem.line || null,
          color: cat.color,
          isChildNode: true,
          w: 150,
          h: 36,
          x: childCx - 75,
          y: childCy - 18,
        });

        edges.push({
          id: `edge-${categoryNodeId}-${childNodeId}`,
          source: categoryNodeId,
          target: childNodeId,
          label: childItem.count > 1 ? `renders ×${childItem.count}` : "uses",
          type: "USES",
          color: cat.color,
        });
      });
    }
  });

  return { nodes, edges };
}
