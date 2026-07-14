/**
 * prompt.js
 * Assembles user prompts by combining the question with relevant context.
 * No per-intent templates. Context is injected as labeled sections.
 * The system prompt controls response behavior; this only provides data.
 */

/**
 * Build the user prompt for any intent.
 * @param {string} intentKey
 * @param {string} question
 * @param {object} context - From buildContext()
 * @returns {string}
 */
export function buildPrompt(intentKey, question, context) {
  const parts = [];

  parts.push(`The developer asks: "${question}"`);

  // Project overview
  if (context.projectOverview) {
    const o = context.projectOverview;
    parts.push(`\n## Project: ${o.name}`);
    parts.push(`- Framework: ${o.framework} (${o.language})`);
    parts.push(`- Scale: ${o.componentCount} components, ${o.routeCount} routes, ${o.apiCount} API endpoints, ${o.stateCount} state stores`);
    if (o.router !== 'None') parts.push(`- Router: ${o.router}`);
    if (o.stateLibrary !== 'None') parts.push(`- State: ${o.stateLibrary}`);
  }

  // Selected node
  if (context.selection) {
    const s = context.selection;
    parts.push(`\n## Selected: ${s.name} (${s.kind}${s.subtype ? '/' + s.subtype : ''})`);
    if (s.file) parts.push(`- File: ${s.file}`);

    const meta = s.metadata ?? {};
    if (meta.hooks?.length) parts.push(`- Hooks: ${meta.hooks.join(', ')}`);
    if (meta.props?.length) parts.push(`- Props: ${meta.props.join(', ')}`);
    if (meta.loc) parts.push(`- Lines of code: ${meta.loc}`);
    if (meta.method) parts.push(`- HTTP Method: ${meta.method}`);
    if (meta.endpoint) parts.push(`- Endpoint: ${meta.endpoint}`);
    if (meta.path) parts.push(`- Route path: ${meta.path}`);
    if (meta.isProtected) parts.push(`- Protected route: yes`);

    if (s.outgoing?.length) {
      parts.push(`\n### Outgoing connections (${s.name} depends on):`);
      for (const edge of s.outgoing.slice(0, 15)) {
        parts.push(`- ${edge.type} → ${edge.targetName} (${edge.targetKind})`);
      }
      if (s.outgoing.length > 15) parts.push(`- ... and ${s.outgoing.length - 15} more`);
    }

    if (s.incoming?.length) {
      parts.push(`\n### Incoming connections (depends on ${s.name}):`);
      for (const edge of s.incoming.slice(0, 15)) {
        parts.push(`- ${edge.sourceName} (${edge.sourceKind}) → ${edge.type}`);
      }
      if (s.incoming.length > 15) parts.push(`- ... and ${s.incoming.length - 15} more`);
    }

    if (s.impact) {
      parts.push(`\n### Impact Analysis`);
      if (s.impact.directDependents) parts.push(`- Direct dependents: ${s.impact.directDependents}`);
      if (s.impact.transitiveDependents) parts.push(`- Transitive dependents: ${s.impact.transitiveDependents}`);
      if (s.impact.riskLevel) parts.push(`- Risk level: ${s.impact.riskLevel}`);
    }
  }

  // Source code
  if (context.sourceCode) {
    parts.push(`\n## Source Code\n\`\`\`jsx\n${context.sourceCode}\n\`\`\``);
  }

  // Graph summary
  if (context.graphSummary) {
    const g = context.graphSummary;
    parts.push(`\n## Architecture Overview`);
    parts.push(`- Total: ${g.totalNodes} entities, ${g.totalEdges} relationships`);

    const kinds = Object.entries(g.nodesByKind).map(([k, v]) => `${v} ${k}s`).join(', ');
    parts.push(`- Entities: ${kinds}`);

    const edges = Object.entries(g.edgesByType).map(([k, v]) => `${v} ${k}`).join(', ');
    parts.push(`- Relationships: ${edges}`);

    if (g.topNodes?.length) {
      parts.push(`\n### Most connected entities:`);
      for (const n of g.topNodes.slice(0, 8)) {
        parts.push(`- ${n.name} (${n.kind}) — ${n.degree} connections`);
      }
    }
  }

  // Analysis summary
  if (context.analysisSummary) {
    const a = context.analysisSummary;
    parts.push(`\n## Analysis Results`);
    if (a.healthScore != null) parts.push(`- Health score: ${a.healthScore}/100 (${a.healthGrade})`);
    if (a.deadCodeCount != null) parts.push(`- Dead code entities: ${a.deadCodeCount}`);

    if (a.complexityHotspots?.length) {
      parts.push(`\n### Complexity hotspots:`);
      for (const h of a.complexityHotspots) {
        parts.push(`- ${h.name ?? h.id}: complexity ${h.score ?? h.complexity ?? 'high'}`);
      }
    }

    if (a.highCouplingNodes?.length) {
      parts.push(`\n### High coupling:`);
      for (const h of a.highCouplingNodes) {
        parts.push(`- ${h.name ?? h.id}: ${h.degree ?? h.coupling ?? 'high'} connections`);
      }
    }

    if (a.architectureFindings?.length) {
      parts.push(`\n### Architecture findings:`);
      for (const f of a.architectureFindings) {
        const text = typeof f === 'string' ? f : (f.message ?? f.description ?? JSON.stringify(f));
        parts.push(`- ${text}`);
      }
    }
  }

  return parts.join('\n');
}
