// Bridge legacy .eslintrc.cjs to ESLint flat config using FlatCompat
const { FlatCompat } = require("@eslint/eslintrc");
const legacy = require("./.eslintrc.cjs");

// FlatCompat requires `recommendedConfig` for `eslint:recommended`.
// In offline/dev environments, `@eslint/js` may be unavailable; fall back
// to an empty object so lint still runs with project/plugin rules.
let recommendedConfig = { rules: {} };
try {
  // The FlatCompat helper prefers the core recommended config from @eslint/js.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { configs } = require("@eslint/js");
  recommendedConfig = configs.recommended;
} catch {
  // Keep fallback config.
}

const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig });

// Convert legacy config to flat config and also add ignores that were previously in .eslintignore
module.exports = [
  {
    ignores: [
      "dist",
      "coverage",
      "node_modules",
      "skills",
      "*.config.cjs",
      "*.config.js",
      "*.config.mjs",
      "vite.config.ts",
      ".eslintrc.cjs",
      "eslint.config.cjs",
    ],
  },
  ...compat.config(legacy),
];
