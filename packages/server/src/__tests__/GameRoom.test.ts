import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { boot, ColyseusTestServer } from "@colyseus/testing";
import { Server } from "colyseus";
import { LobbyRoom } from "../rooms/LobbyRoom";
import { GameRoom } from "../rooms/GameRoom";
import { MSG_WINNER } from "@mpmario/shared";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  const gameServer = new Server();
  gameServer.define("lobby", LobbyRoom);
  gameServer.define("game", GameRoom);
  colyseus = await boot(gameServer, 2569);
});

afterAll(async () => colyseus.shutdown());

describe("GameRoom", () => {
  it("assigns spawn positions from level data when players join", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const player = room.state.players.get(c1.sessionId);
    expect(player).toBeDefined();
    expect(player!.lives).toBe(3);
    expect(typeof player!.x).toBe("number");
    c1.leave();
  });

  it("kills player who falls below the map", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const player = room.state.players.get(c1.sessionId)!;
    const initialLives = player.lives;
    // Move player far below the map bottom
    player.y = 99999;
    (room as any).checkPitDeath(player);
    expect(player.lives).toBeLessThan(initialLives);
    c1.leave();
  });

  it("respawns player with invincibility ticks when they have lives remaining", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const player = room.state.players.get(c1.sessionId)!;
    player.lives = 2; // ensure they have a life to spare
    (room as any).eliminatePlayer(player, null);
    expect(player.lives).toBe(1);
    expect(player.invincibleTicks).toBeGreaterThan(0);
    expect(player.x).toBe(player.spawnX);
    c1.leave();
  });

  it("emits winner message when only one player has lives", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let winnerId = "";
    c1.onMessage(MSG_WINNER, (msg: { winnerId: string }) => { winnerId = msg.winnerId; });

    // Force player2 to lose all lives
    const p2 = room.state.players.get(c2.sessionId)!;
    p2.lives = 0;
    (room as any).checkWinCondition();

    await new Promise<void>(r => setTimeout(r, 100));
    expect(winnerId).toBe(c1.sessionId);

    c1.leave();
    c2.leave();
  });
});
