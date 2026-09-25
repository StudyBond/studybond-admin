import path from "node:path";
import { defineConfig } from "vitest/config";

// Pure-logic tests only (no DOM): form state, validation, payload building.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
