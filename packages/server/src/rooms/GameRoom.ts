import { Room, Client, matchMaker } from "colyseus";
import {
  GameState, PlayerState, EnemyState, PowerUpState,
  LIVES_PER_PLAYER, SERVER_TICK_MS, MAX_PLAYERS,
  MSG_INPUT, MSG_WINNER, MSG_VOTE, MSG_GAME_READY,
  RESPAWN_INVINCIBILITY_TICKS, VOTE_DURATION_S, MATCH_END_DELAY_MS,
  ENEMY_SPEED, POWERUP_RESPAWN_TICKS, TILE_SIZE,
} from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import { LevelLoader, LevelData } from "../game/LevelLoader";
import { applyPhysics } from "../game/Physics";
import { resolvePlayerCollisions } from "../game/Collision";
import { updateEnemies } from "../game/EnemyAI";

interface GameRoomOptions { levelIndex?: number; }

export class GameRoom extends Room<GameState> {
  private inputs   = new Map<string, InputMessage>();
  private levelData!: LevelData;
  private votes    = new Map<string, number>();
  maxClients = MAX_PLAYERS;

  async onCreate(options: GameRoomOptions) {
    this.setState(new GameState());
    this.state.levelIndex = options.levelIndex ?? 0;
    this.levelData = LevelLoader.load(this.state.levelIndex);

    this.initEnemies();
    this.initPowerUps();

    this.onMessage(MSG_INPUT, (client: Client, msg: InputMessage) => {
      this.inputs.set(client.sessionId, msg);
    });
    this.onMessage(MSG_VOTE, (client: Client, { levelIndex }: { levelIndex: number }) => {
      this.votes.set(client.sessionId, levelIndex);
    });

    this.clock.setInterval(() => this.tick(), SERVER_TICK_MS);
  }

  onJoin(client: Client) {
    const p = new PlayerState();
    p.id = client.sessionId;
    p.lives = LIVES_PER_PLAYER;
    const spawnCount = Math.max(this.levelData.spawns.length, 1);
    const spawn = this.levelData.spawns[this.state.players.size % spawnCount];
    p.x = spawn?.x ?? 32;
    p.y = spawn?.y ?? 32;
    p.spawnX = p.x;
    p.spawnY = p.y;
    this.state.players.set(client.sessionId, p);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.inputs.delete(client.sessionId);
    this.checkWinCondition();
  }

  private tick() {
    if (this.state.matchPhase !== "playing") return;

    this.state.players.forEach((player, id) => {
      if (!player.isAlive) return;
      const input = this.inputs.get(id) ?? { left: false, right: false, jump: false, attack: false };
      applyPhysics(player, input);
      resolvePlayerCollisions(player, this.levelData.collisionMap);
      this.checkPitDeath(player);
      if (player.invincibleTicks > 0) player.invincibleTicks--;
    });

    updateEnemies(this.state.enemies, this.levelData.collisionMap);
    this.resolveEntityCollisions();
    this.tickPowerUps();
    this.inputs.clear();
    this.checkWinCondition();
  }

  private checkPitDeath(player: PlayerState) {
    if (player.y > this.levelData.heightTiles * TILE_SIZE) {
      this.eliminatePlayer(player, null);
    }
  }

  private resolveEntityCollisions() {
    this.state.players.forEach((attacker, attackerId) => {
      if (!attacker.isAlive || attacker.invincibleTicks > 0) return;

      this.state.players.forEach((victim, victimId) => {
        if (attackerId === victimId || !victim.isAlive || victim.invincibleTicks > 0) return;
        if (this.overlaps(attacker, victim, 14, 16)) {
          if (attacker.vy > 0 && attacker.y + 16 <= victim.y + 4) {
            this.eliminatePlayer(victim, attackerId);
            attacker.vy = -6;
          }
        }
      });

      this.state.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        if (this.overlaps(attacker, enemy, 14, 16)) {
          if (attacker.vy > 0 && attacker.y + 16 <= enemy.y + 4) {
            if (enemy.type === "koopa" && !enemy.isShell) {
              enemy.isShell = true;
              enemy.vx = 0;
            } else {
              enemy.isAlive = false;
            }
            attacker.vy = -6;
          } else if (enemy.piranhaVisible !== false) {
            this.eliminatePlayer(attacker, null);
          }
        }
      });

      this.state.powerUps.forEach((pu) => {
        if (!pu.isActive) return;
        if (this.overlaps(attacker, pu, 14, 16)) {
          this.applyPowerUp(attacker, pu);
        }
      });
    });
  }

  private overlaps(
    a: { x: number; y: number },
    b: { x: number; y: number },
    aw: number, ah: number
  ): boolean {
    return a.x < b.x + 16 && a.x + aw > b.x && a.y < b.y + 16 && a.y + ah > b.y;
  }

  private applyPowerUp(player: PlayerState, pu: PowerUpState) {
    pu.isActive = false;
    pu.respawnTicks = POWERUP_RESPAWN_TICKS;
    if (pu.type === "mushroom") player.powerUp = "big";
    else if (pu.type === "flower") player.powerUp = "fire";
    else if (pu.type === "star") {
      player.powerUp = "star";
      player.invincibleTicks = 600;
    }
  }

  private tickPowerUps() {
    this.state.powerUps.forEach(pu => {
      if (!pu.isActive && pu.respawnTicks > 0) {
        pu.respawnTicks--;
        if (pu.respawnTicks === 0) pu.isActive = true;
      }
    });
  }

  private eliminatePlayer(player: PlayerState, _killerId: string | null) {
    if (!player.isAlive) return;
    player.lives--;
    if (player.lives <= 0) {
      player.isAlive = false;
    } else {
      player.x = player.spawnX;
      player.y = player.spawnY;
      player.vx = 0;
      player.vy = 0;
      player.invincibleTicks = RESPAWN_INVINCIBILITY_TICKS;
    }
  }

  checkWinCondition() {
    if (this.state.matchPhase !== "playing") return;
    const alive = [...this.state.players.values()].filter(p => p.lives > 0);
    if (alive.length === 1) {
      this.state.matchPhase = "ended";
      this.state.winnerId = alive[0].id;
      this.broadcast(MSG_WINNER, { winnerId: this.state.winnerId });
      this.clock.setTimeout(() => this.startVote(), MATCH_END_DELAY_MS);
    } else if (alive.length === 0 && this.state.players.size >= 1) {
      // Simultaneous elimination — pick random winner from all players
      const all = [...this.state.players.values()];
      const winner = all[Math.floor(Math.random() * all.length)];
      this.state.matchPhase = "ended";
      this.state.winnerId = winner.id;
      this.broadcast(MSG_WINNER, { winnerId: this.state.winnerId });
      this.clock.setTimeout(() => this.startVote(), MATCH_END_DELAY_MS);
    }
  }

  private startVote() {
    this.state.matchPhase = "voting";
    this.state.voteTimer = VOTE_DURATION_S;
    const countdown = this.clock.setInterval(() => {
      this.state.voteTimer--;
      if (this.state.voteTimer <= 0) {
        countdown.clear();
        this.resolveVote();
      }
    }, 1000);
  }

  private async resolveVote() {
    const counts = new Map<number, number>();
    this.votes.forEach(idx => counts.set(idx, (counts.get(idx) ?? 0) + 1));
    let nextLevel = Math.floor(Math.random() * 3);
    let best = 0;
    counts.forEach((count, idx) => { if (count > best) { best = count; nextLevel = idx; } });
    try {
      const room = await matchMaker.createRoom("game", { levelIndex: nextLevel });
      this.broadcast(MSG_GAME_READY, { roomId: room.roomId });
    } catch (err) {
      console.error("resolveVote: failed to create room", err);
      // Broadcast game_ready with a fallback so clients don't get stuck
      this.broadcast(MSG_GAME_READY, { roomId: "" });
    }
  }

  private initEnemies() {
    this.levelData.enemySpawns.forEach((spawn, i) => {
      const e = new EnemyState();
      e.id = `enemy_${i}`;
      e.type = spawn.type;
      e.x = spawn.x;
      e.y = spawn.y;
      e.vx = spawn.type === "piranha" ? 0 : ENEMY_SPEED;
      this.state.enemies.set(e.id, e);
    });
  }

  private initPowerUps() {
    this.levelData.powerUpSpawns.forEach((spawn, i) => {
      const pu = new PowerUpState();
      pu.id = `pu_${i}`;
      pu.type = spawn.type;
      pu.x = spawn.x;
      pu.y = spawn.y;
      this.state.powerUps.set(pu.id, pu);
    });
  }
}
