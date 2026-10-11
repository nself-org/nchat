import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // @nself/* are link: deps into the sibling packages repo, which has its own
  // node_modules. Without dedupe their imports of react resolve to a second
  // copy there and hooks throw "Invalid hook call".
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  // prevent vite from obscuring rust errors
  clearScreen: false,
  // Tauri expects a fixed port; fail if it isn't available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    target: "esnext",
  },
});
