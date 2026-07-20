import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, GRID } from "./builder";

/** Mature wheat growing in the ground — a couple of stalks with golden
 * grain heads rising out of a soil base. Rendered for every collectible
 * crop on the map (capped to the nearest ~100 or so via CROP_DETAIL_RADIUS
 * in ArenaCanvas, everything past that is a plain dot) — kept deliberately
 * low on filled cells (~30 vs. an earlier ~90) since each one is a real
 * SVG <Rect> and the sprite renders at 20-36px on screen at most, well
 * below where the extra detail would even be visible. */
export function buildGroundCropSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 4, 14, 8, 2, "soilBrown");

  fillRect(m, 6, 7, 1, 7, "wheatStalk");
  fillRect(m, 9, 8, 1, 6, "wheatStalk");

  fillRect(m, 4, 6, 3, 2, "wheatGold");
  fillRect(m, 7, 4, 3, 2, "wheatGoldDark");
  fillRect(m, 9, 6, 3, 2, "wheatGold");

  return m;
}

/** A freshly planted seed — short green sprouts, no grain yet. Matures into
 * a ground crop after SEEDLING_GROW_MS. */
export function buildSeedlingSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 5, 15, 6, 1, "soilBrown");

  fillRect(m, 6, 11, 1, 4, "sproutGreen");
  fillRect(m, 8, 10, 1, 5, "sproutGreenDark");
  fillRect(m, 10, 11, 1, 4, "sproutGreen");

  return m;
}

/** One harvested sheaf — golden grain above a brown binding band, stalk
 * ends showing below. Stacked repeatedly (up to MAX_BUNDLES) to build a
 * player's backpack pile, so this one's cell count matters most of all:
 * it's the single most-instantiated sprite in the game (bundles × visible
 * players). Kept to ~20 filled cells, down from ~94. */
export function buildWheatBundleSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 5, 10, 2, 3, "wheatStalk");
  fillRect(m, 8, 10, 2, 3, "wheatStalkDark");

  fillRect(m, 4, 9, 6, 1, "bindingBrown");

  fillRect(m, 4, 6, 6, 2, "wheatGold");

  return m;
}

/** Empty backpack base — always visible on a player's back, even at 0
 * crops; wheat bundles stack above it as their crop count grows. One per
 * visible player, so kept modest too (~24 cells, down from ~65+). */
export function buildBackpackSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 4, 5, 8, 1, "backpackBrownDark");
  fillRect(m, 4, 6, 1, 6, "backpackBrownDark");
  fillRect(m, 11, 6, 1, 6, "backpackBrownDark");
  fillRect(m, 5, 6, 6, 6, "backpackBrown");
  fillRect(m, 7, 8, 2, 1, "outline");

  return m;
}

/** A power-up on the ground — a faceted blue crystal on the same soil
 * base as a ground crop, so it reads as "part of the field" but
 * unmistakably different at a glance. Rare enough (see POWERUP_* in
 * server/src/constants.ts) that it always renders in full detail
 * regardless of distance, unlike crops/seedlings. */
export function buildPowerUpSprite(): PixelMatrix {
  const m = blank();

  fillRect(m, 4, 14, 8, 2, "soilBrown");

  fillRect(m, 7, 2, 2, 2, "crystalBlueDark");
  fillRect(m, 6, 4, 4, 2, "crystalBlueDark");
  fillRect(m, 5, 6, 6, 2, "crystalBlueDark");
  fillRect(m, 5, 8, 6, 2, "crystalBlueDark");
  fillRect(m, 6, 10, 4, 2, "crystalBlueDark");
  fillRect(m, 7, 12, 2, 2, "crystalBlueDark");

  fillRect(m, 7, 4, 2, 2, "crystalBlue");
  fillRect(m, 6, 6, 4, 4, "crystalBlue");
  fillRect(m, 7, 10, 2, 2, "crystalBlue");

  fillRect(m, 6, 6, 1, 2, "crystalBlueLight");
  fillRect(m, 7, 5, 1, 1, "crystalBlueLight");

  return m;
}

export const CROP_SPRITE_GRID = GRID;
