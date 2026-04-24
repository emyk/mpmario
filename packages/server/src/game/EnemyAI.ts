import { EnemyState } from "@mpmario/shared";
import {
  ENEMY_SPEED, SHELL_SPEED,
  PIRANHA_VISIBLE_TICKS, PIRANHA_HIDDEN_TICKS,
  TILE_SIZE,
} from "@mpmario/shared";
import { isSolid } from "./Collision";

export function updateEnemies(enemies: Map<string, EnemyState>, map: boolean[][]): void {
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

  const leadingCol = Math.floor((nextX + (e.vx > 0 ? TILE_SIZE - 1 : 0)) / TILE_SIZE);
  const midRow     = Math.floor((e.y + TILE_SIZE / 2) / TILE_SIZE);
  const belowRow   = Math.floor((e.y + TILE_SIZE) / TILE_SIZE);

  const hitsWall = isSolid(map, leadingCol, midRow);
  const noFloor  = !isSolid(map, leadingCol, belowRow);

  if (hitsWall || noFloor) {
    e.vx = e.vx > 0 ? -speed : speed;
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
