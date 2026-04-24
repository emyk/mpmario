# Eksperimentlogg

- Gruppe: (individual)
- Tema: Agentic software development workflows with Claude
- Eksperiment: Building a multiplayer browser game (mpMario) using Claude Code + Superpowers skills — studying brainstorming, plan-writing, and subagent-driven development in practice
- Dato: 2026-04-24
- Deltakere: Espen Myklevoll (researcher), Claude Sonnet 4.6
- Verktøy/modeller: Claude Code CLI, Claude Sonnet 4.6, Superpowers plugin v5.0.7 (brainstorming, writing-plans, using-git-worktrees, subagent-driven-development, test-driven-development, code-reviewer)
- Repo / case: /workspace/mpmario — browser-based 2–4 player "last one standing" Mario clone

---

## Løpende logg

### Oppføring — Brainstorming: prosjektstart og idéavklaring

- Tidspunkt: 2026-04-24, session start
- Hva ble testet: Full brainstorming → design → plan pipeline using Superpowers skills
- Betingelse / variant: Researcher starts with a vague idea ("multiplayer Mario clone, document the process as we go"); Claude leads collaborative design via structured brainstorming skill
- Resultat / observasjon: Brainstorming skill asked one question at a time, proposed 2–3 approach options per decision point. Key decisions made during brainstorming:
  - **Tech stack**: Offered three options (Socket.io + custom server / Colyseus / Croquet). Chose **Colyseus 0.15** for built-in delta encoding, room lifecycle management, and schema-based state sync. Phaser 3 chosen for client rendering (mature 2D game framework, large community).
  - **Architecture**: Server-authoritative chosen over client-side prediction. Reason: simpler to implement correctly for a research project; lag hiding via interpolation is sufficient for a LAN/demo context.
  - **Input model**: Full key-state messages (`{left, right, jump, attack}`) rather than event-based. Reason: supports simultaneous inputs (run+jump) without sequencing issues.
  - **Match format**: Last-one-standing (3 lives), not score-based or timed. Reason: creates natural tension without a clock; eliminated players stay invested via spectating and vote.
  - **Enemies**: Goomba, Koopa Troopa, Piranha Plant, Bullet Bill — chosen for variety of movement patterns (walk, shell, stationary-cycle, projectile).
  - **Levels**: 3 hand-crafted Tiled JSON levels with post-match vote, rather than procedural or single-map. Reason: gives researcher control over test conditions; rotation adds replay value.
  - **Lobby**: Public matchmaking (no accounts). Simplest viable model for a research vehicle.
  - Researcher answered with brief confirmations ("Looks good") at each section checkpoint. Full design took ~15 minutes.
- Måling / eksempel: Spec saved to `docs/superpowers/specs/2026-04-24-mpmario-design.md`. 17-task implementation plan saved to `docs/superpowers/plans/2026-04-24-mpmario-implementation.md`. Plan contains complete TDD steps with actual code in every step (no placeholders).
- Tolkning / usikkerhet: The one-question-at-a-time discipline felt natural. Researcher did not need to propose alternatives — Claude surfaced them. The visual companion (browser mockup tool) was offered but could not be used — dev server runs in a container with no port forwarding. Text-only brainstorming was sufficient for architecture decisions but would be limiting for UI layout work.

---

### Oppføring — Planlegging: skrive implementasjonsplan

- Tidspunkt: 2026-04-24, after design approval
- Hva ble testet: writing-plans skill generating a 17-task TDD implementation plan from the design spec
- Betingelse / variant: Claude reads the approved design spec and produces a plan with exact file paths, full code in every step, and expected test output. No placeholders allowed by skill rules.
- Resultat / observasjon: Plan written with a File Map section defining every file and its responsibility upfront, then 17 tasks each broken into ~5 sub-steps (write failing test → run to confirm fail → write implementation → run to confirm pass → commit). Task granularity: ~2–5 minutes per step. Plan includes exact command-line invocations with expected output strings.
- Måling / eksempel: Plan at `docs/superpowers/plans/2026-04-24-mpmario-implementation.md` — 17 tasks, ~1800 lines. Tasks cover: monorepo scaffold, shared schemas, server entry/lobby, level loader, physics, collision, enemy AI, game room (full), fireball system, level content (3 Tiled JSON files), and full client (Vite+Phaser boot, NetworkManager, InputHandler, StateRenderer, GameScene, LobbyScene/VoteScene, end-to-end wiring).
- Tolkning / usikkerhet: Researcher chose subagent-driven development over inline execution ("1"). The plan is detailed enough that subagents can work from it without reading the design spec — this is the intended design. One risk: plans written in advance can contain bugs (as happened in Task 5 Physics — see below).

---

### Oppføring — Oppsett: git worktree for isolert implementasjonsgren

- Tidspunkt: 2026-04-24, before implementation
- Hva ble testet: using-git-worktrees skill creating an isolated `implement` branch
- Betingelse / variant: Researcher chose `.worktrees/` (project-local, hidden) over global `~/.config/superpowers/worktrees/`. Directory was already in `.gitignore`.
- Resultat / observasjon: `git worktree add .worktrees/implement -b implement` ran cleanly. `pnpm install` ran in the worktree. No baseline tests to verify (repo was brand new). Implementation proceeds in `.worktrees/implement` with main branch untouched.
- Måling / eksempel: All subsequent commits go to the `implement` branch. Main branch stays at initial scaffold commit.
- Tolkning / usikkerhet: Worktree isolation means Claude can make commits freely without polluting main. Useful for the research context where the controller session may be long-running.

---

### Oppføring — Task 1: Monorepo-stillas

- Tidspunkt: 2026-04-24
- Hva ble testet: Subagent implements pnpm workspace root, three packages (shared, server, client), tsconfigs, vitest config
- Betingelse / variant: First task; no prior code. Spec compliance + quality review cycle.
- Resultat / observasjon: Implemented cleanly. Quality reviewer flagged `"main": "src/index.ts"` in `shared/package.json` as incorrect for production builds — source files are not the published entry point. Fixed to `"dist/index.js"` with `types` and `exports` fields added.
- Måling / eksempel: Commit `e744fea`. 0 tests (scaffold only).
- Tolkning / usikkerhet: The `exports` field fix is forward-looking — it will matter when server imports from shared. Good catch by quality reviewer.

---

### Oppføring — Task 2: Delte skjemaer, meldingstyper og konstanter

- Tidspunkt: 2026-04-24
- Hva ble testet: Subagent implements all Colyseus `@type`-decorated schemas (PlayerState, EnemyState, PowerUpState, GameState), InputMessage interface, MSG_* constants, and 24 game constants
- Betingelse / variant: Spec called for four schema files. Implementer added a fifth: `FireballState`.
- Resultat / observasjon: Spec reviewer flagged `FireballState` as not in spec. Controller evaluated and accepted it with reasoning: adding `@type` fields to a live Colyseus schema mid-game causes a schema version bump that disconnects all connected clients. Adding `FireballState` now (before the server goes live) avoids that churn. This was the one deliberate spec deviation in the project so far. Quality reviewer also added `vy` field to `EnemyState` for the same reason.
- Måling / eksempel: Commit `7b28a97`. 0 explicit tests; schemas verified by TypeScript compilation.
- Tolkning / usikkerhet: The spec compliance check surfaced a genuine tension: strict spec adherence vs. architectural foresight. The controller's ability to evaluate context and override the reviewer was important here. A fully automated pipeline would have rejected the change.

---

### Oppføring — Task 3: Server entry point og LobbyRoom

- Tidspunkt: 2026-04-24
- Hva ble testet: Express + Colyseus server on port 2567; LobbyRoom queues 2–4 players and creates a GameRoom when MIN_PLAYERS reached
- Betingelse / variant: First use of `@colyseus/testing` — test uses `ColyseusTestServer.boot()`. Plan had `ColyseusTestServer.boot(gameServer)` but actual 0.15 API exports a standalone `boot()` function without arguments.
- Resultat / observasjon: Implementer adapted to actual API. Quality reviewer caught a race condition: `startGame()` could fire twice if two clients join simultaneously (both trigger the `>= MIN_PLAYERS` check before `isStarting` is set). Fixed with `isStarting` boolean guard and queue snapshot before the async `createRoom`. Unhandled promise rejection on `gameServer.listen()` also fixed with `.catch`.
- Måling / eksempel: Commit `99c3eca` + `faad1d0`. 1 integration test (LobbyRoom fills and transitions to game).
- Tolkning / usikkerhet: The race condition was a real bug that would manifest in production. The test suite only has one client joining sequentially, so the race was invisible to tests. The quality reviewer caught it through code inspection, not test failure — this is a key value of the review step.

---

### Oppføring — Task 4: LevelLoader

- Tidspunkt: 2026-04-24
- Hva ble testet: Parses Tiled JSON map export into `LevelData` (collision map, spawn points, enemy spawns, power-up spawns)
- Betingelse / variant: Server package uses `"type": "module"` (ESM). Plan's reference code used `__dirname` directly.
- Resultat / observasjon: Quality reviewer flagged `__dirname` as undefined in ESM context. Fixed with `fileURLToPath(import.meta.url)`. Path comment added explaining that at runtime `dist/game/` is 4 directories up from `levels/`.
- Måling / eksempel: Commits `fa530c3` + `23c30de`. 4 tests (parse collision map, find spawns, handle missing layers, bounds check).
- Tolkning / usikkerhet: ESM/CJS interop issues recur throughout the project (vitest config, schema imports). The container environment (Node.js with pnpm) makes these more visible than a typical local setup.

---

### Oppføring — Task 5: Server Physics

- Tidspunkt: 2026-04-24
- Hva ble testet: `applyPhysics(player, input)` — gravity, velocity integration, jump, max fall speed
- Betingelse / variant: Plan contained a subtle bug in its reference implementation: gravity was applied on the same tick as a jump, giving `vy = JUMP_VELOCITY + GRAVITY = -9.5` instead of `JUMP_VELOCITY = -10`. Implementer detected this during self-review.
- Resultat / observasjon: Implementer self-fixed with a `jumped` boolean flag: gravity is skipped on the tick a jump fires. Tests were written to the correct spec values (JUMP_VELOCITY = -10), not the buggy plan code. This was a case where the test spec and the reference implementation disagreed — the implementer correctly trusted the test spec.
- Måling / eksempel: Commit `6a99e85`. 7 tests (gravity, jump, max fall speed, no air control, left/right movement).
- Tolkning / usikkerhet: Plan bugs are possible even in well-written plans. TDD provides a forcing function: if the plan's reference implementation is wrong, the tests reveal it. The implementer's job is to make the tests pass, not to faithfully copy the reference code.

---

### Oppføring — Task 6: Kollisjonsdeteksjon (AABB)

- Tidspunkt: 2026-04-24
- Hva ble testet: `isSolid()`, `resolvePlayerCollisions()`, `resolveEnemyCollisions()` — AABB tile collision for floor, ceiling, and walls
- Betingelse / variant: Physics.ts integrates velocity before Collision.ts runs. Plan's X-axis wall check was written as if collision ran before physics integration.
- Resultat / observasjon: Quality reviewer caught that X-axis wall checks added `e.vx` to the position (projecting one step ahead) even though Physics had already integrated `vx` into `x`. This was a double-count. Fixed to use current position, consistent with Y-axis. Also added: comment explaining the `isOnGround` unconditional-clear invariant; left-wall test; `isOnGround = false` reset test; fixed `makePlayer` type from `Partial<Record<string, any>>` to `Partial<PlayerState>`.
- Måling / eksempel: Commits `47398c3` + fix commit. 20 tests passing after fixes.
- Tolkning / usikkerhet: The position-vs-projected inconsistency between axes is a class of bug that's easy to introduce when physics and collision are separate functions. The review step caught it; the tests (which exercised normal speeds) did not.

---

### Oppføring — Task 7: Enemy AI

- Tidspunkt: 2026-04-24
- Hva ble testet: `updateEnemies()` — goomba/koopa wall+cliff reversal, koopa shell mode, piranha visible/hidden cycle, bullet bill no-op
- Betingelse / variant: `@colyseus/schema` not directly listed as server dependency; vitest ESM/CJS interop issue required alias in vitest.config.ts.
- Resultat / observasjon: Implementer added `@colyseus/schema` CJS alias using a hard-coded `.pnpm` internal path. Quality reviewer flagged this as fragile (pnpm store layout is internal and can change). Fixed to use `(require as NodeRequire).resolve("@colyseus/schema")`. Two logic issues also caught: (1) un-stall fallback always used `+speed` regardless of direction — fixed to `e.vx > 0 ? -speed : speed`; (2) `footAheadCol` and `aheadCol` were computed identically (dead abstraction) — merged into `leadingCol`. Test gaps fixed: added cliff-detection test, stopped-shell test, piranha hidden→visible test.
- Måling / eksempel: Commits `7d6a25b` + `c27ec94`. 27 tests passing after fixes (+7 from Task 7).
- Tolkning / usikkerhet: The goomba wall-reversal test passes via the `noFloor` path (enemy walks off map edge) rather than `hitsWall`. The implementer noted this. Both paths produce the same user-visible behaviour, but the wall-hit code path is untested. Acceptable for now; GameRoom integration tests will exercise it with real maps.

---
