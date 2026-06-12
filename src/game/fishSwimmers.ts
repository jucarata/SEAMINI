import Phaser from "phaser";

export type FishSwimmer = {
  sprite: Phaser.GameObjects.Image;
  speed: number;
  direction: 1 | -1;
  minX: number;
  maxX: number;
  baseY: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
};

export function createFishSwimmers(scene: Phaser.Scene, layout: {
  width: number;
  height: number;
  waterHeight: number;
  surfaceHeight: number;
  sandY: number;
}): FishSwimmer[] {
  const fishKeys = scene.registry.get("fishTextureKeys") as string[] | undefined;
  if (!fishKeys?.length) return [];

  const swimmers: FishSwimmer[] = [];
  const marginX = layout.width * 0.08;

  fishKeys.forEach((textureKey, index) => {
    if (!scene.textures.exists(textureKey)) return;

    const seed = index + 1;
    const rand = mulberry32(8800 + seed * 131);
    const minY = layout.surfaceHeight + layout.waterHeight * 0.1;
    const maxY = layout.sandY - layout.height * 0.06;
    const targetWidth = layout.width * (0.07 + rand() * 0.05);

    const fish = scene.add.image(0, 0, textureKey);
    fish.setOrigin(0.5, 0.5);
    fish.setDisplaySize(targetWidth, (fish.height / fish.width) * targetWidth);
    fish.setDepth(10);

    const direction: 1 | -1 = rand() > 0.5 ? 1 : -1;
    fish.setFlipX(direction < 0);

    const startX = marginX + rand() * (layout.width - marginX * 2);
    const startY = minY + rand() * Math.max(1, maxY - minY);
    fish.setPosition(startX, startY);

    swimmers.push({
      sprite: fish,
      speed: 28 + rand() * 42,
      direction,
      minX: marginX,
      maxX: layout.width - marginX,
      baseY: startY,
      wobbleOffset: rand() * Math.PI * 2,
      wobbleSpeed: 0.0012 + rand() * 0.0018,
      wobbleAmplitude: 4 + rand() * 8,
    });
  });

  return swimmers;
}

export function updateFishSwimmers(swimmers: FishSwimmer[], time: number, delta: number) {
  const deltaSeconds = delta / 1000;

  for (const swimmer of swimmers) {
    const { sprite } = swimmer;
    sprite.x += swimmer.speed * swimmer.direction * deltaSeconds;

    if (sprite.x >= swimmer.maxX) {
      sprite.x = swimmer.maxX;
      swimmer.direction = -1;
      sprite.setFlipX(true);
    } else if (sprite.x <= swimmer.minX) {
      sprite.x = swimmer.minX;
      swimmer.direction = 1;
      sprite.setFlipX(false);
    }

    sprite.y =
      swimmer.baseY +
      Math.sin(time * swimmer.wobbleSpeed + swimmer.wobbleOffset) * swimmer.wobbleAmplitude;
  }
}

function mulberry32(seed: number) {
  let t = seed;

  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
