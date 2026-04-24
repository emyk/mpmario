import { defineConfig, Plugin } from "vite";
import path from "path";
import fs from "fs";

function serveLevels(): Plugin {
  const levelsDir = path.resolve(__dirname, "../../levels");
  const levelFiles = ["level1.json", "level2.json", "level3.json"];
  const middleware = (req: any, res: any, next: any) => {
    const match = req.url?.match(/^\/levels\/(level\d+\.json)$/);
    if (!match) { next(); return; }
    const file = path.join(levelsDir, match[1]);
    if (!fs.existsSync(file)) { next(); return; }
    res.setHeader("Content-Type", "application/json");
    res.end(fs.readFileSync(file));
  };
  return {
    name: "serve-levels",
    configureServer(s) { s.middlewares.use(middleware); },
    configurePreviewServer(s) { s.middlewares.use(middleware); },
    generateBundle() {
      for (const name of levelFiles) {
        const src = path.join(levelsDir, name);
        if (fs.existsSync(src)) {
          this.emitFile({ type: "asset", fileName: `levels/${name}`, source: fs.readFileSync(src, "utf-8") });
        }
      }
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@mpmario/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  plugins: [serveLevels()],
  server: { port: 3000 },
});
