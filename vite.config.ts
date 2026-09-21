import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: ["index.html", "stats.html"],
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    overrides: [
      {
        files: ["*.json", "*.jsonc", "*.json5", "*.webmanifest"],
        options: { trailingComma: "none" },
      },
    ],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
