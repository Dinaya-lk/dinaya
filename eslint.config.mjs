import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "apps/desktop/dist/**",
    "apps/desktop/src-tauri/target/**",
    "apple-ultra-skills/**",
    "node_modules/**",
    "next-env.d.ts",
    "tsconfig.tsbuildinfo",
    // Vendored / static assets — not our source
    "public/**",
    // Sibling projects with their own toolchains
    "dinaya-uptime-monitor/**",
    // Local scratchpads and temp repo copies — never linted
    "scratch/**",
    ".codex-temp/**",
  ]),
]);
