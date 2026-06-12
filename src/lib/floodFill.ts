import { hexToRgb } from "./colorUtils";

const COLOR_TOLERANCE = 36;

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  a1: number,
  r2: number,
  g2: number,
  b2: number,
  a2: number,
) {
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) + Math.abs(a1 - a2) * 0.5;
}

function matchesColor(
  data: Uint8ClampedArray,
  index: number,
  targetR: number,
  targetG: number,
  targetB: number,
  targetA: number,
) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];

  return colorDistance(r, g, b, a, targetR, targetG, targetB, targetA) <= COLOR_TOLERANCE;
}

function matchesFillColor(
  data: Uint8ClampedArray,
  index: number,
  fillR: number,
  fillG: number,
  fillB: number,
  fillA: number,
) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];

  return r === fillR && g === fillG && b === fillB && a === fillA;
}

export function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillHex: string,
) {
  const { data, width, height } = imageData;

  if (startX < 0 || startY < 0 || startX >= width || startY >= height) {
    return;
  }

  const { r: fillR, g: fillG, b: fillB } = hexToRgb(fillHex);
  const fillA = 255;
  const startIndex = (startY * width + startX) * 4;

  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  if (matchesFillColor(data, startIndex, fillR, fillG, fillB, fillA)) {
    return;
  }

  const stack: number[] = [startX, startY];

  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;

    if (x < 0 || y < 0 || x >= width || y >= height) {
      continue;
    }

    const index = (y * width + x) * 4;

    if (!matchesColor(data, index, targetR, targetG, targetB, targetA)) {
      continue;
    }

    let left = x;
    while (left >= 0) {
      const leftIndex = (y * width + left) * 4;
      if (!matchesColor(data, leftIndex, targetR, targetG, targetB, targetA)) {
        break;
      }
      left -= 1;
    }
    left += 1;

    let right = x;
    while (right < width) {
      const rightIndex = (y * width + right) * 4;
      if (!matchesColor(data, rightIndex, targetR, targetG, targetB, targetA)) {
        break;
      }
      right += 1;
    }
    right -= 1;

    for (let fillX = left; fillX <= right; fillX += 1) {
      const fillIndex = (y * width + fillX) * 4;
      data[fillIndex] = fillR;
      data[fillIndex + 1] = fillG;
      data[fillIndex + 2] = fillB;
      data[fillIndex + 3] = fillA;
    }

    for (const scanY of [y - 1, y + 1]) {
      if (scanY < 0 || scanY >= height) {
        continue;
      }

      let scanX = left;
      let spanFilled = false;

      while (scanX <= right) {
        const scanIndex = (scanY * width + scanX) * 4;

        if (matchesColor(data, scanIndex, targetR, targetG, targetB, targetA)) {
          if (!spanFilled) {
            stack.push(scanX, scanY);
            spanFilled = true;
          }
        } else if (spanFilled) {
          spanFilled = false;
        }

        scanX += 1;
      }
    }
  }
}
