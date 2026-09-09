import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import zodCompiler from "zod-compiler/vite";

const sentryClientEntry = resolve(
  dirname(createRequire(import.meta.url).resolve("@sentry/nextjs/package.json")),
  "build/cjs/index.client.js",
);

const reactConfig = defineConfig({
  plugins: [zodCompiler(), react()],
  resolve: {
    alias: [{ find: /^@sentry\/nextjs$/v, replacement: sentryClientEntry }],
  },
  test: {
    css: false,
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
    setupFiles: ["@repo/config-vitest/setup-react"],
  },
});

export default reactConfig;
