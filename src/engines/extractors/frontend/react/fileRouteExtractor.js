export function extractFileBasedRoutes(files) {
  const pageRoutes = [];
  const apiRoutes = [];

  files.forEach((file) => {
    const path = file.path.replace(/\\/g, "/");

    const isAppRouterPage = /(^|\/)app\/([^]*\/)?page\.(jsx|tsx|js|ts)$/.test(path);
    const isAppRouterApiRoute = /(^|\/)app\/([^]*\/)?route\.(js|ts)$/.test(path);
    const isPagesRouterFile =
      /(^|\/)pages\//.test(path) &&
      /\.(jsx|tsx|js|ts)$/.test(path) &&
      !/(^|\/)pages\/_(app|document|error)\./.test(path);

    if (isAppRouterPage) {
      pageRoutes.push({
        path: buildAppRouterPath(path, "page"),
        component: guessDefaultExportName(file.content) || "Page",
        file: path,
        source: "nextjs-app-router",
      });
    } else if (isAppRouterApiRoute) {
      const routePath = buildAppRouterPath(path, "route");
      const methods = extractExportedHttpMethods(file.content);
      (methods.length ? methods : ["ALL"]).forEach((method) => {
        apiRoutes.push({ type: "endpoint", method, path: routePath, file: path, source: "nextjs-app-router" });
      });
    } else if (isPagesRouterFile) {
      const isApiRoute = /(^|\/)pages\/api\//.test(path);
      const routePath = buildPagesRouterPath(path, isApiRoute);
      if (isApiRoute) {
        apiRoutes.push({ type: "endpoint", method: "ALL", path: routePath, file: path, source: "nextjs-pages-router" });
      } else {
        pageRoutes.push({
          path: routePath,
          component: guessDefaultExportName(file.content) || "Page",
          file: path,
          source: "nextjs-pages-router",
        });
      }
    }
  });

  return { pageRoutes, apiRoutes };
}

function buildAppRouterPath(filePath, fileBaseName) {
  const withoutExt = filePath.replace(new RegExp(`/${fileBaseName}\\.(jsx|tsx|js|ts)$`), "");
  const withoutRoot = withoutExt.replace(/(^|.*\/)app$/, "").replace(/^.*\bapp\//, "");
  const segments = withoutRoot.split("/").filter(Boolean).map(segmentToUrlPart).filter((s) => s !== null);
  return segments.length ? `/${segments.join("/")}` : "/";
}

function buildPagesRouterPath(filePath, isApiRoute) {
  const withoutRoot = filePath.replace(/^.*\bpages\//, "").replace(/\.(jsx|tsx|js|ts)$/, "");
  const segments = withoutRoot.split("/").filter(Boolean);
  const mapped = segments.map(segmentToUrlPart).filter((s) => s !== null);

  if (mapped.length && mapped[mapped.length - 1] === "index") {
    mapped.pop();
  }

  const prefix = isApiRoute ? "" : "";
  return mapped.length ? `${prefix}/${mapped.join("/")}` : "/";
}

function segmentToUrlPart(segment) {
  if (segment.startsWith("(") && segment.endsWith(")")) return null;
  if (segment.startsWith("[...") && segment.endsWith("]")) return `*${segment.slice(4, -1)}`;
  if (segment.startsWith("[[...") && segment.endsWith("]]")) return `*${segment.slice(5, -2)}`;
  if (segment.startsWith("[") && segment.endsWith("]")) return `:${segment.slice(1, -1)}`;
  return segment;
}

function guessDefaultExportName(content) {
  const namedMatch = content.match(/export\s+default\s+function\s+([A-Z]\w*)/);
  if (namedMatch) return namedMatch[1];
  const constMatch = content.match(/(?:export\s+default\s+)?(?:function|const)\s+([A-Z]\w*)[\s\S]*?export\s+default\s+\1/);
  if (constMatch) return constMatch[1];
  return null;
}

function extractExportedHttpMethods(content) {
  const methods = new Set();
  const fnRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/g;
  const constRegex = /export\s+const\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s*=/g;
  let match;
  while ((match = fnRegex.exec(content)) !== null) methods.add(match[1]);
  while ((match = constRegex.exec(content)) !== null) methods.add(match[1]);
  return [...methods];
}
