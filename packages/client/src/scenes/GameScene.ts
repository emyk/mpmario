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
  private fireHintText: Phaser.GameObjects.Text | null = null;
  private levelRendered = false;

  constructor() { super({ key: "GameScene" }); }

  init(data: GameSceneData) {
    this.network = data.network;
    this.levelRendered = false;
  }

  create(_data: GameSceneData) {
    this.cameras.main.setBounds(0, 0, 960, 240);
    this.inputHandler  = new InputHandler(this);
    this.stateRenderer = new StateRenderer(this, this.network.sessionId);
    this.lastTickTime  = Date.now();

    this.network.onStateChange = (state) => {
      if (!this.levelRendered) {
        this.levelRendered = true;
        this.renderLevel(state.levelIndex);
      }
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

  private renderLevel(levelIndex: number): void {
    const key = `level${levelIndex + 1}`;
    const data = this.cache.json.get(key);
    if (!data) return;
    const w = data.width as number;
    for (const layer of data.layers as any[]) {
      if (layer.type === "tilelayer" && layer.name === "collision") {
        (layer.data as number[]).forEach((tile: number, i: number) => {
          if (tile > 0) {
            const tx = (i % w) * 16;
            const ty = Math.floor(i / w) * 16;
            this.add.image(tx, ty, "tile_solid").setOrigin(0, 0).setDepth(0);
          }
        });
      }
    }
  }

  private updateHUD(state: GameState) {
    let i = 0;
    let localHasFire = false;
    state.players.forEach((player, id) => {
      const isMe = id === this.network.sessionId;
      const label = isMe ? `You: ${player.lives}♥` : `P${i + 1}: ${player.lives}♥`;
      if (!this.livesTexts.has(id)) {
        this.livesTexts.set(id, this.add.text(10, 10 + i * 18, label, { fontSize: "14px", color: isMe ? "#ffe066" : "#fff" }).setScrollFactor(0).setDepth(10));
      }
      this.livesTexts.get(id)!.setText(label);
      if (isMe && player.powerUp === "fire") localHasFire = true;
      i++;
    });

    if (localHasFire) {
      if (!this.fireHintText) {
        this.fireHintText = this.add.text(480, 225, "Z — throw fireball", { fontSize: "12px", color: "#ff8800" }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(10);
      }
      this.fireHintText.setVisible(true);
    } else if (this.fireHintText) {
      this.fireHintText.setVisible(false);
    }
  }

  shutdown() {
    this.stateRenderer?.destroy();
    this.livesTexts.forEach(t => t.destroy());
    this.livesTexts.clear();
    this.fireHintText?.destroy();
    this.fireHintText = null;
    this.levelRendered = false;
  }
}
