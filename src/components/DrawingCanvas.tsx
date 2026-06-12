"use client";

import { Palette, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { exportFishDrawing } from "@/lib/exportFishDrawing";
import { floodFill } from "@/lib/floodFill";
import {
  DEFAULT_BRUSH_SIZE,
  type DrawingTool,
  PaintPanel,
} from "./PaintPanel";
import { SaveFishModal } from "./SaveFishModal";
import styles from "./DrawingCanvas.module.css";

type DrawingCanvasProps = {
  onClose: () => void;
  onFishSaved?: () => void;
};

type StrokePoint = {
  x: number;
  y: number;
  pressure: number;
};

const MIN_LINE_WIDTH = 1;
const MAX_LINE_WIDTH = 48;
const DEFAULT_STROKE_COLOR = "#000000";
const INTERPOLATION_STEP = 2.5;

function getPoint(canvas: HTMLCanvasElement, event: PointerEvent): StrokePoint {
  const rect = canvas.getBoundingClientRect();
  const pressure = event.pressure > 0 ? event.pressure : 0.5;

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    pressure,
  };
}

function getLineWidth(brushSize: number, pressure: number) {
  const scaled = brushSize * (0.55 + pressure * 0.75);
  return Math.min(MAX_LINE_WIDTH, Math.max(MIN_LINE_WIDTH, scaled));
}

function interpolatePoints(from: StrokePoint, to: StrokePoint, step = INTERPOLATION_STEP): StrokePoint[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= step) {
    return [to];
  }

  const segments = Math.ceil(distance / step);
  const points: StrokePoint[] = [];

  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    points.push({
      x: from.x + dx * t,
      y: from.y + dy * t,
      pressure: from.pressure + (to.pressure - from.pressure) * t,
    });
  }

  return points;
}

export function DrawingCanvas({ onClose, onFishSaved }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const lastPointRef = useRef<StrokePoint | null>(null);
  const lastMidPointRef = useRef<StrokePoint | null>(null);
  const strokeColorRef = useRef(DEFAULT_STROKE_COLOR);
  const toolRef = useRef<DrawingTool>("brush");
  const brushSizeRef = useRef(DEFAULT_BRUSH_SIZE);

  const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE_COLOR);
  const [tool, setTool] = useState<DrawingTool>("brush");
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateStrokeColor = useCallback((color: string) => {
    strokeColorRef.current = color;
    setStrokeColor(color);
  }, []);

  const updateTool = useCallback((nextTool: DrawingTool) => {
    toolRef.current = nextTool;
    setTool(nextTool);
  }, []);

  const updateBrushSize = useCallback((size: number) => {
    brushSizeRef.current = size;
    setBrushSize(size);
  }, []);

  const openSaveModal = useCallback(() => {
    setSaveError(null);
    setIsSaveModalOpen(true);
  }, []);

  const closeSaveModal = useCallback(() => {
    if (isSaving) return;
    setIsSaveModalOpen(false);
    setSaveError(null);
  }, [isSaving]);

  const handleSaveFish = useCallback(async (name: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = exportFishDrawing(canvas);
    if (!image) {
      setSaveError("Dibuja tu pez antes de guardarlo.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { saveFish } = await import("@/lib/fishStore");
      await saveFish(name, image);
      onFishSaved?.();
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el pez.");
    } finally {
      setIsSaving(false);
    }
  }, [onClose, onFishSaved]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const prepareStrokeContext = useCallback((ctx: CanvasRenderingContext2D) => {
    const activeTool = toolRef.current;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (activeTool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
      return;
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = strokeColorRef.current;
    ctx.fillStyle = strokeColorRef.current;
  }, []);

  const drawDot = useCallback((point: StrokePoint) => {
    const ctx = getContext();
    if (!ctx) return;

    prepareStrokeContext(ctx);

    const radius = getLineWidth(brushSizeRef.current, point.pressure) / 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }, [getContext, prepareStrokeContext]);

  const drawSmoothSegment = useCallback((from: StrokePoint, to: StrokePoint) => {
    const ctx = getContext();
    if (!ctx) return;

    const midPoint: StrokePoint = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      pressure: (from.pressure + to.pressure) / 2,
    };

    prepareStrokeContext(ctx);
    ctx.lineWidth = getLineWidth(brushSizeRef.current, midPoint.pressure);
    ctx.beginPath();

    if (lastMidPointRef.current) {
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.quadraticCurveTo(from.x, from.y, midPoint.x, midPoint.y);
    } else {
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(from.x, from.y, midPoint.x, midPoint.y);
    }

    ctx.stroke();
    lastMidPointRef.current = midPoint;
  }, [getContext, prepareStrokeContext]);

  const drawToPoint = useCallback((target: StrokePoint) => {
    const lastPoint = lastPointRef.current;
    if (!lastPoint) return;

    const points = interpolatePoints(lastPoint, target);
    let previous = lastPoint;

    for (const point of points) {
      drawSmoothSegment(previous, point);
      previous = point;
    }

    lastPointRef.current = target;
  }, [drawSmoothSegment]);

  const floodFillAt = useCallback((point: StrokePoint) => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const x = Math.floor(point.x * dpr);
    const y = Math.floor(point.y * dpr);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    floodFill(imageData, x, y, strokeColorRef.current);
    ctx.putImageData(imageData, 0, 0);
  }, [getContext]);

  const finishStroke = useCallback((target: StrokePoint) => {
    const ctx = getContext();
    const lastPoint = lastPointRef.current;
    if (!ctx || !lastPoint) return;

    drawToPoint(target);

    if (lastMidPointRef.current) {
      prepareStrokeContext(ctx);
      ctx.lineWidth = getLineWidth(brushSizeRef.current, target.pressure);
      ctx.beginPath();
      ctx.moveTo(lastMidPointRef.current.x, lastMidPointRef.current.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }, [drawToPoint, getContext, prepareStrokeContext]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;

    setupCanvas();

    const observer = new ResizeObserver(() => {
      const snapshot = canvas.toDataURL();
      setupCanvas();

      const image = new Image();
      image.onload = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        ctx.drawImage(image, 0, 0, rect.width, rect.height);
      };
      image.src = snapshot;
    });

    observer.observe(wrap);
    return () => observer.disconnect();
  }, [setupCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (activePointerIdRef.current !== null) return;

      const point = getPoint(canvas, event);

      if (toolRef.current === "bucket") {
        floodFillAt(point);
        event.preventDefault();
        return;
      }

      activePointerIdRef.current = event.pointerId;
      isDrawingRef.current = true;
      lastPointRef.current = point;
      lastMidPointRef.current = null;
      drawDot(point);
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current || activePointerIdRef.current !== event.pointerId) return;

      drawToPoint(getPoint(canvas, event));
      event.preventDefault();
    };

    const endStroke = (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) return;

      if (isDrawingRef.current) {
        finishStroke(getPoint(canvas, event));
      }

      isDrawingRef.current = false;
      activePointerIdRef.current = null;
      lastPointRef.current = null;
      lastMidPointRef.current = null;

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endStroke);
      canvas.removeEventListener("pointercancel", endStroke);
    };
  }, [drawDot, drawToPoint, finishStroke, floodFillAt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isSaveModalOpen) {
          closeSaveModal();
          return;
        }

        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSaveModal, isSaveModalOpen, onClose]);

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Lienzo de dibujo"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.headerText}>
            <div className={styles.titleRow}>
              <span className={styles.titleIcon}>
                <Palette size={18} strokeWidth={2} aria-hidden="true" />
              </span>
              <h2 className={styles.title}>Crea tu pez</h2>
            </div>
            <p className={styles.subtitle}>
              Dibuja tu pez y suéltalo en el acuario cuando lo guardes.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label="Cerrar"
            title="Cerrar"
            onClick={onClose}
          >
            <X size={22} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <PaintPanel
          color={strokeColor}
          tool={tool}
          brushSize={brushSize}
          onColorChange={updateStrokeColor}
          onToolChange={updateTool}
          onBrushSizeChange={updateBrushSize}
          onSave={openSaveModal}
        />

        <div className={styles.canvasWrap}>
          <div className={styles.screen}>
            <div className={styles.canvasFrame}>
              <canvas
                ref={canvasRef}
                className={`${styles.canvas} ${
                  tool === "eraser"
                    ? styles.canvasEraser
                    : tool === "bucket"
                      ? styles.canvasBucket
                      : styles.canvasBrush
                }`}
                aria-label="Área de dibujo"
              />
            </div>
          </div>
        </div>
      </div>

      {isSaveModalOpen ? (
        <SaveFishModal
          isSaving={isSaving}
          error={saveError}
          onSave={handleSaveFish}
          onClose={closeSaveModal}
        />
      ) : null}
    </div>
  );
}
