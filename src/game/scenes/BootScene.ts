import { listFish, revokeFishUrls, type StoredFish } from "@/lib/fishStore";
import { publicPath } from "@/lib/publicPath";
import Phaser from "phaser";

const GAME_ASSETS = [
  { key: "simple-rock-1", path: publicPath("/assets/rocks/simple-rock-1.png") },
  { key: "simple-seaweed-1", path: publicPath("/assets/seaweed/simple-seaweed-1.png") },
  { key: "simple-seaweed-2", path: publicPath("/assets/seaweed/simple-seaweed-2.png") },
  { key: "simple-seaweed-3", path: publicPath("/assets/seaweed/simple-seaweed-3.png") },
  { key: "simple-seaweed-4", path: publicPath("/assets/seaweed/simple-seaweed-4.png") },
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
    void this.loadFishAssets();
  }

  private async loadFishAssets() {
    let fish: StoredFish[] = [];

    try {
      fish = await listFish();
    } catch {
      fish = [];
    }

    if (fish.length === 0) {
      this.registry.set("fishTextureKeys", [] as string[]);
      this.scene.start("AquariumScene");
      return;
    }

    try {
      for (const asset of fish) {
        this.load.image(`fish-${asset.fileName}`, asset.url);
      }

      await new Promise<void>((resolve) => {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
        this.load.start();
      });

      this.registry.set(
        "fishTextureKeys",
        fish.map((asset) => `fish-${asset.fileName}`),
      );
    } finally {
      revokeFishUrls(fish);
    }

    this.scene.start("AquariumScene");
  }
}
