import { walk } from "../../../parser/walk.js";
import { getCalleeName, guessNameFromFilePath } from "../../../parser/astUtils.js";
import { parseUseSelectorCallback, parseDispatchCall } from "./reduxExtractor.js";
import { createExtractionResult } from "../../../types/schemas.js";

export function extract(ast, context = {}) {
  const comps = extractComponents(ast, context.filePath || "");
  return createExtractionResult("components", comps);
}

const REACT_BUILTIN_JSX_NAMES = new Set([
  "Fragment", "StrictMode", "Suspense", "Profiler",
  "Routes", "Route", "Navigate", "Outlet", "Link", "NavLink",
  "BrowserRouter", "HashRouter", "MemoryRouter", "RouterProvider",
  "StaticRouter", "NativeRouter",
  "Switch", "Redirect",
]);

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

function unwrapFunction(initNode) {
  if (!initNode) return { fn: null, isLazy: false, lazyImportSource: null };

  if (initNode.type === "CallExpression") {
    const calleeName = getCalleeName(initNode.callee);

    if (calleeName === "lazy" || calleeName === "React.lazy") {
      const loader = initNode.arguments && initNode.arguments[0];
      let lazyImportSource = null;

      if (loader && (loader.type === "ArrowFunctionExpression" || loader.type === "FunctionExpression")) {
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

function getFileImports(ast) {
  const fileImports = [];
  if (!ast || !ast.program || !Array.isArray(ast.program.body)) return fileImports;

  ast.program.body.forEach((node) => {
    if (node.type === "ImportDeclaration" && node.source && node.source.type === "StringLiteral") {
      const source = node.source.value;
      (node.specifiers || []).forEach((spec) => {
        if (spec.type === "ImportSpecifier") {
          fileImports.push({
            name: spec.local.name,
            importedName: spec.imported ? (spec.imported.name || spec.imported.value) : spec.local.name,
            source,
            kind: "named",
          });
        } else if (spec.type === "ImportDefaultSpecifier") {
          fileImports.push({
            name: spec.local.name,
            importedName: "default",
            source,
            kind: "default",
          });
        } else if (spec.type === "ImportNamespaceSpecifier") {
          fileImports.push({
            name: spec.local.name,
            importedName: "*",
            source,
            kind: "namespace",
          });
        }
      });
    }
  });

  return fileImports;
}

function analyzeComponentBody(bodyNode, fileImports = []) {
  const hooks = new Set();
  const contexts = new Set();
  const apiCalls = new Set();
  const reduxSlices = new Set();
  const dispatchedActions = [];
  const children = new Set();
  let hasJSX = false;

  // Build a set of PascalCase names that come from external (non-project) packages.
  // A project import starts with ".", "/", "@/" (alias), or "~/".
  // Anything else (e.g. "lucide-react", "framer-motion", "react-router-dom") is external.
  const externalImportNames = new Set(
    fileImports
      .filter((imp) => {
        const src = imp.source || "";
        const isProjectLocal =
          src.startsWith(".") ||
          src.startsWith("/") ||
          src.startsWith("@/") ||
          src.startsWith("~/") ||
          src.startsWith("#");
        return !isProjectLocal;
      })
      .map((imp) => imp.name)
      .filter((n) => n && /^[A-Z]/.test(n)) // PascalCase only
  );

  walk(bodyNode, (node) => {
    if (node.type === "CallExpression") {
      let name = null;
      if (node.callee.type === "Identifier") {
        name = node.callee.name;
      } else if (node.callee.type === "MemberExpression" && node.callee.object.name === "React") {
        name = node.callee.property.name;
      }

      if (name) {
        if (/^use[A-Z0-9]/.test(name)) {
          hooks.add(name);
        }
        if (name === "useSelector") {
          const matched = parseUseSelectorCallback(node, fileImports);
          matched.forEach(res => reduxSlices.add(res.sliceName || res));
        }
        if (name === "useContext" && node.arguments && node.arguments[0]) {
          const ctxArg = node.arguments[0];
          contexts.add(ctxArg.name || ctxArg.value || "unknown");
        }
        if (name.toLowerCase().includes("fetch") || name.toLowerCase().includes("api") || name === "axios") {
          apiCalls.add(name);
        }
      }

      const dispatches = parseDispatchCall(node, fileImports);
      if (dispatches.length > 0) {
        dispatches.forEach((d) => {
          if (!dispatchedActions.some((x) => x.sliceName === d.sliceName && x.actionName === d.actionName)) {
            dispatchedActions.push(d);
          }
        });
      }
    }

    if (node.type === "JSXOpeningElement") {
      hasJSX = true;

      if (node.name.type === "JSXIdentifier") {
        const name = node.name.name;
        // Skip if: React built-in OR imported from an external package (lucide-react, framer-motion, etc.)
        if (/^[A-Z]/.test(name) && !REACT_BUILTIN_JSX_NAMES.has(name) && !externalImportNames.has(name)) {
          children.add(name);
        }
      } else if (node.name.type === "JSXMemberExpression") {
        const objectName = node.name.object && node.name.object.name;
        const propertyName = node.name.property && node.name.property.name;

        if (objectName && (propertyName === "Provider" || propertyName === "Consumer")) {
          contexts.add(objectName);
        } else if (objectName && /^[A-Z]/.test(objectName) && !externalImportNames.has(objectName)) {
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
    reduxSlices: [...reduxSlices],
    dispatchedActions,
    children: [...children],
    hasJSX,
  };
}

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

export function extractComponents(ast, filePath = "") {
  const components = [];
  if (!ast || !ast.program) return components;

  const defaultExportedNames = getDefaultExportedLocalNames(ast);
  const fileImports = getFileImports(ast);
  let anonymousDefaultUsed = false;

  walk(ast.program, (node) => {
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^[A-Z]/.test(name)) {
        const bodyAnalysis = analyzeComponentBody(node.body, fileImports);
        if (bodyAnalysis.hasJSX) {
          components.push(buildComponentEntry(name, node, getPropsFromParams(node.params), bodyAnalysis, defaultExportedNames));
        }
      }
    }

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
          const bodyAnalysis = analyzeComponentBody(unwrapped.fn.body, fileImports);
          if (bodyAnalysis.hasJSX) {
            components.push(
              buildComponentEntry(name, node, getPropsFromParams(unwrapped.fn.params), bodyAnalysis, defaultExportedNames)
            );
          }
        }
      }
    }

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

    if (node.type === "ExportDefaultDeclaration" && !anonymousDefaultUsed) {
      const decl = node.declaration;
      const isAnonymousFn =
        decl &&
        (decl.type === "FunctionDeclaration" || decl.type === "ArrowFunctionExpression" || decl.type === "FunctionExpression") &&
        !decl.id;

      if (isAnonymousFn) {
        const bodyAnalysis = analyzeComponentBody(decl.body, fileImports);
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
    reduxSlices: bodyAnalysis.reduxSlices || [],
    dispatchedActions: bodyAnalysis.dispatchedActions || [],
    children: bodyAnalysis.children,
    loc: node.loc ? node.loc.end.line - node.loc.start.line + 1 : null,
    line: node.loc ? node.loc.start.line : null,
    isDefaultExport: defaultExportedNames.has(name),
  };
}
