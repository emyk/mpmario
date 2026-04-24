import { GRAVITY, PLAYER_SPEED, JUMP_VELOCITY, MAX_FALL_SPEED } from "@mpmario/shared";
import type { InputMessage } from "@mpmario/shared";
import type { PlayerState } from "@mpmario/shared";

export function applyPhysics(player: PlayerState, input: InputMessage): void {
  // Horizontal movement
  if (input.left) {
    player.vx = -PLAYER_SPEED;
    player.facingRight = false;
  } else if (input.right) {
    player.vx = PLAYER_SPEED;
    player.facingRight = true;
  } else {
    player.vx = 0;
  }

  // Jump — only when grounded
  const jumped = input.jump && player.isOnGround;
  if (jumped) {
    player.vy = JUMP_VELOCITY;
    player.isOnGround = false;
  }

  // Gravity — only when airborne and not the tick we jumped
  if (!player.isOnGround && !jumped) {
    player.vy = Math.min(player.vy + GRAVITY, MAX_FALL_SPEED);
  }

  // Integrate velocity → position
  player.x += player.vx;
  player.y += player.vy;
}
