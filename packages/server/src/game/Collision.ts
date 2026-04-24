import { TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT_SMALL, PLAYER_HEIGHT_BIG } from "@mpmario/shared";
import type { PlayerState } from "@mpmario/shared";

export function isSolid(map: boolean[][], tileX: number, tileY: number): boolean {
  if (tileY < 0 || tileY >= map.length) return false;
  if (tileX < 0 || tileX >= map[0].length) return false;
  return map[tileY][tileX];
}

interface CollidableEntity {
  x: number; y: number;
  vx: number; vy: number;
  isOnGround: boolean;
}

function resolveEntity(
  e: CollidableEntity,
  map: boolean[][],
  w: number,
  h: number
): void {
  // Y axis — falling (floor check)
  if (e.vy >= 0) {
    const tileY  = Math.floor((e.y + h) / TILE_SIZE);
    const tileX1 = Math.floor(e.x / TILE_SIZE);
    const tileX2 = Math.floor((e.x + w - 1) / TILE_SIZE);
    e.isOnGround = false;
    if (isSolid(map, tileX1, tileY) || isSolid(map, tileX2, tileY)) {
      e.y = tileY * TILE_SIZE - h;
      e.vy = 0;
      e.isOnGround = true;
    }
  } else {
    // Y axis — rising (ceiling check)
    const ceilY  = Math.floor(e.y / TILE_SIZE);
    const tileX1 = Math.floor(e.x / TILE_SIZE);
    const tileX2 = Math.floor((e.x + w - 1) / TILE_SIZE);
    if (isSolid(map, tileX1, ceilY) || isSolid(map, tileX2, ceilY)) {
      e.y = (ceilY + 1) * TILE_SIZE;
      e.vy = 0;
    }
  }

  // X axis — right wall (check projected position after velocity)
  if (e.vx > 0) {
    const wallX  = Math.floor((e.x + w + e.vx) / TILE_SIZE);
    const tileYT = Math.floor(e.y / TILE_SIZE);
    const tileYB = Math.floor((e.y + h - 1) / TILE_SIZE);
    if (isSolid(map, wallX, tileYT) || isSolid(map, wallX, tileYB)) {
      e.x  = wallX * TILE_SIZE - w;
      e.vx = 0;
    }
  } else if (e.vx < 0) {
    // X axis — left wall (check projected position after velocity)
    const wallX  = Math.floor((e.x + e.vx) / TILE_SIZE);
    const tileYT = Math.floor(e.y / TILE_SIZE);
    const tileYB = Math.floor((e.y + h - 1) / TILE_SIZE);
    if (isSolid(map, wallX, tileYT) || isSolid(map, wallX, tileYB)) {
      e.x  = (wallX + 1) * TILE_SIZE;
      e.vx = 0;
    }
  }
}

export function resolvePlayerCollisions(player: PlayerState, map: boolean[][]): void {
  const h = (player.powerUp === "big" || player.powerUp === "fire" || player.powerUp === "star")
    ? PLAYER_HEIGHT_BIG
    : PLAYER_HEIGHT_SMALL;
  resolveEntity(player, map, PLAYER_WIDTH, h);
}

export function resolveEnemyCollisions(
  e: CollidableEntity,
  map: boolean[][],
  w: number,
  h: number
): void {
  resolveEntity(e, map, w, h);
}
