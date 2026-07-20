import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect } from "./builder";

/** A round, blobby 16-bit deciduous tree — a wide leafy canopy over a
 * short trunk, not an evergreen pyramid. Purely decorative background
 * texture (see EntryTrees), not a gameplay sprite, so it reuses existing
 * palette colors rather than adding new ones just for this. */
export function buildTreeSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 7, 10, 2, 5, "backpackBrownDark");

  // A roughly circular canopy — narrow at the top and bottom rows, wide
  // through the middle — instead of a straight-edged triangle.
  fillRect(m, 6, 0, 4, 1, "arenaGroundDark");
  fillRect(m, 4, 1, 8, 1, "arenaGroundDark");
  fillRect(m, 3, 2, 10, 1, "arenaGroundDark");
  fillRect(m, 2, 3, 12, 1, "arenaGroundDark");
  fillRect(m, 1, 4, 14, 2, "arenaGroundDark");
  fillRect(m, 2, 6, 12, 1, "arenaGroundDark");
  fillRect(m, 3, 7, 10, 1, "arenaGroundDark");
  fillRect(m, 5, 8, 6, 1, "arenaGroundDark");

  // A few lighter patches for a bit of leafy depth, not a flat fill.
  fillRect(m, 3, 3, 3, 2, "sproutGreenDark");
  fillRect(m, 9, 5, 4, 2, "sproutGreenDark");
  fillRect(m, 5, 6, 3, 1, "sproutGreenDark");

  return m;
}
