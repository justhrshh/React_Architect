import { walk } from "../walk.js";

/**
 * Extracts both static ES module imports and dynamic `import()` expressions.
 *
 * Static imports now report which *kind* of binding each specifier is
 * (default / named / namespace), since that distinction matters when
 * resolving through barrel files - `import Foo from './x'` needs the
 * "default" export of x, while `import { Foo } from './x'` needs the named
 * export "Foo".
 *
 * Dynamic imports (`import('./Chunk')`, including the `React.lazy(() =>
 * import('./Foo'))` pattern) are reported with `dynamic: true` and no bound
 * local name, since a bare `import()` doesn't introduce one at the call site.
 *
 * @param {object} ast
 * @returns {Array<{name: string|null, source: string, kind: string, dynamic: boolean, line: number|null}>}
 */
export function extractImports(ast) {
  const imports = [];
  if (!ast.program || !ast.program.body) return imports;

  ast.program.body.forEach((node) => {
    if (node.type === "ImportDeclaration") {
      const source = node.source.value;
      const line = node.loc ? node.loc.start.line : null;
      node.specifiers.forEach((spec) => {
        let kind = "named";
        let importedName = spec.local.name;
        if (spec.type === "ImportDefaultSpecifier") {
          kind = "default";
          importedName = "default";
        } else if (spec.type === "ImportNamespaceSpecifier") {
          kind = "namespace";
          importedName = "*";
        } else if (spec.imported && spec.imported.name) {
          importedName = spec.imported.name;
        }

        imports.push({
          name: spec.local.name,
          importedName,
          source,
          kind,
          dynamic: false,
          line,
        });
      });
    }
  });

  // Dynamic imports can appear anywhere in the module (inside functions,
  // event handlers, lazy() loaders) so we walk the full tree separately.
  // Babel represents `import('./x')` differently across parser versions:
  // as an `ImportExpression` node (source in `node.source`), or as a
  // `CallExpression` whose callee has type `Import` (older/alternate
  // parser configurations). Both are handled since we can't assume which
  // @babel/parser version a given host project depends on.
  walk(ast.program, (node) => {
    let source = null;

    if (node.type === "ImportExpression" && node.source && node.source.type === "StringLiteral") {
      source = node.source.value;
    } else if (node.type === "CallExpression" && node.callee.type === "Import") {
      const arg = node.arguments && node.arguments[0];
      if (arg && arg.type === "StringLiteral") source = arg.value;
    }

    if (source) {
      imports.push({
        name: null,
        importedName: "default",
        source,
        kind: "dynamic",
        dynamic: true,
        line: node.loc ? node.loc.start.line : null,
      });
    }
  });

  return imports;
}
