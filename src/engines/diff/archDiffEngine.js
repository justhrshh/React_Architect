/**
 * archDiffEngine.js
 *
 * Pure function that computes an architectural diff between two Knowledge Graphs.
 * Runs entirely in-browser with no external dependencies.
 *
 * Input:  two KnowledgeGraph objects (from buildKnowledgeGraph)
 * Output: ArchDiff object describing what changed architecturally
 */

// ── Node type constants (must match buildKnowledgeGraph.js) ──────────────────
const TYPE_COMPONENT  = 'component';
const TYPE_HOOK       = 'hook';
const TYPE_SLICE      = 'slice';
const TYPE_ROUTE      = 'route';
const TYPE_SERVICE    = 'service';
const TYPE_CONTEXT    = 'context';
const TYPE_UTIL       = 'util';

/**
 * Compute an architectural diff between two snapshots' knowledge graphs.
 *
 * @param {object} kgA  Older / baseline Knowledge Graph
 * @param {object} kgB  Newer / current Knowledge Graph
 * @param {number} scoreA Older health score
 * @param {number} scoreB Newer health score
 * @returns {ArchDiff}
 */
export function computeArchDiff(kgA, kgB, scoreA = null, scoreB = null) {
  const nodesA = kgA?.nodes || [];
  const nodesB = kgB?.nodes || [];
  const edgesA = kgA?.edges || [];
  const edgesB = kgB?.edges || [];

  // Index by id and by label+type for fuzzy matching
  const mapA = indexNodes(nodesA);
  const mapB = indexNodes(nodesB);

  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

  const added   = [];
  const removed = [];
  const changed = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);

    if (!a && b)  added.push(summarizeNode(b));
    if (a && !b)  removed.push(summarizeNode(a));
    if (a && b) {
      const changes = detectNodeChanges(a, b);
      if (changes.length > 0) {
        changed.push({ ...summarizeNode(b), changes });
      }
    }
  }

  // Partition by type
  const partition = (arr, type) => arr.filter((n) => n.type === type);

  // Edge analysis — circular dependency delta
  const circlesA = detectCircularPairs(edgesA, nodesA);
  const circlesB = detectCircularPairs(edgesB, nodesB);
  const circularsAdded   = circlesB.filter((c) => !circlesA.some((d) => d.key === c.key));
  const circularsRemoved = circlesA.filter((c) => !circlesB.some((d) => d.key === c.key));

  // Import count delta
  const importDelta = edgesB.length - edgesA.length;

  // Health delta
  const healthDelta = (scoreB !== null && scoreA !== null)
    ? scoreB - scoreA
    : null;

  // AI-style summary
  const summary = generateSummary({
    added, removed, changed, circularsAdded, circularsRemoved,
    importDelta, healthDelta,
  });

  return {
    // Flat lists
    nodesAdded:   added,
    nodesRemoved: removed,
    nodesChanged: changed,

    // By type
    componentsAdded:   partition(added,   TYPE_COMPONENT),
    componentsRemoved: partition(removed, TYPE_COMPONENT),
    hooksAdded:        partition(added,   TYPE_HOOK),
    hooksRemoved:      partition(removed, TYPE_HOOK),
    routesAdded:       partition(added,   TYPE_ROUTE),
    routesRemoved:     partition(removed, TYPE_ROUTE),
    slicesAdded:       partition(added,   TYPE_SLICE),
    slicesRemoved:     partition(removed, TYPE_SLICE),
    servicesAdded:     partition(added,   TYPE_SERVICE),
    servicesRemoved:   partition(removed, TYPE_SERVICE),

    // Edges
    importDelta,
    circularsAdded,
    circularsRemoved,

    // Scores
    healthDelta,
    scoreA,
    scoreB,

    // Summary
    summary,

    // Stats
    totalAdded:   added.length,
    totalRemoved: removed.length,
    totalChanged: changed.length,
  };
}

// ── Node indexing ─────────────────────────────────────────────────────────────

function indexNodes(nodes) {
  const map = new Map();
  for (const node of nodes) {
    // Use path as key if available (most stable), else label+type
    const key = node.data?.path || `${node.data?.label}::${node.type || node.data?.type}`;
    map.set(key, node);
  }
  return map;
}

function summarizeNode(node) {
  return {
    id:    node.id,
    label: node.data?.label || node.id,
    type:  node.type || node.data?.type || 'unknown',
    path:  node.data?.path || null,
    loc:   node.data?.loc || null,
  };
}

function detectNodeChanges(a, b) {
  const changes = [];
  const da = a.data || {};
  const db = b.data || {};

  if (da.loc && db.loc && Math.abs(db.loc - da.loc) > 20) {
    changes.push({
      field: 'loc',
      from: da.loc,
      to: db.loc,
      delta: db.loc - da.loc,
    });
  }

  if (da.imports?.length !== db.imports?.length && db.imports) {
    changes.push({
      field: 'imports',
      from: da.imports?.length || 0,
      to: db.imports?.length || 0,
    });
  }

  return changes;
}

// ── Circular dependency detection ─────────────────────────────────────────────

function detectCircularPairs(edges, nodes) {
  const pairs = [];
  const edgeSet = new Set(edges.map((e) => `${e.source}->${e.target}`));

  for (const edge of edges) {
    const reverse = `${edge.target}->${edge.source}`;
    if (edgeSet.has(reverse)) {
      const key = [edge.source, edge.target].sort().join('<->');
      if (!pairs.some((p) => p.key === key)) {
        const labelA = nodes.find((n) => n.id === edge.source)?.data?.label || edge.source;
        const labelB = nodes.find((n) => n.id === edge.target)?.data?.label || edge.target;
        pairs.push({ key, labelA, labelB });
      }
    }
  }
  return pairs;
}

// ── Summary generation ────────────────────────────────────────────────────────

function generateSummary({ added, removed, changed, circularsAdded, circularsRemoved, importDelta, healthDelta }) {
  const parts = [];

  if (added.length === 0 && removed.length === 0 && changed.length === 0) {
    return 'No architectural changes detected in this snapshot.';
  }

  if (added.length > 0) {
    const byType = groupByType(added);
    const descriptions = Object.entries(byType).map(([type, items]) =>
      `${items.length} ${type}${items.length > 1 ? 's' : ''}`
    );
    parts.push(`Added ${descriptions.join(', ')}`);
  }

  if (removed.length > 0) {
    const byType = groupByType(removed);
    const descriptions = Object.entries(byType).map(([type, items]) =>
      `${items.length} ${type}${items.length > 1 ? 's' : ''}`
    );
    parts.push(`removed ${descriptions.join(', ')}`);
  }

  if (circularsRemoved.length > 0) {
    parts.push(`resolved ${circularsRemoved.length} circular dependenc${circularsRemoved.length > 1 ? 'ies' : 'y'}`);
  }

  if (circularsAdded.length > 0) {
    parts.push(`introduced ${circularsAdded.length} new circular dependenc${circularsAdded.length > 1 ? 'ies' : 'y'}`);
  }

  if (importDelta > 0)  parts.push(`${importDelta} more imports`);
  if (importDelta < 0)  parts.push(`${Math.abs(importDelta)} fewer imports`);

  if (healthDelta !== null) {
    if (healthDelta > 0) parts.push(`health improved by ${healthDelta} points`);
    if (healthDelta < 0) parts.push(`health decreased by ${Math.abs(healthDelta)} points`);
  }

  return parts.length > 0
    ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + '. ' + parts.slice(1).join(', ') + '.'
    : 'Minor structural changes detected.';
}

function groupByType(nodes) {
  return nodes.reduce((acc, node) => {
    const t = node.type || 'module';
    if (!acc[t]) acc[t] = [];
    acc[t].push(node);
    return acc;
  }, {});
}
