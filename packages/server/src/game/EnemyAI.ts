import { MapSchema } from "@colyseus/schema";
import { EnemyState } from "@mpmario/shared";
import {
  ENEMY_SPEED, SHELL_SPEED,
  PIRANHA_VISIBLE_TICKS, PIRANHA_HIDDEN_TICKS,
  TILE_SIZE,
} from "@mpmario/shared";
import { isSolid } from "./Collision";

export function updateEnemies(enemies: MapSchema<EnemyState>, map: boolean[][]): void {
  enemies.forEach(e => {
    if (!e.isAlive) return;
    switch (e.type) {
      case "goomba":     updateWalker(e, map, ENEMY_SPEED); break;
      case "koopa":      updateKoopa(e, map); break;
      case "piranha":    updatePiranha(e); break;
      case "bulletbill": break; // bullet bills are spawned per-tick in GameRoom
    }
  });
}

function updateWalker(e: EnemyState, map: boolean[][], speed: number): void {
  const nextX = e.x + e.vx;

  // Tile ahead (in direction of movement) at mid-body height
  const aheadCol   = e.vx > 0
    ? Math.floor((nextX + TILE_SIZE - 1) / TILE_SIZE)
    : Math.floor(nextX / TILE_SIZE);
  const midRow     = Math.floor((e.y + TILE_SIZE / 2) / TILE_SIZE);

  // Tile below foot in front (for edge/cliff detection)
  const footAheadCol = e.vx > 0
    ? Math.floor((nextX + TILE_SIZE - 1) / TILE_SIZE)
    : Math.floor(nextX / TILE_SIZE);
  const belowRow   = Math.floor((e.y + TILE_SIZE) / TILE_SIZE);

  const hitsWall  = isSolid(map, aheadCol, midRow);
  const noFloor   = !isSolid(map, footAheadCol, belowRow);

  if (hitsWall || noFloor) {
    e.vx = e.vx !== 0 ? -e.vx : speed;
  } else {
    e.x = nextX;
  }
}

function updateKoopa(e: EnemyState, map: boolean[][]): void {
  if (e.isShell) {
    if (e.vx !== 0) updateWalker(e, map, SHELL_SPEED);
  } else {
    updateWalker(e, map, ENEMY_SPEED);
  }
}

function updatePiranha(e: EnemyState): void {
  e.piranhaTimer++;
  const cycle = PIRANHA_VISIBLE_TICKS + PIRANHA_HIDDEN_TICKS;
  e.piranhaVisible = (e.piranhaTimer % cycle) < PIRANHA_VISIBLE_TICKS;
}
