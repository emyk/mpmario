export class VoteScene extends Phaser.Scene {
    constructor() { super({ key: "VoteScene" }); }
    create() { this.add.text(10, 10, "Vote", { color: "#fff" }); }
}
