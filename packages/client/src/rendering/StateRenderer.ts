import { GameState } from "@mpmario/shared";
import { lerp } from "./Interpolator";

interface TrackedSprite {
  sprite: Phaser.GameObjects.Image;
  prevX: number;
  prevY: number;
}

export class StateRenderer {
  private scene: Phaser.Scene;
  private sessionId: string;
  private players  = new Map<string, TrackedSprite>();
  private enemies  = new Map<string, TrackedSprite>();
  private powerUps = new Map<string, Phaser.GameObjects.Image>();
  private playerIndex = new Map<string, number>();

  constructor(scene: Phaser.Scene, sessionId: string) {
    this.scene = scene;
    this.sessionId = sessionId;
  }

  apply(state: GameState, alpha: number): void {
    this.syncPlayers(state, alpha);
    this.syncEnemies(state, alpha);
    this.syncPowerUps(state);
    this.syncFireballs(state);
  }

  private syncPlayers(state: GameState, alpha: number) {
    state.players.forEach((player, id) => {
      if (!player.isAlive) {
        this.players.get(id)?.sprite.setVisible(false);
        return;
      }
      if (!this.players.has(id)) {
        const idx = this.playerIndex.size;
        this.playerIndex.set(id, idx);
        const sprite = this.scene.add.image(player.x, player.y, `player_${idx}`).setOrigin(0, 0);
        this.players.set(id, { sprite, prevX: player.x, prevY: player.y });
      }
      const tracked = this.players.get(id)!;
      const isBig   = player.powerUp === "big" || player.powerUp === "fire" || player.powerUp === "star";
      const idx      = this.playerIndex.get(id) ?? 0;
      tracked.sprite.setTexture(isBig ? `player_big_${idx}` : `player_${idx}`);
      tracked.sprite.setVisible(true);
      tracked.sprite.setAlpha(player.invincibleTicks > 0 ? (Math.floor(player.invincibleTicks / 4) % 2 === 0 ? 0.4 : 1) : 1);
      tracked.sprite.setFlipX(!player.facingRight);
      tracked.sprite.x = lerp(tracked.prevX, player.x, alpha);
      tracked.sprite.y = lerp(tracked.prevY, player.y, alpha);
      tracked.prevX = player.x;
      tracked.prevY = player.y;
    });
    this.players.forEach((tracked, id) => {
      if (!state.players.has(id)) {
        tracked.sprite.destroy();
        this.players.delete(id);
      }
    });
  }

  private syncEnemies(state: GameState, alpha: number) {
    state.enemies.forEach((enemy, id) => {
      if (!enemy.isAlive || (enemy.type === "piranha" && !enemy.piranhaVisible)) {
        this.enemies.get(id)?.sprite.setVisible(false);
        return;
      }
      if (!this.enemies.has(id)) {
        const textureKey = enemy.isShell ? "shell" : enemy.type;
        const sprite = this.scene.add.image(enemy.x, enemy.y, textureKey).setOrigin(0, 0);
        this.enemies.set(id, { sprite, prevX: enemy.x, prevY: enemy.y });
      }
      const tracked = this.enemies.get(id)!;
      tracked.sprite.setVisible(true);
      tracked.sprite.setTexture(enemy.isShell ? "shell" : enemy.type);
      tracked.sprite.x = lerp(tracked.prevX, enemy.x, alpha);
      tracked.sprite.y = lerp(tracked.prevY, enemy.y, alpha);
      tracked.prevX = enemy.x;
      tracked.prevY = enemy.y;
    });
    this.enemies.forEach((tracked, id) => {
      if (!state.enemies.has(id)) { tracked.sprite.destroy(); this.enemies.delete(id); }
    });
  }

  private syncPowerUps(state: GameState) {
    state.powerUps.forEach((pu, id) => {
      if (!pu.isActive) { this.powerUps.get(id)?.setVisible(false); return; }
      if (!this.powerUps.has(id)) {
        const sprite = this.scene.add.image(pu.x, pu.y, pu.type).setOrigin(0, 0);
        this.powerUps.set(id, sprite);
      }
      this.powerUps.get(id)!.setVisible(true);
    });
    this.powerUps.forEach((sprite, id) => {
      if (!state.powerUps.has(id)) { sprite.destroy(); this.powerUps.delete(id); }
    });
  }

  private fireballs = new Map<string, Phaser.GameObjects.Image>();

  private syncFireballs(state: GameState) {
    state.fireballs.forEach((fb, id) => {
      if (!fb.isAlive) { this.fireballs.get(id)?.setVisible(false); return; }
      if (!this.fireballs.has(id)) {
        if (!this.scene.textures.exists("fireball")) {
          const g = this.scene.make.graphics({}, false);
          g.fillStyle(0xff6600); g.fillCircle(4, 4, 4);
          g.generateTexture("fireball", 8, 8);
          g.destroy();
        }
        this.fireballs.set(id, this.scene.add.image(fb.x, fb.y, "fireball").setOrigin(0, 0));
      }
      const sprite = this.fireballs.get(id)!;
      sprite.setVisible(true);
      sprite.x = fb.x;
      sprite.y = fb.y;
    });
    this.fireballs.forEach((sprite, id) => {
      if (!state.fireballs.has(id)) { sprite.destroy(); this.fireballs.delete(id); }
    });
  }

  destroy() {
    this.players.forEach(t => t.sprite.destroy());
    this.enemies.forEach(t => t.sprite.destroy());
    this.powerUps.forEach(s => s.destroy());
    this.fireballs.forEach(s => s.destroy());
  }
}
