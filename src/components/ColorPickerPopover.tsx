"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clamp,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
} from "@/lib/colorUtils";
import styles from "./ColorPickerPopover.module.css";

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

type ColorPickerPopoverProps = {
  initialColor: string;
  onPreview: (color: string) => void;
  onAccept: (color: string) => void;
  onCancel: () => void;
};

function getSvFromPointer(rect: DOMRect, clientX: number, clientY: number): Pick<HsvColor, "s" | "v"> {
  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);

  return {
    s: rect.width === 0 ? 0 : x / rect.width,
    v: rect.height === 0 ? 0 : 1 - y / rect.height,
  };
}

function getHueFromPointer(rect: DOMRect, clientX: number) {
  const x = clamp(clientX - rect.left, 0, rect.width);
  return rect.width === 0 ? 0 : (x / rect.width) * 360;
}

export function ColorPickerPopover({
  initialColor,
  onPreview,
  onAccept,
  onCancel,
}: ColorPickerPopoverProps) {
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(normalizeHex(initialColor)));
  const svAreaRef = useRef<HTMLDivElement>(null);
  const hueSliderRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<"sv" | "hue" | null>(null);

  const draftHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const rgb = hexToRgb(draftHex);

  useEffect(() => {
    onPreview(draftHex);
  }, [draftHex, onPreview]);

  const updateHsv = useCallback((updater: (current: HsvColor) => HsvColor) => {
    setHsv(updater);
  }, []);

  const handleSvPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svAreaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const { s, v } = getSvFromPointer(rect, clientX, clientY);
      updateHsv((current) => ({ ...current, s, v }));
    },
    [updateHsv],
  );

  const handleHuePointer = useCallback(
    (clientX: number) => {
      const rect = hueSliderRef.current?.getBoundingClientRect();
      if (!rect) return;

      const hue = getHueFromPointer(rect, clientX);
      updateHsv((current) => ({ ...current, h: hue }));
    },
    [updateHsv],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (dragTargetRef.current === "sv") {
        handleSvPointer(event.clientX, event.clientY);
      }

      if (dragTargetRef.current === "hue") {
        handleHuePointer(event.clientX);
      }
    };

    const handlePointerUp = () => {
      dragTargetRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [handleHuePointer, handleSvPointer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleRgbChange = (channel: "r" | "g" | "b", value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;

    const nextRgb = {
      ...rgb,
      [channel]: clamp(parsed, 0, 255),
    };

    const nextHsv = rgbToHsv(nextRgb.r, nextRgb.g, nextRgb.b);
    updateHsv(() => nextHsv);
  };

  return (
    <div className={styles.popover} onPointerDown={(event) => event.stopPropagation()}>
      <div
        ref={svAreaRef}
        className={styles.svArea}
        style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
        onPointerDown={(event) => {
          dragTargetRef.current = "sv";
          handleSvPointer(event.clientX, event.clientY);
          event.preventDefault();
        }}
      >
        <div className={styles.svOverlayWhite} />
        <div className={styles.svOverlayBlack} />
        <div
          className={styles.svPointer}
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
          }}
        />
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.preview} style={{ backgroundColor: draftHex }} aria-hidden="true" />
        <div
          ref={hueSliderRef}
          className={styles.hueSlider}
          onPointerDown={(event) => {
            dragTargetRef.current = "hue";
            handleHuePointer(event.clientX);
            event.preventDefault();
          }}
        >
          <div className={styles.hueThumb} style={{ left: `${(hsv.h / 360) * 100}%` }} />
        </div>
      </div>

      <div className={styles.rgbRow}>
        {(["r", "g", "b"] as const).map((channel) => (
          <label key={channel} className={styles.rgbField}>
            <span className={styles.rgbLabel}>{channel.toUpperCase()}</span>
            <input
              type="number"
              min={0}
              max={255}
              className={styles.rgbInput}
              value={rgb[channel]}
              onChange={(event) => handleRgbChange(channel, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={styles.acceptButton}
          onClick={() => onAccept(rgbToHex(rgb.r, rgb.g, rgb.b))}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
