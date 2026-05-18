import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "auth/index": "src/auth/index.ts",
    "adapters/index": "src/adapters/index.ts",
    // T02-T09: uncomment as domains are implemented
    "chat/index": "src/chat/index.ts",
    "layout/index": "src/layout/index.ts",
    "settings/index": "src/settings/index.ts",
    "calls/index": "src/calls/index.ts",
    "search/index": "src/search/index.ts",
    "files/index": "src/files/index.ts",
    "admin/index": "src/admin/index.ts",
    "primitives/index": "src/primitives/index.ts",
  },
  format: ["esm", "cjs"],
  dts: {
    compilerOptions: {
      incremental: false,
    },
  },
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ["react", "react-dom", "tailwindcss"],
  treeshake: true,
  outDir: "dist",
});
