import { walk } from "../walk.js";

/**
 * Extracts custom hook *declarations* from AST (not hook *usages* - those
 * are tracked per-component in componentExtractor).
 *
 * Uses the same `use[A-Z0-9]` boundary check as componentExtractor so names
 * like `userData` or `useful` (which merely start with the substring "use")
 * are not misidentified as hooks. Function-valued VariableDeclarators are
 * required for the arrow-function form to avoid matching plain constants
 * such as `const useDefault = 5`.
 *
 * @param {object} ast
 * @returns {Array<{name: string, line: number|null}>}
 */
const BUILTIN_HOOKS = new Set([
  // React Core Built-ins
  "useState", "useEffect", "useContext", "useReducer", "useCallback", "useMemo",
  "useRef", "useImperativeHandle", "useLayoutEffect", "useDebugValue", "useDeferredValue",
  "useTransition", "useId", "useInsertionEffect", "useSyncExternalStore",
  // Standard Library Hooks (React Router, Redux, React Query, React Hook Form, i18n)
  "useNavigate", "useLocation", "useParams", "useSearchParams", "useMatch", "useRoutes", "useHref", "useOutlet",
  "useDispatch", "useSelector", "useStore",
  "useQuery", "useMutation", "useQueryClient",
  "useForm", "useFieldArray", "useFormContext", "useWatch",
  "useTranslation"
]);

export function extractHooks(ast) {
  const hooks = [];

  walk(ast.program, (node) => {
    if (node.type === "FunctionDeclaration") {
      const name = node.id && node.id.name;
      if (name && /^use[A-Z0-9]/.test(name) && !BUILTIN_HOOKS.has(name)) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }

    if (node.type === "VariableDeclarator") {
      const name = node.id && node.id.name;
      const isFunctionValued =
        node.init && (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression");
      if (name && isFunctionValued && /^use[A-Z0-9]/.test(name) && !BUILTIN_HOOKS.has(name)) {
        hooks.push({
          name,
          line: node.loc ? node.loc.start.line : null,
        });
      }
    }
  });

  return hooks;
}
