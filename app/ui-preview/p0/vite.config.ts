import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import routes from "../../routes";
import { previewRoutesPlugin } from "../build/route-modules";

const candidateRoot = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(candidateRoot, "../..");

export default defineConfig({
  root: candidateRoot,
  base: "./",
  plugins: [
    // P0 import-graph proof only. Full module coverage belongs to P1.
    previewRoutesPlugin(routes, appDirectory, ["root", "routes/locale-boundary", "routes/topic"]),
  ],
  build: {
    outDir: resolve(candidateRoot, "../../../dist/ui-preview-p0"),
    emptyOutDir: true,
  },
});
