import { describe, it, expect } from "vitest";
import { applyPhysics } from "../game/Physics";
import { PlayerState } from "@mpmario/shared";
import { GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, MAX_FALL_SPEED } from "@mpmario/shared";

function makePlayer(overrides: Partial<Record<keyof PlayerState, any>> = {}): PlayerState {
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
    expect(p.vy).toBeCloseTo(-5 + GRAVITY);
  });
});
