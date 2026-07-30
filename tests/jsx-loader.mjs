import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transformWithOxc } from "vite";
import { register } from "node:module";

try {
  register(import.meta.url);
} catch (e) {
  // already registered or worker context
}

export async function resolve(specifier, context, nextResolve) {
  let mappedSpecifier = specifier;
  if (specifier.startsWith("@/")) {
    mappedSpecifier = pathToFileURL(process.cwd() + "/src/" + specifier.slice(2)).href;
  }
  try {
    return await nextResolve(mappedSpecifier, context);
  } catch (err) {
    if (mappedSpecifier.startsWith(".") || mappedSpecifier.startsWith("/") || mappedSpecifier.startsWith("file:")) {
      const parentUrl = context.parentURL || pathToFileURL(process.cwd() + "/").href;
      const resolved = mappedSpecifier.startsWith("file:") ? new URL(mappedSpecifier) : new URL(mappedSpecifier, parentUrl);
      const filePath = fileURLToPath(resolved.href);
      for (const ext of [".js", ".jsx", ".json", "/index.js", "/index.jsx"]) {
        if (fs.existsSync(filePath + ext)) {
          return {
            url: pathToFileURL(filePath + ext).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const filePath = fileURLToPath(url);
    const code = fs.readFileSync(filePath, "utf8");
    const result = await transformWithOxc(code, filePath);
    return {
      format: "module",
      shortCircuit: true,
      source: result.code,
    };
  }
  return nextLoad(url, context);
}

