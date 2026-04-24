import fs from "fs";
import path from "path";

export interface SpawnPoint  { x: number; y: number; }
export interface EnemySpawn  { type: string; x: number; y: number; }
export interface PowerUpSpawn { type: string; x: number; y: number; }

export interface LevelData {
  collisionMap: boolean[][];
  spawns: SpawnPoint[];
  enemySpawns: EnemySpawn[];
  powerUpSpawns: PowerUpSpawn[];
  widthTiles: number;
  heightTiles: number;
}

const ENEMY_TYPES   = new Set(["goomba", "koopa", "piranha", "bulletbill"]);
const POWERUP_TYPES = new Set(["mushroom", "flower", "star"]);

export class LevelLoader {
  static load(index: number): LevelData {
    const p = path.resolve(__dirname, "../../../../levels", `level${index + 1}.json`);
    return LevelLoader.parse(JSON.parse(fs.readFileSync(p, "utf-8")));
  }

  static parse(raw: any): LevelData {
    const w = raw.width as number;
    const h = raw.height as number;
    const collisionMap: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false));
    const spawns: SpawnPoint[] = [];
    const enemySpawns: EnemySpawn[] = [];
    const powerUpSpawns: PowerUpSpawn[] = [];

    for (const layer of raw.layers) {
      if (layer.type === "tilelayer" && layer.name === "collision") {
        (layer.data as number[]).forEach((tile, i) => {
          if (tile > 0) collisionMap[Math.floor(i / w)][i % w] = true;
        });
      }
      if (layer.type === "objectgroup") {
        for (const obj of layer.objects) {
          const x = Math.floor(obj.x), y = Math.floor(obj.y);
          if (obj.type === "spawn")              spawns.push({ x, y });
          else if (ENEMY_TYPES.has(obj.type))    enemySpawns.push({ type: obj.type, x, y });
          else if (POWERUP_TYPES.has(obj.type))  powerUpSpawns.push({ type: obj.type, x, y });
        }
      }
    }
    return { collisionMap, spawns, enemySpawns, powerUpSpawns, widthTiles: w, heightTiles: h };
  }
}
