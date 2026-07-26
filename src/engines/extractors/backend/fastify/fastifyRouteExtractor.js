/**
 * fastifyRouteExtractor.js
 *
 * AST Extractor for Fastify route definitions (fastify.get, fastify.post).
 */

export function extractFastifyRoutes(ast, filePath) {
  const routes = [];
  if (!ast || !ast.program) return routes;

  return routes;
}
