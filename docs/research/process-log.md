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

### Oppføring

- Tidspunkt: 2026-04-24, session start
- Hva ble testet: Full brainstorming → design → plan pipeline using Superpowers skills
- Betingelse / variant: Researcher starts with a vague idea ("multiplayer Mario clone"); Claude leads collaborative design via structured brainstorming skill
- Resultat / observasjon: brainstorming skill asked one question at a time, proposed 2–3 approach options per decision point. Produced a complete design spec covering architecture, game rules, enemies, power-ups, levels, data flow, error handling, and testing. Researcher answered with brief confirmations ("Looks good") at each section checkpoint. Total design took ~15 minutes of back-and-forth.
- Måling / eksempel: Spec saved to `docs/superpowers/specs/2026-04-24-mpmario-design.md`. 17-task implementation plan saved to `docs/superpowers/plans/2026-04-24-mpmario-implementation.md`. Plan contains complete TDD steps with actual code in every step (no placeholders).
- Tolkning / usikkerhet: The one-question-at-a-time discipline felt natural for the researcher. The visual companion (browser mockup tool) was offered but could not be used — the dev server runs in a container with no port forwarding. Text-only brainstorming worked fine.

---

### Oppføring

- Tidspunkt: 2026-04-24, implementation start
- Hva ble testet: Subagent-driven development: fresh subagent per task + two-stage review (spec compliance then code quality) after each
- Betingelse / variant: Researcher selects "subagent-driven development" over "inline execution". Controller (main Claude session) dispatches implementer subagents; they implement, run tests, commit, then pass to spec reviewer and quality reviewer subagents.
- Resultat / observasjon: Tasks 1–6 completed across one session (session ran out of context and was resumed). Notable subagent behaviours:
  - **Task 2** (shared schemas): Implementer proactively added `FireballState` schema not yet requested by plan. Quality reviewer correctly flagged this as over-spec; it was accepted because the schema was needed later and adding it now avoided a schema version bump that would disconnect live clients.
  - **Task 4** (LevelLoader): Plan used `__dirname` in an ESM module; quality reviewer flagged this as fragile. Fixed with `fileURLToPath(import.meta.url)`.
  - **Task 5** (Physics): Plan's reference code had a subtle bug — gravity was applied on the same tick as a jump, giving `JUMP_VELOCITY + GRAVITY` instead of `JUMP_VELOCITY`. The implementer self-detected and fixed this by checking test assertions as ground truth.
  - **Task 5** (Physics): Quality reviewer added `vy` field to `EnemyState` proactively, anticipating that adding `@type` fields mid-game would cause Colyseus schema version bumps disconnecting clients.
  - **Task 3** (LobbyRoom): Quality reviewer caught a race condition — `startGame()` could fire twice if MIN_PLAYERS joined simultaneously. Fixed with `isStarting` boolean guard and queue snapshot before async `createRoom`.
  - **Task 6** (Collision): Quality reviewer caught that X-axis wall checks were using projected position (`e.x + e.vx`) even though Physics had already integrated velocity. Fixed to use current position, consistent with Y-axis handling.
- Måling / eksempel: 6 tasks completed, 20 tests passing (shared: 0, server: 20). Code is in `.worktrees/implement` branch. Commit history: e744fea → 7b28a97 → 99c3eca → faad1d0 → fa530c3 → 23c30de → 6a99e85 → 47398c3 → (collision quality fixes)
- Tolkning / usikkerhet: The two-stage review loop (spec then quality) is catching real bugs — not just style issues. The "no extra features" spec compliance check is particularly valuable: it creates a forcing function that keeps implementers from gold-plating. The one exception (FireballState schema) was a legitimate architectural concern that the controller was able to evaluate in context and accept. Controller overhead (reading plan, crafting subagent prompts, managing review loops) is non-trivial — roughly 30–40% of session time. Whether this overhead pays off depends on task complexity.

---
