/**
 * context.js
 * Assembles project context from Redux store data for AI prompts.
 * NEVER calls an AI model, makes network requests, or reads files from disk.
 * All data comes from the Redux store (Knowledge Graph + Analysis).
 *
 * v2: Adds source code injection from knowledgeGraph.rawFiles.
 */

// ─── Caching ─────────────────────────────────────────────────────────────────

let _cachedOverview = null;
let _cachedOverviewKey = null;

let _cachedGraphSummary = null;
let _cachedGraphSummaryKey = null;

let _cachedAnalysisSummary = null;
let _cachedAnalysisSummaryKey = null;

// ─── Project Overview ────────────────────────────────────────────────────────

/**
 * High-level project summary.
 * @param {{ knowledgeGraph: object, selectedProject: object }} params
 * @returns {object}
 */
export function buildProjectOverview({ knowledgeGraph, selectedProject }) {
  if (
    _cachedOverview &&
    _cachedOverviewKey &&
    _cachedOverviewKey.graphRef === knowledgeGraph &&
    _cachedOverviewKey.projectRef === selectedProject
  ) {
    return _cachedOverview;
  }

  const { project = {}, nodes = [], edges = [] } = knowledgeGraph ?? {};
  const count = (kind) => nodes.filter(n => n.kind === kind).length;

  const result = {
    name:           selectedProject?.name ?? project.name ?? 'Unknown Project',
    framework:      project.framework ?? 'Unknown',
    language:       project.language ?? 'Unknown',
    router:         project.router ?? 'None',
    stateLibrary:   project.state ?? 'None',
    buildTool:      project.buildTool ?? 'Unknown',
    componentCount: count('component'),
    routeCount:     count('route'),
    apiCount:       count('api'),
    stateCount:     count('state'),
    totalNodes:     nodes.length,
    totalEdges:     edges.length,
  };

  _cachedOverview = result;
  _cachedOverviewKey = { graphRef: knowledgeGraph, projectRef: selectedProject };
  return result;
}

// ─── Graph Summary ───────────────────────────────────────────────────────────

/**
 * Token-efficient summary of the Knowledge Graph.
 * @param {object} knowledgeGraph
 * @returns {object}
 */
export function buildGraphSummary(knowledgeGraph) {
  if (_cachedGraphSummary && _cachedGraphSummaryKey === knowledgeGraph) {
    return _cachedGraphSummary;
  }

  const { nodes = [], edges = [] } = knowledgeGraph ?? {};

  const nodesByKind = {};
  for (const n of nodes) nodesByKind[n.kind] = (nodesByKind[n.kind] ?? 0) + 1;

  const edgesByType = {};
  for (const e of edges) edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;

  const degreeMap = new Map();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }

  const topNodes = nodes
    .map(n => ({ id: n.id, name: n.name, kind: n.kind, degree: degreeMap.get(n.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 10);

  const result = { nodesByKind, edgesByType, topNodes, totalNodes: nodes.length, totalEdges: edges.length };
  _cachedGraphSummary = result;
  _cachedGraphSummaryKey = knowledgeGraph;
  return result;
}

// ─── Analysis Summary ────────────────────────────────────────────────────────

/**
 * Extracts key signals from Analysis Engine output.
 * @param {object} analysis
 * @returns {object|null}
 */
export function buildAnalysisSummary(analysis) {
  if (!analysis) return null;
  if (_cachedAnalysisSummary && _cachedAnalysisSummaryKey === analysis) {
    return _cachedAnalysisSummary;
  }

  const { architectureHealth, deadCode, complexity, dependencyHeatmap } = analysis;
  const result = {
    healthScore:          architectureHealth?.score ?? null,
    healthGrade:          architectureHealth?.grade ?? null,
    deadCodeCount:        deadCode?.items?.length ?? null,
    complexityHotspots:   (complexity?.hotspots ?? []).slice(0, 5),
    highCouplingNodes:    (dependencyHeatmap?.highCoupling ?? []).slice(0, 5),
    architectureFindings: (architectureHealth?.findings ?? []).slice(0, 10),
  };

  _cachedAnalysisSummary = result;
  _cachedAnalysisSummaryKey = analysis;
  return result;
}

// ─── Selection Context ───────────────────────────────────────────────────────

/**
 * Context for the currently selected node.
 * @param {{ selectedId: string, knowledgeGraph: object, analysis: object }} params
 * @returns {object|null}
 */
export function buildSelectionContext({ selectedId, knowledgeGraph, analysis }) {
  if (!selectedId) return null;

  const { nodes = [], edges = [] } = knowledgeGraph ?? {};
  const node = nodes.find(n => n.id === selectedId);
  if (!node) return null;

  const outgoing = edges
    .filter(e => e.source === selectedId)
    .map(e => {
      const target = nodes.find(n => n.id === e.target);
      return { type: e.type, targetId: e.target, targetName: target?.name ?? e.target, targetKind: target?.kind ?? 'unknown' };
    });

  const incoming = edges
    .filter(e => e.target === selectedId)
    .map(e => {
      const source = nodes.find(n => n.id === e.source);
      return { type: e.type, sourceId: e.source, sourceName: source?.name ?? e.source, sourceKind: source?.kind ?? 'unknown' };
    });

  const impact = analysis?.impact?.[selectedId] ?? null;

  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    subtype: node.subtype ?? null,
    file: node.file ?? null,
    metadata: node.metadata ?? {},
    outgoing,
    incoming,
    impact,
  };
}

// ─── Source Code ─────────────────────────────────────────────────────────────

const MAX_SOURCE_LINES = 300;

/**
 * Get the source code for a node's file from rawFiles.
 * @param {object|null} selection - Selection context from buildSelectionContext
 * @param {object} knowledgeGraph - Must have rawFiles array
 * @returns {string|null}
 */
export function getSourceCode(selection, knowledgeGraph) {
  if (!selection?.file || !knowledgeGraph?.rawFiles) return null;

  const file = knowledgeGraph.rawFiles.find(f => f.path === selection.file);
  if (!file?.content) return null;

  const lines = file.content.split('\n');
  if (lines.length <= MAX_SOURCE_LINES) {
    return `// ${file.path}\n${file.content}`;
  }

  const truncated = lines.slice(0, MAX_SOURCE_LINES).join('\n');
  return `// ${file.path} (first ${MAX_SOURCE_LINES} of ${lines.length} lines)\n${truncated}\n// ... truncated`;
}

// ─── Lazy Context Builder ────────────────────────────────────────────────────

/**
 * Builds only the requested context slices.
 * @param {string[]} slices
 * @param {{ knowledgeGraph: object, analysis: object, selectedId: string, selectedProject: object }} params
 * @returns {object}
 */
export function buildContext(slices, { knowledgeGraph, analysis, selectedId, selectedProject }) {
  const ctx = {};
  const sliceSet = new Set(slices || []);

  if (sliceSet.has('projectOverview')) {
    ctx.projectOverview = buildProjectOverview({ knowledgeGraph, selectedProject });
  }
  if (sliceSet.has('graphSummary')) {
    ctx.graphSummary = buildGraphSummary(knowledgeGraph);
  }
  if (sliceSet.has('analysisSummary')) {
    ctx.analysisSummary = buildAnalysisSummary(analysis);
  }
  if (sliceSet.has('selection')) {
    ctx.selection = buildSelectionContext({ selectedId, knowledgeGraph, analysis });
  }
  if (sliceSet.has('sourceCode')) {
    ctx.sourceCode = getSourceCode(ctx.selection, knowledgeGraph);
  }

  return ctx;
}
