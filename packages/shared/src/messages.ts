export interface InputMessage {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
}

export const MSG_INPUT = "input";
export const MSG_GAME_READY = "game_ready";
export const MSG_VOTE = "vote";
export const MSG_WINNER = "winner";
