// Bridge legacy .eslintrc.cjs to ESLint flat config using FlatCompat
const { FlatCompat } = require("@eslint/eslintrc");
// The FlatCompat helper requires the core recommended config from @eslint/js
const { configs } = require("@eslint/js");
const legacy = require("./.eslintrc.cjs");

const compat = new FlatCompat({ baseDirectory: __dirname, recommendedConfig: configs.recommended });

// Convert legacy config to flat config and also add ignores that were previously in .eslintignore
module.exports = [
  { ignores: ["dist", "coverage", "node_modules", "skills"] },
  ...compat.config(legacy),
];
