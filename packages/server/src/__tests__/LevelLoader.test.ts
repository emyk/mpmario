import { describe, it, expect } from "vitest";
import { LevelLoader } from "../game/LevelLoader";

const FIXTURE = {
  width: 5,
  height: 3,
  tilewidth: 16,
  tileheight: 16,
  layers: [
    {
      name: "collision",
      type: "tilelayer",
      width: 5,
      height: 3,
      data: [
        0, 0, 0, 0, 0,
        0, 0, 0, 0, 0,
        1, 1, 1, 1, 1,
      ],
    },
    {
      name: "objects",
      type: "objectgroup",
      objects: [
        { id: 1, type: "spawn",    name: "s1",  x: 16, y: 16 },
        { id: 2, type: "goomba",   name: "",    x: 48, y: 16 },
        { id: 3, type: "mushroom", name: "",    x: 32, y: 16 },
      ],
    },
  ],
};

describe("LevelLoader.parse", () => {
  it("builds a collision map from tilelayer data", () => {
    const level = LevelLoader.parse(FIXTURE);
    expect(level.collisionMap[2][0]).toBe(true);  // bottom row solid
    expect(level.collisionMap[0][0]).toBe(false); // top row empty
  });

  it("extracts spawn points", () => {
    const level = LevelLoader.parse(FIXTURE);
    expect(level.spawns).toHaveLength(1);
    expect(level.spawns[0]).toEqual({ x: 16, y: 16 });
  });

  it("extracts enemy spawns", () => {
    const level = LevelLoader.parse(FIXTURE);
    expect(level.enemySpawns[0]).toMatchObject({ type: "goomba", x: 48, y: 16 });
  });

  it("extracts power-up spawns", () => {
    const level = LevelLoader.parse(FIXTURE);
    expect(level.powerUpSpawns[0]).toMatchObject({ type: "mushroom", x: 32, y: 16 });
  });
});
