import Phaser from "phaser";

const GAME_ASSETS = [
  { key: "simple-rock-1", path: "/assets/rocks/simple-rock-1.png" },
  { key: "simple-seaweed-1", path: "/assets/seaweed/simple-seaweed-1.png" },
  { key: "simple-seaweed-2", path: "/assets/seaweed/simple-seaweed-2.png" },
  { key: "simple-seaweed-3", path: "/assets/seaweed/simple-seaweed-3.png" },
  { key: "simple-seaweed-4", path: "/assets/seaweed/simple-seaweed-4.png" },
] as const;

type FishAsset = {
  fileName: string;
  url: string;
};

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
    let fish: FishAsset[] = [];

    try {
      const response = await fetch("/api/fish");
      const data = (await response.json()) as { fish?: FishAsset[] };
      fish = data.fish ?? [];
    } catch {
      fish = [];
    }

    if (fish.length === 0) {
      this.registry.set("fishTextureKeys", [] as string[]);
      this.scene.start("AquariumScene");
      return;
    }

    const cacheBust = Date.now();

    for (const asset of fish) {
      this.load.image(`fish-${asset.fileName}`, `${asset.url}?v=${cacheBust}`);
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.registry.set(
        "fishTextureKeys",
        fish.map((asset) => `fish-${asset.fileName}`),
      );
      this.scene.start("AquariumScene");
    });

    this.load.start();
  }
}
