import { describe, it, expect } from "vitest";
import { resolvePlayerCollisions, isSolid } from "../game/Collision";
import { PlayerState } from "@mpmario/shared";
import { TILE_SIZE, PLAYER_WIDTH, PLAYER_HEIGHT_SMALL } from "@mpmario/shared";

// 3×3 grid: bottom row solid
const MAP: boolean[][] = [
  [false, false, false],
  [false, false, false],
  [true,  true,  true ],
];

function makePlayer(overrides: Partial<Record<string, any>> = {}): PlayerState {
  const p = new PlayerState();
  p.x = TILE_SIZE; p.y = TILE_SIZE; p.vx = 0; p.vy = 0;
  Object.assign(p, overrides);
  return p;
}

describe("isSolid", () => {
  it("returns true for solid tiles", () => expect(isSolid(MAP, 0, 2)).toBe(true));
  it("returns false for empty tiles", () => expect(isSolid(MAP, 0, 0)).toBe(false));
  it("returns false for out-of-bounds", () => expect(isSolid(MAP, -1, 0)).toBe(false));
});

describe("resolvePlayerCollisions", () => {
  it("stops player at floor and sets isOnGround", () => {
    // Player falling into bottom row (y=2*TILE_SIZE is the solid row)
    const p = makePlayer({
      x: TILE_SIZE,
      y: 2 * TILE_SIZE - PLAYER_HEIGHT_SMALL + 1, // one pixel into the floor
      vy: 2,
    });
    resolvePlayerCollisions(p, MAP);
    expect(p.isOnGround).toBe(true);
    expect(p.vy).toBe(0);
    expect(p.y).toBe(2 * TILE_SIZE - PLAYER_HEIGHT_SMALL);
  });

  it("stops player at ceiling when jumping", () => {
    const CEIL_MAP: boolean[][] = [
      [false, true, false],
      [false, false, false],
      [true,  true,  true ],
    ];
    const p = makePlayer({ x: TILE_SIZE, y: 1, vy: -3 });
    resolvePlayerCollisions(p, CEIL_MAP);
    expect(p.vy).toBe(0);
  });

  it("stops player walking into wall on the right", () => {
    const WALL_MAP: boolean[][] = [
      [false, false, true],
      [false, false, true],
      [true,  true,  true],
    ];
    const PLAYER_SPEED = 3;
    const p = makePlayer({ x: TILE_SIZE, y: 0, vx: PLAYER_SPEED });
    resolvePlayerCollisions(p, WALL_MAP);
    expect(p.vx).toBe(0);
    expect(p.x).toBeLessThanOrEqual(2 * TILE_SIZE - PLAYER_WIDTH);
  });
});
