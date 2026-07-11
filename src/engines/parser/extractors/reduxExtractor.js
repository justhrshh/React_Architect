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
