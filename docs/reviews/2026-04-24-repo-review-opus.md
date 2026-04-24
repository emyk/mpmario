---
reviewer: Claude Opus 4.7 (1M context)
date: 2026-04-24
scope: Full repository review (mpmario)
branch: master @ b19e787
---

# Repo Review — mpmario

Multiplayer Mario clone (Phaser 3 + Colyseus + TypeScript, pnpm monorepo). Research project — game is the vehicle, Claude-interaction patterns are the subject. This review covers structure, architecture, code quality, testing, config/deployment, and docs.

## 1. Structure & Organization

Monorepo follows the planned spec closely. Layout is sound:
- **packages/shared** — Colyseus schemas, constants, message types. Clean separation.
- **packages/server** — Room definitions (LobbyRoom, GameRoom), game logic (Physics, Collision, EnemyAI, LevelLoader).
- **packages/client** — Phaser scenes (Boot, Lobby, Game, Vote), rendering (StateRenderer, Interpolator), networking (NetworkManager), input/audio.

Naming is consistent and predictable. Game logic is appropriately server-resident. Minor: `LevelLoader` path assumes compiled structure (`../../../../levels`), which is fragile but documented.

## 2. Architecture

**Client/server split is clean.** The authoritative-server model is well-executed:
- Server runs 60 Hz fixed tick with `applyPhysics → resolveCollisions → check win → broadcast state diff` (GameRoom.ts:68–99).
- Clients send discrete input each frame, no gameplay authority.
- State is Colyseus MapSchema (auto-diffed patches), with client-side linear interpolation to mask latency.

**Message flow** is tight and minimal — `InputMessage` (5 bools/tick), `MSG_WINNER`, `MSG_VOTE`, `MSG_GAME_READY`. No unnecessary RPC chatter.

Shared package enforces schema single-source-of-truth well. No architectural concerns.

## 3. Code Quality Hotspots

1. **GameRoom.ts:118–157 — Magic collision bounds.** Hardcoded `14, 16` (player width, height) repeated 5× across stomp, enemy stomp, power-up pickup, fireball hit detection. No centralized collision shape constant. Extract `PLAYER_COLLISION_WIDTH/HEIGHT` to `packages/shared/src/constants.ts`.

2. **GameRoom.ts:86 — Fireball cooldown magic number.** `this.fireballCooldowns.set(player.id, 10);` with inline `~167ms` comment. Not in `constants.ts` where `FIREBALL_SPEED`, `FIREBALL_GRAVITY` live. Tuning attack rate requires searching. Should be `FIREBALL_COOLDOWN_TICKS = 10`.

3. **GameRoom.ts:180–193 — `eliminatePlayer()` drops killer attribution.** Accepts `_killerId` but never uses it (underscore-prefixed). Defeats assist tracking and leaderboards. Either remove the parameter or record it.

4. **GameRoom.ts:228–242 — `resolveVote()` silent error recovery.** On room-creation failure, broadcasts `roomId: ""`. Clients attempting to join silently fail. Logs error but doesn't surface to UI. Game hangs from player perspective.

5. **StateRenderer.ts:48, 107–112 — Fireball texture generated on first use.** `if (!this.scene.textures.exists("fireball"))` generates the texture lazily inside the render loop. Wasteful; belongs in `BootScene` or `GameScene.create()`. Orange color `0xff6600` is also a magic literal.

## 4. Testing

Reasonable but incomplete:
- **Unit:** Physics, Collision, EnemyAI, LevelLoader (all under `__tests__/`).
- **Integration:** GameRoom covers spawn, pit death, respawn, winner detection.
- **Gaps:** No stomp collision test, no fireball↔enemy interaction test, no simultaneous-elimination edge case. Win-condition logic tested (GameRoom.test.ts:57–72) but only normal flow — no race conditions during vote timeout.
- **Missing E2E:** No automation of 2–4 concurrent players with overlapping inputs. Spec mentions "two browser tabs against local dev server" but nothing codified.

## 5. Config & Deployment

- **Dockerfile** (1–32): Proper layer caching (manifests before source), serves built client as static fallback. Clean.
- **railway.json** (1–12): Correct build/deploy, `/health` healthcheck. But `/health` only returns `{ ok: true }` — doesn't verify Colyseus is listening or lobby room is available. A crashed game server could still pass.
- **nixpacks.toml:** Minimal `pnpm run build`. Coexists with Dockerfile builder (railway is now Dockerfile-based per commit `4c48920`) — nixpacks.toml may be redundant dead config.
- **package.json scripts:** Missing a top-level `dev` that runs all three packages concurrently. Devs must start 3 terminals. No docker-compose for local multi-service dev.

## 6. Documentation

- **Process log** (`docs/research/process-log.md`): Up to date through session 2, records brainstorming decisions.
- **Design spec** (`docs/superpowers/specs/2026-04-24-mpmario-design.md`): Comprehensive — data flow, error handling, testing strategy.
- **Plan** (`docs/superpowers/plans/2026-04-24-mpmario-implementation.md`): 17 tasks; code matches the plan.
- **Reality vs. plan:** No significant divergence. Authoritative server, 60 Hz tick, MapSchema state, all 4 enemy types, power-ups, respawn invincibility — all present.
- Docs don't mention current limitations (no multiplayer scenario tests, fireball texture workaround, redundant nixpacks.toml).

## Top 3 Priority Issues

1. **Magic collision numbers (GameRoom.ts:118–157).** Repeated hardcoded `14, 16` across 5 collision checks. Extract to `PLAYER_COLLISION_*` constants to reduce maintenance debt and hitbox bug risk.
2. **`resolveVote()` silent failure (GameRoom.ts:238–240).** Empty-`roomId` fallback leaves players stuck with no feedback. Add retry / fallback-to-default-level with client-side error surfacing.
3. **Healthcheck is superficial (railway.json + `/health` route).** A dead Colyseus loop would still pass `{ ok: true }`. Probe actual room registration or matchmaker state.
