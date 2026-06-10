import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "content/post/*.gen.test.ts",
      "node_modules/**",
      "public/**",
      "resources/**",
      "themes/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        clearTimeout: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
      sourceType: "module",
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["content/post/*.post.ts"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
];
