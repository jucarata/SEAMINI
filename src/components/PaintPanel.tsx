"use client";

import { Eraser, PaintBucket, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ColorPickerPopover } from "./ColorPickerPopover";
import styles from "./PaintPanel.module.css";

export type DrawingTool = "brush" | "eraser" | "bucket";

const MAX_RECENT_COLORS = 5;
export const MIN_BRUSH_SIZE = 2;
export const MAX_BRUSH_SIZE = 40;
export const DEFAULT_BRUSH_SIZE = 6;

type PaintPanelProps = {
  color: string;
  tool: DrawingTool;
  brushSize: number;
  onColorChange: (color: string) => void;
  onToolChange: (tool: DrawingTool) => void;
  onBrushSizeChange: (size: number) => void;
  onSave: () => void;
};

function normalizeColor(color: string) {
  return color.toLowerCase();
}

function addRecentColor(recentColors: string[], color: string) {
  const normalized = normalizeColor(color);
  const filtered = recentColors.filter((entry) => normalizeColor(entry) !== normalized);

  return [color, ...filtered].slice(0, MAX_RECENT_COLORS);
}

export function PaintPanel({
  color,
  tool,
  brushSize,
  onColorChange,
  onToolChange,
  onBrushSizeChange,
  onSave,
}: PaintPanelProps) {
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [previewColor, setPreviewColor] = useState(color);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  const applyColor = useCallback(
    (nextColor: string) => {
      onColorChange(nextColor);
    },
    [onColorChange],
  );

  const commitColor = useCallback(
    (nextColor: string) => {
      onColorChange(nextColor);
      setRecentColors((current) => addRecentColor(current, nextColor));
    },
    [onColorChange],
  );

  const openPicker = useCallback(() => {
    setPreviewColor(color);
    setIsPickerOpen(true);
  }, [color]);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
    setPreviewColor(color);
  }, [color]);

  const handleAccept = useCallback(
    (nextColor: string) => {
      commitColor(nextColor);
      setIsPickerOpen(false);
    },
    [commitColor],
  );

  useEffect(() => {
    if (!isPickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (pickerWrapRef.current?.contains(event.target as Node)) return;
      closePicker();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isPickerOpen, closePicker]);

  const wheelColor = isPickerOpen ? previewColor : color;
  const previewRadius = Math.max(2, Math.min(14, brushSize / 2.5));

  return (
    <div className={styles.panel} role="toolbar" aria-label="Panel de dibujo">
      <div className={styles.toolGroup} aria-label="Herramientas">
        <button
          type="button"
          className={`${styles.toolButton} ${tool === "brush" ? styles.toolButtonActive : ""}`}
          aria-label="Lápiz"
          aria-pressed={tool === "brush"}
          title="Lápiz"
          onClick={() => onToolChange("brush")}
        >
          <Pencil className={styles.toolIcon} size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`${styles.toolButton} ${tool === "bucket" ? styles.toolButtonActive : ""}`}
          aria-label="Tarro de pintura"
          aria-pressed={tool === "bucket"}
          title="Tarro de pintura"
          onClick={() => onToolChange("bucket")}
        >
          <PaintBucket className={styles.toolIcon} size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        <button
          type="button"
          className={`${styles.toolButton} ${tool === "eraser" ? styles.toolButtonActive : ""}`}
          aria-label="Borrador"
          aria-pressed={tool === "eraser"}
          title="Borrador"
          onClick={() => onToolChange("eraser")}
        >
          <Eraser className={styles.toolIcon} size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div
        className={`${styles.sizeGroup} ${tool === "bucket" ? styles.sizeGroupDisabled : ""}`}
        aria-label="Grosor del trazo"
      >
        <span className={styles.sizeLabel}>Grosor</span>
        <div
          className={styles.sizePreview}
          aria-hidden="true"
          style={{ width: previewRadius * 2, height: previewRadius * 2 }}
        />
        <input
          type="range"
          className={styles.sizeSlider}
          min={MIN_BRUSH_SIZE}
          max={MAX_BRUSH_SIZE}
          value={brushSize}
          aria-label="Grosor del trazo"
          aria-valuemin={MIN_BRUSH_SIZE}
          aria-valuemax={MAX_BRUSH_SIZE}
          aria-valuenow={brushSize}
          disabled={tool === "bucket"}
          onChange={(event) => onBrushSizeChange(Number(event.target.value))}
        />
        <span className={styles.sizeValue}>{brushSize}px</span>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <div className={`${styles.colorSection} ${tool === "eraser" ? styles.colorSectionDisabled : ""}`}>
        <div className={styles.colorWheelWrap} ref={pickerWrapRef}>
          <button
            type="button"
            className={styles.colorWheel}
            aria-label="Elegir color del lápiz"
            aria-expanded={isPickerOpen}
            disabled={tool === "eraser"}
            onClick={() => {
              if (tool === "eraser") return;

              if (isPickerOpen) {
                closePicker();
                return;
              }

              openPicker();
            }}
          >
            <span
              className={styles.colorWheelInner}
              style={{ backgroundColor: wheelColor }}
              aria-hidden="true"
            />
          </button>

          {isPickerOpen && tool !== "eraser" ? (
            <ColorPickerPopover
              initialColor={color}
              onPreview={setPreviewColor}
              onAccept={handleAccept}
              onCancel={closePicker}
            />
          ) : null}
        </div>

        {recentColors.length > 0 ? (
          <div className={styles.recentColors} aria-label="Colores recientes">
            {recentColors.map((recentColor) => {
              const isSelected = normalizeColor(recentColor) === normalizeColor(color);

              return (
                <button
                  key={recentColor}
                  type="button"
                  className={`${styles.recentSwatch} ${isSelected ? styles.recentSwatchActive : ""}`}
                  style={{ backgroundColor: recentColor }}
                  aria-label={`Color reciente ${recentColor}`}
                  aria-pressed={isSelected}
                  disabled={tool === "eraser"}
                  onClick={() => applyColor(recentColor)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.panelActions}>
        <button type="button" className={styles.saveButton} onClick={onSave}>
          Guardar pez
        </button>
      </div>
    </div>
  );
}
