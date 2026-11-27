import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    testTimeout: 15000,
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: [
        "services/**/*.{ts,tsx}",
        "proxy.ts",
        "hooks/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.d.ts",
        "__tests__/**",
        "app/layout.tsx",
        "app/mobile/layout.tsx",
        "app/admin/layout.tsx",
        "coverage/**",
        ".next/**",
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 60,
        lines: 70,
        "proxy.ts": {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        "services/**/*.ts": {
          statements: 90,
          branches: 75,
          functions: 95,
          lines: 90,
        },
        "app/page.tsx": {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
        "app/mobile/aluno/page.tsx": {
          statements: 90,
          branches: 80,
          functions: 90,
          lines: 90,
        },
        "components/ui/PessoaPhoto.tsx": {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
        "components/ui/ProtectedRoute.tsx": {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
