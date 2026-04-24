import { NetworkManager } from "../network/NetworkManager";

export class LobbyScene extends Phaser.Scene {
  private networkManager!: NetworkManager;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super({ key: "LobbyScene" }); }

  create() {
    this.add.rectangle(480, 120, 960, 240, 0x1a1a2e).setOrigin(0.5);
    this.add.text(480, 60, "mpMario", { fontSize: "36px", color: "#e74c3c", fontStyle: "bold" }).setOrigin(0.5);
    this.statusText = this.add.text(480, 120, "Connecting…", { fontSize: "18px", color: "#ecf0f1" }).setOrigin(0.5);
    this.add.text(480, 180, "Waiting for players…", { fontSize: "14px", color: "#7f8c8d" }).setOrigin(0.5);

    this.networkManager = new NetworkManager();
    this.networkManager.connectToGame()
      .then(() => { this.scene.start("GameScene", { network: this.networkManager }); })
      .catch((err: Error) => { this.statusText.setText(`Connection failed: ${err.message}`); });
  }
}
