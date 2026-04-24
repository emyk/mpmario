export class BootScene extends Phaser.Scene {
    constructor() { super({ key: "BootScene" }); }
    create() {
        this.generateTextures();
        this.scene.start("LobbyScene");
    }
    generateTextures() {
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        const playerColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12];
        playerColors.forEach((color, i) => {
            g.clear();
            g.fillStyle(color);
            g.fillRect(0, 0, 14, 16);
            g.generateTexture(`player_${i}`, 14, 16);
        });
        playerColors.forEach((color, i) => {
            g.clear();
            g.fillStyle(color);
            g.fillRect(0, 0, 14, 32);
            g.generateTexture(`player_big_${i}`, 14, 32);
        });
        g.clear();
        g.fillStyle(0x8B4513);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("goomba", 16, 16);
        g.clear();
        g.fillStyle(0x27ae60);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("koopa", 16, 16);
        g.clear();
        g.fillStyle(0xc0392b);
        g.fillRect(0, 0, 16, 24);
        g.generateTexture("piranha", 16, 24);
        g.clear();
        g.fillStyle(0x7f8c8d);
        g.fillRect(0, 0, 20, 14);
        g.generateTexture("bulletbill", 20, 14);
        g.clear();
        g.fillStyle(0x27ae60);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("shell", 16, 16);
        g.clear();
        g.fillStyle(0xe74c3c);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("mushroom", 16, 16);
        g.clear();
        g.fillStyle(0xff6600);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("flower", 16, 16);
        g.clear();
        g.fillStyle(0xf1c40f);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("star", 16, 16);
        g.clear();
        g.fillStyle(0x8B6914);
        g.fillRect(0, 0, 16, 16);
        g.lineStyle(1, 0x5D4A0F);
        g.strokeRect(0, 0, 16, 16);
        g.generateTexture("tile_solid", 16, 16);
        g.clear();
        g.fillStyle(0x87CEEB);
        g.fillRect(0, 0, 16, 16);
        g.generateTexture("tile_sky", 16, 16);
        g.destroy();
    }
}
