import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/database/**/*.test.ts","app/complaints/**/*.dbtest.tsx"],
    testTimeout: 30_000,
  },
});
