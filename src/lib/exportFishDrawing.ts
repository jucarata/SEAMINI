const WHITE_THRESHOLD = 250;
const CROP_PADDING = 4;

function isBackgroundPixel(r: number, g: number, b: number) {
  return r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
}

export function exportFishDrawing(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const { width, height } = canvas;
  const source = ctx.getImageData(0, 0, width, height);
  const data = new Uint8ClampedArray(source.data);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let hasContent = false;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];

      if (a === 0 || isBackgroundPixel(r, g, b)) {
        data[index + 3] = 0;
        continue;
      }

      hasContent = true;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (!hasContent) {
    return null;
  }

  minX = Math.max(0, minX - CROP_PADDING);
  minY = Math.max(0, minY - CROP_PADDING);
  maxX = Math.min(width - 1, maxX + CROP_PADDING);
  maxY = Math.min(height - 1, maxY + CROP_PADDING);

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;

  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = cropWidth;
  exportCanvas.height = cropHeight;

  const exportCtx = exportCanvas.getContext("2d");
  if (!exportCtx) return null;

  const cropped = exportCtx.createImageData(cropWidth, cropHeight);

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      const sourceIndex = ((minY + y) * width + (minX + x)) * 4;
      const targetIndex = (y * cropWidth + x) * 4;

      cropped.data[targetIndex] = data[sourceIndex];
      cropped.data[targetIndex + 1] = data[sourceIndex + 1];
      cropped.data[targetIndex + 2] = data[sourceIndex + 2];
      cropped.data[targetIndex + 3] = data[sourceIndex + 3];
    }
  }

  exportCtx.putImageData(cropped, 0, 0);
  return exportCanvas.toDataURL("image/png");
}
