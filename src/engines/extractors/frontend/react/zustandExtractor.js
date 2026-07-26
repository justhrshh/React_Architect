/**
 * zustandExtractor.js
 *
 * AST Extractor for Zustand state store definitions and subscriber hooks.
 */

export function extractZustandStores(ast, filePath) {
  const stores = [];
  if (!ast || !ast.program) return stores;

  // Simple inspection of export const useStore = create(...)
  const body = ast.program.body || [];
  body.forEach((stmt) => {
    if (stmt.type === "ExportNamedDeclaration" && stmt.declaration) {
      const decl = stmt.declaration;
      if (decl.type === "VariableDeclaration") {
        decl.declarations.forEach((d) => {
          if (d.id && d.id.name && /^use[A-Z]/.test(d.id.name)) {
            if (d.init && d.init.type === "CallExpression") {
              const calleeName = d.init.callee.name;
              if (calleeName === "create" || (d.init.callee.callee && d.init.callee.callee.name === "create")) {
                stores.push({
                  kind: "state",
                  subtype: "zustand-store",
                  name: d.id.name,
                  file: filePath,
                });
              }
            }
          }
        });
      }
    }
  });

  return stores;
}
