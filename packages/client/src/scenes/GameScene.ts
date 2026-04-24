import { NetworkManager } from "../network/NetworkManager";
import { InputHandler }   from "../input/InputHandler";
import { StateRenderer }  from "../rendering/StateRenderer";
import { SoundManager }   from "../audio/SoundManager";
import { GameState }      from "@mpmario/shared";
import { SERVER_TICK_MS } from "@mpmario/shared";

interface GameSceneData { network: NetworkManager; levelIndex: number; }

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private inputHandler!: InputHandler;
  private stateRenderer!: StateRenderer;
  private sounds = new SoundManager();
  private lastState: GameState | null = null;
  private lastTickTime = 0;
  private livesTexts = new Map<string, Phaser.GameObjects.Text>();
  private fireHintText: Phaser.GameObjects.Text | null = null;
  private levelRendered = false;

  // Sound change-detection
  private prevLives    = new Map<string, number>();
  private prevPowerUp  = new Map<string, string>();
  private prevEnemyAlive = new Map<string, boolean>();
  private prevJump   = false;
  private prevAttack = false;

  constructor() { super({ key: "GameScene" }); }

  init(data: GameSceneData) {
    this.network = data.network;
    this.levelRendered = false;
    this.prevLives.clear();
    this.prevPowerUp.clear();
    this.prevEnemyAlive.clear();
    this.prevJump   = false;
    this.prevAttack = false;
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
      this.detectSoundEvents(state);
      this.lastState    = state;
      this.lastTickTime = Date.now();
      this.updateHUD(state);
    };

    this.network.onWinner = (winnerId) => {
      const isMe = winnerId === this.network.sessionId;
      isMe ? this.sounds.win() : this.sounds.loseLife();
      const msg = isMe ? "You Win!" : "You Lose!";
      this.add.text(480, 120, msg, { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.time.delayedCall(3000, () => {
        this.scene.start("VoteScene", { network: this.network });
      });
    };

    this.network.onGameReady = (roomId) => {
      this.network.joinGame(roomId)
        .then(() => { this.scene.restart({ network: this.network, levelIndex: 0 }); })
        .catch((err: Error) => { console.error("Failed to join next game", err); });
    };
  }

  update() {
    const msg = this.inputHandler.getInputMessage();

    // Edge-detect keypresses for input-driven sounds
    const me = this.lastState?.players.get(this.network.sessionId);
    if (msg.jump && !this.prevJump && me?.isOnGround)  this.sounds.jump();
    if (msg.attack && !this.prevAttack && me?.powerUp === "fire") this.sounds.fireball();
    this.prevJump   = msg.jump;
    this.prevAttack = msg.attack;

    this.network.sendInput(msg);

    if (this.lastState) {
      const elapsed = Date.now() - this.lastTickTime;
      const alpha   = Math.min(elapsed / SERVER_TICK_MS, 1);
      this.stateRenderer.apply(this.lastState, alpha);
    }
  }

  private detectSoundEvents(state: GameState) {
    const myId = this.network.sessionId;

    state.players.forEach((player, id) => {
      const prevLives   = this.prevLives.get(id) ?? player.lives;
      const prevPowerUp = this.prevPowerUp.get(id) ?? player.powerUp;

      if (player.lives < prevLives && id === myId)       this.sounds.loseLife();
      if (player.powerUp !== "none" && prevPowerUp === "none") this.sounds.powerUp();

      this.prevLives.set(id, player.lives);
      this.prevPowerUp.set(id, player.powerUp);
    });

    state.enemies.forEach((enemy, id) => {
      const wasAlive = this.prevEnemyAlive.get(id) ?? enemy.isAlive;
      if (wasAlive && !enemy.isAlive) this.sounds.stomp();
      this.prevEnemyAlive.set(id, enemy.isAlive);
    });
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
