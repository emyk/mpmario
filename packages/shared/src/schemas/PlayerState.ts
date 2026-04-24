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
