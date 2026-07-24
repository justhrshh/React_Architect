import { walk } from "../walk.js";

/**
 * Extracts Redux Toolkit store setups, slice properties, and async thunks
 * from AST.
 *
 * Added over the previous version:
 * - `createAsyncThunk('auth/login', ...)` is recorded as a lightweight
 *   "thunk" entry associated with its slice namespace (the part before the
 *   first "/"), since async thunks are one of the most common real-world
 *   sources of API-to-state relationships.
 * - `combineReducers({...})` is recognized as an alternate store-assembly
 *   pattern (pre-RTK codebases, or manual store composition).
 *
 * RTK Query's `createApi` is intentionally handled in apiExtractor.js
 * instead of here, since its endpoints are fundamentally API relationships,
 * not local reducer state - see apiExtractor's "Known Limitations" note.
 *
 * @param {object} ast
 * @returns {Array<object>} reduxMetadata
 */
export function extractRedux(ast) {
  const reduxInfo = [];

  walk(ast.program, (node) => {
    if (node.type !== "CallExpression") return;

    if (node.callee.name === "createSlice") {
      const arg = node.arguments[0];
      if (arg && arg.type === "ObjectExpression") {
        let sliceName = "unknownSlice";
        const stateKeys = [];

        arg.properties.forEach((prop) => {
          if (prop.key && prop.key.name === "name" && prop.value.type === "StringLiteral") {
            sliceName = prop.value.value;
          }
          if (prop.key && prop.key.name === "initialState" && prop.value.type === "ObjectExpression") {
            prop.value.properties.forEach((stateProp) => {
              if (stateProp.key && stateProp.key.name) {
                stateKeys.push(stateProp.key.name);
              }
            });
          }
        });

        reduxInfo.push({
          type: "slice",
          name: sliceName,
          keys: stateKeys,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }

    if (node.callee.name === "configureStore") {
      reduxInfo.push({
        type: "store",
        name: "store",
        line: node.loc ? node.loc.start.line : null,
      });
    }

    if (node.callee.name === "combineReducers") {
      const reducerNames = [];
      const arg = node.arguments[0];
      if (arg && arg.type === "ObjectExpression") {
        arg.properties.forEach((prop) => {
          if (prop.key && prop.key.name) reducerNames.push(prop.key.name);
        });
      }
      reduxInfo.push({
        type: "store",
        name: "combinedReducers",
        keys: reducerNames,
        line: node.loc ? node.loc.start.line : null,
      });
    }

    if (node.callee.name === "createAsyncThunk") {
      const typeArg = node.arguments[0];
      const actionType = typeArg && typeArg.type === "StringLiteral" ? typeArg.value : "unknownThunk";
      reduxInfo.push({
        type: "thunk",
        name: actionType,
        sliceNamespace: actionType.split("/")[0],
        line: node.loc ? node.loc.start.line : null,
      });
    }
  });

  return reduxInfo;
}

/**
 * Parses a useSelector call expression AST to extract target slice names deterministically.
 * Supports:
 * - Inline callback: `useSelector(state => state.graph.knowledgeGraph)` -> "graph" (ast_selector)
 * - Destructured callback: `useSelector(({ graph }) => graph.nodes)` -> "graph" (ast_selector)
 * - Imported selector: `useSelector(selectSelectedProject)` with import from `@/redux/slices/hubSlice` -> "hub" (imported_selector)
 *
 * @param {object} callNode - AST CallExpression node
 * @param {Array<object>} fileImports - Array of file imports [{ name, importedName, source }]
 * @returns {Array<{ sliceName: string, method: string }>} sliceDetails
 */
export function parseUseSelectorCallback(callNode, fileImports = []) {
  if (!callNode || callNode.type !== "CallExpression") return [];
  const selectorArg = callNode.arguments && callNode.arguments[0];
  if (!selectorArg) return [];

  const results = [];
  const sliceNames = new Set();

  if (selectorArg.type === "ArrowFunctionExpression" || selectorArg.type === "FunctionExpression") {
    const params = selectorArg.params || [];
    let stateParamName = null;

    if (params[0]) {
      if (params[0].type === "Identifier") {
        stateParamName = params[0].name;
      } else if (params[0].type === "ObjectPattern") {
        params[0].properties.forEach((p) => {
          const keyName = p.key && (p.key.name || p.key.value);
          if (keyName) {
            sliceNames.add(keyName);
            results.push({ sliceName: keyName, method: "ast_selector" });
          }
        });
      }
    }

    if (stateParamName) {
      walk(selectorArg.body, (node) => {
        if (node.type === "MemberExpression" && node.object) {
          if (node.object.type === "Identifier" && node.object.name === stateParamName) {
            if (node.property && node.property.name) {
              const name = node.property.name;
              if (!sliceNames.has(name)) {
                sliceNames.add(name);
                results.push({ sliceName: name, method: "ast_selector" });
              }
            }
          } else if (node.object.type === "MemberExpression" && node.object.object && node.object.object.name === stateParamName) {
            if (node.object.property && node.object.property.name) {
              const name = node.object.property.name;
              if (!sliceNames.has(name)) {
                sliceNames.add(name);
                results.push({ sliceName: name, method: "ast_selector" });
              }
            }
          }
        }
      });
    }
  } else if (selectorArg.type === "Identifier") {
    const identifierName = selectorArg.name;

    // 1. Resolve imported selector function to its import declaration source module
    const matchedImport = (fileImports || []).find((imp) => imp.name === identifierName || imp.importedName === identifierName);
    if (matchedImport && matchedImport.source) {
      const source = matchedImport.source;
      const sliceMatch = source.match(/([^/]+)Slice(?:\.[a-z]+)?$/i) || source.match(/\/([^/]+)$/);
      if (sliceMatch && sliceMatch[1]) {
        const sliceName = sliceMatch[1].replace(/Slice$/i, "");
        if (sliceName) {
          sliceNames.add(sliceName);
          results.push({ sliceName, method: "imported_selector" });
        }
      }
    }

    // 2. Fallback heuristic from identifier name if not resolved via import declaration
    if (results.length === 0) {
      let derivedSlice = null;
      if (/graph/i.test(identifierName)) derivedSlice = "graph";
      else if (/analysis|hygiene|health/i.test(identifierName)) derivedSlice = "analysis";
      else if (/hub/i.test(identifierName)) derivedSlice = "hub";
      else if (/project/i.test(identifierName)) derivedSlice = "project";
      else if (/route/i.test(identifierName)) derivedSlice = "routes";
      else if (/ui|theme|sidebar/i.test(identifierName)) derivedSlice = "ui";
      else {
        const cleaned = identifierName.replace(/^select(ed)?/i, "").toLowerCase();
        if (cleaned) derivedSlice = cleaned;
      }

      if (derivedSlice && !sliceNames.has(derivedSlice)) {
        sliceNames.add(derivedSlice);
        results.push({ sliceName: derivedSlice, method: "imported_selector" });
      }
    }
  }

  return results;
}

/**
 * Parses a dispatch(...) call expression AST to extract target slice mutations.
 * Supports:
 * - `dispatch(setActiveRoom("brain"))` where `setActiveRoom` is imported from `@/redux/slices/uiSlice` -> "ui" (dispatch_action)
 * - `dispatch(reanalyzeProject(...))` where `reanalyzeProject` is imported from `@/redux/slices/analysisSlice` -> "analysis" (dispatch_action)
 *
 * @param {object} callNode - AST CallExpression node
 * @param {Array<object>} fileImports - Array of file imports [{ name, importedName, source }]
 * @returns {Array<{ sliceName: string, actionName: string, method: string }>} dispatchDetails
 */
export function parseDispatchCall(callNode, fileImports = []) {
  if (!callNode || callNode.type !== "CallExpression") return [];

  let isDispatch = false;
  if (callNode.callee.type === "Identifier" && callNode.callee.name === "dispatch") {
    isDispatch = true;
  } else if (callNode.callee.type === "MemberExpression" && callNode.callee.property && callNode.callee.property.name === "dispatch") {
    isDispatch = true;
  }

  if (!isDispatch) return [];

  const dispatchedArg = callNode.arguments && callNode.arguments[0];
  if (!dispatchedArg) return [];

  const results = [];

  if (dispatchedArg.type === "CallExpression") {
    let actionName = null;
    if (dispatchedArg.callee.type === "Identifier") {
      actionName = dispatchedArg.callee.name;
    } else if (dispatchedArg.callee.type === "MemberExpression" && dispatchedArg.callee.property) {
      actionName = dispatchedArg.callee.property.name;
    }

    if (actionName) {
      const matchedImport = (fileImports || []).find((imp) => imp.name === actionName || imp.importedName === actionName);
      if (matchedImport && matchedImport.source) {
        const source = matchedImport.source;
        const sliceMatch = source.match(/([^/]+)Slice(?:\.[a-z]+)?$/i) || source.match(/\/([^/]+)$/);
        if (sliceMatch && sliceMatch[1]) {
          const sliceName = sliceMatch[1].replace(/Slice$/i, "");
          if (sliceName) {
            results.push({ sliceName, actionName, method: "dispatch_action" });
          }
        }
      }

      if (results.length === 0) {
        let derivedSlice = null;
        if (/graph/i.test(actionName)) derivedSlice = "graph";
        else if (/analysis|reanalyze|hygiene|health/i.test(actionName)) derivedSlice = "analysis";
        else if (/hub|project/i.test(actionName)) derivedSlice = "project";
        else if (/route/i.test(actionName)) derivedSlice = "routes";
        else if (/ui|sidebar|tab|modal|mode|room/i.test(actionName)) derivedSlice = "ui";

        if (derivedSlice) {
          results.push({ sliceName: derivedSlice, actionName, method: "dispatch_action" });
        }
      }
    }
  }

  return results;
}
