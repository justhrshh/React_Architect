/**
 * Extracts ES6 Export declarations from AST.
 *
 * @param {object} ast
 * @returns {Array<string>}
 */
export function extractExports(ast) {
  const exportsList = [];
  if (ast.program && ast.program.body) {
    ast.program.body.forEach((node) => {
      if (node.type === "ExportNamedDeclaration") {
        if (node.declaration) {
          if (node.declaration.id) {
            exportsList.push(node.declaration.id.name);
          } else if (node.declaration.declarations) {
            node.declaration.declarations.forEach((decl) => {
              if (decl.id && decl.id.name) {
                exportsList.push(decl.id.name);
              }
            });
          }
        }
        if (node.specifiers) {
          node.specifiers.forEach((spec) => {
            exportsList.push(spec.exported.name);
          });
        }
      }

      if (node.type === "ExportDefaultDeclaration") {
        if (node.declaration && node.declaration.name) {
          exportsList.push("default:" + node.declaration.name);
        } else if (node.declaration && node.declaration.id) {
          exportsList.push("default:" + node.declaration.id.name);
        } else {
          exportsList.push("default");
        }
      }
    });
  }
  return exportsList;
}
