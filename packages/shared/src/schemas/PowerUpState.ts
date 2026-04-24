import { Schema, type } from "@colyseus/schema";

export class PowerUpState extends Schema {
  @type("string")  id: string = "";
  @type("string")  type: string = "mushroom"; // "mushroom"|"flower"|"star"
  @type("number")  x: number = 0;
  @type("number")  y: number = 0;
  @type("boolean") isActive: boolean = true;
  @type("number")  respawnTicks: number = 0;
}
