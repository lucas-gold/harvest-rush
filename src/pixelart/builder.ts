import { PaletteKey } from "../theme/palette";
import { PixelMatrix } from "./PixelCanvas";

export const GRID = 16;

export function blank(w: number = GRID, h: number = GRID): PixelMatrix {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => null));
}

export function fillRect(
  m: PixelMatrix,
  x0: number,
  y0: number,
  w: number,
  h: number,
  key: PaletteKey
): PixelMatrix {
  for (let y = y0; y < y0 + h; y++) {
    if (y < 0 || y >= m.length) continue;
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || x >= m[y].length) continue;
      m[y][x] = key;
    }
  }
  return m;
}

export function setCell(m: PixelMatrix, x: number, y: number, key: PaletteKey): PixelMatrix {
  if (y >= 0 && y < m.length && x >= 0 && x < m[y].length) m[y][x] = key;
  return m;
}

export function setCells(m: PixelMatrix, coords: [number, number][], key: PaletteKey): PixelMatrix {
  for (const [x, y] of coords) setCell(m, x, y, key);
  return m;
}

export function clone(m: PixelMatrix): PixelMatrix {
  return m.map((row) => [...row]);
}
