import { createExtractionResult } from "../types/schemas.js";

import { extract as importExtractor } from "./shared/importExtractor.js";
import { extract as exportExtractor } from "./shared/exportExtractor.js";
import { extract as functionExtractor } from "./shared/functionExtractor.js";
import { extract as variableExtractor } from "./shared/variableExtractor.js";

import { extract as componentExtractor } from "./frontend/react/componentExtractor.js";
import { extract as hookExtractor } from "./frontend/react/hookExtractor.js";
import { extract as contextExtractor } from "./frontend/react/contextExtractor.js";
import { extract as reduxExtractor } from "./frontend/react/reduxExtractor.js";
import { extract as routeExtractor } from "./frontend/react/routeExtractor.js";
import { extract as apiExtractor } from "./frontend/react/apiExtractor.js";

import { extract as expressExtractor } from "./backend/express/index.js";

/**
 * Extractor Registry
 *
 * Centralized registry for all static analysis extractors.
 */
export class ExtractorRegistry {
  constructor() {
    this.extractors = new Map();
  }

  register(name, extractorFn) {
    if (typeof extractorFn !== "function") {
      throw new Error(`Extractor '${name}' must be a function.`);
    }
    this.extractors.set(name, extractorFn);
  }

  runAll(ast, context = {}) {
    const results = new Map();

    for (const [name, extractorFn] of this.extractors.entries()) {
      try {
        const res = extractorFn(ast, context);
        if (res && res.type) {
          results.set(name, res);
        } else {
          results.set(name, createExtractionResult(name, Array.isArray(res) ? res : []));
        }
      } catch (err) {
        console.warn(`[ExtractorRegistry] Error in extractor '${name}' for ${context.filePath || "file"}:`, err);
        results.set(
          name,
          createExtractionResult(name, [], [{ stage: `extract-${name}`, message: err.message || String(err) }])
        );
      }
    }

    return results;
  }

  clear() {
    this.extractors.clear();
  }
}

export const defaultExtractorRegistry = new ExtractorRegistry();

// Pre-register default core extractors
defaultExtractorRegistry.register("imports", importExtractor);
defaultExtractorRegistry.register("exports", exportExtractor);
defaultExtractorRegistry.register("functions", functionExtractor);
defaultExtractorRegistry.register("variables", variableExtractor);
defaultExtractorRegistry.register("components", componentExtractor);
defaultExtractorRegistry.register("hooks", hookExtractor);
defaultExtractorRegistry.register("contexts", contextExtractor);
defaultExtractorRegistry.register("redux", reduxExtractor);
defaultExtractorRegistry.register("routes", routeExtractor);
defaultExtractorRegistry.register("api", apiExtractor);
defaultExtractorRegistry.register("express", expressExtractor);
