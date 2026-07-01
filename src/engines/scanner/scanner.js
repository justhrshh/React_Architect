import JSZip from "jszip";

/**
 * Recursively scans a FileSystemDirectoryHandle for supported JS/TS/MD files.
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {string} path - current path prefix
 * @returns {Promise<Array<{name: string, path: string, content: string}>>}
 */
export async function scanDirectory(dirHandle, path = "") {
  const files = [];
  const ignoreDirs = new Set(["node_modules", "dist", "build", "coverage", ".git", ".next", "out"]);
  const supportedExtensions = new Set(["js", "jsx", "ts", "tsx", "md"]);

  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === "file") {
      const ext = entry.name.split(".").pop().toLowerCase();
      if (supportedExtensions.has(ext)) {
        try {
          const file = await entry.getFile();
          const content = await file.text();
          files.push({
            name: entry.name,
            path: entryPath,
            content,
          });
        } catch (err) {
          console.warn(`Failed to read file: ${entryPath}`, err);
        }
      }
    } else if (entry.kind === "directory") {
      if (!ignoreDirs.has(entry.name)) {
        const subFiles = await scanDirectory(entry, entryPath);
        files.push(...subFiles);
      }
    }
  }
  return files;
}

/**
 * Scans a ZIP File object for supported JS/TS/MD files.
 *
 * @param {File} zipFile
 * @returns {Promise<Array<{name: string, path: string, content: string}>>}
 */
export async function scanZip(zipFile) {
  const files = [];
  const supportedExtensions = new Set(["js", "jsx", "ts", "tsx", "md"]);
  const ignoreDirs = ["node_modules/", "dist/", "build/", "coverage/", ".git/", ".next/", "out/"];

  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      
      const shouldIgnore = ignoreDirs.some(ignored => relativePath.includes(ignored));
      if (shouldIgnore) continue;

      const ext = relativePath.split(".").pop().toLowerCase();
      if (supportedExtensions.has(ext)) {
        const content = await zipEntry.async("string");
        files.push({
          name: zipEntry.name.split("/").pop(),
          path: relativePath,
          content,
        });
      }
    }
  } catch (err) {
    console.error("Failed to parse ZIP file", err);
    throw err;
  }

  return files;
}
