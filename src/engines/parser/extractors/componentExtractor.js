import { walk } from "../walk";

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

// Helper to analyze component function body
function analyzeComponentBody(fnNode) {
  const hooks = [];
  const contexts = [];
  const apiCalls = [];
  const children = new Set();
  let hasJSX = false;

  walk(fnNode.body, (node) => {
    // Detect CallExpressions (hooks, contexts, api calls)
    if (node.type === "CallExpression") {
      let name = null;
      if (node.callee.type === "Identifier") {
        name = node.callee.name;
      } else if (node.callee.type === "MemberExpression") {
        if (node.callee.object.name === "React" && node.callee.property.name) {
          name = node.callee.property.name;
        }
      }

      if (name) {
        if (name.startsWith("use") || name === "useState" || name === "useEffect") {
          hooks.push(name);
        }
        if (name === "useContext" && node.arguments && node.arguments[0]) {
          const ctxArg = node.arguments[0];
          contexts.push(ctxArg.name || ctxArg.value || "unknown");
        }
        if (name.toLowerCase().includes("fetch") || name.toLowerCase().includes("api") || name === "axios") {
          apiCalls.push(name);
        }
      }
    }

    // Detect JSX Element usage
    if (node.type === "JSXOpeningElement") {
      hasJSX = true;
      let name = null;
      if (node.name.type === "JSXIdentifier") {
        name = node.name.name;
      } else if (node.name.type === "JSXMemberExpression") {
        name = node.name.object.name;
      }
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
    contexts: [...new Set(contexts)],
    apiCalls: [...new Set(apiCalls)],
    children: [...children],
    hasJSX,
  };
}

/**
 * Extracts Component declarations from AST.
 *
 * @param {object} ast
 * @returns {Array<object>} components
 */
export function extractComponents(ast) {
  const components = [];

  walk(ast.program, (node) => {
    // Standard function: function Button() {}
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const bodyAnalysis = analyzeComponentBody(node);
        if (bodyAnalysis.hasJSX) {
          components.push({
            name,
            props: getPropsFromParams(node.params),
            hooks: bodyAnalysis.hooks,
            contexts: bodyAnalysis.contexts,
            apiCalls: bodyAnalysis.apiCalls,
            children: bodyAnalysis.children,
            loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
            line: node.loc ? node.loc.start.line : null,
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
            components.push({
              name,
              props: getPropsFromParams(unwrapped.params),
              hooks: bodyAnalysis.hooks,
              contexts: bodyAnalysis.contexts,
              apiCalls: bodyAnalysis.apiCalls,
              children: bodyAnalysis.children,
              loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
              line: node.loc ? node.loc.start.line : null,
            });
          }
        }
      }
    }
  });

  return components;
}
