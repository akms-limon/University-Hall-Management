import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/**/*.test.js"],
    fileParallelism: false,
    restoreMocks: true,
    hookTimeout: 10 * 60 * 1000,
    testTimeout: 60 * 1000,
  },
});
