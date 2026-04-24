import { Room, Client, matchMaker } from "colyseus";
import { MIN_PLAYERS, MAX_PLAYERS, MSG_GAME_READY } from "@mpmario/shared";

export class LobbyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private queue: string[] = [];
  private isStarting = false;

  onCreate() {}

  onJoin(client: Client) {
    this.queue.push(client.sessionId);
    if (this.queue.length >= MIN_PLAYERS && !this.isStarting) {
      this.startGame();
    }
  }

  onLeave(client: Client) {
    this.queue = this.queue.filter(id => id !== client.sessionId);
  }

  private async startGame() {
    this.isStarting = true;
    const players = [...this.queue]; // snapshot before async gap
    const room = await matchMaker.createRoom("game", { levelIndex: 0, players });
    this.broadcast(MSG_GAME_READY, { roomId: room.roomId });
    this.disconnect();
  }
}
