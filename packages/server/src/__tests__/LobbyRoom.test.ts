import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, ColyseusTestServer } from "@colyseus/testing";
import { Server } from "colyseus";
import { LobbyRoom } from "../rooms/LobbyRoom";
import { GameRoom } from "../rooms/GameRoom";
import { MSG_GAME_READY } from "@mpmario/shared";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  const gameServer = new Server();
  gameServer.define("lobby", LobbyRoom);
  gameServer.define("game", GameRoom);
  colyseus = await boot(gameServer);
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe("LobbyRoom", () => {
  it("broadcasts game_ready when MIN_PLAYERS (2) join", async () => {
    const room = await colyseus.createRoom("lobby", {});
    let receivedRoomId: string | null = null;

    const c1 = await colyseus.connectTo(room);
    c1.onMessage(MSG_GAME_READY, (msg: { roomId: string }) => {
      receivedRoomId = msg.roomId;
    });

    const c2 = await colyseus.connectTo(room);

    await new Promise<void>(resolve => setTimeout(resolve, 200));
    expect(receivedRoomId).not.toBeNull();

    c1.leave();
    c2.leave();
  });
});
