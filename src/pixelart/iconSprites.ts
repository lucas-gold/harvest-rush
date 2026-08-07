import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect } from "./builder";

/** A small skull, sized for a status pill (10x10, not the usual 16x16
 * sprite grid) -- rendered at ~16px on screen, so this stays a plain
 * rounded silhouette with eye sockets rather than chasing detail that
 * would never actually be visible at that size. */
export function buildSkullIconSprite(): PixelMatrix {
  const m = blank(10, 10);

  fillRect(m, 3, 0, 4, 1, "white");
  fillRect(m, 2, 1, 6, 1, "white");
  fillRect(m, 1, 2, 8, 4, "white");
  fillRect(m, 2, 6, 6, 2, "white");

  fillRect(m, 2, 3, 2, 2, "outline");
  fillRect(m, 6, 3, 2, 2, "outline");
  fillRect(m, 3, 7, 1, 1, "outline");
  fillRect(m, 5, 7, 1, 1, "outline");

  return m;
}
