import { Server } from "colyseus";
import http from "http";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

// Serve built client (production / Railway)
const clientDist = path.resolve(__dirname, "../../../packages/client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — must come after static so Colyseus matchmake POSTs still reach the WS server
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define("lobby", LobbyRoom);
gameServer.define("game", GameRoom);

gameServer.listen(port)
  .then(() => { console.log(`Server listening on port ${port}`); })
  .catch((err: Error) => { console.error("Failed to start server:", err); process.exit(1); });
