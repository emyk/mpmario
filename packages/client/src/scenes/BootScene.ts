export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  preload() {
    this.load.json("level1", "/levels/level1.json");
    this.load.json("level2", "/levels/level2.json");
    this.load.json("level3", "/levels/level3.json");
  }

  create() {
    this.generateTextures();
    this.scene.start("LobbyScene");
  }

  private generateTextures() {
    const g = this.make.graphics({}, false);

    // ── Player sprites ──────────────────────────────────────────────────
    // Each player gets a unique cap/shirt colour; overalls and shoes are fixed
    const capColors = [0xCC2200, 0x0044CC, 0x228800, 0xCC7700];
    capColors.forEach((cap, i) => {
      g.clear(); this.drawSmallPlayer(g, cap);
      g.generateTexture(`player_${i}`, 14, 16);

      g.clear(); this.drawBigPlayer(g, cap);
      g.generateTexture(`player_big_${i}`, 14, 32);
    });

    // ── Enemies ─────────────────────────────────────────────────────────
    g.clear(); this.drawGoomba(g);   g.generateTexture("goomba",    16, 16);
    g.clear(); this.drawKoopa(g);    g.generateTexture("koopa",     16, 16);
    g.clear(); this.drawKoopaShell(g); g.generateTexture("shell",   16, 16);
    g.clear(); this.drawPiranha(g);  g.generateTexture("piranha",   16, 24);
    g.clear(); this.drawBulletBill(g); g.generateTexture("bulletbill", 20, 14);

    // ── Power-ups ────────────────────────────────────────────────────────
    g.clear(); this.drawMushroom(g); g.generateTexture("mushroom",  16, 16);
    g.clear(); this.drawFlower(g);   g.generateTexture("flower",    16, 16);
    g.clear(); this.drawStar(g);     g.generateTexture("star",      16, 16);

    // ── Tiles ────────────────────────────────────────────────────────────
    g.clear(); this.drawBrickTile(g);  g.generateTexture("tile_solid", 16, 16);
    g.clear(); this.drawSkyTile(g);    g.generateTexture("tile_sky",   16, 16);

    g.destroy();
  }

  // ── Small player (14×16) ───────────────────────────────────────────────
  private drawSmallPlayer(g: Phaser.GameObjects.Graphics, cap: number) {
    const SK = 0xFFCC99; // skin
    const OV = 0x2244BB; // overalls
    const SH = 0x661100; // shoes
    const HA = 0x331100; // hair / mustache

    // Hat
    g.fillStyle(cap);
    g.fillRect(3, 0, 8, 1);
    g.fillRect(1, 1, 11, 1);

    // Hair under brim
    g.fillStyle(HA);
    g.fillRect(1, 2, 2, 1);
    g.fillRect(11, 2, 2, 1);

    // Face
    g.fillStyle(SK);
    g.fillRect(2, 2, 9, 3);

    // Nose bump
    g.fillStyle(0xFFAA77);
    g.fillRect(5, 3, 2, 1);

    // Mustache
    g.fillStyle(HA);
    g.fillRect(3, 4, 3, 1);
    g.fillRect(7, 4, 3, 1);

    // Shirt (cap colour)
    g.fillStyle(cap);
    g.fillRect(2, 5, 10, 2);

    // Overalls body
    g.fillStyle(OV);
    g.fillRect(0, 7, 13, 4);

    // Buckle highlight
    g.fillStyle(0xFFFF88);
    g.fillRect(6, 7, 2, 1);

    // Suspender straps (cap colour)
    g.fillStyle(cap);
    g.fillRect(0, 7, 3, 2);
    g.fillRect(10, 7, 3, 2);

    // Legs split
    g.fillStyle(OV);
    g.fillRect(1, 11, 4, 2);
    g.fillRect(7, 11, 4, 2);

    // Shoes
    g.fillStyle(SH);
    g.fillRect(0, 13, 6, 2);
    g.fillRect(7, 13, 6, 2);
    // Toe highlight
    g.fillStyle(0x994422);
    g.fillRect(0, 13, 6, 1);
    g.fillRect(7, 13, 6, 1);
  }

  // ── Big player (14×32) ─────────────────────────────────────────────────
  private drawBigPlayer(g: Phaser.GameObjects.Graphics, cap: number) {
    const SK = 0xFFCC99;
    const OV = 0x2244BB;
    const SH = 0x661100;
    const HA = 0x331100;

    // Hat (taller)
    g.fillStyle(cap);
    g.fillRect(3, 0, 8, 2);
    g.fillRect(1, 2, 11, 2);

    // Hair
    g.fillStyle(HA);
    g.fillRect(1, 4, 2, 2);
    g.fillRect(11, 4, 2, 2);

    // Face
    g.fillStyle(SK);
    g.fillRect(2, 4, 9, 6);

    // Nose
    g.fillStyle(0xFFAA77);
    g.fillRect(5, 7, 2, 2);

    // Mustache
    g.fillStyle(HA);
    g.fillRect(3, 8, 3, 2);
    g.fillRect(7, 8, 3, 2);

    // Shirt
    g.fillStyle(cap);
    g.fillRect(2, 10, 10, 4);

    // Overalls
    g.fillStyle(OV);
    g.fillRect(0, 14, 13, 10);

    // Buckle
    g.fillStyle(0xFFFF88);
    g.fillRect(6, 14, 2, 2);

    // Suspenders
    g.fillStyle(cap);
    g.fillRect(0, 14, 3, 4);
    g.fillRect(10, 14, 3, 4);

    // Legs
    g.fillStyle(OV);
    g.fillRect(1, 24, 4, 4);
    g.fillRect(7, 24, 4, 4);

    // Shoes
    g.fillStyle(SH);
    g.fillRect(0, 28, 6, 4);
    g.fillRect(7, 28, 6, 4);
    g.fillStyle(0x994422);
    g.fillRect(0, 28, 6, 1);
    g.fillRect(7, 28, 6, 1);
  }

  // ── Goomba (16×16) ────────────────────────────────────────────────────
  private drawGoomba(g: Phaser.GameObjects.Graphics) {
    // Body — warm brown mushroom head
    g.fillStyle(0xAA5500);
    g.fillRect(2, 4, 12, 8);
    g.fillRect(4, 2, 8, 3);
    g.fillRect(3, 3, 10, 1);

    // Face — lighter centre
    g.fillStyle(0xCC7733);
    g.fillRect(5, 5, 6, 5);

    // White eye sclera
    g.fillStyle(0xFFFFFF);
    g.fillRect(3, 5, 4, 4);
    g.fillRect(9, 5, 4, 4);

    // Angry pupils (shifted inward)
    g.fillStyle(0x000000);
    g.fillRect(5, 6, 2, 3);
    g.fillRect(9, 6, 2, 3);

    // Angry eyebrows (slant toward centre)
    g.fillStyle(0x000000);
    g.fillRect(3, 4, 2, 1);
    g.fillRect(5, 3, 2, 1);
    g.fillRect(11, 4, 2, 1);
    g.fillRect(9,  3, 2, 1);

    // Teeth
    g.fillStyle(0xFFFFFF);
    g.fillRect(5, 9, 2, 1);
    g.fillRect(9, 9, 2, 1);

    // Feet (dark brown rounded)
    g.fillStyle(0x663300);
    g.fillRect(1, 12, 5, 4);
    g.fillRect(10, 12, 5, 4);
    g.fillStyle(0x885522);
    g.fillRect(1, 12, 5, 1);
    g.fillRect(10, 12, 5, 1);
  }

  // ── Koopa (16×16) ────────────────────────────────────────────────────
  private drawKoopa(g: Phaser.GameObjects.Graphics) {
    // Shell — dark green base
    g.fillStyle(0x226622);
    g.fillRect(3, 4, 10, 8);

    // Shell highlight — lighter
    g.fillStyle(0x44AA44);
    g.fillRect(5, 5, 6, 5);

    // Shell hexagon lines
    g.fillStyle(0x115511);
    g.fillRect(3, 8, 10, 1);
    g.fillRect(8, 4, 1, 8);

    // Head (yellow-green)
    g.fillStyle(0xDDCC44);
    g.fillRect(5, 0, 6, 5);

    // Eye
    g.fillStyle(0xFFFFFF);
    g.fillRect(7, 1, 3, 3);
    g.fillStyle(0x000000);
    g.fillRect(8, 1, 2, 2);

    // Neck
    g.fillStyle(0xDDCC44);
    g.fillRect(5, 4, 4, 2);

    // Feet
    g.fillStyle(0xDDCC44);
    g.fillRect(2, 12, 4, 4);
    g.fillRect(10, 12, 4, 4);
    g.fillStyle(0xBBAA33);
    g.fillRect(2, 14, 4, 2);
    g.fillRect(10, 14, 4, 2);
  }

  // ── Koopa shell (16×16) ───────────────────────────────────────────────
  private drawKoopaShell(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x226622);
    g.fillRect(2, 2, 12, 12);
    g.fillStyle(0x44AA44);
    g.fillRect(4, 4, 8, 8);
    g.fillStyle(0xFFFFFF);
    g.fillRect(7, 2, 2, 12);
    g.fillRect(2, 7, 12, 2);
  }

  // ── Piranha plant (16×24) ────────────────────────────────────────────
  private drawPiranha(g: Phaser.GameObjects.Graphics) {
    // Stem
    g.fillStyle(0x228822);
    g.fillRect(6, 10, 4, 14);

    // Head
    g.fillStyle(0xCC2222);
    g.fillRect(1, 0, 14, 12);

    // Lips / mouth
    g.fillStyle(0xEE5555);
    g.fillRect(2, 1, 12, 10);

    // White spots
    g.fillStyle(0xFFFFFF);
    g.fillRect(3, 2, 3, 3);
    g.fillRect(10, 2, 3, 3);
    g.fillRect(5, 6, 2, 2);
    g.fillRect(9, 6, 2, 2);

    // Teeth
    g.fillStyle(0xFFFFFF);
    g.fillRect(2, 9, 3, 3);
    g.fillRect(7, 9, 2, 3);
    g.fillRect(11, 9, 3, 3);
  }

  // ── Bullet Bill (20×14) ──────────────────────────────────────────────
  private drawBulletBill(g: Phaser.GameObjects.Graphics) {
    // Body
    g.fillStyle(0x222222);
    g.fillRect(2, 1, 16, 12);

    // Eye
    g.fillStyle(0xFFFFFF);
    g.fillRect(13, 4, 4, 5);
    g.fillStyle(0x000000);
    g.fillRect(15, 5, 2, 3);

    // Angry brow
    g.fillStyle(0x000000);
    g.fillRect(13, 3, 4, 1);

    // Nose tip
    g.fillStyle(0x444444);
    g.fillRect(0, 5, 3, 4);

    // Highlight
    g.fillStyle(0x555555);
    g.fillRect(2, 1, 16, 2);
  }

  // ── Mushroom (16×16) ────────────────────────────────────────────────
  private drawMushroom(g: Phaser.GameObjects.Graphics) {
    // Cap
    g.fillStyle(0xDD2222);
    g.fillRect(3, 1, 10, 9);
    g.fillRect(1, 4, 14, 6);

    // White spots
    g.fillStyle(0xFFFFFF);
    g.fillRect(4, 2, 3, 3);
    g.fillRect(9, 2, 3, 3);
    g.fillRect(2, 6, 2, 2);
    g.fillRect(12, 6, 2, 2);

    // Stem
    g.fillStyle(0xFFEECC);
    g.fillRect(3, 10, 10, 6);

    // Eyes
    g.fillStyle(0x000000);
    g.fillRect(5, 11, 2, 2);
    g.fillRect(9, 11, 2, 2);
  }

  // ── Fire flower (16×16) ──────────────────────────────────────────────
  private drawFlower(g: Phaser.GameObjects.Graphics) {
    // Stem
    g.fillStyle(0x228822);
    g.fillRect(7, 10, 2, 6);
    g.fillRect(5, 12, 4, 2);

    // Petals (orange)
    g.fillStyle(0xFF6600);
    g.fillRect(5, 2, 6, 2);
    g.fillRect(3, 4, 2, 4);
    g.fillRect(11, 4, 2, 4);
    g.fillRect(5, 8, 6, 2);

    // Centre (yellow)
    g.fillStyle(0xFFDD00);
    g.fillRect(5, 4, 6, 6);

    // Face
    g.fillStyle(0x000000);
    g.fillRect(6, 5, 1, 1);
    g.fillRect(9, 5, 1, 1);
    g.fillRect(6, 8, 4, 1);
  }

  // ── Star (16×16) ────────────────────────────────────────────────────
  private drawStar(g: Phaser.GameObjects.Graphics) {
    // Five-point star approximation
    g.fillStyle(0xFFDD00);
    // Centre square
    g.fillRect(5, 5, 6, 6);
    // Top spike
    g.fillRect(6, 2, 4, 4);
    // Bottom spike
    g.fillRect(6, 10, 4, 4);
    // Left spike
    g.fillRect(2, 6, 4, 4);
    // Right spike
    g.fillRect(10, 6, 4, 4);
    // Shine
    g.fillStyle(0xFFFFAA);
    g.fillRect(6, 3, 2, 2);
    g.fillRect(5, 6, 2, 2);

    // Eye
    g.fillStyle(0x000000);
    g.fillRect(6, 6, 1, 1);
    g.fillRect(9, 6, 1, 1);
    g.fillRect(7, 8, 2, 1);
  }

  // ── Brick tile (16×16) ───────────────────────────────────────────────
  private drawBrickTile(g: Phaser.GameObjects.Graphics) {
    // Base brick colour
    g.fillStyle(0xC87428);
    g.fillRect(0, 0, 16, 16);

    // Mortar (darker seams)
    g.fillStyle(0x9A4A10);
    g.fillRect(0, 7, 16, 2);   // horizontal centre seam
    g.fillRect(0, 0, 1, 7);    // left edge top
    g.fillRect(0, 9, 1, 7);    // left edge bottom
    g.fillRect(15, 0, 1, 7);   // right edge top
    g.fillRect(15, 9, 1, 7);   // right edge bottom
    g.fillRect(7, 0, 2, 7);    // vertical seam — top row
    g.fillRect(3, 9, 2, 7);    // vertical seam — bottom row left
    g.fillRect(11, 9, 2, 7);   // vertical seam — bottom row right

    // Top highlight
    g.fillStyle(0xE89040);
    g.fillRect(1, 0, 6, 1);
    g.fillRect(9, 0, 6, 1);
    g.fillRect(1, 9, 2, 1);
    g.fillRect(5, 9, 6, 1);
    g.fillRect(13, 9, 2, 1);

    // Left highlight
    g.fillStyle(0xD07830);
    g.fillRect(1, 1, 1, 6);
    g.fillRect(9, 1, 1, 6);
    g.fillRect(1, 10, 1, 6);
    g.fillRect(5, 10, 1, 6);
    g.fillRect(13, 10, 1, 6);
  }

  // ── Sky tile (16×16) ────────────────────────────────────────────────
  private drawSkyTile(g: Phaser.GameObjects.Graphics) {
    g.fillStyle(0x5C94FC);
    g.fillRect(0, 0, 16, 16);
  }
}
