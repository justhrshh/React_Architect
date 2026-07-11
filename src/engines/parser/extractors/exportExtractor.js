import { getCalleeName } from "../astUtils.js";

/**
 * Extracts ES module export declarations from AST, including re-exports
 * (barrel files). Each entry describes:
 *
 *   { localName, exportedName, isDefault, reExportFrom, originalName, line }
 *
 * - `export const Foo = ...`               -> { localName: "Foo", exportedName: "Foo", isDefault: false, reExportFrom: null }
 * - `export default function Foo() {}`     -> { localName: "Foo", exportedName: "default", isDefault: true, reExportFrom: null }
 * - `export default memo(Foo)`             -> { localName: "Foo" (best-effort), exportedName: "default", isDefault: true }
 * - `export { Foo }`                       -> { localName: "Foo", exportedName: "Foo" }
 * - `export { Foo as Bar }`                -> { localName: "Foo", exportedName: "Bar" }
 * - `export { default as Foo } from './x'` -> { exportedName: "Foo", isDefault: false, reExportFrom: "./x", originalName: "default" }
 * - `export { Foo } from './x'`            -> { exportedName: "Foo", reExportFrom: "./x", originalName: "Foo" }
 * - `export * from './x'`                  -> { exportedName: "*", reExportFrom: "./x" }
 * - `export * as ns from './x'`            -> { exportedName: "ns" (namespace), reExportFrom: "./x" }
 *
 * These entries feed importResolver.resolveComponentDeclaration(), which
 * follows barrel files to their real source so `import { Button } from
 * '@/components'` resolves through an `index.js` to `Button.jsx`.
 *
 * @param {object} ast
 * @returns {Array<object>} export entries
 */
export function extractExports(ast) {
  const entries = [];
  if (!ast.program || !ast.program.body) return entries;

  ast.program.body.forEach((node) => {
    const line = node.loc ? node.loc.start.line : null;

    if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) {
        if (node.declaration.id && node.declaration.id.name) {
          entries.push(makeEntry({ localName: node.declaration.id.name, exportedName: node.declaration.id.name, line }));
        } else if (node.declaration.declarations) {
          node.declaration.declarations.forEach((decl) => {
            if (decl.id && decl.id.name) {
              entries.push(makeEntry({ localName: decl.id.name, exportedName: decl.id.name, line }));
            }
          });
        }
      }

      if (node.specifiers && node.specifiers.length > 0) {
        const reExportFrom = node.source ? node.source.value : null;
        node.specifiers.forEach((spec) => {
          const localOrOriginal = spec.local && spec.local.name;
          const exportedName = spec.exported && spec.exported.name;
          const isDefault = localOrOriginal === "default" || exportedName === "default";

          entries.push(
            makeEntry({
              localName: reExportFrom ? null : localOrOriginal,
              exportedName,
              isDefault,
              reExportFrom,
              originalName: reExportFrom ? localOrOriginal : null,
              line,
            })
          );
        });
      }
    }

    if (node.type === "ExportDefaultDeclaration") {
      const decl = node.declaration;
      let localName = null;

      if (decl) {
        if (decl.id && decl.id.name) {
          localName = decl.id.name;
        } else if (decl.type === "Identifier") {
          localName = decl.name;
        } else if (decl.type === "CallExpression") {
          localName = findIdentifierInCallArgs(decl);
        }
      }

      entries.push(makeEntry({ localName, exportedName: "default", isDefault: true, line }));
    }

    if (node.type === "ExportAllDeclaration") {
      const namespace = node.exported && node.exported.name;
      entries.push(
        makeEntry({
          exportedName: namespace || "*",
          reExportFrom: node.source ? node.source.value : null,
          line,
        })
      );
    }
  });

  return entries;
}

function makeEntry({ localName = null, exportedName = null, isDefault = false, reExportFrom = null, originalName = null, line = null }) {
  return { localName, exportedName, isDefault, reExportFrom, originalName, line };
}

function findIdentifierInCallArgs(callExpr) {
  const calleeName = getCalleeName(callExpr.callee);
  const isWrapperCall = calleeName && ["memo", "React.memo", "forwardRef", "React.forwardRef"].includes(calleeName);
  const arg = callExpr.arguments && callExpr.arguments[0];
  if (!arg) return null;

  if (arg.type === "Identifier") return arg.name;
  if (isWrapperCall && arg.type === "CallExpression") return findIdentifierInCallArgs(arg);
  if ((arg.type === "FunctionExpression" || arg.type === "ArrowFunctionExpression") && arg.id) return arg.id.name;
  return null;
}
