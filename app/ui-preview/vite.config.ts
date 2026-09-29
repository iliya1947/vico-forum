import { defineConfig } from "vite";

export default defineConfig({
  root: "app/ui-preview",
  base: "./",
  build: {
    outDir: "../../dist/ui-preview",
    emptyOutDir: true,
  },
});
