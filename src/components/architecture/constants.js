export const NW = 224;
export const NH = 110;

export const INTER = "'Inter', -apple-system, sans-serif";
export const MONO = "'JetBrains Mono', 'SF Mono', monospace";
export const SERIF = "'Fraunces', Georgia, serif";

export const TYPE_CFG = {
  page:      { label: "Page",      color: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
  layout:    { label: "Layout",    color: "#7C3AED", bg: "#F5F3FF", text: "#6D28D9" },
  component: { label: "Component", color: "#059669", bg: "#ECFDF5", text: "#047857" },
  provider:  { label: "Provider",  color: "#D97706", bg: "#FFFBEB", text: "#B45309" },
  context:   { label: "Context",   color: "#DB2777", bg: "#FDF2F8", text: "#9D174D" },
};

export const BUILTIN_HOOKS = new Set([
  "useState", "useEffect", "useCallback", "useMemo", "useRef",
  "useContext", "useReducer", "useId", "useLayoutEffect",
  "useParams", "useRoutes", "useActiveRoute", "useScrollRestoration",
  "useNavigation", "useLoaderData", "useSearchParams", "useLocation", "useNavigate",
]);

export function findPathToNode(nodesList, targetId, currentPath = []) {
  for (const node of nodesList) {
    const nextPath = node.kind === "category" ? currentPath : [...currentPath, node];
    if (node.id === targetId) {
      return nextPath;
    }
    if (node.children && node.children.length > 0) {
      const path = findPathToNode(node.children, targetId, nextPath);
      if (path) return path;
    }
  }
  return null;
}
