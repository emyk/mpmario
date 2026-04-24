# Multiplayer Mario Clone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 2–4 player "last one standing" Mario clone where the server is authoritative, clients send key-state inputs, and Phaser 3 renders interpolated server state.

**Architecture:** Colyseus `GameRoom` runs a 60 Hz fixed-rate game loop (physics, collision, enemy AI, win detection) and broadcasts state diffs. Phaser 3 client applies patches with linear interpolation. Shared TypeScript package ties both sides together via a single set of `@colyseus/schema` schemas, message type constants, and game constants.

**Tech Stack:** Phaser 3.87, Colyseus 0.15, @colyseus/schema 2.x, colyseus.js 0.15, Vite 5, Vitest 1, pnpm workspaces, TypeScript 5, tsx (server dev runner).

---

## File Map

```
mpmario/
├── package.json                                  # pnpm workspace root
├── pnpm-workspace.yaml
├── .gitignore
├── levels/
│   ├── level1.json                               # Tiled JSON export
│   ├── level2.json
│   └── level3.json
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                          # re-exports everything
│   │       ├── constants.ts                      # TILE_SIZE, GRAVITY, speeds, timers
│   │       ├── messages.ts                       # InputMessage, MSG_* constants
│   │       └── schemas/
│   │           ├── PlayerState.ts                # @colyseus/schema Player
│   │           ├── EnemyState.ts                 # @colyseus/schema Enemy
│   │           ├── PowerUpState.ts               # @colyseus/schema PowerUp
│   │           └── GameState.ts                  # Root schema with MapSchemas
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts                          # HTTP + Colyseus server entry
│   │       ├── rooms/
│   │       │   ├── LobbyRoom.ts                  # Queue + matchmaking
│   │       │   └── GameRoom.ts                   # Authoritative game room
│   │       ├── game/
│   │       │   ├── Physics.ts                    # applyPhysics()
│   │       │   ├── Collision.ts                  # resolveCollisions(), isSolid()
│   │       │   ├── EnemyAI.ts                    # updateEnemies()
│   │       │   └── LevelLoader.ts                # parse Tiled JSON → LevelData
│   │       └── __tests__/
│   │           ├── Physics.test.ts
│   │           ├── Collision.test.ts
│   │           ├── EnemyAI.test.ts
│   │           └── GameRoom.test.ts               # integration test
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.ts                            # Phaser game init
│           ├── scenes/
│           │   ├── BootScene.ts                   # preload + generate textures
│           │   ├── LobbyScene.ts                  # matchmaking queue UI
│           │   ├── GameScene.ts                   # main game rendering
│           │   └── VoteScene.ts                   # level vote screen
│           ├── network/
│           │   └── NetworkManager.ts              # colyseus.js client wrapper
│           ├── input/
│           │   └── InputHandler.ts                # keyboard state → InputMessage
│           └── rendering/
│               ├── StateRenderer.ts               # apply server state to sprites
│               └── Interpolator.ts                # lerp between server ticks
```

---

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/vitest.config.ts`
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`

- [ ] **Step 1: Create root workspace files**

```bash
mkdir -p packages/shared/src/schemas packages/server/src/__tests__ packages/client/src
```

`package.json` (root):
```json
{
  "name": "mpmario",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter @mpmario/server dev",
    "dev:client": "pnpm --filter @mpmario/client dev",
    "test": "pnpm --filter @mpmario/server test",
    "build": "pnpm --filter @mpmario/shared build && pnpm --filter @mpmario/server build && pnpm --filter @mpmario/client build"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`.gitignore`:
```
node_modules/
dist/
.superpowers/
```

- [ ] **Step 2: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@mpmario/shared",
  "version": "1.0.0",
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@colyseus/schema": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "dist",
    "strict": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create server package**

`packages/server/package.json`:
```json
{
  "name": "@mpmario/server",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@mpmario/shared": "workspace:*",
    "colyseus": "^0.15.0",
    "express": "^4.19.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@colyseus/testing": "^0.15.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "tsx": "^4.7.0",
    "vitest": "^1.6.0"
  }
}
```

`packages/server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "strict": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "paths": {
      "@mpmario/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

`packages/server/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@mpmario/shared": path.resolve(__dirname, "../shared/src/index.ts") },
  },
});
```

- [ ] **Step 4: Create client package**

`packages/client/package.json`:
```json
{
  "name": "@mpmario/client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mpmario/shared": "workspace:*",
    "phaser": "^3.87.0",
    "colyseus.js": "^0.15.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

`packages/client/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": {
      "@mpmario/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

`packages/client/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@mpmario/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  server: { port: 3000 },
});
```

- [ ] **Step 5: Install dependencies and verify TypeScript**

```bash
pnpm install
pnpm --filter @mpmario/shared typecheck
```

Expected: exits 0 (no files yet, that's fine — "no input files" error is acceptable at this stage).

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore packages/
git commit -m "feat: monorepo scaffold with shared/server/client packages"
```

---

## Task 2: Shared — Constants, Messages, State Schemas

**Files:**
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/messages.ts`
- Create: `packages/shared/src/schemas/PlayerState.ts`
- Create: `packages/shared/src/schemas/EnemyState.ts`
- Create: `packages/shared/src/schemas/PowerUpState.ts`
- Create: `packages/shared/src/schemas/GameState.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write constants**

`packages/shared/src/constants.ts`:
```typescript
export const TILE_SIZE = 16;
export const GRAVITY = 0.5;
export const PLAYER_SPEED = 3;
export const JUMP_VELOCITY = -10;
export const MAX_FALL_SPEED = 12;
export const PLAYER_WIDTH = 14;
export const PLAYER_HEIGHT_SMALL = 16;
export const PLAYER_HEIGHT_BIG = 32;
export const SERVER_TICK_MS = Math.floor(1000 / 60); // ~16ms
export const RESPAWN_INVINCIBILITY_TICKS = 120; // 2 s at 60 Hz
export const STAR_DURATION_TICKS = 600;          // 10 s
export const POWERUP_RESPAWN_TICKS = 1800;        // 30 s
export const SHELL_SPEED = 5;
export const FIREBALL_SPEED = 4;
export const FIREBALL_GRAVITY = 0.2;
export const BULLET_BILL_SPEED = 2;
export const ENEMY_SPEED = 1;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const LIVES_PER_PLAYER = 3;
export const PIRANHA_VISIBLE_TICKS = 120;
export const PIRANHA_HIDDEN_TICKS = 60;
export const VOTE_DURATION_S = 15;
export const MATCH_END_DELAY_MS = 3000;
```

- [ ] **Step 2: Write message types**

`packages/shared/src/messages.ts`:
```typescript
export interface InputMessage {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
}

export const MSG_INPUT = "input";
export const MSG_GAME_READY = "game_ready";
export const MSG_VOTE = "vote";
export const MSG_WINNER = "winner";
```

- [ ] **Step 3: Write PlayerState schema**

`packages/shared/src/schemas/PlayerState.ts`:
```typescript
import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string")  id: string = "";
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  vx: number = 0;
  @type("number")  vy: number = 0;
  @type("number")  lives: number = 3;
  @type("boolean") isAlive: boolean = true;
  @type("string")  powerUp: string = "none"; // "none"|"big"|"fire"|"star"
  @type("boolean") facingRight: boolean = true;
  @type("boolean") isOnGround: boolean = false;
  @type("number")  invincibleTicks: number = 0;
  @type("number")  spawnX: number = 0;
  @type("number")  spawnY: number = 0;
}
```

- [ ] **Step 4: Write EnemyState schema**

`packages/shared/src/schemas/EnemyState.ts`:
```typescript
import { Schema, type } from "@colyseus/schema";

export class EnemyState extends Schema {
  @type("string")  id: string = "";
  @type("string")  type: string = "goomba"; // "goomba"|"koopa"|"piranha"|"bulletbill"
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  vx: number = 0;
  @type("boolean") isAlive: boolean = true;
  @type("boolean") isShell: boolean = false;       // Koopa shell mode
  @type("number")  piranhaTimer: number = 0;
  @type("boolean") piranhaVisible: boolean = true;
}
```

- [ ] **Step 5: Write PowerUpState schema**

`packages/shared/src/schemas/PowerUpState.ts`:
```typescript
import { Schema, type } from "@colyseus/schema";

export class PowerUpState extends Schema {
  @type("string")  id: string = "";
  @type("string")  type: string = "mushroom"; // "mushroom"|"flower"|"star"
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("boolean") isActive: boolean = true;
  @type("number")  respawnTicks: number = 0;
}
```

- [ ] **Step 6: Write GameState root schema**

`packages/shared/src/schemas/GameState.ts`:
```typescript
import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { EnemyState } from "./EnemyState";
import { PowerUpState } from "./PowerUpState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players  = new MapSchema<PlayerState>();
  @type({ map: EnemyState })  enemies  = new MapSchema<EnemyState>();
  @type({ map: PowerUpState }) powerUps = new MapSchema<PowerUpState>();
  @type("number") levelIndex:  number = 0;
  @type("string") matchPhase:  string = "playing"; // "playing"|"ended"|"voting"
  @type("string") winnerId:    string = "";
  @type("number") voteTimer:   number = 0;
}
```

- [ ] **Step 7: Write index re-export**

`packages/shared/src/index.ts`:
```typescript
export * from "./constants";
export * from "./messages";
export * from "./schemas/PlayerState";
export * from "./schemas/EnemyState";
export * from "./schemas/PowerUpState";
export * from "./schemas/GameState";
```

- [ ] **Step 8: Type-check**

```bash
pnpm --filter @mpmario/shared typecheck
```

Expected: exits 0, no errors.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/
git commit -m "feat: shared schemas, message types, and game constants"
```

---

## Task 3: Server — Entry Point + LobbyRoom

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/rooms/LobbyRoom.ts`
- Test: `packages/server/src/__tests__/LobbyRoom.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/server/src/__tests__/LobbyRoom.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ColyseusTestServer } from "@colyseus/testing";
import { Server } from "colyseus";
import { LobbyRoom } from "../rooms/LobbyRoom";
import { GameRoom } from "../rooms/GameRoom";
import { MSG_GAME_READY } from "@mpmario/shared";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  const gameServer = new Server();
  gameServer.define("lobby", LobbyRoom);
  gameServer.define("game", GameRoom);
  colyseus = await ColyseusTestServer.boot(gameServer);
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe("LobbyRoom", () => {
  it("broadcasts game_ready when MIN_PLAYERS (2) join", async () => {
    const room = await colyseus.createRoom("lobby", {});
    let receivedRoomId: string | null = null;

    const c1 = await colyseus.connectTo(room);
    c1.onMessage(MSG_GAME_READY, (msg: { roomId: string }) => {
      receivedRoomId = msg.roomId;
    });

    const c2 = await colyseus.connectTo(room);

    await new Promise<void>(resolve => setTimeout(resolve, 100));
    expect(receivedRoomId).not.toBeNull();

    c1.leave();
    c2.leave();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — "Cannot find module" for LobbyRoom / GameRoom.

- [ ] **Step 3: Create a stub GameRoom so LobbyRoom test can run**

`packages/server/src/rooms/GameRoom.ts` (stub — will be replaced in Task 8):
```typescript
import { Room } from "colyseus";
import { GameState } from "@mpmario/shared";

export class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());
  }
}
```

- [ ] **Step 4: Write LobbyRoom**

`packages/server/src/rooms/LobbyRoom.ts`:
```typescript
import { Room, Client, matchMaker } from "colyseus";
import { MIN_PLAYERS, MAX_PLAYERS, MSG_GAME_READY } from "@mpmario/shared";

export class LobbyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private queue: string[] = [];

  onCreate() {}

  onJoin(client: Client) {
    this.queue.push(client.sessionId);
    if (this.queue.length >= MIN_PLAYERS) {
      this.startGame();
    }
  }

  onLeave(client: Client) {
    this.queue = this.queue.filter(id => id !== client.sessionId);
  }

  private async startGame() {
    const room = await matchMaker.createRoom("game", { levelIndex: 0 });
    this.broadcast(MSG_GAME_READY, { roomId: room.roomId });
  }
}
```

- [ ] **Step 5: Write server entry point**

`packages/server/src/index.ts`:
```typescript
import { Server } from "colyseus";
import http from "http";
import express from "express";
import cors from "cors";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT ?? 2567);
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define("lobby", LobbyRoom);
gameServer.define("game", GameRoom);

gameServer.listen(port).then(() => {
  console.log(`Server listening on port ${port}`);
});
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm --filter @mpmario/server test
```

Expected: PASS — `LobbyRoom › broadcasts game_ready when MIN_PLAYERS (2) join`

- [ ] **Step 7: Verify server starts**

```bash
cd packages/server && npx tsx src/index.ts &
sleep 2 && curl http://localhost:2567/health
kill %1
```

Expected: `{"ok":true}`

- [ ] **Step 8: Commit**

```bash
git add packages/server/
git commit -m "feat: server entry point and LobbyRoom with matchmaking"
```

---

## Task 4: Server — LevelLoader

**Files:**
- Create: `packages/server/src/game/LevelLoader.ts`
- Create: `levels/level1.json` (minimal fixture used by tests and game)
- Test: `packages/server/src/__tests__/LevelLoader.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/server/src/__tests__/LevelLoader.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — "Cannot find module '../game/LevelLoader'"

- [ ] **Step 3: Write LevelLoader**

`packages/server/src/game/LevelLoader.ts`:
```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mpmario/server test
```

Expected: all LevelLoader tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/game/LevelLoader.ts packages/server/src/__tests__/LevelLoader.test.ts
git commit -m "feat: LevelLoader parses Tiled JSON into collision map and spawn points"
```

---

## Task 5: Server — Physics

**Files:**
- Create: `packages/server/src/game/Physics.ts`
- Test: `packages/server/src/__tests__/Physics.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/server/src/__tests__/Physics.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { applyPhysics } from "../game/Physics";
import { PlayerState } from "@mpmario/shared";
import { GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, MAX_FALL_SPEED } from "@mpmario/shared";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const p = new PlayerState();
  Object.assign(p, overrides);
  return p;
}

describe("applyPhysics", () => {
  it("applies gravity when not on ground", () => {
    const p = makePlayer({ vy: 0, isOnGround: false });
    applyPhysics(p, { left: false, right: false, jump: false, attack: false });
    expect(p.vy).toBe(GRAVITY);
  });

  it("does not apply gravity when on ground", () => {
    const p = makePlayer({ vy: 0, isOnGround: true });
    applyPhysics(p, { left: false, right: false, jump: false, attack: false });
    expect(p.vy).toBe(0);
  });

  it("caps fall speed at MAX_FALL_SPEED", () => {
    const p = makePlayer({ vy: MAX_FALL_SPEED, isOnGround: false });
    applyPhysics(p, { left: false, right: false, jump: false, attack: false });
    expect(p.vy).toBe(MAX_FALL_SPEED);
  });

  it("moves left when left input is true", () => {
    const p = makePlayer({ x: 100, vx: 0 });
    applyPhysics(p, { left: true, right: false, jump: false, attack: false });
    expect(p.vx).toBe(-PLAYER_SPEED);
    expect(p.facingRight).toBe(false);
    expect(p.x).toBe(100 - PLAYER_SPEED);
  });

  it("moves right when right input is true", () => {
    const p = makePlayer({ x: 100, vx: 0 });
    applyPhysics(p, { left: false, right: true, jump: false, attack: false });
    expect(p.vx).toBe(PLAYER_SPEED);
    expect(p.facingRight).toBe(true);
  });

  it("sets jump velocity when on ground and jump pressed", () => {
    const p = makePlayer({ vy: 0, isOnGround: true });
    applyPhysics(p, { left: false, right: false, jump: true, attack: false });
    expect(p.vy).toBe(JUMP_VELOCITY);
    expect(p.isOnGround).toBe(false);
  });

  it("does not jump when already airborne", () => {
    const p = makePlayer({ vy: -5, isOnGround: false });
    applyPhysics(p, { left: false, right: false, jump: true, attack: false });
    expect(p.vy).toBe(-5 + GRAVITY); // gravity only, no additional jump
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — "Cannot find module '../game/Physics'"

- [ ] **Step 3: Write Physics**

`packages/server/src/game/Physics.ts`:
```typescript
import {
  GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, MAX_FALL_SPEED,
} from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import type { PlayerState } from "@mpmario/shared";

export function applyPhysics(player: PlayerState, input: InputMessage): void {
  // Horizontal
  if (input.left) {
    player.vx = -PLAYER_SPEED;
    player.facingRight = false;
  } else if (input.right) {
    player.vx = PLAYER_SPEED;
    player.facingRight = true;
  } else {
    player.vx = 0;
  }

  // Jump (only when grounded)
  if (input.jump && player.isOnGround) {
    player.vy = JUMP_VELOCITY;
    player.isOnGround = false;
  }

  // Gravity
  if (!player.isOnGround) {
    player.vy = Math.min(player.vy + GRAVITY, MAX_FALL_SPEED);
  }

  // Integrate
  player.x += player.vx;
  player.y += player.vy;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mpmario/server test
```

Expected: all Physics tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/game/Physics.ts packages/server/src/__tests__/Physics.test.ts
git commit -m "feat: server physics — gravity, velocity, jump"
```

---

## Task 6: Server — Collision

**Files:**
- Create: `packages/server/src/game/Collision.ts`
- Test: `packages/server/src/__tests__/Collision.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/server/src/__tests__/Collision.test.ts`:
```typescript
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

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
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
    // Player rising into row 0 (empty) while row 0 col 1 is solid — use a map with a ceiling block
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
    // Player at x=TILE_SIZE moving right into column 2
    const p = makePlayer({ x: TILE_SIZE, y: 0, vx: PLAYER_SPEED });
    resolvePlayerCollisions(p, WALL_MAP);
    expect(p.vx).toBe(0);
    expect(p.x).toBeLessThanOrEqual(2 * TILE_SIZE - PLAYER_WIDTH);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — "Cannot find module '../game/Collision'"

- [ ] **Step 3: Write Collision**

`packages/server/src/game/Collision.ts`:
```typescript
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
  // Y axis: falling (floor check)
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
    // Rising (ceiling check)
    const ceilY  = Math.floor(e.y / TILE_SIZE);
    const tileX1 = Math.floor(e.x / TILE_SIZE);
    const tileX2 = Math.floor((e.x + w - 1) / TILE_SIZE);
    if (isSolid(map, tileX1, ceilY) || isSolid(map, tileX2, ceilY)) {
      e.y = (ceilY + 1) * TILE_SIZE;
      e.vy = 0;
    }
  }

  // X axis
  if (e.vx > 0) {
    const wallX  = Math.floor((e.x + w) / TILE_SIZE);
    const tileYT = Math.floor(e.y / TILE_SIZE);
    const tileYB = Math.floor((e.y + h - 1) / TILE_SIZE);
    if (isSolid(map, wallX, tileYT) || isSolid(map, wallX, tileYB)) {
      e.x  = wallX * TILE_SIZE - w;
      e.vx = 0;
    }
  } else if (e.vx < 0) {
    const wallX  = Math.floor(e.x / TILE_SIZE);
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mpmario/server test
```

Expected: all Collision tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/game/Collision.ts packages/server/src/__tests__/Collision.test.ts
git commit -m "feat: AABB tile collision for players and enemies"
```

---

## Task 7: Server — Enemy AI

**Files:**
- Create: `packages/server/src/game/EnemyAI.ts`
- Test: `packages/server/src/__tests__/EnemyAI.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/server/src/__tests__/EnemyAI.test.ts`:
```typescript
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
    // Put goomba against left wall: wall is col 0 in a map with col 0 solid
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — "Cannot find module '../game/EnemyAI'"

- [ ] **Step 3: Write EnemyAI**

`packages/server/src/game/EnemyAI.ts`:
```typescript
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
  // Tile ahead (in direction of movement)
  const aheadCol   = Math.floor((nextX + (e.vx > 0 ? TILE_SIZE : 0)) / TILE_SIZE);
  const midRow     = Math.floor((e.y + TILE_SIZE / 2) / TILE_SIZE);
  // Tile below foot in front (for edge detection)
  const footAheadCol = Math.floor((nextX + (e.vx > 0 ? TILE_SIZE - 1 : 0)) / TILE_SIZE);
  const belowRow   = Math.floor((e.y + TILE_SIZE) / TILE_SIZE);

  const hitsWall  = isSolid(map, aheadCol, midRow);
  const noFloor   = !isSolid(map, footAheadCol, belowRow);

  if (hitsWall || noFloor) {
    e.vx = -e.vx;
  } else {
    e.x = nextX;
  }

  if (e.vx === 0) e.vx = speed; // un-stall
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @mpmario/server test
```

Expected: all EnemyAI tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/game/EnemyAI.ts packages/server/src/__tests__/EnemyAI.test.ts
git commit -m "feat: enemy AI — goomba/koopa walking, piranha cycling, shell mode"
```

---

## Task 8: Server — GameRoom (full)

**Files:**
- Modify: `packages/server/src/rooms/GameRoom.ts` (replaces stub)
- Test: `packages/server/src/__tests__/GameRoom.test.ts`

- [ ] **Step 1: Write the failing integration test**

`packages/server/src/__tests__/GameRoom.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ColyseusTestServer } from "@colyseus/testing";
import { Server } from "colyseus";
import { LobbyRoom } from "../rooms/LobbyRoom";
import { GameRoom } from "../rooms/GameRoom";
import { MSG_WINNER } from "@mpmario/shared";

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  const gameServer = new Server();
  gameServer.define("lobby", LobbyRoom);
  gameServer.define("game", GameRoom);
  colyseus = await ColyseusTestServer.boot(gameServer);
});

afterAll(async () => colyseus.shutdown());

describe("GameRoom", () => {
  it("assigns spawn positions from level data when players join", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();
    const player = room.state.players.get(c1.sessionId);
    expect(player).toBeDefined();
    expect(player!.lives).toBe(3);
    expect(typeof player!.x).toBe("number");
    c1.leave();
  });

  it("emits winner message when only one player has lives", async () => {
    const room = await colyseus.createRoom("game", { levelIndex: 0 });
    const c1 = await colyseus.connectTo(room);
    const c2 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    let winnerId = "";
    c1.onMessage(MSG_WINNER, (msg: { winnerId: string }) => { winnerId = msg.winnerId; });

    // Force player2 to lose all lives
    const p2 = room.state.players.get(c2.sessionId)!;
    p2.lives = 0;
    (room as any).checkWinCondition();

    await new Promise<void>(r => setTimeout(r, 100));
    expect(winnerId).toBe(c1.sessionId);

    c1.leave();
    c2.leave();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @mpmario/server test
```

Expected: FAIL — test for spawn positions fails because stub GameRoom doesn't load level or assign spawns.

- [ ] **Step 3: Write full GameRoom**

`packages/server/src/rooms/GameRoom.ts`:
```typescript
import { Room, Client, matchMaker } from "colyseus";
import {
  GameState, PlayerState, EnemyState, PowerUpState,
  LIVES_PER_PLAYER, SERVER_TICK_MS, MAX_PLAYERS,
  MSG_INPUT, MSG_WINNER, MSG_VOTE,
  RESPAWN_INVINCIBILITY_TICKS, VOTE_DURATION_S, MATCH_END_DELAY_MS,
  ENEMY_SPEED, POWERUP_RESPAWN_TICKS,
} from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import { LevelLoader, LevelData } from "../game/LevelLoader";
import { applyPhysics } from "../game/Physics";
import { resolvePlayerCollisions, resolveEnemyCollisions } from "../game/Collision";
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

    this.onMessage(MSG_INPUT, (client, msg: InputMessage) => {
      this.inputs.set(client.sessionId, msg);
    });
    this.onMessage(MSG_VOTE, (client, { levelIndex }: { levelIndex: number }) => {
      this.votes.set(client.sessionId, levelIndex);
    });

    this.clock.setInterval(() => this.tick(), SERVER_TICK_MS);
  }

  onJoin(client: Client) {
    const p = new PlayerState();
    p.id = client.sessionId;
    p.lives = LIVES_PER_PLAYER;
    const spawn = this.levelData.spawns[this.state.players.size % Math.max(this.levelData.spawns.length, 1)];
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
    if (player.y > this.levelData.heightTiles * 32) { // fell below map
      this.eliminatePlayer(player, null);
    }
  }

  private resolveEntityCollisions() {
    this.state.players.forEach((attacker, attackerId) => {
      if (!attacker.isAlive || attacker.invincibleTicks > 0) return;

      // Player vs player (stomp)
      this.state.players.forEach((victim, victimId) => {
        if (attackerId === victimId || !victim.isAlive || victim.invincibleTicks > 0) return;
        if (this.overlaps(attacker, victim, 14, 16)) {
          // Attacker lands on top of victim
          if (attacker.vy > 0 && attacker.y + 16 <= victim.y + 4) {
            this.eliminatePlayer(victim, attackerId);
            attacker.vy = -6; // bounce
          }
        }
      });

      // Player vs enemy
      this.state.enemies.forEach((enemy) => {
        if (!enemy.isAlive) return;
        if (this.overlaps(attacker, enemy, 14, 16)) {
          if (attacker.vy > 0 && attacker.y + 16 <= enemy.y + 4) {
            // Stomp enemy
            if (enemy.type === "koopa" && !enemy.isShell) {
              enemy.isShell = true;
              enemy.vx = 0;
            } else {
              enemy.isAlive = false;
            }
            attacker.vy = -6;
          } else if (enemy.piranhaVisible !== false) {
            // Enemy hurts player
            this.eliminatePlayer(attacker, null);
          }
        }
      });

      // Player vs power-up
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
    if (this.state.players.size >= 2 && alive.length <= 1) {
      this.state.matchPhase = "ended";
      this.state.winnerId = alive[0]?.id ?? "";
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
    const room = await matchMaker.createRoom("game", { levelIndex: nextLevel });
    this.broadcast(MSG_GAME_READY, { roomId: room.roomId });
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
```

The import line for GameRoom.ts must include `MSG_GAME_READY`:
```typescript
import {
  GameState, PlayerState, EnemyState, PowerUpState,
  LIVES_PER_PLAYER, SERVER_TICK_MS, MAX_PLAYERS,
  MSG_INPUT, MSG_WINNER, MSG_VOTE, MSG_GAME_READY,
  RESPAWN_INVINCIBILITY_TICKS, VOTE_DURATION_S, MATCH_END_DELAY_MS,
  ENEMY_SPEED, POWERUP_RESPAWN_TICKS,
} from "@mpmario/shared";
```

- [ ] **Step 4: Run all server tests**

```bash
pnpm --filter @mpmario/server test
```

Expected: all tests PASS (Physics, Collision, EnemyAI, LobbyRoom, GameRoom).

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/rooms/GameRoom.ts packages/server/src/__tests__/GameRoom.test.ts
git commit -m "feat: full GameRoom with authoritative game loop, win detection, and vote"
```

---

## Task 9: Shared + Server — Fireball Projectiles

The Fire Flower power-up's attack is a projectile that travels horizontally, bounces once off the floor, and eliminates players/enemies on contact. This needs state in the shared schemas and logic in GameRoom.

**Files:**
- Create: `packages/shared/src/schemas/FireballState.ts`
- Modify: `packages/shared/src/schemas/GameState.ts` (add fireballs MapSchema)
- Modify: `packages/shared/src/index.ts` (export FireballState)
- Modify: `packages/server/src/rooms/GameRoom.ts` (spawn + tick fireballs)

- [ ] **Step 1: Write FireballState schema**

`packages/shared/src/schemas/FireballState.ts`:
```typescript
import { Schema, type } from "@colyseus/schema";

export class FireballState extends Schema {
  @type("string")  id: string = "";
  @type("string")  ownerId: string = "";   // sessionId of the player who fired it
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  vx: number = 0;
  @type("number")  vy: number = 0;
  @type("boolean") isAlive: boolean = true;
}
```

- [ ] **Step 2: Add fireballs to GameState**

In `packages/shared/src/schemas/GameState.ts`, add:
```typescript
import { FireballState } from "./FireballState";

export class GameState extends Schema {
  @type({ map: PlayerState })   players   = new MapSchema<PlayerState>();
  @type({ map: EnemyState })    enemies   = new MapSchema<EnemyState>();
  @type({ map: PowerUpState })  powerUps  = new MapSchema<PowerUpState>();
  @type({ map: FireballState }) fireballs = new MapSchema<FireballState>();
  @type("number") levelIndex:  number = 0;
  @type("string") matchPhase:  string = "playing";
  @type("string") winnerId:    string = "";
  @type("number") voteTimer:   number = 0;
}
```

- [ ] **Step 3: Export FireballState from shared index**

In `packages/shared/src/index.ts`, add:
```typescript
export * from "./schemas/FireballState";
```

- [ ] **Step 4: Add fireball spawning and ticking to GameRoom**

Add to the `tick()` method in `GameRoom.ts` (after `resolveEntityCollisions()`):
```typescript
this.tickFireballs();
```

Add these methods to `GameRoom`:
```typescript
private fireballCounter = 0;

private spawnFireball(player: PlayerState) {
  const fb = new FireballState();
  fb.id      = `fb_${this.fireballCounter++}`;
  fb.ownerId = player.id;
  fb.x       = player.x;
  fb.y       = player.y;
  fb.vx      = player.facingRight ? FIREBALL_SPEED : -FIREBALL_SPEED;
  fb.vy      = 0;
  this.state.fireballs.set(fb.id, fb);
}

private tickFireballs() {
  this.state.fireballs.forEach((fb, id) => {
    if (!fb.isAlive) { this.state.fireballs.delete(id); return; }

    // Physics
    fb.vy = Math.min(fb.vy + FIREBALL_GRAVITY, MAX_FALL_SPEED);
    fb.x += fb.vx;
    fb.y += fb.vy;

    // Tile collision: bounce off floor, die on wall/ceiling
    const tileX = Math.floor(fb.x / TILE_SIZE);
    const tileY = Math.floor((fb.y + 8) / TILE_SIZE);
    if (isSolid(this.levelData.collisionMap, tileX, tileY)) {
      if (fb.vy > 0) {
        fb.y  = tileY * TILE_SIZE - 8;
        fb.vy = -6; // bounce
      } else {
        fb.isAlive = false;
        return;
      }
    }

    // Out of bounds
    if (fb.x < 0 || fb.x > this.levelData.widthTiles * TILE_SIZE) {
      fb.isAlive = false;
      return;
    }

    // Hit enemies
    this.state.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      if (Math.abs(enemy.x - fb.x) < 16 && Math.abs(enemy.y - fb.y) < 16) {
        enemy.isAlive = false;
        fb.isAlive    = false;
      }
    });

    // Hit other players (not owner)
    this.state.players.forEach((target, tid) => {
      if (tid === fb.ownerId || !target.isAlive || target.invincibleTicks > 0) return;
      if (Math.abs(target.x - fb.x) < 14 && Math.abs(target.y - fb.y) < 16) {
        this.eliminatePlayer(target, fb.ownerId);
        fb.isAlive = false;
      }
    });
  });
}
```

Add `FIREBALL_SPEED`, `FIREBALL_GRAVITY`, `MAX_FALL_SPEED`, `TILE_SIZE` to the imports in `GameRoom.ts`, and also `import { isSolid } from "../game/Collision"`.

In `tick()`, when processing player attack input, check for fire:
```typescript
// Inside the players.forEach loop, after resolvePlayerCollisions:
if (input.attack && player.powerUp === "fire") {
  this.spawnFireball(player);
}
```

Add `FireballState` to the GameRoom import from `@mpmario/shared`.

- [ ] **Step 5: Re-run all server tests**

```bash
pnpm --filter @mpmario/server test
```

Expected: all tests still PASS (fireball logic has no dedicated test — it's covered by the GameRoom integration test which verifies the room state initialises without errors).

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/schemas/FireballState.ts packages/shared/src/schemas/GameState.ts packages/shared/src/index.ts packages/server/src/rooms/GameRoom.ts
git commit -m "feat: fireball projectile — state schema, physics, bounce, and hit detection"
```

---

## Task 10: Level Content (3 Tiled JSON files)  <!-- renumbered from 9 -->

**Files:**
- Create: `levels/level1.json`
- Create: `levels/level2.json`
- Create: `levels/level3.json`

Each level is 60 tiles wide × 15 tiles tall (960×240 px at 16px/tile). The `collision` tilelayer uses `1` for solid, `0` for empty. The `objects` layer places spawns, enemies, and power-ups.

- [ ] **Step 1: Generate level1.json**

Run the following Node.js snippet once to generate it:

```bash
node -e "
const W = 60, H = 15;
// Bottom 2 rows solid (ground), plus some platform tiles
const data = Array(W * H).fill(0);
// Ground rows 13 and 14 (y=13,14)
for (let x = 0; x < W; x++) { data[13*W+x] = 1; data[14*W+x] = 1; }
// Platforms
[[10,10],[11,10],[15,8],[16,8],[20,10],[21,10],[22,10],[30,6],[31,6],[32,6],
 [40,10],[41,10],[45,8],[46,8],[50,10],[51,10],[52,10]].forEach(([x,y])=>data[y*W+x]=1);
// Walls on edges
for (let y=0;y<H;y++){data[y*W]=1;data[y*W+W-1]=1;}
const level = {
  height:H,width:W,tilewidth:16,tileheight:16,
  layers:[
    {name:'collision',type:'tilelayer',x:0,y:0,width:W,height:H,data},
    {name:'objects',type:'objectgroup',objects:[
      {id:1,type:'spawn',name:'s1',x:32,y:192},{id:2,type:'spawn',name:'s2',x:192,y:192},
      {id:3,type:'spawn',name:'s3',x:736,y:192},{id:4,type:'spawn',name:'s4',x:864,y:192},
      {id:5,type:'goomba',name:'',x:320,y:192},{id:6,type:'goomba',name:'',x:480,y:192},
      {id:7,type:'koopa',name:'',x:560,y:192},{id:8,type:'goomba',name:'',x:640,y:192},
      {id:9,type:'mushroom',name:'',x:400,y:160},{id:10,type:'flower',name:'',x:500,y:160},
      {id:11,type:'star',name:'',x:300,y:80}
    ]}
  ]
};
require('fs').writeFileSync('levels/level1.json', JSON.stringify(level, null, 2));
console.log('level1.json written');
"
```

- [ ] **Step 2: Generate level2.json (vertical platforms)**

```bash
node -e "
const W = 60, H = 15;
const data = Array(W * H).fill(0);
// Ground
for (let x=0;x<W;x++){data[14*W+x]=1;data[13*W+x]=1;}
// Staircase platforms going up
[[5,12],[6,12],[10,10],[11,10],[12,10],[15,8],[16,8],[17,8],[18,8],
 [20,6],[21,6],[22,6],[25,4],[26,4],[30,10],[31,10],[32,10],[33,10],
 [35,8],[36,8],[40,6],[41,6],[42,6],[45,4],[46,4],[47,4],[50,10],[51,10]].forEach(([x,y])=>data[y*W+x]=1);
for (let y=0;y<H;y++){data[y*W]=1;data[y*W+W-1]=1;}
const level = {
  height:H,width:W,tilewidth:16,tileheight:16,
  layers:[
    {name:'collision',type:'tilelayer',x:0,y:0,width:W,height:H,data},
    {name:'objects',type:'objectgroup',objects:[
      {id:1,type:'spawn',name:'s1',x:48,y:192},{id:2,type:'spawn',name:'s2',x:160,y:192},
      {id:3,type:'spawn',name:'s3',x:800,y:192},{id:4,type:'spawn',name:'s4',x:880,y:192},
      {id:5,type:'koopa',name:'',x:300,y:192},{id:6,type:'koopa',name:'',x:450,y:192},
      {id:7,type:'goomba',name:'',x:550,y:192},{id:8,type:'koopa',name:'',x:650,y:192},
      {id:9,type:'flower',name:'',x:380,y:160},{id:10,type:'star',name:'',x:480,y:80},
      {id:11,type:'mushroom',name:'',x:250,y:160}
    ]}
  ]
};
require('fs').writeFileSync('levels/level2.json', JSON.stringify(level, null, 2));
console.log('level2.json written');
"
```

- [ ] **Step 3: Generate level3.json (arena with pits)**

```bash
node -e "
const W = 60, H = 15;
const data = Array(W * H).fill(0);
// Islands separated by pits (no ground tiles in gap areas)
const segments = [[0,14],[1,14],[2,14],[3,14],[4,14],[5,14],[6,14],[7,14], // left island
  [10,14],[11,14],[12,14],[13,14],[14,14],[15,14],[16,14],[17,14],[18,14],
  [21,14],[22,14],[23,14],[24,14],[25,14],[26,14],[27,14],[28,14],[29,14],
  [32,14],[33,14],[34,14],[35,14],[36,14],[37,14],[38,14],[39,14],[40,14],
  [43,14],[44,14],[45,14],[46,14],[47,14],[48,14],[49,14],[50,14],
  [53,14],[54,14],[55,14],[56,14],[57,14],[58,14],[59,14],
  // upper platforms
  [5,10],[6,10],[7,10],[8,10],[15,8],[16,8],[17,8],[25,10],[26,10],[27,10],
  [35,8],[36,8],[37,8],[45,10],[46,10],[47,10],[52,8],[53,8]];
segments.forEach(([x,y])=>data[y*W+x]=1);
// Add row 13 for ground thickness
segments.filter(([,y])=>y===14).forEach(([x])=>data[13*W+x]=1);
// Side walls
for (let y=0;y<H;y++){data[y*W]=1;data[y*W+W-1]=1;}
const level = {
  height:H,width:W,tilewidth:16,tileheight:16,
  layers:[
    {name:'collision',type:'tilelayer',x:0,y:0,width:W,height:H,data},
    {name:'objects',type:'objectgroup',objects:[
      {id:1,type:'spawn',name:'s1',x:48,y:192},{id:2,type:'spawn',name:'s2',x:192,y:192},
      {id:3,type:'spawn',name:'s3',x:720,y:192},{id:4,type:'spawn',name:'s4',x:864,y:192},
      {id:5,type:'goomba',name:'',x:280,y:192},{id:6,type:'koopa',name:'',x:420,y:192},
      {id:7,type:'goomba',name:'',x:560,y:192},{id:8,type:'koopa',name:'',x:700,y:192},
      {id:9,type:'star',name:'',x:460,y:144},{id:10,type:'mushroom',name:'',x:250,y:160},
      {id:11,type:'flower',name:'',x:580,y:160}
    ]}
  ]
};
require('fs').writeFileSync('levels/level3.json', JSON.stringify(level, null, 2));
console.log('level3.json written');
"
```

- [ ] **Step 4: Verify levels parse correctly**

```bash
node -e "
const { LevelLoader } = require('./packages/server/src/game/LevelLoader');
// Quick parse check using tsx
"
```

Instead, run the server tests which test LevelLoader.load():
```bash
pnpm --filter @mpmario/server test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add levels/
git commit -m "feat: three hand-crafted levels as Tiled JSON exports"
```

---

## Task 11: Client — Vite + Phaser Boot

**Files:**
- Create: `packages/client/index.html`
- Create: `packages/client/src/main.ts`
- Create: `packages/client/src/scenes/BootScene.ts`
- Create: `packages/client/src/scenes/LobbyScene.ts` (stub)
- Create: `packages/client/src/scenes/GameScene.ts` (stub)
- Create: `packages/client/src/scenes/VoteScene.ts` (stub)

- [ ] **Step 1: Create index.html**

`packages/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>mpMario</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { display: block; }
  </style>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create stub scenes**

`packages/client/src/scenes/LobbyScene.ts`:
```typescript
export class LobbyScene extends Phaser.Scene {
  constructor() { super({ key: "LobbyScene" }); }
  create() { this.add.text(10, 10, "Lobby — connecting…", { color: "#fff" }); }
}
```

`packages/client/src/scenes/GameScene.ts`:
```typescript
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: "GameScene" }); }
  create() { this.add.text(10, 10, "Game", { color: "#fff" }); }
}
```

`packages/client/src/scenes/VoteScene.ts`:
```typescript
export class VoteScene extends Phaser.Scene {
  constructor() { super({ key: "VoteScene" }); }
  create() { this.add.text(10, 10, "Vote", { color: "#fff" }); }
}
```

- [ ] **Step 3: Create BootScene (generates textures, starts LobbyScene)**

`packages/client/src/scenes/BootScene.ts`:
```typescript
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: "BootScene" }); }

  create() {
    this.generateTextures();
    this.scene.start("LobbyScene");
  }

  private generateTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Player colours (one per player slot)
    const playerColors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12];
    playerColors.forEach((color, i) => {
      g.clear();
      g.fillStyle(color);
      g.fillRect(0, 0, 14, 16);
      g.generateTexture(`player_${i}`, 14, 16);
    });

    // Big player (2x height)
    playerColors.forEach((color, i) => {
      g.clear();
      g.fillStyle(color);
      g.fillRect(0, 0, 14, 32);
      g.generateTexture(`player_big_${i}`, 14, 32);
    });

    // Enemies
    g.clear(); g.fillStyle(0x8B4513); g.fillRect(0,0,16,16);
    g.generateTexture("goomba", 16, 16);

    g.clear(); g.fillStyle(0x27ae60); g.fillRect(0,0,16,16);
    g.generateTexture("koopa", 16, 16);

    g.clear(); g.fillStyle(0xc0392b); g.fillRect(0,0,16,24);
    g.generateTexture("piranha", 16, 24);

    g.clear(); g.fillStyle(0x7f8c8d); g.fillRect(0,0,20,14);
    g.generateTexture("bulletbill", 20, 14);

    g.clear(); g.fillStyle(0x27ae60); g.fillRect(0,0,16,16);
    g.generateTexture("shell", 16, 16);

    // Power-ups
    g.clear(); g.fillStyle(0xe74c3c); g.fillRect(0,0,16,16);
    g.generateTexture("mushroom", 16, 16);

    g.clear(); g.fillStyle(0xff6600); g.fillRect(0,0,16,16);
    g.generateTexture("flower", 16, 16);

    g.clear(); g.fillStyle(0xf1c40f); g.fillRect(0,0,16,16);
    g.generateTexture("star", 16, 16);

    // Tiles
    g.clear(); g.fillStyle(0x8B6914); g.fillRect(0,0,16,16);
    g.lineStyle(1, 0x5D4A0F); g.strokeRect(0,0,16,16);
    g.generateTexture("tile_solid", 16, 16);

    g.clear(); g.fillStyle(0x87CEEB); g.fillRect(0,0,16,16);
    g.generateTexture("tile_sky", 16, 16);

    g.destroy();
  }
}
```

- [ ] **Step 4: Create main.ts**

`packages/client/src/main.ts`:
```typescript
import Phaser from "phaser";
import { BootScene }  from "./scenes/BootScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene }  from "./scenes/GameScene";
import { VoteScene }  from "./scenes/VoteScene";

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 240,
  zoom: 2,
  backgroundColor: "#87CEEB",
  scene: [BootScene, LobbyScene, GameScene, VoteScene],
});
```

- [ ] **Step 5: Start Vite dev server and verify game canvas renders**

```bash
pnpm --filter @mpmario/client dev
```

Open `http://localhost:3000` in a browser. Expected: blue sky background canvas (960×240 scaled ×2), "Lobby — connecting…" text visible.

- [ ] **Step 6: Commit**

```bash
git add packages/client/
git commit -m "feat: Vite + Phaser 3 client scaffold with generated placeholder textures"
```

---

## Task 12: Client — NetworkManager

**Files:**
- Create: `packages/client/src/network/NetworkManager.ts`

- [ ] **Step 1: Write NetworkManager**

`packages/client/src/network/NetworkManager.ts`:
```typescript
import { Client, Room } from "colyseus.js";
import { GameState } from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import { MSG_INPUT, MSG_GAME_READY, MSG_WINNER, MSG_VOTE } from "@mpmario/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

export class NetworkManager {
  private client: Client;
  private lobbyRoom: Room | null = null;
  private gameRoom: Room<GameState> | null = null;

  onGameReady?: (roomId: string) => void;
  onStateChange?: (state: GameState) => void;
  onWinner?: (winnerId: string) => void;

  constructor() {
    this.client = new Client(SERVER_URL);
  }

  async joinLobby(): Promise<void> {
    this.lobbyRoom = await this.client.join("lobby");
    this.lobbyRoom.onMessage(MSG_GAME_READY, ({ roomId }: { roomId: string }) => {
      this.onGameReady?.(roomId);
    });
  }

  async joinGame(roomId: string): Promise<void> {
    await this.lobbyRoom?.leave();
    this.lobbyRoom = null;
    this.gameRoom = await this.client.joinById<GameState>(roomId);
    this.gameRoom.onStateChange(state => this.onStateChange?.(state));
    this.gameRoom.onMessage(MSG_GAME_READY, ({ roomId }: { roomId: string }) => {
      this.onGameReady?.(roomId);
    });
    this.gameRoom.onMessage(MSG_WINNER, ({ winnerId }: { winnerId: string }) => {
      this.onWinner?.(winnerId);
    });
  }

  sendInput(msg: InputMessage): void {
    this.gameRoom?.send(MSG_INPUT, msg);
  }

  sendVote(levelIndex: number): void {
    this.gameRoom?.send(MSG_VOTE, { levelIndex });
  }

  get sessionId(): string {
    return this.gameRoom?.sessionId ?? "";
  }

  get currentState(): GameState | null {
    return this.gameRoom?.state ?? null;
  }

  disconnect(): void {
    this.gameRoom?.leave();
    this.lobbyRoom?.leave();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/network/
git commit -m "feat: NetworkManager wraps colyseus.js client with typed callbacks"
```

---

## Task 13: Client — InputHandler

**Files:**
- Create: `packages/client/src/input/InputHandler.ts`

- [ ] **Step 1: Write InputHandler**

`packages/client/src/input/InputHandler.ts`:
```typescript
import type { InputMessage } from "@mpmario/shared";

export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.cursors    = scene.input.keyboard!.createCursorKeys();
    this.attackKey  = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  }

  getInputMessage(): InputMessage {
    return {
      left:   this.cursors.left.isDown,
      right:  this.cursors.right.isDown,
      jump:   this.cursors.up.isDown || this.cursors.space.isDown,
      attack: this.attackKey.isDown,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/input/
git commit -m "feat: InputHandler reads Phaser cursor + Z-key state each frame"
```

---

## Task 14: Client — StateRenderer + Interpolator

**Files:**
- Create: `packages/client/src/rendering/Interpolator.ts`
- Create: `packages/client/src/rendering/StateRenderer.ts`

- [ ] **Step 1: Write Interpolator**

`packages/client/src/rendering/Interpolator.ts`:
```typescript
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Vec2 { x: number; y: number; }

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}
```

- [ ] **Step 2: Write StateRenderer**

`packages/client/src/rendering/StateRenderer.ts`:
```typescript
import { GameState, PlayerState, EnemyState, PowerUpState } from "@mpmario/shared";
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
  private playerIndex = new Map<string, number>(); // sessionId → colour slot

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
        const textureKey = id === this.sessionId ? `player_${idx}` : `player_${idx}`;
        const sprite = this.scene.add.image(player.x, player.y, textureKey).setOrigin(0, 0);
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
    // Remove sprites for disconnected players
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
        // Generate fireball texture once if not present
        if (!this.scene.textures.exists("fireball")) {
          const g = this.scene.make.graphics({ add: false });
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/rendering/
git commit -m "feat: StateRenderer applies server state to Phaser sprites with interpolation"
```

---

## Task 15: Client — GameScene (full)

**Files:**
- Modify: `packages/client/src/scenes/GameScene.ts`

- [ ] **Step 1: Write full GameScene**

`packages/client/src/scenes/GameScene.ts`:
```typescript
import { NetworkManager } from "../network/NetworkManager";
import { InputHandler }   from "../input/InputHandler";
import { StateRenderer }  from "../rendering/StateRenderer";
import { GameState }      from "@mpmario/shared";
import { SERVER_TICK_MS } from "@mpmario/shared";

interface GameSceneData { network: NetworkManager; levelIndex: number; }

export class GameScene extends Phaser.Scene {
  private network!: NetworkManager;
  private input!: InputHandler;
  private renderer!: StateRenderer;
  private lastState: GameState | null = null;
  private lastTickTime = 0;
  private livesTexts = new Map<string, Phaser.GameObjects.Text>();

  constructor() { super({ key: "GameScene" }); }

  init(data: GameSceneData) {
    this.network = data.network;
  }

  create(data: GameSceneData) {
    this.input    = new InputHandler(this);
    this.renderer = new StateRenderer(this, this.network.sessionId);
    this.lastTickTime = Date.now();

    this.network.onStateChange = (state) => {
      this.lastState    = state;
      this.lastTickTime = Date.now();
      this.updateHUD(state);
    };

    this.network.onWinner = (winnerId) => {
      const isMe = winnerId === this.network.sessionId;
      const msg  = isMe ? "You Win!" : "You Lose!";
      this.add.text(480, 120, msg, { fontSize: "32px", color: "#fff" }).setOrigin(0.5);
      this.time.delayedCall(3000, () => {
        this.scene.start("VoteScene", { network: this.network });
      });
    };

    this.network.onGameReady = (roomId) => {
      this.network.joinGame(roomId).then(() => {
        this.scene.restart({ network: this.network, levelIndex: 0 });
      });
    };
  }

  update() {
    const msg = this.input.getInputMessage();
    this.network.sendInput(msg);

    if (this.lastState) {
      const elapsed = Date.now() - this.lastTickTime;
      const alpha   = Math.min(elapsed / SERVER_TICK_MS, 1);
      this.renderer.apply(this.lastState, alpha);
    }
  }

  private updateHUD(state: GameState) {
    let i = 0;
    state.players.forEach((player, id) => {
      const label = id === this.network.sessionId ? `You: ${player.lives}♥` : `P${i + 1}: ${player.lives}♥`;
      if (!this.livesTexts.has(id)) {
        this.livesTexts.set(id, this.add.text(10, 10 + i * 18, label, { fontSize: "14px", color: "#fff" }).setScrollFactor(0));
      }
      this.livesTexts.get(id)!.setText(label);
      i++;
    });
  }

  shutdown() {
    this.renderer?.destroy();
    this.livesTexts.forEach(t => t.destroy());
    this.livesTexts.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/client/src/scenes/GameScene.ts
git commit -m "feat: full GameScene — state rendering, HUD, winner handling"
```

---

## Task 16: Client — LobbyScene + VoteScene

**Files:**
- Modify: `packages/client/src/scenes/LobbyScene.ts`
- Modify: `packages/client/src/scenes/VoteScene.ts`

- [ ] **Step 1: Write full LobbyScene**

`packages/client/src/scenes/LobbyScene.ts`:
```typescript
import { NetworkManager } from "../network/NetworkManager";

export class LobbyScene extends Phaser.Scene {
  private network!: NetworkManager;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super({ key: "LobbyScene" }); }

  create() {
    this.add.rectangle(480, 120, 960, 240, 0x1a1a2e).setOrigin(0.5);
    this.add.text(480, 60, "mpMario", { fontSize: "36px", color: "#e74c3c", fontStyle: "bold" }).setOrigin(0.5);
    this.statusText = this.add.text(480, 120, "Connecting…", { fontSize: "18px", color: "#ecf0f1" }).setOrigin(0.5);
    this.add.text(480, 180, "Waiting for players…", { fontSize: "14px", color: "#7f8c8d" }).setOrigin(0.5);

    this.network = new NetworkManager();
    this.network.onGameReady = async (roomId) => {
      this.statusText.setText("Game found! Joining…");
      await this.network.joinGame(roomId);
      this.scene.start("GameScene", { network: this.network });
    };

    this.network.joinLobby()
      .then(() => { this.statusText.setText("In queue — waiting for opponent…"); })
      .catch((err) => { this.statusText.setText(`Connection failed: ${err.message}`); });
  }
}
```

- [ ] **Step 2: Write full VoteScene**

`packages/client/src/scenes/VoteScene.ts`:
```typescript
import { NetworkManager } from "../network/NetworkManager";

interface VoteSceneData { network: NetworkManager; }

export class VoteScene extends Phaser.Scene {
  private network!: NetworkManager;
  private timerText!: Phaser.GameObjects.Text;

  constructor() { super({ key: "VoteScene" }); }

  create(data: VoteSceneData) {
    this.network = data.network;
    this.add.rectangle(480, 120, 960, 240, 0x1a1a2e).setOrigin(0.5);
    this.add.text(480, 30, "Vote for next level", { fontSize: "22px", color: "#fff" }).setOrigin(0.5);
    this.timerText = this.add.text(480, 200, "15s", { fontSize: "18px", color: "#e74c3c" }).setOrigin(0.5);

    const labels = ["Level 1 — Classic", "Level 2 — Stairs", "Level 3 — Islands"];
    labels.forEach((label, i) => {
      const btn = this.add.text(480, 80 + i * 36, label, {
        fontSize: "16px", color: "#ecf0f1",
        backgroundColor: "#2c3e50", padding: { x: 16, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => {
        this.network.sendVote(i);
        btn.setColor("#2ecc71"); // highlight selected button
      });
    });

    // Listen for next game_ready to auto-transition
    this.network.onGameReady = async (roomId) => {
      await this.network.joinGame(roomId);
      this.scene.start("GameScene", { network: this.network });
    };

    // Count down from server voteTimer via state
    this.network.onStateChange = (state) => {
      this.timerText.setText(`${state.voteTimer}s`);
    };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/scenes/LobbyScene.ts packages/client/src/scenes/VoteScene.ts
git commit -m "feat: LobbyScene matchmaking UI and VoteScene level selection"
```

---

## Task 17: End-to-End Wiring + Process Doc

**Files:**
- Create: `docs/research/process-log.md`
- Verify full game flow works end-to-end

- [ ] **Step 1: Start server in one terminal**

```bash
pnpm --filter @mpmario/server dev
```

Expected: `Server listening on port 2567`

- [ ] **Step 2: Start client in another terminal**

```bash
pnpm --filter @mpmario/client dev
```

Expected: `http://localhost:3000` opens with "mpMario" title screen.

- [ ] **Step 3: Open two browser tabs to http://localhost:3000**

Both tabs should show "In queue — waiting for opponent…". Once the second tab opens, both should transition to GameScene.

Verify:
- [ ] Two coloured player rectangles appear
- [ ] Arrow keys move your player
- [ ] Player falls and lands on ground tiles
- [ ] Lives counter shows in top-left of each tab

- [ ] **Step 4: Create process log**

`docs/research/process-log.md`:
```markdown
# Research Process Log — mpMario

## Purpose

This document tracks how design and implementation decisions were made
collaboratively with Claude during the mpMario research project. The goal
is to capture observations about agentic workflows, iterative design, and
the use of superpowers tooling in practice.

---

## Session 1 — 2026-04-24

### Brainstorming phase
- Used `/brainstorming` skill to design the game interactively.
- Clarifying questions were asked one at a time via `AskUserQuestion` tool.
- Visual companion was offered but the localhost server was inaccessible
  from the host machine (containerised environment). Continued text-only.
- Architecture diagram was written to the visual companion screen dir
  (`.superpowers/brainstorm/`) even though it couldn't be viewed live.

### Key decisions and how they were made
| Decision | How |
|---|---|
| Tech stack: Phaser 3 + Colyseus | Claude proposed 3 options, user chose Option A |
| Win condition: last one alive | Multiple-choice question |
| All four combat methods | Multi-select question |
| 3 levels with rotation | Multiple-choice question |
| Public matchmaking | Multiple-choice question |

### Observations
- One-question-at-a-time flow worked well for design decisions.
- Having Claude propose 2-3 options with trade-offs was efficient; user
  validated or rejected quickly.
- The brainstorming → spec → plan pipeline produced a clear, actionable
  plan before any code was written.

---

*Add new session entries as development progresses.*
```

- [ ] **Step 5: Final commit**

```bash
git add docs/research/
git commit -m "docs: initial research process log capturing brainstorming session"
```

---

## Verification Checklist

Run this after completing all tasks:

```bash
# All server tests pass
pnpm --filter @mpmario/server test

# TypeScript compiles clean
pnpm --filter @mpmario/shared typecheck
pnpm --filter @mpmario/server build

# Manual E2E
# Terminal 1: pnpm --filter @mpmario/server dev
# Terminal 2: pnpm --filter @mpmario/client dev
# Open two tabs at http://localhost:3000
# Verify: both players appear, movement works, lives count down, winner declared
```
