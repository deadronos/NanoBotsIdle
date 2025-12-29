/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  reportUnusedDisableDirectives: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
    },
  },
  plugins: [
    "@typescript-eslint",
    "import",
    "jsx-a11y",
    "react",
    "react-hooks",
    "react-refresh",
    "simple-import-sort",
    "testing-library",
    "jest-dom",
    "unused-imports",
  ],
  extends: [
    "eslint:recommended",

    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/stylistic",

    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",

    "plugin:import/recommended",
    "plugin:import/typescript",

    "prettier",
  ],
  ignorePatterns: ["dist/", "coverage/", "node_modules/", "*.min.*", "*.d.ts"],
  overrides: [
    {
      files: ["**/*.{test,spec}.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
      extends: ["plugin:testing-library/react", "plugin:jest-dom/recommended"],
    },
    {
      // Config files often use CommonJS and `require()`
      files: [
        "*.config.cjs",
        "*.config.js",
        "*.config.mjs",
        "*.cjs",
        "vite.config.ts",
        "tailwind.config.cjs",
        "eslint.config.cjs",
        ".eslintrc.cjs",
      ],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/no-var-requires": "off",
      },
    },
  ],
  rules: {
    // React Three Fiber/Three.js patterns intentionally mutate scene/refs.
    "react-hooks/immutability": "off",

    // React 17+ / Vite SWC JSX transform
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",

    // We use TypeScript for props typing
    "react/prop-types": "off",

    // Vite fast refresh: prefer component-only exports
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

    // Prefer type imports where possible (keeps runtime lean)
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],

    // Both `type` and `interface` are acceptable; avoid forcing refactors.
    "@typescript-eslint/consistent-type-definitions": "off",

    // Handled by unused-imports for autofix
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],

    // Stable, auto-fixable import ordering
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",

    // In a Vite+TS app, TS handles module resolution.
    "import/no-unresolved": "off",
    "import/named": "off",
    "import/default": "off",
    "import/namespace": "off",

    // Avoid Node-only builtins in browser code (still allow in config/scripts)
    "import/no-nodejs-modules": "off",
  },
};
