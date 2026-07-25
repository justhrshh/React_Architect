import { createDiagnosticsContainer } from "../types/schemas.js";

/**
 * Pipeline Diagnostics & Performance Instrumentation
 *
 * Measures execution time per stage and collects files scanned/skipped, parse errors,
 * extractor failures, resolver warnings, graph warnings, and analysis warnings.
 */
export class PipelineDiagnostics {
  constructor() {
    this.container = createDiagnosticsContainer();
  }

  startStage(stageName) {
    return performance.now();
  }

  endStage(stageName, startTimeMs) {
    const elapsed = Math.round((performance.now() - startTimeMs) * 100) / 100;
    const key = `${stageName}Ms`;
    if (key in this.container.timings) {
      this.container.timings[key] = elapsed;
    }
    return elapsed;
  }

  log(level, stage, message, file = null) {
    this.container.logs.push({
      level,
      stage,
      message,
      file,
      timestamp: new Date().toISOString(),
    });

    if (level === "error") {
      if (stage.includes("parse")) this.container.summary.parseFailures++;
      if (stage.includes("extract")) this.container.summary.extractorFailures++;
    } else if (level === "warning") {
      if (stage.includes("resolver")) this.container.summary.resolverWarnings++;
      if (stage.includes("graph")) this.container.summary.graphWarnings++;
    }
  }

  setFilesSummary(scanned, skipped = 0) {
    this.container.summary.filesScanned = scanned;
    this.container.summary.filesSkipped = skipped;
  }

  finalize(totalStartMs) {
    this.container.timings.totalMs = Math.round((performance.now() - totalStartMs) * 100) / 100;
    return this.container;
  }
}
