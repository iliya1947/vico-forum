import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import routes from "../../routes";
import { previewRoutesPlugin } from "../build/route-modules";

const root = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(root, "../..");

/** Unpublished P1 build: actual imports for every generated Framework route. */
export default defineConfig({
  root,
  base: "./",
  plugins: [previewRoutesPlugin(routes, appDirectory)],
  build: {
    outDir: resolve(root, "../../../dist/ui-preview-p1-import"),
    emptyOutDir: true,
  },
});
