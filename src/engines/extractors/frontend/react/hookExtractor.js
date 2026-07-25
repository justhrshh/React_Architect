import { walk } from "../../../parser/walk.js";
import { createExtractionResult } from "../../../types/schemas.js";

export function extract(ast, context = {}) {
  const hooks = extractHooks(ast);
  return createExtractionResult("hooks", hooks);
}

const BUILTIN_HOOKS = new Set([
  "useState", "useEffect", "useContext", "useReducer", "useCallback", "useMemo",
  "useRef", "useImperativeHandle", "useLayoutEffect", "useDebugValue", "useDeferredValue",
  "useTransition", "useId", "useInsertionEffect", "useSyncExternalStore",
  "useNavigate", "useLocation", "useParams", "useSearchParams", "useMatch", "useRoutes", "useHref", "useOutlet",
  "useDispatch", "useSelector", "useStore",
  "useQuery", "useMutation", "useQueryClient",
  "useForm", "useFieldArray", "useFormContext", "useWatch",
  "useTranslation"
]);

export function extractHooks(ast) {
  const hooks = [];
  if (!ast || !ast.program) return hooks;

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
