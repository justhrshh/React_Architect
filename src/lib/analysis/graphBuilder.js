/**
 * Resolves a relative or alias import path to a standard path relative to the root.
 *
 * @param {string} currentFile - e.g. "src/layouts/AppLayout.jsx"
 * @param {string} importPath - e.g. "../components/Header"
 * @returns {string|null}
 */
function resolveImportPath(currentFile, importPath) {
  if (!importPath.startsWith(".")) {
    // Check aliases
    if (importPath.startsWith("@/")) {
      return "src/" + importPath.substring(2);
    }
    if (importPath.startsWith("src/")) {
      return importPath;
    }
    return null; // External npm package
  }

  const fileDirParts = currentFile.split("/");
  fileDirParts.pop(); // remove file name

  const importParts = importPath.split("/");
  for (const part of importParts) {
    if (part === ".") continue;
    if (part === "..") {
      fileDirParts.pop();
    } else {
      fileDirParts.push(part);
    }
  }

  return fileDirParts.join("/");
}

/**
 * Builds a normalized component dependency graph from scanned files.
 *
 * @param {Array<{name: string, path: string, content: string, components: Array, imports: Array, exports: Array}>} parsedFiles
 * @returns {{nodes: Array, edges: Array}}
 */
export function buildGraph(parsedFiles) {
  const nodes = [];
  const edges = [];

  // Create lookup maps
  const fileMap = new Map(); // path -> file
  const componentMap = new Map(); // componentName -> file

  parsedFiles.forEach(file => {
    const cleanPath = file.path.replace(/\\/g, "/");
    fileMap.set(cleanPath, file);
    
    // Register component locations
    file.components.forEach(comp => {
      componentMap.set(comp.name, file);
    });
  });

  // Helper to determine component node type
  function determineNodeType(comp, filePath) {
    const pathLower = filePath.toLowerCase();
    const nameLower = comp.name.toLowerCase();

    if (pathLower.includes("/pages/") || pathLower.includes("/app/page") || nameLower.endsWith("page")) {
      return "page";
    }
    if (pathLower.includes("/layouts/") || nameLower.endsWith("layout")) {
      return "layout";
    }
    if (nameLower.endsWith("provider") || pathLower.includes("/providers/") || pathLower.includes("/contexts/")) {
      return "provider";
    }
    if (nameLower.endsWith("context")) {
      return "context";
    }
    return "component";
  }

  // 1. Generate Nodes
  parsedFiles.forEach(file => {
    const cleanPath = file.path.replace(/\\/g, "/");
    file.components.forEach(comp => {
      const type = determineNodeType(comp, cleanPath);
      
      // Calculate external dependencies based on package imports
      const deps = [];
      const importsList = [];
      file.imports.forEach(imp => {
        importsList.push(imp.name);
        if (!imp.source.startsWith(".")) {
          deps.push(imp.source);
        }
      });

      nodes.push({
        id: comp.name,
        name: comp.name,
        type,
        filePath: cleanPath,
        hookCount: comp.hooks.length,
        childCount: comp.children.length,
        apiCount: comp.hooks.filter(h => h.toLowerCase().includes("api") || h.toLowerCase().includes("fetch")).length,
        hooks: comp.hooks,
        children: comp.children,
        props: comp.props,
        deps: [...new Set(deps)],
        imports: [...new Set(importsList)],
        // Start layout coordinates — to be positioned dynamically by adapter
        x: 0,
        y: 0,
      });
    });
  });

  // 2. Generate Edges (Parent -> Child relationships)
  nodes.forEach(parentComp => {
    const parentFile = fileMap.get(parentComp.filePath);
    if (!parentFile) return;

    parentComp.children.forEach(childName => {
      // Find where this child name comes from
      let targetFile = null;

      // Rule A: Local declaration in same file
      const localDecl = parentFile.components.some(c => c.name === childName);
      if (localDecl) {
        targetFile = parentFile;
      } else {
        // Rule B: Match imports
        const matchingImport = parentFile.imports.find(imp => imp.name === childName);
        if (matchingImport) {
          const resolvedPath = resolveImportPath(parentComp.filePath, matchingImport.source);
          if (resolvedPath) {
            // Find file starting with resolved path (excluding extension)
            for (const [filePath, fileObj] of fileMap.entries()) {
              const fileNoExt = filePath.replace(/\.[^/.]+$/, "");
              if (fileNoExt === resolvedPath || fileNoExt + "/index" === resolvedPath) {
                targetFile = fileObj;
                break;
              }
            }
          }
        }
      }

      // Rule C: Global lookup fallback
      if (!targetFile) {
        targetFile = componentMap.get(childName);
      }

      // If we found the target file, check which component it declares
      if (targetFile) {
        const matchingComp = targetFile.components.find(c => c.name === childName);
        if (matchingComp) {
          edges.push({
            from: parentComp.name,
            to: matchingComp.name,
          });
        }
      }
    });
  });

  return { nodes, edges };
}
