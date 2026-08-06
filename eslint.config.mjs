import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not part of the Next.js app: a separate, vanilla-JS browser extension
    // (its own popup.html confuses eslint-config-next's pages-dir detection)
    // and a one-off Node script — neither should be linted with Next rules.
    "extension/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
