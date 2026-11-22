import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import routes from "../../routes";
import { previewRoutesPlugin } from "../build/route-modules";

const candidateRoot = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(candidateRoot, "../..");


/** P0 diagnostic: expose the exact route-to-PostgreSQL import path, not a guess. */
function importGraphDiagnostics(): Plugin {
  return {
    name: "vico-ui-preview-p0-import-edges",
    apply: "build",
    generateBundle() {
      const ids = Array.from(this.getModuleIds());
      const targets = ids.filter((id) =>
        id.endsWith("/db/postgres-deadlines.ts")
        || id.includes("/node_modules/.pnpm/pg@") && id.endsWith("/pg/lib/index.js")
        || id.endsWith("/db/hyperdrive-forum.ts")
        || id.endsWith("/db/forum-repository.ts")
      );
      const short = (id: string) => id.replaceAll("\\", "/").split("/node_modules/.pnpm/").pop()!
        .replace(/^.*?\/(app|db)\//, "$1/");
      for (const target of targets.slice(0, 12)) {
        const queue: string[][] = [[target]];
        const visited = new Set([target]);
        let traces = 0;
        while (queue.length > 0 && traces < 4) {
          const chain = queue.shift()!;
          const current = chain[chain.length - 1]!;
          if (current.includes("/app/routes/topic.tsx")) {
            console.warn("P0_IMPORT_EDGE " + chain.slice().reverse().map(short).join(" -> "));
            traces += 1;
            continue;
          }
          const info = this.getModuleInfo(current);
          for (const importer of info?.importers ?? []) {
            if (!visited.has(importer) && chain.length < 12) {
              visited.add(importer);
              queue.push([...chain, importer]);
            }
          }
        }
      }
    },
  };
}

export default defineConfig({
  root: candidateRoot,
  base: "./",
  plugins: [
    // P0 import-graph proof only. Full module coverage belongs to P1.
    previewRoutesPlugin(routes, appDirectory, ["root", "routes/locale-boundary", "routes/topic"]),
    importGraphDiagnostics(),
  ],
  build: {
    outDir: resolve(candidateRoot, "../../../dist/ui-preview-p0"),
    emptyOutDir: true,
  },
});
