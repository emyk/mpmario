import { Room, Client, matchMaker } from "colyseus";
import { MIN_PLAYERS, MAX_PLAYERS, MSG_GAME_READY } from "@mpmario/shared";

export class LobbyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private queue: string[] = [];

  onCreate() {}

  onJoin(client: Client) {
    this.queue.push(client.sessionId);
    if (this.queue.length >= MIN_PLAYERS) {
      this.startGame();
    }
  }

  onLeave(client: Client) {
    this.queue = this.queue.filter(id => id !== client.sessionId);
  }

  private async startGame() {
    const room = await matchMaker.createRoom("game", { levelIndex: 0 });
    this.broadcast(MSG_GAME_READY, { roomId: room.roomId });
  }
}
