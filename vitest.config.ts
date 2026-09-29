import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    // Production-style output: dev mode adds generated helpers (e.g. hydration stubs) that no test can reach.
    svelte({ compilerOptions: { dev: false } }),
    svelteTesting()
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      all: true,
      include: ["src/**/*.{ts,svelte}"],
      // Type declarations only; there is no runtime code to cover.
      exclude: ["src/data/CardTypes.ts"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100
      }
    }
  }
});
