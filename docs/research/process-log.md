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

### Oppføring — Task 8: GameRoom (full implementasjon)

- Tidspunkt: 2026-04-24
- Hva ble testet: Full `GameRoom` replacing the stub — 60 Hz game loop integrating Physics, Collision, EnemyAI, player lifecycle, win detection, vote phase
- Betingelse / variant: Largest single task so far. Implementer also created `levels/level1.json` as a minimal test fixture so `LevelLoader.load(0)` could work in integration tests (full levels come in Task 10).
- Resultat / observasjon: Quality reviewer caught a critical bug: pit death threshold used `heightTiles * 32` instead of `heightTiles * TILE_SIZE` (= 16), making the death zone twice as deep. Also found: win condition's `players.size >= 2` guard left a sole survivor stuck in "playing" forever after an opponent disconnected; `resolveVote` had no error handling for `matchMaker.createRoom` failures; `eliminatePlayer` lacked a guard against double-elimination. Two tests added: pit death and respawn-with-invincibility.
- Måling / eksempel: Commits `fa8d588` + `c4551c6`. 31 tests passing.
- Tolkning / usikkerhet: The pit-death bug (`* 32` instead of `* TILE_SIZE`) is a recurring hardcoding pattern — the plan's reference code used `32` but `TILE_SIZE = 16` is the canonical constant throughout the project. The reviewers are consistently catching this class of magic-number bugs.

---

### Oppføring — Task 9: Fireball-prosjektiler

- Tidspunkt: 2026-04-24
- Hva ble testet: Fireball physics (gravity, bounce off floor, wall/ceiling kill), spawning from fire-flower players, hit detection against enemies and players
- Betingelse / variant: Shared-side (FireballState schema, GameState.fireballs) was already done proactively in Task 2. Only server-side GameRoom changes needed.
- Resultat / observasjon: Quality reviewer found that a fireball that kills an enemy could also kill a player on the same tick — missing `if (!fb.isAlive) return;` guard between the enemy and player collision loops. Also: `spawnFireball` was called unconditionally every tick while `attack` was held, spawning ~60 fireballs/second. Fixed with a 20-tick per-player cooldown (~333ms at 60 Hz).
- Måling / eksempel: Commits `1b91bb5` + `22c24b9`. 31 tests passing.
- Tolkning / usikkerhet: The double-kill scenario (fireball kills enemy and player simultaneously) would be hard to notice during playtesting — it requires precise pixel alignment. The review step caught it through code inspection. The cooldown was not in the plan but is clearly necessary for gameplay correctness.

---

### Oppføring — Task 10: Nivåinnhold (3 Tiled JSON-filer)

- Tidspunkt: 2026-04-24
- Hva ble testet: Generating three 60×15 Tiled JSON level files with varied platform layouts, 4 spawn points, 4 enemies, and 3 power-ups each
- Betingelse / variant: `levels/level1.json` already existed as a minimal 20×10 test fixture from Task 8. Task 10 overwrites it with the full 60×15 version and adds level2 and level3.
- Resultat / observasjon: Generated correctly. Quality reviewer flagged that all 9 power-up placements were floating mid-air with no platform support — particularly the star objects placed at y=80 with no nearby geometry. Since power-ups are static (no gravity in the physics loop), they would render floating visually. Fixed by placing power-ups one tile above existing platform tiles in each level.
- Måling / eksempel: Commits `e2f69bb` + `1567790`. 31 server tests passing. Three 60×15 levels: level1 (flat ground + platforms), level2 (staircase ascending), level3 (island platforms with pits).
- Tolkning / usikkerhet: The level generation is script-based (Node.js one-liners). This makes levels reproducible but not visually designable without tooling. The Tiled editor would give better control, but generating from code is fast for a research project.

---

### Oppføring — Tasks 11–14: Client scaffold, NetworkManager, InputHandler, StateRenderer

- Tidspunkt: 2026-04-24
- Hva ble testet: Phaser 3 client bootstrap — Vite build pipeline, generated placeholder textures, Colyseus.js NetworkManager, keyboard InputHandler, and state-interpolating StateRenderer
- Betingelse / variant: Client tasks have no unit test suite — verification is TypeScript compilation via `pnpm --filter @mpmario/client build`. Browser rendering cannot be verified in this container environment.
- Resultat / observasjon: Several Phaser API issues caught during implementation:
  - `this.make.graphics({ add: false })` is not a valid Phaser 3 API — the `add` flag is the second argument, not an option key. Fixed to `this.make.graphics({}, false)`.
  - `tsc` was emitting `.js` files alongside TypeScript sources; fixed with `"noEmit": true` in tsconfig.
  - `input` and `renderer` are reserved property names on `Phaser.Scene`; the implementer renamed them to `inputHandler` and `stateRenderer` to avoid conflicts.
  - `NetworkManager.joinGame()` originally did not close the previous game room before overwriting the reference — WebSocket leak on vote-to-next-game transition. Fixed.
  - A spurious `MSG_GAME_READY` listener was registered on the game room (it should only be on the lobby room). Removed.
- Måling / eksempel: Commits `bb751e3` through `515d146`. Client builds to 1.5 MB (Phaser bundled). Chunk size warning expected — Phaser is a large library. 31 server tests still passing.
- Tolkning / usikkerhet: Phaser API issues (naming conflicts, constructor signatures) are the primary challenge in client tasks. The spec reference code had two such errors. The implementer self-corrected both, which shows that even well-specified plans can contain API mistakes for a library-heavy domain.

---

### Oppføring — Tasks 15–16: GameScene (full), LobbyScene, VoteScene

- Tidspunkt: 2026-04-24
- Hva ble testet: Full game scenes — interpolated state rendering in GameScene, matchmaking UI in LobbyScene, level vote UI in VoteScene
- Betingelse / variant: These scenes complete the client-side user flow: connect → queue → play → vote → play again.
- Resultat / observasjon: One critical spec/logic bug found by the reviewer: `VoteScene.onGameReady` was dead code. The callback was set but could never fire because `MSG_GAME_READY` was only registered as a listener on `lobbyRoom`, and by the time VoteScene is reached, the lobby room has been left. Fixed by also registering `MSG_GAME_READY` on the game room inside `NetworkManager.joinGame()`. Additionally: `GameScene.onGameReady` had an unhandled promise rejection; fixed with `.catch()`.
- Måling / eksempel: Commits `63ec3d7` through `5cdcf23`. Full client flow wired end-to-end.
- Tolkning / usikkerhet: The MSG_GAME_READY dead-code bug was architectural rather than syntactic — no TypeScript error, no test failure would catch it. The code review step was essential for catching it. This is the clearest example in the project of a bug that only surface review (not compilation, not tests) could find.

---

### Oppføring — Task 17: Avslutning og verifisering

- Tidspunkt: 2026-04-24
- Hva ble testet: Final end-to-end build verification and process documentation
- Betingelse / variant: Browser testing not possible (container with no port forwarding). Verified via: 31/31 server tests, clean TypeScript compilation for all three packages, client Vite build success.
- Resultat / observasjon: All 17 tasks completed. Server: 31 unit and integration tests, all passing. Client: builds cleanly with no TypeScript errors (1.57 MB bundle, Phaser included). All game systems integrated: matchmaking → game loop → physics/collision/AI → win detection → vote → next game.
- Måling / eksempel: Total commits on `implement` branch: 30+. Commit history from e744fea (scaffold) to final. Test count grew: 0 → 20 (after Task 6) → 27 (after Task 7) → 31 (final).
- Tolkning / usikkerhet: The two-stage review (spec compliance + code quality) added overhead but caught bugs at every task. Summary of bugs caught by review, not tests: LobbyRoom race condition (Task 3), X-axis wall double-count (Task 6), `heightTiles * 32` magic number (Task 8), fireball double-kill (Task 9), VoteScene dead-code transition (Task 15/16), `joinGame` WebSocket leak (Tasks 12/16). The spec compliance check was particularly valuable — it prevented implementers from over-building and caught one case where the plan itself was wrong about which message to route.

---

### Oppføring — Runtime-feil: tsx dekoratorer etter merge til main

- Tidspunkt: 2026-04-24, etter merge av implement-gren til main
- Hva ble testet: Faktisk kjøring av serveren for første gang (`pnpm dev:server`)
- Betingelse / variant: Første gang koden kjøres utenom tester. Alle 31 tester passerte, men det er en vesentlig forskjell mellom testmiljø (vitest med CJS-alias) og runtime (tsx watch).
- Resultat / observasjon: Serveren krasjet umiddelbart med `TypeError: Cannot read properties of undefined (reading 'constructor')` fra `@colyseus/schema/src/annotations.ts`. Stack trace viste `__decorateElement` (esbuild TC39 decorator-helper) i stedet for `__decorate` (legacy TypeScript decorator-helper). Dette betyr at esbuild/tsx brukte nytt TC39-dekoratorsyntaks i stedet for det gamle TypeScript-formatet som `@colyseus/schema` krever.
  - **Første forsøk** (feil diagnose): Opprettet root-nivå `tsconfig.json` med `experimentalDecorators: true`. Hjalp ikke — tsx leser fremdeles tsconfig per pakke, og `packages/shared/tsconfig.json` hadde allerede riktig innstilling.
  - **Korrekt diagnose**: `packages/server/tsconfig.json` hadde `"paths": { "@mpmario/shared": ["../shared/src/index.ts"] }`. Denne `paths`-overstyringen tvang tsx til å prosessere TypeScript-kildekoden til shared-pakken direkte under kjøretid, noe som utløste esbuild-dekoratorfeil. Uten `paths`-overstyringen ville Node.js løse `@mpmario/shared` via pnpm workspace-symlink til `packages/shared/dist/index.js` (forhåndskompilert JS der `tsc` håndterte dekoratorer korrekt).
  - **Løsning**: Fjernet `paths` fra server-tsconfig. La til `pnpm --filter @mpmario/shared build` som første steg i `dev:server`-skriptet.
- Måling / eksempel: Serveren starter nå uten feil etter `pnpm dev:server`.
- Tolkning / usikkerhet: Dette er en typisk fallgruve i TypeScript monorepos: `paths`-overtyring er nyttig under utvikling for hot-reload av shared-kode, men den omgår Node.js-moduloppløsning og eksponerer kjøretidsverktøy (tsx/esbuild) for TypeScript-filer som er ment kompilert av `tsc`. For verktøy som avhenger av spesifikk dekoratorsyntaks (Colyseus, NestJS, TypeORM) er dette farlig. Riktig arbeidsflyt er: kompiler shared med `tsc` (som håndterer `experimentalDecorators` korrekt), importer fra `dist/`.

---

### Oppføring — Tilkoblingsfeil: `join` vs. `joinOrCreate` og matchmaking-design

- Tidspunkt: 2026-04-24, etter serverfix
- Hva ble testet: To nettleserfaner koblet til den kjørende serveren
- Betingelse / variant: Første faktiske spillertest.
- Resultat / observasjon: Feil 4211 ("no rooms found with provided criteria") i begge faner. Årsak: `NetworkManager.joinLobby()` brukte `client.join("lobby")` som krever at et lobby-rom eksisterer fra før. Ingen lobby-rom finnes ved serveroppstart — rom opprettes on-demand i Colyseus.
  - **Løsning del 1**: Endret til `client.joinOrCreate("lobby")` — første fane oppretter rom, andre fane slutter seg til.
  - **Løsning del 2**: Etter videre testing: `joinOrCreate("lobby")` opprettet separate lobby-rom per fane (fordi fane 2 opprettet ny NetworkManager-instans etter at fane 1 allerede satt i kø). Dette er en race condition i lobby-design, ikke en bug i seg selv.
  - **Designendring** (brukerens forespørsel): Fjernet lobby-laget helt. Klienten gjør nå `joinOrCreate("game")` direkte. Ingen venting på MIN_PLAYERS — spillet starter med én spiller og andre kan bli med etterpå.
  - **GameRoom-fix**: `checkWinCondition()` utløste umiddelbart "vinner" med én spiller fordi `alive.length === 1` alltid er sant for ensomme spillere. Fikset ved å spore `peakPlayerCount` — vinnerbetingelse krever nå at minst 2 spillere noen gang har vært i rommet.
  - **Rommets tilgjengelighet**: La til `this.lock()` når spillet avsluttes slik at nye faner via `joinOrCreate` får et nytt rom og ikke slutter seg til et rom i voteringsfase.
- Måling / eksempel: To faner kobler nå til samme spillrom. Spill starter med 1 spiller, andre kan bli med.
- Tolkning / usikkerhet: Den opprinnelige lobby-tilnærmingen (samlingsrom → spillrom) er mer robust for matchmaking med ukjente spillere (garanterer at alle starter samtidig), men er unødvendig kompleks for utvikling og testing. Den direkte `joinOrCreate("game")`-tilnærmingen er bedre for et forskningsprosjekt der 2 faner er typisk testscenario.

---

### Oppføring — Visuell feil: ingen nivelrender, spillere usynlige

- Tidspunkt: 2026-04-24, etter tilkoblingsfix
- Hva ble testet: Faktisk spillgjengivelse i nettleseren
- Betingelse / variant: To faner koblet, spillet kjører, men visuelt innhold mangler.
- Resultat / observasjon: Bruker rapporterte: "blå bakgrunn og noen bokser — noen statiske og noen som scrollet. Ingen spillerfigur." Diagnose:
  1. **Ingen nivelrendering**: `GameScene` gjengir aldri fliser. `StateRenderer` håndterer bare spillere/fiender/power-ups som sprites. Nivåets plattformer (fra `LevelLoader`s `collisionMap`) ble aldri tegnet på skjermen.
  2. **Nivådata ikke tilgjengelig for klient**: `LevelLoader` bruker `fs.readFileSync` (Node.js) og kjører kun på serveren. Klienten hadde ingen tilgang til nivå-JSON-filene.
  3. **Spilleren var faktisk synlig** som en farget rektangel (14×16 px) — men uten plattformer ser spilleren ut til å sveve i luften.
  - **Løsning**:
    - Vite-plugin i `vite.config.ts` som serverer `levels/*.json` fra repots rot — via dev-server middleware (utvikling) og Rollup `emitFile` (produksjonsbygg til Railway).
    - `BootScene.preload()` laster alle 3 nivå-JSONer via Phaser sin innebygde `this.load.json()`.
    - `GameScene.renderLevel()` tegner solid-fliser (fra collision-laget) ved første state-endring.
    - `StateRenderer`: lokal spillers sprite markert med hvit tint + sprites satt til `depth: 1` over fliser.
    - `GameScene.updateHUD()`: lokal spiller-tekst i gult for å skille seg ut.
  - **Railway-hensyn**: `generateBundle`-hook i Vite-plugin sikrer at `levels/` kopieres til `dist/` under bygging. Serveren leser nivåer via `path.resolve(__dirname, ...)` — fungerer så lenge Railway kloner hele repo (nivåene er ikke i `.gitignore`).
- Måling / eksempel: Plattformer synlige som brune fliser, spillere som fargede rektangler (hvit tint for deg selv), blå himmel som bakgrunn.
- Tolkning / usikkerhet: Gapet mellom "kompilerer og tester" og "kjører og ser riktig ut" var stort her. 17 oppgaver med TDD og kodegjennomganger ga en server som fungerer korrekt, men et klientrenderingslag som aldri hadde blitt verifisert visuelt. Dette er den direkte konsekvensen av observasjonen i Task 17: "Browser testing gap — client tasks verified only by TypeScript compilation."

---

## Samlede observasjoner

### Hva fungerte godt

1. **Subagent-driven development**: Fresh context per task kept implementers focused. No accumulated confusion across tasks. The review handoff was clean.
2. **Two-stage review** (spec then quality): Caught bugs at every stage. Quality review was more valuable than expected — it found not just style issues but real logic bugs.
3. **Plan quality**: The 17-task plan with complete code in every step let subagents implement without reading the design spec. The few plan bugs (physics gravity, pit threshold magic number, MSG_GAME_READY routing) were caught by tests or review before reaching production.
4. **Proactive schema fixes**: Adding `FireballState` and `vy` to `EnemyState` in Task 2 avoided Colyseus schema version bumps later. The controller's ability to override the spec reviewer's "not in spec" flag was important here.
5. **Process log discipline**: Maintaining this log in parallel with development forced reflection on each task's observations, which is the research value.

### Hva kan forbedres

1. **Browser testing gap**: Client tasks (Tasks 11–17) were verified only by TypeScript compilation. The actual rendering pipeline was not tested end-to-end. For a production project, E2E browser tests would be essential.
2. **Plan API errors**: The plan contained wrong Phaser 3 API calls (constructor signatures, property names that conflict with base class). For library-heavy domains, plans should be validated against the actual installed library version before implementation.
3. **Controller overhead**: Each task required the controller to read the plan, craft an implementer prompt, wait for implementation, then dispatch spec and quality reviewers. Roughly 30-40% of elapsed time was coordination, not implementation.
4. **Test coverage for complex interactions**: The GameRoom integration tests were limited (2 tests). More scenarios (fireball mechanics, multi-player simultaneous events, vote resolution) would have caught bugs earlier.

---
