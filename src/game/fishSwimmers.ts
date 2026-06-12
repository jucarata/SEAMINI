import Phaser from "phaser";

type SwimBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function textureKeyToFileName(textureKey: string): string {
  return textureKey.startsWith("fish-") ? textureKey.slice(5) : textureKey;
}

export type FishSwimmer = {
  fileName: string;
  sprite: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  cruiseSpeed: number;
  bounds: SwimBounds;
  targetX: number;
  targetY: number;
  radius: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  isDragging: boolean;
  pickTarget: () => void;
};

const BASE_DEPTH = 10;
const TARGET_REACH = 24;
const STEERING = 0.045;
const SEPARATION_STRENGTH = 18;

export function createFishSwimmers(
  scene: Phaser.Scene,
  layout: {
    width: number;
    height: number;
    waterHeight: number;
    surfaceHeight: number;
    sandY: number;
  },
): FishSwimmer[] {
  const fishKeys = scene.registry.get("fishTextureKeys") as string[] | undefined;
  if (!fishKeys?.length) return [];

  const swimmers: FishSwimmer[] = [];
  const marginX = layout.width * 0.06;

  const bounds: SwimBounds = {
    minX: marginX,
    maxX: layout.width - marginX,
    minY: layout.surfaceHeight + layout.waterHeight * 0.08,
    maxY: layout.sandY - layout.height * 0.05,
  };

  fishKeys.forEach((textureKey, index) => {
    if (!scene.textures.exists(textureKey)) return;

    const seed = index + 1;
    const rand = mulberry32(8800 + seed * 131);
    const targetWidth = layout.width * (0.07 + rand() * 0.05);

    const fish = scene.add.image(0, 0, textureKey);
    fish.setOrigin(0.5, 0.5);
    fish.setDisplaySize(targetWidth, (fish.height / fish.width) * targetWidth);
    fish.setDepth(BASE_DEPTH);

    const startX = bounds.minX + rand() * (bounds.maxX - bounds.minX);
    const startY = bounds.minY + rand() * (bounds.maxY - bounds.minY);
    fish.setPosition(startX, startY);

    const swimmer: FishSwimmer = {
      fileName: textureKeyToFileName(textureKey),
      sprite: fish,
      vx: 0,
      vy: 0,
      cruiseSpeed: 34 + rand() * 38,
      bounds,
      targetX: startX,
      targetY: startY,
      radius: Math.max(14, targetWidth * 0.42),
      wobbleOffset: rand() * Math.PI * 2,
      wobbleSpeed: 0.0014 + rand() * 0.0016,
      wobbleAmplitude: 2 + rand() * 4,
      isDragging: false,
      pickTarget: () => {},
    };

    swimmer.pickTarget = () => {
      swimmer.targetX = bounds.minX + rand() * (bounds.maxX - bounds.minX);
      swimmer.targetY = bounds.minY + rand() * (bounds.maxY - bounds.minY);
    };

    swimmer.pickTarget();

    const initialAngle = rand() * Math.PI * 2;
    swimmer.vx = Math.cos(initialAngle) * swimmer.cruiseSpeed * 0.6;
    swimmer.vy = Math.sin(initialAngle) * swimmer.cruiseSpeed * 0.6;

    swimmers.push(swimmer);
  });

  return swimmers;
}

export function updateFishSwimmers(swimmers: FishSwimmer[], time: number, delta: number) {
  const deltaSeconds = delta / 1000;

  for (const swimmer of swimmers) {
    if (swimmer.isDragging) {
      syncFishDepth(swimmer);
      continue;
    }

    updateSwimmerTarget(swimmer);
    applySteering(swimmer, swimmers);
    integrateSwimmer(swimmer, time, deltaSeconds);
    syncFishDepth(swimmer);
  }
}

export function clampFishToBounds(swimmer: FishSwimmer) {
  const { sprite, bounds } = swimmer;

  sprite.x = Phaser.Math.Clamp(sprite.x, bounds.minX, bounds.maxX);
  sprite.y = Phaser.Math.Clamp(sprite.y, bounds.minY, bounds.maxY);
}

export function syncFishDepth(swimmer: FishSwimmer) {
  swimmer.sprite.setDepth(BASE_DEPTH + swimmer.sprite.y * 0.02);
}

export function releaseFishDrag(swimmer: FishSwimmer) {
  swimmer.isDragging = false;
  swimmer.vx = 0;
  swimmer.vy = 0;
  swimmer.targetX = swimmer.sprite.x;
  swimmer.targetY = swimmer.sprite.y;
  swimmer.sprite.setAlpha(1);
  syncFishDepth(swimmer);
}

function updateSwimmerTarget(swimmer: FishSwimmer) {
  const dx = swimmer.targetX - swimmer.sprite.x;
  const dy = swimmer.targetY - swimmer.sprite.y;
  const distance = Math.hypot(dx, dy);

  if (distance < TARGET_REACH) {
    swimmer.pickTarget();
  }
}

function applySteering(swimmer: FishSwimmer, swimmers: FishSwimmer[]) {
  const dx = swimmer.targetX - swimmer.sprite.x;
  const dy = swimmer.targetY - swimmer.sprite.y;
  const distance = Math.max(0.001, Math.hypot(dx, dy));

  let desiredVx = (dx / distance) * swimmer.cruiseSpeed;
  let desiredVy = (dy / distance) * swimmer.cruiseSpeed;

  for (const other of swimmers) {
    if (other === swimmer) continue;

    const offsetX = swimmer.sprite.x - other.sprite.x;
    const offsetY = swimmer.sprite.y - other.sprite.y;
    const separationDistance = Math.hypot(offsetX, offsetY);
    const minDistance = swimmer.radius + other.radius;

    if (separationDistance <= 0 || separationDistance >= minDistance) {
      continue;
    }

    const pushStrength =
      ((minDistance - separationDistance) / minDistance) * SEPARATION_STRENGTH;

    desiredVx += (offsetX / separationDistance) * pushStrength;
    desiredVy += (offsetY / separationDistance) * pushStrength;
  }

  swimmer.vx += (desiredVx - swimmer.vx) * STEERING;
  swimmer.vy += (desiredVy - swimmer.vy) * STEERING;

  const speed = Math.hypot(swimmer.vx, swimmer.vy);
  const maxSpeed = swimmer.cruiseSpeed * 1.15;

  if (speed > maxSpeed) {
    swimmer.vx = (swimmer.vx / speed) * maxSpeed;
    swimmer.vy = (swimmer.vy / speed) * maxSpeed;
  }
}

function integrateSwimmer(swimmer: FishSwimmer, time: number, deltaSeconds: number) {
  const { sprite, bounds } = swimmer;
  const wobble = Math.sin(time * swimmer.wobbleSpeed + swimmer.wobbleOffset) * swimmer.wobbleAmplitude;

  sprite.x += swimmer.vx * deltaSeconds;
  sprite.y += swimmer.vy * deltaSeconds + wobble * deltaSeconds * 18;

  clampFishToBounds(swimmer);

  if (sprite.x <= bounds.minX) {
    swimmer.vx = Math.abs(swimmer.vx);
    swimmer.pickTarget();
  } else if (sprite.x >= bounds.maxX) {
    swimmer.vx = -Math.abs(swimmer.vx);
    swimmer.pickTarget();
  }

  if (sprite.y <= bounds.minY) {
    swimmer.vy = Math.abs(swimmer.vy) * 0.6;
    swimmer.pickTarget();
  } else if (sprite.y >= bounds.maxY) {
    swimmer.vy = -Math.abs(swimmer.vy) * 0.6;
    swimmer.pickTarget();
  }

  if (Math.abs(swimmer.vx) > 4) {
    sprite.setFlipX(swimmer.vx < 0);
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
