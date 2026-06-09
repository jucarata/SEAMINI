import type Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { AquariumScene } from "./scenes/AquariumScene";

export function createAquariumGame(
  parent: HTMLElement,
  PhaserLib: typeof Phaser,
): Phaser.Game {
  const width = parent.clientWidth;
  const height = parent.clientHeight;

  return new PhaserLib.Game({
    type: PhaserLib.AUTO,
    parent,
    width,
    height,
    transparent: true,
    scale: {
      mode: PhaserLib.Scale.RESIZE,
      autoCenter: PhaserLib.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
    scene: [BootScene, AquariumScene],
  });
}
