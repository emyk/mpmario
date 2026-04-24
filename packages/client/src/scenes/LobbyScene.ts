export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: "LobbyScene" }); }
  create() { this.add.text(10, 10, "Lobby — connecting…", { color: "#fff" }); }
}
