import { extractExpressRoutes } from "./expressRouteExtractor.js";
import { extractExpressMiddleware } from "./expressMiddlewareExtractor.js";
import { extractExpressControllers } from "./expressControllerExtractor.js";
import { extractExpressServices } from "./expressServiceExtractor.js";
import { createExtractionResult } from "../../../types/schemas.js";

/**
 * Express Extractor Orchestrator
 *
 * Runs all Express-specific extractors and returns normalized Universal Architecture facts:
 * - routes
 * - middleware
 * - controllers
 * - services & models
 */
export function extract(ast, context = {}) {
  const routes = extractExpressRoutes(ast, context);
  const middleware = extractExpressMiddleware(ast, context);
  const controllers = extractExpressControllers(ast, context);
  const services = extractExpressServices(ast, context);

  return createExtractionResult("express", {
    routes,
    middleware,
    controllers,
    services,
  });
}
