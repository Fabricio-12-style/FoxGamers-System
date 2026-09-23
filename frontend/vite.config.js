import { readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { defineConfig } from "vite";

function findHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ["dist", "node_modules", "public"].includes(entry.name)) {
      return [];
    }

    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return findHtmlFiles(entryPath);
    }

    return extname(entry.name) === ".html" ? [entryPath] : [];
  });
}

const frontendRoot = resolve(import.meta.dirname);

export default defineConfig({
  root: frontendRoot,
  build: {
    rollupOptions: {
      input: findHtmlFiles(frontendRoot),
    },
  },
});