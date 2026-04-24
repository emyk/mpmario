import { Server } from "colyseus";
import http from "http";
import express from "express";
import cors from "cors";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define("lobby", LobbyRoom);
gameServer.define("game", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`Server listening on port ${port}`);
});
