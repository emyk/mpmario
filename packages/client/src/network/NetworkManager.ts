import { Client, Room } from "colyseus.js";
import { GameState } from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import { MSG_INPUT, MSG_GAME_READY, MSG_WINNER, MSG_VOTE } from "@mpmario/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export class NetworkManager {
  private client: Client;
  private lobbyRoom: Room | null = null;
  private gameRoom: Room<GameState> | null = null;

  onGameReady?: (roomId: string) => void;
  onStateChange?: (state: GameState) => void;
  onWinner?: (winnerId: string) => void;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  async joinLobby(): Promise<void> {
    this.lobbyRoom = await this.client.join("lobby");
    this.lobbyRoom.onMessage(MSG_GAME_READY, ({ roomId }: { roomId: string }) => {
      this.onGameReady?.(roomId);
    });
  }

  async joinGame(roomId: string): Promise<void> {
    await this.lobbyRoom?.leave();
    this.lobbyRoom = null;
    await this.gameRoom?.leave();
    this.gameRoom = null;
    this.gameRoom = await this.client.joinById<GameState>(roomId);
    this.gameRoom.onStateChange(state => this.onStateChange?.(state));
    this.gameRoom.onMessage(MSG_WINNER, ({ winnerId }: { winnerId: string }) => {
      this.onWinner?.(winnerId);
    });
    this.gameRoom.onMessage(MSG_GAME_READY, ({ roomId }: { roomId: string }) => {
      this.onGameReady?.(roomId);
    });
  }

  sendInput(msg: InputMessage): void {
    this.gameRoom?.send(MSG_INPUT, msg);
  }

  sendVote(levelIndex: number): void {
    this.gameRoom?.send(MSG_VOTE, { levelIndex });
  }

  get sessionId(): string {
    return this.gameRoom?.sessionId ?? "";
  }

  get currentState(): GameState | null {
    return this.gameRoom?.state ?? null;
  }

  disconnect(): void {
    this.gameRoom?.leave();
    this.lobbyRoom?.leave();
  }
}
