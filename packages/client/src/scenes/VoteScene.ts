import { NetworkManager } from "../network/NetworkManager";

interface VoteSceneData { network: NetworkManager; }

export class VoteScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private timerText!: Phaser.GameObjects.Text;

  constructor() { super({ key: "VoteScene" }); }

  create(data: VoteSceneData) {
    this.networkManager = data.network;
    this.add.rectangle(480, 120, 960, 240, 0x1a1a2e).setOrigin(0.5);
    this.add.text(480, 30, "Vote for next level", { fontSize: "22px", color: "#fff" }).setOrigin(0.5);
    this.timerText = this.add.text(480, 200, "15s", { fontSize: "18px", color: "#e74c3c" }).setOrigin(0.5);

    const labels = ["Level 1 — Classic", "Level 2 — Stairs", "Level 3 — Islands"];
    labels.forEach((label, i) => {
      const btn = this.add.text(480, 80 + i * 36, label, {
        fontSize: "16px", color: "#ecf0f1",
        backgroundColor: "#2c3e50", padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => {
        this.networkManager.sendVote(i);
        btn.setColor("#2ecc71");
      });
    });

    this.networkManager.onGameReady = async (roomId) => {
      await this.networkManager.joinGame(roomId);
      this.scene.start("GameScene", { network: this.networkManager });
    };

    this.networkManager.onStateChange = (state) => {
      this.timerText.setText(`${state.voteTimer}s`);
    };
  }
}
