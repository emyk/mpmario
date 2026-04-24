import { Client, Room } from "colyseus.js";
import { GameState } from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import { MSG_INPUT, MSG_GAME_READY, MSG_WINNER, MSG_VOTE } from "@mpmario/shared";

function resolveServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL as string;
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname;
  // In local dev the Vite server (3000) and Colyseus server (2567) are separate
  if (host === "localhost" || host === "127.0.0.1") return `${proto}://${host}:2567`;
  // In production the client is served from the same host as the server
  return `${proto}://${window.location.host}`;
}
const SERVER_URL = resolveServerUrl();

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

  async connectToGame(): Promise<void> {
    await this.gameRoom?.leave().catch(() => {});
    this.gameRoom = await this.client.joinOrCreate<GameState>("game");
    this.setupGameListeners();
  }

  async joinGame(roomId: string): Promise<void> {
    await this.lobbyRoom?.leave().catch(() => {});
    this.lobbyRoom = null;
    await this.gameRoom?.leave().catch(() => {});
    this.gameRoom = null;
    this.gameRoom = await this.client.joinById<GameState>(roomId);
    this.setupGameListeners();
  }

  private setupGameListeners(): void {
    this.gameRoom!.onStateChange(state => this.onStateChange?.(state));
    this.gameRoom!.onMessage(MSG_WINNER, ({ winnerId }: { winnerId: string }) => {
      this.onWinner?.(winnerId);
    });
    this.gameRoom!.onMessage(MSG_GAME_READY, ({ roomId }: { roomId: string }) => {
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
