import { walk } from "../walk";

/**
 * Extracts Redux Toolkit store setups and slice properties from AST.
 *
 * @param {object} ast
 * @returns {Array<object>} reduxMetadata
 */
export function extractRedux(ast) {
  const reduxInfo = [];

  walk(ast.program, (node) => {
    // Redux Slice discovery: e.g. createSlice({ name: 'auth', initialState: {...} })
    if (node.type === "CallExpression" && node.callee.name === "createSlice") {
      const arg = node.arguments[0];
      if (arg && arg.type === "ObjectExpression") {
        let sliceName = "unknownSlice";
        const stateKeys = [];
        
        arg.properties.forEach(prop => {
          if (prop.key && prop.key.name === "name" && prop.value.type === "StringLiteral") {
            sliceName = prop.value.value;
          }
          if (prop.key && prop.key.name === "initialState" && prop.value.type === "ObjectExpression") {
            prop.value.properties.forEach(stateProp => {
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

    // Redux Store discovery: e.g. configureStore({ reducer: {...} })
    if (node.type === "CallExpression" && node.callee.name === "configureStore") {
      reduxInfo.push({
        type: "store",
        name: "store",
        line: node.loc ? node.loc.start.line : null,
      });
    }
  });

  return reduxInfo;
}
