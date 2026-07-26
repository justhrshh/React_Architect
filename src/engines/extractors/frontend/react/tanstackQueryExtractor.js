/**
 * tanstackQueryExtractor.js
 *
 * AST Extractor for TanStack Query (useQuery / useMutation) usage.
 */

export function extractTanstackQueries(ast, filePath) {
  const queries = [];
  if (!ast || !ast.program) return queries;

  // Simple traversal for useQuery / useMutation calls
  const body = ast.program.body || [];
  body.forEach((stmt) => {
    // Basic AST scan placeholder for Tanstack calls
  });

  return queries;
}
