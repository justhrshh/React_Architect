import { walk } from "../walk";
import { getCalleeName, guessNameFromFilePath } from "../astUtils";

// React built-ins that are frequently used as JSX tags but are not
// user-authored components. Treating them as "children" would create
// noisy, meaningless RENDERS edges (every Suspense boundary, every StrictMode
// wrapper). A real component happening to share one of these names is a
// known, accepted edge case (see parser README "Known Limitations").
const REACT_BUILTIN_JSX_NAMES = new Set(["Fragment", "StrictMode", "Suspense", "Profiler"]);

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

/**
 * Unwraps memo(...) / forwardRef(...) / lazy(...) wrapper calls to find the
 * actual component function underneath, however deeply nested
 * (e.g. `memo(forwardRef((props, ref) => {...}))`).
 *
 * `lazy()` is handled specially: its argument is a loader function that
 * returns a dynamic `import()`, not a component body, so there is nothing
 * to "unwrap" - we instead report `isLazy` plus the import source so the
 * graph builder can link the lazy placeholder to its real target file.
 *
 * @param {object|null} initNode
 * @returns {{fn: object|null, isLazy: boolean, lazyImportSource: string|null}}
 */
function unwrapFunction(initNode) {
  if (!initNode) return { fn: null, isLazy: false, lazyImportSource: null };

  if (initNode.type === "CallExpression") {
    const calleeName = getCalleeName(initNode.callee);

    if (calleeName === "lazy" || calleeName === "React.lazy") {
      const loader = initNode.arguments && initNode.arguments[0];
      let lazyImportSource = null;

      if (loader && (loader.type === "ArrowFunctionExpression" || loader.type === "FunctionExpression")) {
        // Dynamic import() is represented as either an `ImportExpression` node
        // or a `CallExpression` with an `Import`-typed callee, depending on
        // the @babel/parser version - support both defensively.
        walk(loader.body, (node) => {
          if (lazyImportSource) return;
          if (node.type === "ImportExpression" && node.source && node.source.type === "StringLiteral") {
            lazyImportSource = node.source.value;
          } else if (node.type === "CallExpression" && node.callee.type === "Import") {
            const importArg = node.arguments[0];
            if (importArg && importArg.type === "StringLiteral") {
              lazyImportSource = importArg.value;
            }
          }
        });
      }

      return { fn: null, isLazy: true, lazyImportSource };
    }

    if (["memo", "React.memo", "forwardRef", "React.forwardRef"].includes(calleeName)) {
      if (initNode.arguments && initNode.arguments[0]) {
        return unwrapFunction(initNode.arguments[0]);
      }
    }
  }

  if (initNode.type === "FunctionExpression" || initNode.type === "ArrowFunctionExpression") {
    return { fn: initNode, isLazy: false, lazyImportSource: null };
  }

  return { fn: null, isLazy: false, lazyImportSource: null };
}

// Helper to analyze component function/method body
function analyzeComponentBody(bodyNode) {
  const hooks = new Set();
  const contexts = new Set();
  const apiCalls = new Set();
  const children = new Set();
  let hasJSX = false;

  walk(bodyNode, (node) => {
    if (node.type === "CallExpression") {
      let name = null;
      if (node.callee.type === "Identifier") {
        name = node.callee.name;
      } else if (node.callee.type === "MemberExpression" && node.callee.object.name === "React") {
        name = node.callee.property.name;
      }

      if (name) {
        // Real hook names follow the "use" + Capital/Digit convention
        // (useState, useMemo, useFoo123). This avoids false positives like
        // "user" or "userId" that merely start with the substring "use".
        if (/^use[A-Z0-9]/.test(name)) {
          hooks.add(name);
        }
        if (name === "useContext" && node.arguments && node.arguments[0]) {
          const ctxArg = node.arguments[0];
          contexts.add(ctxArg.name || ctxArg.value || "unknown");
        }
        if (name.toLowerCase().includes("fetch") || name.toLowerCase().includes("api") || name === "axios") {
          apiCalls.add(name);
        }
      }
    }

    if (node.type === "JSXOpeningElement") {
      hasJSX = true;

      if (node.name.type === "JSXIdentifier") {
        const name = node.name.name;
        if (/^[A-Z]/.test(name) && !REACT_BUILTIN_JSX_NAMES.has(name)) {
          children.add(name);
        }
      } else if (node.name.type === "JSXMemberExpression") {
        // <Foo.Bar /> - distinguish Context Provider/Consumer usage (which is
        // a state-management relationship, not a "renders child" relationship)
        // from other namespaced components like <Menu.Item /> or <Motion.div />.
        const objectName = node.name.object && node.name.object.name;
        const propertyName = node.name.property && node.name.property.name;

        if (objectName && (propertyName === "Provider" || propertyName === "Consumer")) {
          contexts.add(objectName);
        } else if (objectName && /^[A-Z]/.test(objectName)) {
          children.add(objectName);
        }
      }
    }

    if (node.type === "JSXFragment") {
      hasJSX = true;
    }
  });

  return {
    hooks: [...hooks],
    contexts: [...contexts],
    apiCalls: [...apiCalls],
    children: [...children],
    hasJSX,
  };
}

/**
 * Extracts JSX from a class component's render() method, treating lifecycle
 * methods as a coarse stand-in for "effect-like" behavior since classes
 * cannot use hooks. Prop destructuring for class components is a known
 * limitation (see module README) - `this.props.x` member access isn't
 * walked, so `props` is reported as a single opaque entry.
 */
function analyzeClassComponent(classNode) {
  const renderMethod = classNode.body.body.find(
    (m) => m.type === "ClassMethod" && m.key && m.key.name === "render"
  );
  if (!renderMethod) return null;

  const bodyAnalysis = analyzeComponentBody(renderMethod.body);
  if (!bodyAnalysis.hasJSX) return null;

  const lifecycleMethods = classNode.body.body
    .filter((m) => m.type === "ClassMethod" && m.key && ["componentDidMount", "componentDidUpdate", "componentWillUnmount"].includes(m.key.name))
    .map((m) => m.key.name);

  return {
    ...bodyAnalysis,
    props: [{ name: "props", required: false, note: "class component - props are not individually destructured" }],
    lifecycleMethods,
  };
}

function getDefaultExportedLocalNames(ast) {
  const names = new Set();
  ast.program.body.forEach((node) => {
    if (node.type === "ExportDefaultDeclaration" && node.declaration) {
      if (node.declaration.id && node.declaration.id.name) {
        names.add(node.declaration.id.name);
      }
    }
  });
  return names;
}

function isReactClassComponent(node) {
  if (node.type !== "ClassDeclaration" || !node.superClass) return false;
  const superClass = node.superClass;
  if (superClass.type === "Identifier") {
    return superClass.name === "Component" || superClass.name === "PureComponent";
  }
  if (superClass.type === "MemberExpression") {
    return (
      superClass.object.name === "React" &&
      (superClass.property.name === "Component" || superClass.property.name === "PureComponent")
    );
  }
  return false;
}

/**
 * Extracts Component declarations from AST: function declarations, arrow/
 * function expressions (optionally wrapped in memo/forwardRef/lazy), and
 * class components extending React.Component/PureComponent.
 *
 * @param {object} ast
 * @param {string} [filePath] - used only to derive a name for anonymous default exports
 * @returns {Array<object>} components
 */
export function extractComponents(ast, filePath = "") {
  const components = [];
  const defaultExportedNames = getDefaultExportedLocalNames(ast);
  let anonymousDefaultUsed = false;

  walk(ast.program, (node) => {
    // function Button() {}
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const bodyAnalysis = analyzeComponentBody(node.body);
        if (bodyAnalysis.hasJSX) {
          components.push(buildComponentEntry(name, node, getPropsFromParams(node.params), bodyAnalysis, defaultExportedNames));
        }
      }
    }

    // const Button = () => {}  /  const Button = memo(forwardRef(...))  /  const Button = lazy(() => import('./Button'))
    if (node.type === "VariableDeclarator") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const unwrapped = unwrapFunction(node.init);

        if (unwrapped.isLazy) {
          components.push({
            name,
            subtypeHint: "lazy",
            props: [],
            hooks: [],
            contexts: [],
            apiCalls: [],
            children: [],
            loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
            line: node.loc ? node.loc.start.line : null,
            lazyImportSource: unwrapped.lazyImportSource,
            isDefaultExport: defaultExportedNames.has(name),
          });
        } else if (unwrapped.fn) {
          const bodyAnalysis = analyzeComponentBody(unwrapped.fn.body);
          if (bodyAnalysis.hasJSX) {
            components.push(
              buildComponentEntry(name, node, getPropsFromParams(unwrapped.fn.params), bodyAnalysis, defaultExportedNames)
            );
          }
        }
      }
    }

    // class Button extends React.Component { render() { ... } }
    if (isReactClassComponent(node)) {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const analysis = analyzeClassComponent(node);
        if (analysis) {
          components.push({
            name,
            isClassComponent: true,
            props: analysis.props,
            hooks: analysis.hooks,
            contexts: analysis.contexts,
            apiCalls: analysis.apiCalls,
            children: analysis.children,
            lifecycleMethods: analysis.lifecycleMethods,
            loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
            line: node.loc ? node.loc.start.line : null,
            isDefaultExport: defaultExportedNames.has(name),
          });
        }
      }
    }

    // export default function() {...}  /  export default () => {...}  (anonymous)
    if (node.type === "ExportDefaultDeclaration" && !anonymousDefaultUsed) {
      const decl = node.declaration;
      const isAnonymousFn =
        decl &&
        (decl.type === "FunctionDeclaration" || decl.type === "ArrowFunctionExpression" || decl.type === "FunctionExpression") &&
        !decl.id;

      if (isAnonymousFn) {
        const bodyAnalysis = analyzeComponentBody(decl.body);
        if (bodyAnalysis.hasJSX && filePath) {
          const derivedName = guessNameFromFilePath(filePath);
          anonymousDefaultUsed = true;
          components.push({
            name: derivedName,
            props: getPropsFromParams(decl.params),
            hooks: bodyAnalysis.hooks,
            contexts: bodyAnalysis.contexts,
            apiCalls: bodyAnalysis.apiCalls,
            children: bodyAnalysis.children,
            loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
            line: node.loc ? node.loc.start.line : null,
            isDefaultExport: true,
            isAnonymousDefault: true,
          });
        }
      }
    }
  });

  return components;
}

function buildComponentEntry(name, node, props, bodyAnalysis, defaultExportedNames) {
  return {
    name,
    props,
    hooks: bodyAnalysis.hooks,
    contexts: bodyAnalysis.contexts,
    apiCalls: bodyAnalysis.apiCalls,
    children: bodyAnalysis.children,
    loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
    line: node.loc ? node.loc.start.line : null,
    isDefaultExport: defaultExportedNames.has(name),
  };
}
