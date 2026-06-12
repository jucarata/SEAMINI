import Phaser from "phaser";

const GAME_ASSETS = [
  { key: "simple-rock-1", path: "/assets/rocks/simple-rock-1.png" },
  { key: "simple-seaweed-1", path: "/assets/seaweed/simple-seaweed-1.png" },
  { key: "simple-seaweed-2", path: "/assets/seaweed/simple-seaweed-2.png" },
  { key: "simple-seaweed-3", path: "/assets/seaweed/simple-seaweed-3.png" },
  { key: "simple-seaweed-4", path: "/assets/seaweed/simple-seaweed-4.png" },
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    for (const asset of GAME_ASSETS) {
      this.load.image(asset.key, asset.path);
    }
  }

  create() {
    this.scene.start("AquariumScene");
  }
}
