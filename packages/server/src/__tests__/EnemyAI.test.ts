import { describe, it, expect } from "vitest";
import { updateEnemies } from "../game/EnemyAI";
import { EnemyState } from "@mpmario/shared";
import { MapSchema } from "@colyseus/schema";
import { TILE_SIZE, PIRANHA_VISIBLE_TICKS, PIRANHA_HIDDEN_TICKS } from "@mpmario/shared";

// 3×3 map: bottom row solid, open above
const MAP: boolean[][] = [
  [false, false, false],
  [false, false, false],
  [true,  true,  true ],
];

function makeEnemy(type: string, overrides: Partial<EnemyState> = {}): EnemyState {
  const e = new EnemyState();
  e.type = type; e.x = TILE_SIZE; e.y = 0; e.vx = 1;
  Object.assign(e, overrides);
  return e;
}

function makeMap(enemies: EnemyState[]): MapSchema<EnemyState> {
  const m = new MapSchema<EnemyState>();
  enemies.forEach((e, i) => m.set(String(i), e));
  return m;
}

describe("EnemyAI", () => {
  it("goomba reverses when hitting a wall", () => {
    const WALL_MAP: boolean[][] = [
      [true,  false, false],
      [true,  false, false],
      [true,  true,  true ],
    ];
    const e = makeEnemy("goomba", { x: 0, vx: -1 }); // moving left into wall
    const enemies = makeMap([e]);
    updateEnemies(enemies, WALL_MAP);
    expect(e.vx).toBeGreaterThan(0); // reversed
  });

  it("koopa in shell mode keeps vx when shell is kicked", () => {
    const e = makeEnemy("koopa", { isShell: true, vx: 5 });
    const enemies = makeMap([e]);
    updateEnemies(enemies, MAP);
    expect(Math.abs(e.vx)).toBeGreaterThan(0);
  });

  it("piranha toggles visibility based on timer", () => {
    const e = makeEnemy("piranha", { piranhaTimer: PIRANHA_VISIBLE_TICKS - 1, piranhaVisible: true });
    const enemies = makeMap([e]);
    updateEnemies(enemies, MAP); // tick pushes timer to PIRANHA_VISIBLE_TICKS
    expect(e.piranhaVisible).toBe(false);
  });

  it("dead enemies are skipped", () => {
    const e = makeEnemy("goomba", { isAlive: false, x: 10 });
    const enemies = makeMap([e]);
    updateEnemies(enemies, MAP);
    expect(e.x).toBe(10); // unchanged
  });
});
