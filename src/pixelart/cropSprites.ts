import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, GRID } from "./builder";

/** Mature wheat growing in the ground — a cluster of staggered stalks with
 * golden grain heads rising out of a small soil mound. Rendered for every
 * collectible crop on the map. */
export function buildGroundCropSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 3, 13, 10, 3, "soilBrown");
  fillRect(m, 3, 15, 10, 1, "soilBrownDark");

  fillRect(m, 4, 8, 1, 5, "wheatStalk");
  fillRect(m, 6, 5, 1, 8, "wheatStalk");
  fillRect(m, 8, 6, 1, 7, "wheatStalkDark");
  fillRect(m, 10, 5, 1, 8, "wheatStalk");
  fillRect(m, 12, 8, 1, 5, "wheatStalk");

  fillRect(m, 3, 6, 3, 2, "wheatGold");
  fillRect(m, 5, 3, 3, 2, "wheatGold");
  fillRect(m, 7, 4, 3, 2, "wheatGoldDark");
  fillRect(m, 9, 3, 3, 2, "wheatGold");
  fillRect(m, 11, 6, 3, 2, "wheatGold");

  return m;
}

/** A freshly planted seed — short green sprouts, no grain yet. Matures into
 * a ground crop after 30s. */
export function buildSeedlingSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 5, 13, 6, 3, "soilBrown");
  fillRect(m, 5, 15, 6, 1, "soilBrownDark");

  fillRect(m, 6, 10, 1, 3, "sproutGreen");
  fillRect(m, 8, 9, 1, 4, "sproutGreenDark");
  fillRect(m, 10, 10, 1, 3, "sproutGreen");
  fillRect(m, 5, 10, 1, 1, "sproutGreen");
  fillRect(m, 10, 9, 1, 1, "sproutGreen");

  return m;
}

/** One harvested sheaf — golden grain fanned above a brown binding band,
 * stalk ends showing below. Stacked repeatedly to build a player's
 * backpack pile; this is the "carrying wheat" unit, not a ground crop. */
export function buildWheatBundleSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 4, 10, 2, 4, "wheatStalk");
  fillRect(m, 7, 10, 2, 4, "wheatStalkDark");
  fillRect(m, 9, 10, 2, 4, "wheatStalk");

  fillRect(m, 3, 8, 8, 2, "bindingBrown");

  fillRect(m, 2, 4, 3, 5, "wheatGold");
  fillRect(m, 5, 2, 4, 6, "wheatGoldDark");
  fillRect(m, 9, 4, 3, 5, "wheatGold");

  return m;
}

/** Empty backpack base — always visible on a player's back, even at 0
 * crops; wheat bundles stack above it as their crop count grows. */
export function buildBackpackSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 4, 4, 1, 9, "backpackBrownDark");
  fillRect(m, 11, 4, 1, 9, "backpackBrownDark");
  fillRect(m, 3, 4, 10, 3, "backpackBrownDark");
  fillRect(m, 4, 6, 8, 7, "backpackBrown");
  fillRect(m, 7, 9, 2, 1, "outline");

  return m;
}

export const CROP_SPRITE_GRID = GRID;
