import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, setCells } from "./builder";

/** A round, blobby 16-bit deciduous tree — a wide leafy canopy over a
 * short trunk, not an evergreen pyramid. Purely decorative background
 * texture (see EntryTrees), not a gameplay sprite, so it reuses existing
 * palette colors rather than adding new ones just for this. */
export function buildTreeSprite(): PixelMatrix {
  const m = blank();

  // Canopy — roughly circular, narrow at the top and bottom, wide
  // through the middle. The bottom row is 2 cells tall and the trunk
  // (below) starts at the same row rather than after it, so the trunk
  // is drawn directly into the canopy's base with no gap between them.
  fillRect(m, 6, 0, 4, 1, "arenaGroundDark");
  fillRect(m, 4, 1, 8, 1, "arenaGroundDark");
  fillRect(m, 3, 2, 10, 1, "arenaGroundDark");
  fillRect(m, 2, 3, 12, 1, "arenaGroundDark");
  fillRect(m, 1, 4, 14, 2, "arenaGroundDark");
  fillRect(m, 2, 6, 12, 1, "arenaGroundDark");
  fillRect(m, 3, 7, 10, 1, "arenaGroundDark");
  fillRect(m, 5, 8, 6, 2, "arenaGroundDark");

  // Leaf texture, kept small and well inside the canopy's edges so it
  // reads as dappled shading rather than separate floating rectangles.
  fillRect(m, 4, 3, 2, 2, "sproutGreenDark");
  fillRect(m, 9, 4, 3, 2, "sproutGreenDark");
  fillRect(m, 6, 6, 2, 1, "sproutGreenDark");

  // Trunk — starts at the same row as the canopy's base (not below it),
  // painting over the canopy's center so it visibly grows out of the
  // foliage instead of floating a row beneath it.
  fillRect(m, 7, 8, 2, 6, "backpackBrownDark");

  // A 1px outline around the whole silhouette (canopy + trunk): any
  // still-empty cell touching a filled one becomes an outline cell. Flat
  // color blobs with no border tend to blend into the same-toned
  // background; this is what makes the shape actually read as a tree.
  const filled = (x: number, y: number) =>
    y >= 0 && y < m.length && x >= 0 && x < m[y].length && m[y][x] !== null;
  const toOutline: [number, number][] = [];
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (filled(x, y)) continue;
      if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        toOutline.push([x, y]);
      }
    }
  }
  setCells(m, toOutline, "outline");

  return m;
}
