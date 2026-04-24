import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@mpmario/shared": path.resolve(__dirname, "../shared/src/index.ts") },
  },
});
