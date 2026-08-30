const path = require("path");

module.exports = {
  extends: ["next/core-web-vitals"],
  settings: {
    next: {
      rootDir: path.resolve(__dirname),
    },
  },
  rules: {
    // Blank line after all imports before code
    "import/newline-after-import": "warn",
    // Blank lines between top-level functions/classes
    "padding-line-between-statements": [
      "warn",
      { blankLine: "always", prev: "*", next: "export" },
      { blankLine: "always", prev: "export", next: "*" },
      { blankLine: "always", prev: "import", next: "*" },
      { blankLine: "never", prev: "import", next: "import" },
    ],
    // @next/eslint-plugin-next v15 rules crash on ESLint 8 because they call
    // filename.split() on an undefined value. This is a known incompatibility.
    // Disable all @next/next rules until ESLint is upgraded to v9.
    // See: https://github.com/vercel/next.js/issues/71093
    "@next/next/no-html-link-for-pages": "off",
    "@next/next/no-page-custom-font": "off",
    "@next/next/no-typos": "off",
    "@next/next/no-duplicate-head": "off",
  },
};