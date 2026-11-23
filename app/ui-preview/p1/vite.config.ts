import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import routes from "../../routes";
import { THEME_BOOTSTRAP_SCRIPT } from "../../theme";
import { previewRoutesPlugin } from "../build/route-modules";

const root = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(root, "../..");

/** Unpublished P1 build: actual imports for every generated Framework route. */
export default defineConfig({
  root,
  base: "./",
  plugins: [
    {
      name: "vico-ui-preview-p1-shared-document-bootstrap",
      transformIndexHtml() {
        // Apply the same pre-paint production theme as P0 / Framework Layout.
        return [{
          tag: "script" as const,
          attrs: { "data-vico-preview-theme-bootstrap": "" },
          children: THEME_BOOTSTRAP_SCRIPT,
          injectTo: "head-prepend" as const,
        }];
      },
    },
    previewRoutesPlugin(routes, appDirectory),
  ],
  build: {
    outDir: resolve(root, "../../../dist/ui-preview-p1-import"),
    emptyOutDir: true,
  },
});
