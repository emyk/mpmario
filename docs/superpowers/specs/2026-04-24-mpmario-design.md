# Multiplayer Super Mario Clone — Design Spec

**Date:** 2026-04-24
**Status:** Approved

---

## Context

This is a research project exploring different ways of interacting with Claude during software development. The game — a browser-based multiplayer Mario clone — is the vehicle for studying agentic workflows, iterative design, and superpowers tooling in practice. All design decisions were made collaboratively through the brainstorming process. Game details will continue to be refined iteratively during implementation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Client | Phaser 3 (2D game framework) + TypeScript |
| Server | Colyseus (multiplayer game server) + Node.js + TypeScript |
| Shared | TypeScript package — schemas, message types, constants |
| Build | Vite (client), ts-node / tsx (server) |
| Monorepo | pnpm workspaces |
| Testing | Vitest |

---

## Monorepo Structure

```
mpmario/
├── packages/
│   ├── shared/        # Colyseus state schemas, message types, game constants
│   ├── server/        # Colyseus game server
│   └── client/        # Phaser 3 browser client (served by Vite)
├── docs/
│   └── superpowers/specs/
├── .gitignore
└── package.json       # pnpm workspaces root
```

---

## System Architecture

Three tiers connected by WebSocket (Colyseus protocol):

**Client (browser — Phaser 3)**
- Game Scene: Phaser 3 render loop, sprites, tilemaps, camera
- Input Handler: keyboard/gamepad → sends action messages to server
- State Renderer: applies Colyseus state patches to sprites with interpolation
- Lobby UI: matchmaking queue screen, waiting room, level vote screen

**Server (Node.js — Colyseus)**
- `LobbyRoom`: queues players, fills rooms of 2–4, transitions to GameRoom
- `GameRoom`: authoritative game loop at 60 Hz — physics, collision, win detection
- Game State Schema: players, enemies, coins, power-ups — auto-diffed and sent to clients
- Level Loader: reads Tiled map JSON, initialises world state

**Shared (TypeScript package)**
- Colyseus state schemas (single source of truth for client and server)
- Input message types: `{ action: "jump" | "left" | "right" | "attack" }`
- Game constants: tile size, physics values, speeds, respawn timers

**Key design principle:** The server is authoritative. All physics and game logic run on the server. Clients send input commands, receive state patches, and interpolate sprite positions to hide latency.

---

## Game Design

### Match Format
- 2–4 players online via public matchmaking
- Win condition: **last player standing**
- Each player starts with **3 lives**
- Respawn at a **fixed per-player spawn point** with 2 seconds of invincibility after each death
- Match ends when only one player has lives remaining

### Combat & Elimination
All four elimination methods are supported:
1. **Stomp** — jump on another player's head to remove one life
2. **Koopa shells** — kick a shell; it slides and eliminates players and enemies on contact
3. **Environmental hazards** — pits, lava, spikes cause instant death
4. **Power-up attacks** — fireballs from Fire Flower hit players and enemies

### Power-ups
| Power-up | Effect |
|---|---|
| Super Mushroom | Player grows; absorbs one hit before losing a life |
| Fire Flower | Unlock fireball attack (replaces standard attack) |
| Star | Brief invincibility + speed boost; contact eliminates others |

Power-ups spawn at fixed map locations on a respawn timer.

### Enemies
| Enemy | Behaviour |
|---|---|
| Goomba | Walks back and forth; eliminated by stomp or fireball |
| Koopa Troopa | Walks back and forth; stomp converts to slideable shell |
| Piranha Plant | Pops in/out of pipes; fireball only |
| Bullet Bill | Fired from cannons, tracks player direction at spawn |

All enemies are server-authoritative — positions and state synced to all clients.

### Levels
- 3 hand-crafted levels built with **Tiled** map editor (exported as JSON)
- After each match, remaining/surviving players vote on next level
- Majority vote wins; tie broken randomly

### Lobby & Matchmaking
- Public matchmaking queue: player connects, enters queue
- Server fills a room of 2–4 players then starts the match
- No accounts or persistent identity required for v1

---

## Data Flow

1. Player opens browser → joins Colyseus `LobbyRoom`
2. Server queues player → when 2–4 players ready, creates `GameRoom` and moves all in
3. `GameRoom` loads selected level JSON, initialises full state schema
4. Server runs 60 Hz fixed-rate loop: process inputs → update physics → resolve collisions → check win condition → broadcast state diff
5. Client receives state patch each tick → applies to sprite positions with linear interpolation
6. Client captures keyboard each frame → sends input message to server
7. Match end: server detects one player remaining → broadcasts winner → transitions all to vote screen
8. Vote resolves → new `GameRoom` created with next level

---

## Error Handling

- **Disconnection during match:** player is removed from state; remaining players continue. If only one remains they win immediately.
- **Server crash / room error:** Colyseus handles room lifecycle; clients reconnect and land back in matchmaking queue.
- **Input flooding:** server ignores inputs arriving faster than tick rate.

---

## Testing

| Layer | Approach |
|---|---|
| Shared schemas & utils | Vitest unit tests |
| Server game logic | Vitest unit tests (physics helpers, collision, win condition) |
| Multiplayer integration | Colyseus `ColyseusTestServer` + two mock clients, assert state transitions |
| End-to-end | Two browser tabs against local dev server |

---

## Research Documentation

A process document (`docs/research/process-log.md`) will be maintained throughout the project, capturing:
- How design decisions were made collaboratively with Claude
- Examples of agentic task breakdown and sub-agent use
- Notes on tooling (skills, visual companion, planning workflow)
- Observations on what worked well and what didn't

This spec itself is an artifact of the iterative design process.
