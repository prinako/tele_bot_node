import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

function treatJsAsJsx() {
  return {
    name: "treat-js-as-jsx",
    // Parse JSX before Vite's built-in JavaScript transform runs.
    enforce: "pre",
    async transform(code, id) {
      if (!id.match(/\/src\/.*\.js$/)) {
        return null;
      }

      return transformWithOxc(code, id, {
        jsx: { runtime: "automatic" },
        lang: "jsx",
      });
    },
  };
}

export default defineConfig({
  plugins: [treatJsAsJsx(), react()],
});
