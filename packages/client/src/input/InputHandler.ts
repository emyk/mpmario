import type { InputMessage } from "@mpmario/shared";

export class InputHandler {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private attackKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.cursors    = scene.input.keyboard!.createCursorKeys();
    this.attackKey  = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
  }

  getInputMessage(): InputMessage {
    return {
      left:   this.cursors.left.isDown,
      right:  this.cursors.right.isDown,
      jump:   this.cursors.up.isDown || this.cursors.space.isDown,
      attack: this.attackKey.isDown,
    };
  }
}
