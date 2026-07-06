import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

function treatJsAsJsx() {
  return {
    name: "treat-js-as-jsx",
    async transform(code, id) {
      if (!id.match(/\/src\/.*\.js$/)) {
        return null;
      }

      return transformWithEsbuild(code, id, {
        jsx: "automatic",
        loader: "jsx",
      });
    },
  };
}

export default defineConfig({
  plugins: [treatJsAsJsx(), react()],
});
