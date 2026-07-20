import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect } from "./builder";

/** A simple 16-bit pine-tree silhouette — purely decorative background
 * texture (see EntryTrees), not a gameplay sprite, so it reuses existing
 * palette colors rather than adding new ones just for this. */
export function buildTreeSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 7, 12, 2, 4, "backpackBrownDark");

  fillRect(m, 7, 2, 2, 2, "arenaGroundDark");
  fillRect(m, 6, 4, 4, 2, "arenaGroundDark");
  fillRect(m, 5, 6, 6, 2, "arenaGroundDark");
  fillRect(m, 4, 8, 8, 2, "arenaGroundDark");
  fillRect(m, 3, 10, 10, 2, "arenaGroundDark");

  fillRect(m, 8, 5, 2, 1, "sproutGreenDark");
  fillRect(m, 9, 8, 2, 1, "sproutGreenDark");
  fillRect(m, 10, 10, 2, 1, "sproutGreenDark");

  return m;
}
