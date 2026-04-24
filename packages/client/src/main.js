import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";
import { VoteScene } from "./scenes/VoteScene";
new Phaser.Game({
    type: Phaser.AUTO,
    width: 960,
    height: 240,
    zoom: 2,
    backgroundColor: "#87CEEB",
    scene: [BootScene, LobbyScene, GameScene, VoteScene],
});
