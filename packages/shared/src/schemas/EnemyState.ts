import { Schema, type } from "@colyseus/schema";

export class EnemyState extends Schema {
  @type("string")  id: string = "";
  @type("string")  type: string = "goomba"; // "goomba"|"koopa"|"piranha"|"bulletbill"
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("number")  vx: number = 0;
  @type("number")  vy: number = 0;
  @type("boolean") isAlive: boolean = true;
  @type("boolean") isShell: boolean = false;
  @type("number")  piranhaTimer: number = 0;
  @type("boolean") piranhaVisible: boolean = true;
}
