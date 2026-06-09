import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.image("simple-rock-1", "/assets/rocks/simple-rock-1.png");
  }

  create() {
    this.scene.start("AquariumScene");
  }
}
