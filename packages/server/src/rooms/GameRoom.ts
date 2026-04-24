import { Room } from "colyseus";
import { GameState } from "@mpmario/shared";

export class GameRoom extends Room<GameState> {
  async onCreate() {
    this.setState(new GameState());
  }
}
