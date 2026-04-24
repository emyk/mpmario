import { NetworkManager } from "../network/NetworkManager";
import { InputHandler }   from "../input/InputHandler";
import { StateRenderer }  from "../rendering/StateRenderer";
import { GameState }      from "@mpmario/shared";
import { SERVER_TICK_MS } from "@mpmario/shared";

interface GameSceneData { network: NetworkManager; levelIndex: number; }

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private inputHandler!: InputHandler;
  private stateRenderer!: StateRenderer;
  private lastState: GameState | null = null;
  private lastTickTime = 0;
  private livesTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() { super({ key: "GameScene" }); }

  init(data: GameSceneData) {
    this.network = data.network;
  }

  create(_data: GameSceneData) {
    this.inputHandler    = new InputHandler(this);
    this.stateRenderer = new StateRenderer(this, this.network.sessionId);
    this.lastTickTime = Date.now();

    this.network.onStateChange = (state) => {
      this.lastState    = state;
      this.lastTickTime = Date.now();
      this.updateHUD(state);
    };

    this.network.onWinner = (winnerId) => {
      const isMe = winnerId === this.network.sessionId;
      const msg  = isMe ? "You Win!" : "You Lose!";
      this.add.text(480, 120, msg, { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.time.delayedCall(3000, () => {
        this.scene.start("VoteScene", { network: this.network });
      });
    };

    this.network.onGameReady = (roomId) => {
      this.network.joinGame(roomId)
        .then(() => {
          this.scene.restart({ network: this.network, levelIndex: 0 });
        })
        .catch((err: Error) => {
          console.error("Failed to join next game", err);
        });
    };
  }

  update() {
    const msg = this.inputHandler.getInputMessage();
    this.network.sendInput(msg);

    if (this.lastState) {
      const elapsed = Date.now() - this.lastTickTime;
      const alpha   = Math.min(elapsed / SERVER_TICK_MS, 1);
      this.stateRenderer.apply(this.lastState, alpha);
    }
  }

  private updateHUD(state: GameState) {
    let i = 0;
    state.players.forEach((player, id) => {
      const label = id === this.network.sessionId ? `You: ${player.lives}♥` : `P${i + 1}: ${player.lives}♥`;
      if (!this.livesTexts.has(id)) {
        this.livesTexts.set(id, this.add.text(10, 10 + i * 18, label, { fontSize: "14px", color: "#fff" }).setScrollFactor(0));
      }
      this.livesTexts.get(id)!.setText(label);
      i++;
    });
  }

  shutdown() {
    this.stateRenderer?.destroy();
    this.livesTexts.forEach(t => t.destroy());
    this.livesTexts.clear();
  }
}
