import { dispatchFishSelected } from "@/lib/fishEvents";
import Phaser from "phaser";
import {
  clampFishToBounds,
  releaseFishDrag,
  syncFishDepth,
  type FishSwimmer,
} from "./fishSwimmers";

const DRAG_DEPTH = 50;
const DRAG_THRESHOLD = 6;

export type FishDragController = {
  reset: () => void;
  destroy: () => void;
};

function findSwimmerAt(swimmers: FishSwimmer[], x: number, y: number): FishSwimmer | null {
  let best: FishSwimmer | null = null;
  let bestDepth = -Infinity;

  for (const swimmer of swimmers) {
    const { sprite } = swimmer;
    if (!sprite.active) continue;

    const halfWidth = sprite.displayWidth * 0.5;
    const halfHeight = sprite.displayHeight * 0.5;

    if (
      x < sprite.x - halfWidth ||
      x > sprite.x + halfWidth ||
      y < sprite.y - halfHeight ||
      y > sprite.y + halfHeight
    ) {
      continue;
    }

    const depth = sprite.depth;

    if (depth > bestDepth) {
      bestDepth = depth;
      best = swimmer;
    }
  }

  return best;
}

export function bindFishDragControls(
  scene: Phaser.Scene,
  getSwimmers: () => FishSwimmer[],
  isEnabled: () => boolean,
): FishDragController {
  let dragged: FishSwimmer | null = null;
  let pressed: FishSwimmer | null = null;
  let pressX = 0;
  let pressY = 0;
  let offsetX = 0;
  let offsetY = 0;

  const updateHoverCursor = (pointer: Phaser.Input.Pointer) => {
    if (dragged) {
      scene.input.setDefaultCursor("grabbing");
      return;
    }

    if (!isEnabled()) {
      scene.input.setDefaultCursor("default");
      return;
    }

    scene.input.setDefaultCursor(
      findSwimmerAt(getSwimmers(), pointer.x, pointer.y) ? "grab" : "default",
    );
  };

  const startDrag = (swimmer: FishSwimmer, pointer: Phaser.Input.Pointer) => {
    dragged = swimmer;
    swimmer.isDragging = true;
    offsetX = swimmer.sprite.x - pointer.x;
    offsetY = swimmer.sprite.y - pointer.y;
    swimmer.vx = 0;
    swimmer.vy = 0;
    swimmer.sprite.setAlpha(0.92);
    swimmer.sprite.setDepth(DRAG_DEPTH);
    scene.input.setDefaultCursor("grabbing");
  };

  const onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (!isEnabled() || !pointer.primaryDown) return;

    const swimmer = findSwimmerAt(getSwimmers(), pointer.x, pointer.y);
    if (!swimmer) return;

    pressed = swimmer;
    pressX = pointer.x;
    pressY = pointer.y;
  };

  const onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (pressed && !dragged) {
      const distance = Math.hypot(pointer.x - pressX, pointer.y - pressY);
      if (distance >= DRAG_THRESHOLD) {
        startDrag(pressed, pointer);
        pressed = null;
      }
    }

    if (dragged) {
      dragged.sprite.x = pointer.x + offsetX;
      dragged.sprite.y = pointer.y + offsetY;
      clampFishToBounds(dragged);
      syncFishDepth(dragged);
      return;
    }

    updateHoverCursor(pointer);
  };

  const onPointerUp = () => {
    if (dragged) {
      const swimmer = dragged;
      dragged = null;
      releaseFishDrag(swimmer);
      scene.input.setDefaultCursor("default");
      pressed = null;
      return;
    }

    if (pressed) {
      dispatchFishSelected(pressed.fileName);
      pressed = null;
    }

    scene.input.setDefaultCursor("default");
  };

  const reset = () => {
    if (dragged) {
      if (dragged.sprite.active) {
        releaseFishDrag(dragged);
      } else {
        dragged.isDragging = false;
      }
      dragged = null;
    }

    pressed = null;
    scene.input.setDefaultCursor("default");
  };

  scene.input.on("pointerdown", onPointerDown);
  scene.input.on("pointermove", onPointerMove);
  scene.input.on("pointerup", onPointerUp);
  scene.input.on("pointerupoutside", onPointerUp);

  return {
    reset,
    destroy: () => {
      reset();
      scene.input.off("pointerdown", onPointerDown);
      scene.input.off("pointermove", onPointerMove);
      scene.input.off("pointerup", onPointerUp);
      scene.input.off("pointerupoutside", onPointerUp);
    },
  };
}
