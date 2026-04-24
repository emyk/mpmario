export class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }
  create() { this.add.text(10, 10, "Game", { color: "#fff" }); }
}
