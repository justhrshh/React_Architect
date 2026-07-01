import { parse } from "@babel/parser";

/**
 * Parses code using Babel and extracts component declarations, imports, exports, JSX elements, and hooks.
 *
 * @param {string} code
 * @param {string} filePath
 * @returns {object} fileSummary
 */
export function parseFile(code, filePath) {
  const summary = {
    filePath,
    components: [],
    imports: [], // Array of { name, source }
    exports: [], // List of exported names
  };

  let ast;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "dynamicImport",
        "objectRestSpread",
        "decorators-legacy",
      ],
    });
  } catch (err) {
    console.warn(`AST Parse error for ${filePath}: ${err.message}`);
    return summary;
  }

  // Helper: custom AST walker
  function walk(node, callback) {
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

  // 1. Gather Imports and Exports at the top level
  if (ast.program && ast.program.body) {
    ast.program.body.forEach((node) => {
      // Imports
      if (node.type === "ImportDeclaration") {
        const source = node.source.value;
        node.specifiers.forEach((spec) => {
          summary.imports.push({
            name: spec.local.name,
            source,
          });
        });
      }

      // Exports
      if (node.type === "ExportNamedDeclaration") {
        if (node.declaration) {
          if (node.declaration.id) {
            summary.exports.push(node.declaration.id.name);
          } else if (node.declaration.declarations) {
            node.declaration.declarations.forEach((decl) => {
              if (decl.id && decl.id.name) {
                summary.exports.push(decl.id.name);
              }
            });
          }
        }
        if (node.specifiers) {
          node.specifiers.forEach((spec) => {
            summary.exports.push(spec.exported.name);
          });
        }
      }

      if (node.type === "ExportDefaultDeclaration") {
        if (node.declaration && node.declaration.name) {
          summary.exports.push("default:" + node.declaration.name);
        } else if (node.declaration && node.declaration.id) {
          summary.exports.push("default:" + node.declaration.id.name);
        } else {
          summary.exports.push("default");
        }
      }
    });
  }

  // Helper to extract destructured parameters (props)
  function getPropsFromParams(params) {
    if (!params || params.length === 0) return [];
    const firstParam = params[0];
    const props = [];

    if (firstParam.type === "ObjectPattern") {
      firstParam.properties.forEach((prop) => {
        if (prop.type === "ObjectProperty" && prop.key && prop.key.name) {
          props.push({
            name: prop.key.name,
            required: !prop.value || prop.value.type !== "AssignmentPattern",
          });
        } else if (prop.type === "RestElement" && prop.argument && prop.argument.name) {
          props.push({
            name: `...${prop.argument.name}`,
            required: false,
          });
        }
      });
    } else if (firstParam.type === "Identifier") {
      props.push({
        name: firstParam.name,
        required: false,
      });
    }
    return props;
  }

  // Helper to unwrap memo(forwardRef(...)) and find function body
  function unwrapFunction(initNode) {
    if (!initNode) return null;
    
    // Unwrap CallExpressions (e.g. memo(forwardRef(fn)))
    if (initNode.type === "CallExpression") {
      const calleeName = initNode.callee.name;
      if (calleeName === "memo" || calleeName === "forwardRef" || calleeName === "lazy") {
        if (initNode.arguments && initNode.arguments[0]) {
          return unwrapFunction(initNode.arguments[0]);
        }
      }
    }

    if (initNode.type === "FunctionExpression" || initNode.type === "ArrowFunctionExpression") {
      return initNode;
    }

    return null;
  }

  // Helper to analyze component function body (extract hooks, JSX children)
  function analyzeComponentBody(fnNode) {
    const hooks = [];
    const children = new Set();
    let hasJSX = false;

    walk(fnNode.body, (node) => {
      // Detect Hook calls
      if (node.type === "CallExpression") {
        let name = null;
        if (node.callee.type === "Identifier") {
          name = node.callee.name;
        } else if (node.callee.type === "MemberExpression") {
          // React.useState
          if (node.callee.object.name === "React" && node.callee.property.name) {
            name = node.callee.property.name;
          }
        }
        if (name && (name.startsWith("use") || name === "useState" || name === "useEffect")) {
          hooks.push(name);
        }
      }

      // Detect JSX Element usage
      if (node.type === "JSXOpeningElement") {
        hasJSX = true;
        let name = null;
        if (node.name.type === "JSXIdentifier") {
          name = node.name.name;
        } else if (node.name.type === "JSXMemberExpression") {
          // e.g. Layout.Content
          name = node.name.object.name;
        }
        // Capitalized signifies React Component JSX element rather than native tag (div, span)
        if (name && /^[A-Z]/.test(name)) {
          children.add(name);
        }
      }

      if (node.type === "JSXFragment") {
        hasJSX = true;
      }
    });

    return {
      hooks: [...new Set(hooks)],
      children: [...children],
      hasJSX,
    };
  }

  // 2. Discover component declarations (Function declarations)
  walk(ast.program, (node) => {
    // Standard function: function Button() {}
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const bodyAnalysis = analyzeComponentBody(node);
        if (bodyAnalysis.hasJSX) {
          summary.components.push({
            name,
            props: getPropsFromParams(node.params),
            hooks: bodyAnalysis.hooks,
            children: bodyAnalysis.children,
          });
        }
      }
    }

    // Variable declarator: const Button = () => {}
    if (node.type === "VariableDeclarator") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const unwrapped = unwrapFunction(node.init);
        if (unwrapped) {
          const bodyAnalysis = analyzeComponentBody(unwrapped);
          if (bodyAnalysis.hasJSX) {
            summary.components.push({
              name,
              props: getPropsFromParams(unwrapped.params),
              hooks: bodyAnalysis.hooks,
              children: bodyAnalysis.children,
            });
          }
        }
      }
    }
  });

  return summary;
}
