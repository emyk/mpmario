import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { EnemyState } from "./EnemyState";
import { PowerUpState } from "./PowerUpState";
import { FireballState } from "./FireballState";

export class GameState extends Schema {
  @type({ map: PlayerState })   players   = new MapSchema<PlayerState>();
  @type({ map: EnemyState })    enemies   = new MapSchema<EnemyState>();
  @type({ map: PowerUpState })  powerUps  = new MapSchema<PowerUpState>();
  @type({ map: FireballState }) fireballs = new MapSchema<FireballState>();
  @type("number") levelIndex:  number = 0;
  @type("string") matchPhase:  string = "playing"; // "playing"|"ended"|"voting"
  @type("string") winnerId:    string = "";
  @type("number") voteTimer:   number = 0;
}
