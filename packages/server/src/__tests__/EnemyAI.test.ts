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

  it("goomba reverses at edge of platform (no floor ahead)", () => {
    // 3-column map: floor only under col 0, open cols 1 and 2
    const CLIFF_MAP: boolean[][] = [
      [false, false, false],
      [false, false, false],
      [true,  false, false],
    ];
    // Enemy at col 0, moving right — col 1 has no floor
    const e = makeEnemy("goomba", { x: 0, y: 0, vx: 1 });
    const enemies = makeMap([e]);
    updateEnemies(enemies, CLIFF_MAP);
    expect(e.vx).toBeLessThan(0); // reversed
  });

  it("stopped shell koopa stays stopped", () => {
    const e = makeEnemy("koopa", { isShell: true, vx: 0 });
    const enemies = makeMap([e]);
    const origX = e.x;
    updateEnemies(enemies, MAP);
    expect(e.vx).toBe(0);
    expect(e.x).toBe(origX);
  });

  it("piranha transitions from hidden to visible", () => {
    const cycle = PIRANHA_VISIBLE_TICKS + PIRANHA_HIDDEN_TICKS;
    const e = makeEnemy("piranha", { piranhaTimer: cycle - 1, piranhaVisible: false });
    const enemies = makeMap([e]);
    updateEnemies(enemies, MAP); // timer wraps to 0 → visible
    expect(e.piranhaVisible).toBe(true);
  });
});
