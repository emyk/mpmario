import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@mpmario/shared": path.resolve(__dirname, "../shared/src/index.ts"),
      "@colyseus/schema": (require as NodeRequire).resolve("@colyseus/schema"),
    },
  },
});
