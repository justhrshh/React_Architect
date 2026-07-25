/**
 * Shared Type Definitions & Schemas for Analysis Engine
 */

export function createFileMetadata({ name, path, content, isConfig = false }) {
  return {
    name: name || "",
    path: (path || "").replace(/\\/g, "/"),
    content: content || "",
    isConfig: !!isConfig,
    size: (content || "").length,
  };
}

export function createExtractionResult(type, data = [], errors = []) {
  return {
    type,
    data: data !== undefined ? data : [],
    errors: Array.isArray(errors) ? errors : [],
  };
}

export function createKnowledgeNode({ id, kind, subtype, name, file, metadata = {} }) {
  return {
    id: id || `${kind}:${file}:${name}`,
    kind,
    subtype: subtype || kind,
    name: name || "Unknown",
    file: (file || "").replace(/\\/g, "/"),
    metadata: {
      loc: null,
      line: null,
      ...metadata,
    },
  };
}

export function createKnowledgeEdge({ type, source, target, metadata = {} }) {
  return {
    id: `edge:${type}:${source}->${target}`,
    type,
    source,
    target,
    metadata: {
      resolved: true,
      dynamic: false,
      line: null,
      ...metadata,
    },
  };
}

export function createResolverResult(edges = [], diagnostics = []) {
  return {
    edges: Array.isArray(edges) ? edges : [],
    diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
  };
}

export function createAnalysisResult({ projectDNA = {}, architectureHealth = {}, deadCode = {}, impactAnalysis = {}, maintainability = {} }) {
  return {
    projectDNA,
    architectureHealth,
    deadCode,
    impactAnalysis,
    maintainability,
  };
}

export function createDiagnosticsContainer() {
  return {
    summary: {
      filesScanned: 0,
      filesSkipped: 0,
      parseFailures: 0,
      extractorFailures: 0,
      resolverWarnings: 0,
      graphWarnings: 0,
    },
    timings: {
      scannerMs: 0,
      parserMs: 0,
      extractorsMs: 0,
      graphBuildMs: 0,
      resolversMs: 0,
      analysisMs: 0,
      totalMs: 0,
    },
    logs: [],
  };
}
