/**
 * Helper: custom AST walker.
 *
 * @param {object} node - Babel AST node
 * @param {function} callback - callback applied on each node
 */
export function walk(node, callback) {
  if (!node) return;
  callback(node);

  for (const key in node) {
    const child = node[key];
    if (child && typeof child === "object") {
      if (Array.isArray(child)) {
        child.forEach((c) => walk(c, callback));
      } else {
        walk(child, callback);
      }
    }
  }
}
