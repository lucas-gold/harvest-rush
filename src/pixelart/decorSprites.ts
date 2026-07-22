import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, setCells } from "./builder";

// Candidate apple spots spread through the canopy interior, well clear of
// the silhouette edge. Each tree only uses a 6-spot window of this pool
// (see buildTreeSprite's `variant` param) so multiple trees on screen
// together don't all show the exact same apple layout.
const APPLE_POOL: [number, number][] = [
  [6, 1],
  [9, 1],
  [7, 2],
  [4, 3],
  [11, 3],
  [10, 4],
  [3, 5],
  [12, 5],
  [8, 6],
  [6, 7],
  [9, 7],
  [5, 8],
];

/** A round, whimsical 16-bit deciduous tree — a puffy canopy (stepped
 * like classic RPG tree sprites, symmetric top-to-bottom so it reads as
 * an actual pom-pom rather than lopsided, and closer to circular than a
 * flattened oval) over a short trunk with a small root flare, plus a
 * scatter of apples for storybook charm. Purely decorative background
 * texture (see EntryTrees), not a gameplay sprite.
 *
 * `variant` picks a different 6-spot window of APPLE_POOL (wrapping, step
 * of 5 out of 12 candidates) so trees placed side by side don't look like
 * copies of each other. */
export function buildTreeSprite(variant: number = 0): PixelMatrix {
  const m = blank();

  // Canopy — a symmetric stepped circle (4/8/10/12/12/12/12/10/8/4), taller
  // relative to its width than before so it reads closer to round rather
  // than a squashed ellipse.
  fillRect(m, 6, 0, 4, 1, "treeCanopy");
  fillRect(m, 4, 1, 8, 1, "treeCanopy");
  fillRect(m, 3, 2, 10, 1, "treeCanopy");
  fillRect(m, 2, 3, 12, 4, "treeCanopy");
  fillRect(m, 3, 7, 10, 1, "treeCanopy");
  fillRect(m, 4, 8, 8, 1, "treeCanopy");
  fillRect(m, 6, 9, 4, 1, "treeCanopy");

  // A soft shadow along the underside rim — a single continuous band
  // (not scattered patches) so the canopy reads as a round volume
  // catching light from above, without needing a hard outline.
  fillRect(m, 3, 7, 10, 1, "treeCanopyShade");
  fillRect(m, 4, 8, 8, 1, "treeCanopyShade");
  fillRect(m, 6, 9, 4, 1, "treeCanopyShade");

  // Trunk — starts one row below the canopy's last (narrowest) row rather
  // than overlapping into it, so it sits flush against the base instead
  // of poking up into the foliage. A single-row root flare at the very
  // bottom reads as small roots without becoming a big blocky rectangle.
  fillRect(m, 7, 10, 2, 4, "backpackBrownDark");
  fillRect(m, 6, 14, 4, 1, "backpackBrownDark");

  // Apples — a rotating window into APPLE_POOL, scattered at varied
  // heights and sides rather than following a single line.
  const offset = (variant * 5) % APPLE_POOL.length;
  const apples = Array.from(
    { length: 6 },
    (_, k) => APPLE_POOL[(offset + k) % APPLE_POOL.length]
  );
  setCells(m, apples, "shirtRed");

  return m;
}
