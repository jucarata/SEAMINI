import Phaser from "phaser";

const STAND_BASE_HEIGHT = 14;
const STAND_FEET_HEIGHT = 10;
const TANK_RADIUS = 8;

const SAND_RATIO = 0.22;
const WATER_RATIO = 0.82;
const SURFACE_RATIO = 0.06;

type TankLayout = {
  width: number;
  height: number;
  sandHeight: number;
  sandY: number;
  waterHeight: number;
  surfaceHeight: number;
};

function createTankLayout(width: number, height: number): TankLayout {
  const sandHeight = height * SAND_RATIO;
  const sandY = height - sandHeight;

  return {
    width,
    height,
    sandHeight,
    sandY,
    waterHeight: height * WATER_RATIO,
    surfaceHeight: height * SURFACE_RATIO,
  };
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

const ROCK_PLACEMENTS = [
  {
    key: "simple-rock-1",
    xFactor: 0.13,
    widthFactor: 0.13,
    heightFactor: 0.11,
    originY: 0.93,
    sandDepth: 1,
    yOffset: -6,
  },
  {
    key: "simple-rock-1",
    xFactor: 0.8,
    widthFactor: 0.1,
    heightFactor: 0.085,
    originY: 0.93,
    sandDepth: 0.52,
    yOffset: 0,
  },
  {
    key: "simple-rock-1",
    xFactor: 0.48,
    widthFactor: 0.07,
    heightFactor: 0.06,
    originY: 0.93,
    sandDepth: 0.12,
    yOffset: 0,
  },
] as const;

const SEAWEED_PLACEMENTS = [
  {
    key: "simple-seaweed-1",
    xFactor: 0.248,
    widthFactor: 0.055,
    heightFactor: 0.28,
    originY: 0.98,
    sandDepth: 0.08,
    yOffset: 0,
    rotation: -0.14,
  },
  {
    key: "simple-seaweed-2",
    xFactor: 0.262,
    widthFactor: 0.042,
    heightFactor: 0.22,
    originY: 0.98,
    sandDepth: 0.1,
    yOffset: -2,
    rotation: 0.12,
  },
  {
    key: "simple-seaweed-4",
    xFactor: 0.254,
    widthFactor: 0.088,
    heightFactor: 0.14,
    originY: 0.98,
    sandDepth: 0.12,
    yOffset: 1,
    rotation: -0.06,
  },
  {
    key: "simple-seaweed-3",
    xFactor: 0.848,
    widthFactor: 0.05,
    heightFactor: 0.25,
    originY: 0.98,
    sandDepth: 0.08,
    yOffset: 0,
    rotation: 0.16,
  },
  {
    key: "simple-seaweed-2",
    xFactor: 0.862,
    widthFactor: 0.038,
    heightFactor: 0.19,
    originY: 0.98,
    sandDepth: 0.11,
    yOffset: -2,
    rotation: -0.1,
  },
  {
    key: "simple-seaweed-4",
    xFactor: 0.855,
    widthFactor: 0.08,
    heightFactor: 0.13,
    originY: 0.98,
    sandDepth: 0.13,
    yOffset: 2,
    rotation: 0.08,
  },
] as const;

export class AquariumScene extends Phaser.Scene {
  private rippleGraphics?: Phaser.GameObjects.Graphics;
  private surfaceWaveGraphics?: Phaser.GameObjects.Graphics;
  private rippleOffset = 0;
  private surfaceWaveOffset = 0;
  private bubbleTimer?: Phaser.Time.TimerEvent;
  private layoutWidth = 0;
  private layoutHeight = 0;
  private tankLayout?: TankLayout;

  constructor() {
    super({ key: "AquariumScene" });
  }

  create() {
    this.scale.on("resize", this.handleResize, this);
    this.layout(this.scale.width, this.scale.height);

    this.bubbleTimer = this.time.addEvent({
      delay: 850,
      loop: true,
      callback: () => this.spawnBubble(),
    });
  }

  update(_time: number, delta: number) {
    if (!this.rippleGraphics || !this.tankLayout) return;

    this.rippleOffset += delta * 0.004;
    this.surfaceWaveOffset += delta * 0.002;

    this.drawRipple();
    this.drawSurfaceWaves();
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
    this.bubbleTimer?.destroy();
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number) {
    if (width <= 0 || height <= 0) return;

    this.layoutWidth = width;
    this.layoutHeight = height;
    this.children.removeAll(true);

    const tankHeight = height - STAND_BASE_HEIGHT - STAND_FEET_HEIGHT;
    const tankWidth = width;
    const layout = createTankLayout(tankWidth, tankHeight);
    this.tankLayout = layout;

    this.drawStand(tankWidth, tankHeight);
    this.drawBackWall(layout);
    this.drawWaterBody(layout);
    this.drawWaterDepthHaze(layout);
    this.drawSandBed(layout);
    this.drawPebbles(layout);
    this.drawRocks(layout);
    this.drawSeaweed(layout);
    this.drawSuspendedParticles(layout);
    this.drawWaterSurfaceBase(layout);
    this.drawGlassFrame(tankWidth, tankHeight);

    this.rippleGraphics = this.add.graphics().setDepth(20);
    this.surfaceWaveGraphics = this.add.graphics().setDepth(21);

    this.drawRipple();
    this.drawSurfaceWaves();

    for (let i = 0; i < 5; i += 1) {
      this.time.delayedCall(i * 350, () => this.spawnBubble());
    }
  }

  private drawStand(tankWidth: number, tankHeight: number) {
    const baseY = tankHeight - 2;
    const feetY = baseY + STAND_BASE_HEIGHT + 2;
    const footWidth = tankWidth * 0.28;
    const footInset = tankWidth * 0.12;

    const shadow = this.add.graphics().setDepth(-1);
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillEllipse(tankWidth / 2, feetY + STAND_FEET_HEIGHT + 6, tankWidth * 0.72, 16);

    const base = this.add.graphics().setDepth(0);
    base.fillGradientStyle(0x475569, 0x334155, 0x1e293b, 0x0f172a, 1);
    base.fillRect(0, baseY, tankWidth, STAND_BASE_HEIGHT);
    base.fillStyle(0xffffff, 0.06);
    base.fillRect(0, baseY, tankWidth, 2);

    const panelCount = Math.max(3, Math.floor(tankWidth / 180));
    const panelWidth = tankWidth / panelCount;
    base.lineStyle(1, 0x000000, 0.18);
    for (let i = 1; i < panelCount; i += 1) {
      base.lineBetween(i * panelWidth, baseY + 3, i * panelWidth, baseY + STAND_BASE_HEIGHT - 1);
    }

    const feet = this.add.graphics().setDepth(0);
    feet.fillGradientStyle(0x1e293b, 0x1e293b, 0x020617, 0x020617, 1);
    feet.fillRoundedRect(footInset, feetY, footWidth, STAND_FEET_HEIGHT, 4);
    feet.fillRoundedRect(tankWidth - footInset - footWidth, feetY, footWidth, STAND_FEET_HEIGHT, 4);
    feet.fillStyle(0xffffff, 0.05);
    feet.fillRect(footInset, feetY, footWidth, 1);
    feet.fillRect(tankWidth - footInset - footWidth, feetY, footWidth, 1);
  }

  private drawBackWall(layout: TankLayout) {
    const wall = this.add.graphics().setDepth(0);
    wall.fillGradientStyle(0x082f49, 0x082f49, 0x041f33, 0x041f33, 1);
    wall.fillRect(0, 0, layout.width, layout.waterHeight);
    wall.fillStyle(0x000000, 0.12);
    wall.fillRect(0, layout.waterHeight * 0.55, layout.width, layout.waterHeight * 0.45);
  }

  private drawWaterBody(layout: TankLayout) {
    const water = this.add.graphics().setDepth(1);

    water.fillGradientStyle(0x38bdf8, 0x0ea5e9, 0x0369a1, 0x0c4a6e, 0.95, 0.92, 0.88, 0.85);
    water.fillRect(0, 0, layout.width, layout.waterHeight);

    const bandCount = 6;
    for (let i = 0; i < bandCount; i += 1) {
      const t = i / bandCount;
      const bandY = layout.waterHeight * (0.15 + t * 0.65);
      const bandH = layout.waterHeight * 0.08;
      water.fillStyle(0x0284c7, 0.04 + t * 0.03);
      water.fillRect(0, bandY, layout.width, bandH);
    }
  }

  private drawWaterDepthHaze(layout: TankLayout) {
    const haze = this.add.graphics().setDepth(2);
    haze.fillGradientStyle(0xffffff, 0xffffff, 0x000000, 0x000000, 0.04, 0.02, 0, 0.08);
    haze.fillRect(0, layout.waterHeight * 0.35, layout.width, layout.waterHeight * 0.65);
  }

  private drawSandBed(layout: TankLayout) {
    const sand = this.add.graphics().setDepth(3);
    sand.fillGradientStyle(0xe8c9a0, 0xd4a574, 0xb8845a, 0x8b6914, 1);
    sand.fillRect(0, layout.sandY, layout.width, layout.sandHeight);

    const substrate = this.add.graphics().setDepth(3);
    substrate.fillStyle(0x6b5344, 0.45);
    substrate.fillRect(0, layout.sandY + layout.sandHeight * 0.72, layout.width, layout.sandHeight * 0.28);

    const dune = this.add.graphics().setDepth(4);
    dune.fillStyle(0xffffff, 0.12);
    dune.beginPath();
    dune.moveTo(0, layout.sandY + layout.sandHeight * 0.2);
    for (let x = 0; x <= layout.width; x += 24) {
      const wave = Math.sin(x * 0.012) * layout.sandHeight * 0.06;
      dune.lineTo(x, layout.sandY + layout.sandHeight * 0.08 + wave);
    }
    dune.lineTo(layout.width, layout.sandY);
    dune.lineTo(0, layout.sandY);
    dune.closePath();
    dune.fillPath();

    this.drawSandGrain(layout);
  }

  private drawSandGrain(layout: TankLayout) {
    const grain = this.add.graphics().setDepth(4);
    const rand = mulberry32(Math.floor(layout.width * 13 + layout.height * 7));
    const grainCount = Math.min(900, Math.floor(layout.width * layout.sandHeight * 0.015));

    for (let i = 0; i < grainCount; i += 1) {
      const px = rand() * layout.width;
      const py = layout.sandY + rand() * layout.sandHeight;
      const shade = rand();
      const color = shade > 0.66 ? 0xf5deb3 : shade > 0.33 ? 0xc9956a : 0x8b6914;
      const size = 1 + rand() * 2.5;

      grain.fillStyle(color, 0.25 + rand() * 0.35);
      grain.fillEllipse(px, py, size, size * 0.7);
    }
  }

  private drawPebbles(layout: TankLayout) {
    const pebbles = this.add.graphics().setDepth(5);
    const rand = mulberry32(90210 + Math.floor(layout.width));

    const pebbleCount = Math.max(18, Math.floor(layout.width / 55));
    for (let i = 0; i < pebbleCount; i += 1) {
      const px = rand() * layout.width;
      const py = layout.sandY + layout.sandHeight * (0.35 + rand() * 0.55);
      const w = 4 + rand() * 10;
      const h = 3 + rand() * 6;
      const tone = rand();
      const color = tone > 0.5 ? 0x78716c : tone > 0.25 ? 0xa8a29e : 0x57534e;

      pebbles.fillStyle(color, 0.85);
      pebbles.fillEllipse(px, py, w, h);
      pebbles.fillStyle(0xffffff, 0.12);
      pebbles.fillEllipse(px - w * 0.15, py - h * 0.2, w * 0.35, h * 0.35);
    }
  }

  private drawRocks(layout: TankLayout) {
    for (const rock of ROCK_PLACEMENTS) {
      const groundY = layout.sandY + layout.sandHeight * rock.sandDepth + rock.yOffset;

      this.placeRock(
        rock.key,
        layout.width * rock.xFactor,
        groundY,
        layout.width * rock.widthFactor,
        layout.height * rock.heightFactor,
        rock.originY,
      );
    }
  }

  private placeRock(
    textureKey: string,
    x: number,
    groundY: number,
    displayWidth: number,
    displayHeight: number,
    originY: number,
  ) {
    if (!this.textures.exists(textureKey)) return;

    const rock = this.add.image(x, groundY, textureKey);
    rock.setOrigin(0.5, originY);
    rock.setDisplaySize(displayWidth, displayHeight);
    rock.setDepth(6);
  }

  private drawSeaweed(layout: TankLayout) {
    for (const seaweed of SEAWEED_PLACEMENTS) {
      const groundY = layout.sandY + layout.sandHeight * seaweed.sandDepth + seaweed.yOffset;

      this.placeSeaweed(
        seaweed.key,
        layout.width * seaweed.xFactor,
        groundY,
        layout.width * seaweed.widthFactor,
        layout.height * seaweed.heightFactor,
        seaweed.originY,
        seaweed.rotation,
      );
    }
  }

  private placeSeaweed(
    textureKey: string,
    x: number,
    groundY: number,
    displayWidth: number,
    displayHeight: number,
    originY: number,
    rotation: number,
  ) {
    if (!this.textures.exists(textureKey)) return;

    const seaweed = this.add.image(x, groundY, textureKey);
    seaweed.setOrigin(0.5, originY);
    seaweed.setDisplaySize(displayWidth, displayHeight);
    seaweed.setRotation(rotation);
    seaweed.setDepth(5);
  }

  private drawSuspendedParticles(layout: TankLayout) {
    const particles = this.add.graphics().setDepth(4);
    const rand = mulberry32(40404 + Math.floor(layout.width * layout.height * 0.001));
    const count = Math.min(120, Math.floor(layout.width * 0.04));

    for (let i = 0; i < count; i += 1) {
      const px = rand() * layout.width;
      const py = rand() * layout.waterHeight * 0.85;
      const size = 0.8 + rand() * 1.8;
      particles.fillStyle(0xffffff, 0.03 + rand() * 0.05);
      particles.fillCircle(px, py, size);
    }
  }

  private drawWaterSurfaceBase(layout: TankLayout) {
    const surface = this.add.graphics().setDepth(18);
    surface.fillGradientStyle(0xe0f2fe, 0xbae6fd, 0x7dd3fc, 0x38bdf8, 0.55, 0.45, 0.35, 0.25);
    surface.fillRect(0, 0, layout.width, layout.surfaceHeight);
  }

  private drawGlassFrame(width: number, height: number) {
    const frame = this.add.graphics().setDepth(30);

    frame.fillGradientStyle(0xffffff, 0xffffff, 0x000000, 0x000000, 0.05, 0.04, 0.02, 0.03);
    frame.fillRoundedRect(0, 0, width, height, TANK_RADIUS);

    frame.lineStyle(3, 0xdbeafe, 0.28);
    frame.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, TANK_RADIUS);

    frame.lineStyle(1, 0xffffff, 0.12);
    frame.strokeRoundedRect(4, 4, width - 8, height - 8, TANK_RADIUS - 2);

    const vignette = this.add.graphics().setDepth(31);
    const edge = Math.min(28, width * 0.025);
    vignette.fillStyle(0x000000, 0.07);
    vignette.fillRect(0, 0, edge, height);
    vignette.fillRect(width - edge, 0, edge, height);
    vignette.fillRect(0, height - edge, width, edge);

    const reflection = this.add.graphics().setDepth(32);
    reflection.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.14, 0.1, 0, 0);
    reflection.fillRect(0, 0, width, height * 0.1);

    const floorGlare = this.add.graphics().setDepth(32);
    floorGlare.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0, 0, 0.04, 0.06);
    floorGlare.fillRect(0, height * 0.88, width, height * 0.12);
  }

  private drawRipple() {
    if (!this.rippleGraphics || !this.tankLayout) return;

    const { width, surfaceHeight } = this.tankLayout;
    this.rippleGraphics.clear();
    this.rippleGraphics.lineStyle(1, 0xffffff, 0.05);

    const gap = 22;
    const offset = (this.rippleOffset * 24) % gap;

    for (let px = -gap + offset; px < width; px += gap) {
      this.rippleGraphics.lineBetween(px, surfaceHeight * 0.35, px + 8, surfaceHeight * 0.65);
    }
  }

  private drawSurfaceWaves() {
    if (!this.surfaceWaveGraphics || !this.tankLayout) return;

    const { width, surfaceHeight } = this.tankLayout;
    this.surfaceWaveGraphics.clear();
    this.surfaceWaveGraphics.lineStyle(1.5, 0xffffff, 0.07);

    for (let wave = 0; wave < 3; wave += 1) {
      this.surfaceWaveGraphics.beginPath();
      const baseY = surfaceHeight * (0.35 + wave * 0.18);
      this.surfaceWaveGraphics.moveTo(0, baseY);

      for (let x = 0; x <= width; x += 8) {
        const y =
          baseY +
          Math.sin(x * 0.018 + this.surfaceWaveOffset + wave * 1.4) * (1.2 + wave * 0.4);
        this.surfaceWaveGraphics.lineTo(x, y);
      }

      this.surfaceWaveGraphics.strokePath();
    }
  }

  private spawnBubble() {
    if (!this.tankLayout) return;

    const { width, height, sandY } = this.tankLayout;
    const size = Phaser.Math.Between(3, 7);
    const x = Phaser.Math.Between(Math.floor(width * 0.12), Math.floor(width * 0.88));
    const startY = Phaser.Math.Between(Math.floor(sandY * 0.62), Math.floor(sandY * 0.9));
    const duration = Phaser.Math.Between(4500, 7500);

    const bubble = this.add.graphics().setDepth(11);
    this.drawBubbleShape(bubble, 0, 0, size);

    const container = this.add.container(x, startY, [bubble]).setDepth(11);

    this.tweens.add({
      targets: container,
      y: height * 0.07,
      duration,
      ease: "Sine.easeInOut",
      onComplete: () => container.destroy(),
    });

    this.tweens.add({
      targets: container,
      alpha: 0,
      duration,
      ease: "Linear",
    });

    this.tweens.add({
      targets: container,
      x: x + Phaser.Math.Between(-8, 8),
      duration: 1100,
      yoyo: true,
      repeat: Math.ceil(duration / 1100),
      ease: "Sine.easeInOut",
    });
  }

  private drawBubbleShape(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number) {
    graphics.clear();
    graphics.fillStyle(0xffffff, 0.18);
    graphics.fillCircle(x, y, size / 2);
    graphics.lineStyle(1, 0xffffff, 0.35);
    graphics.strokeCircle(x, y, size / 2);
    graphics.fillStyle(0xffffff, 0.55);
    graphics.fillCircle(x - size * 0.15, y - size * 0.15, size * 0.15);
  }
}
