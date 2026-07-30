import { PaletteKey } from "../theme/palette";
import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, setCells, GRID } from "./builder";

export type Direction = "down" | "up" | "left" | "right";

export interface AvatarCustomization {
  skinTone: Extract<PaletteKey, "skin1" | "skin2" | "skin3" | "skin4">;
  hairColor: Extract<PaletteKey, "hairBrown" | "hairBlack" | "hairBlonde" | "hairRed">;
  shirtColor: Extract<PaletteKey, "shirtRed" | "shirtBlue" | "shirtGreen" | "shirtYellow">;
  hat: boolean;
}

export const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  skinTone: "skin2",
  hairColor: "hairBrown",
  shirtColor: "shirtRed",
  hat: false,
};

export const SKIN_OPTIONS: AvatarCustomization["skinTone"][] = ["skin1", "skin2", "skin3", "skin4"];
export const HAIR_OPTIONS: AvatarCustomization["hairColor"][] = [
  "hairBrown",
  "hairBlack",
  "hairBlonde",
  "hairRed",
];
export const SHIRT_OPTIONS: AvatarCustomization["shirtColor"][] = [
  "shirtRed",
  "shirtBlue",
  "shirtGreen",
  "shirtYellow",
];

/**
 * Builds a 16x16 avatar sprite — this is the one and only model for a
 * player: the same matrix renders in the avatar picker preview and as the
 * live in-arena character, just scaled differently. `walkFrame` toggles a
 * 2-frame stride cycle used while moving.
 */
export function buildAvatarSprite(
  direction: Direction,
  walkFrame: 0 | 1,
  custom: AvatarCustomization,
  // The walk cycle deliberately staggers the arms (one up, one down) for
  // a mid-stride look — correct while moving, but wrong for a static
  // preview (the avatar picker), where a stride pose just reads as
  // lopsided. Forces both arms to the same height instead.
  armsLevel: boolean = false,
  // Worn by whoever's #1 on the leaderboard (see topPlayerId in
  // server/src/Room.ts) — takes over the hat slot entirely, hat or not.
  crown: boolean = false
): PixelMatrix {
  const m = blank();
  const facingSide = direction === "left" || direction === "right";
  const showFace = direction === "down";

  // Hat / crown (optional cosmetic). The crown gets its own silhouette:
  // three equal-height peaks (gaps at x=6 and x=9 between them) rising
  // straight out of a solid gold base — no separate darker brim/trim
  // like the hat has, so it doesn't read as "just another hat" with
  // spikes on top. Sits snug against the head (no hair band peeking out
  // beneath it, see hairHeight below).
  if (crown) {
    setCells(
      m,
      [
        [4, 0],
        [5, 0],
        [7, 0],
        [8, 0],
        [10, 0],
        [11, 0],
        [4, 1],
        [5, 1],
        [7, 1],
        [8, 1],
        [10, 1],
        [11, 1],
        [4, 2],
        [5, 2],
        [7, 2],
        [8, 2],
        [10, 2],
        [11, 2],
      ],
      "crownGold"
    ); // three peaks, all the same height
    fillRect(m, 4, 3, 8, 2, "crownGold"); // solid base the peaks rise from — no separate brim
    // Bright glints scattered across the peaks and base — reads as
    // shiny/sparkly gold rather than a flat single-tone fill.
    setCells(
      m,
      [
        [8, 0],
        [4, 0],
        [11, 0],
        [5, 3],
        [9, 4],
      ],
      "crownGoldShine"
    );
  } else if (custom.hat) {
    fillRect(m, 4, 0, 8, 2, "hatStraw");
    fillRect(m, 2, 2, 12, 1, "hatStrawDark");
  }

  // Hair (back of head shows more when facing up/away). Without a
  // hat/crown, hair starts higher but must also stand taller to stay
  // contiguous with the face rect starting at row 5 — otherwise there's
  // a gap of bare scalp between the hair and the head. The crown sits
  // snug against the head with no hair band showing beneath it (unlike
  // the hat's brim), so its trim goes directly to row 5. Facing "up",
  // hair always extends down to exactly meet the torso at row 8,
  // whatever hairTop turns out to be.
  const hairTop = crown ? 5 : custom.hat ? 3 : 1;
  const hairHeight = direction === "up" ? 8 - hairTop : crown ? 0 : custom.hat ? 2 : 4;
  fillRect(m, 5, hairTop, 6, hairHeight, custom.hairColor);

  // Face / skin
  if (!facingSide) {
    fillRect(m, 5, 5, 6, 3, custom.skinTone);
    if (showFace) {
      setCells(
        m,
        [
          [6, 6],
          [9, 6],
        ],
        "outline"
      );
    }
  } else {
    // side profile: narrower face strip on the leading edge
    const fx = direction === "left" ? 4 : 8;
    fillRect(m, fx, 5, 4, 3, custom.skinTone);
  }

  // Torso / shirt
  fillRect(m, 4, 8, 8, 4, custom.shirtColor);

  // Arms (skin), swap for walk animation — unless armsLevel forces both
  // to the same height.
  const armUp = walkFrame === 0;
  const leftArmY = armsLevel ? 8 : armUp ? 8 : 9;
  const rightArmY = armsLevel ? 8 : armUp ? 9 : 8;
  fillRect(m, 2, leftArmY, 2, 3, custom.skinTone);
  fillRect(m, 12, rightArmY, 2, 3, custom.skinTone);

  // Legs, offset per walk frame for a simple stride
  const leftLegX = walkFrame === 0 ? 5 : 6;
  const rightLegX = walkFrame === 0 ? 9 : 8;
  fillRect(m, leftLegX, 12, 2, 4, "outline");
  fillRect(m, rightLegX, 12, 2, 4, "outline");

  return m;
}

export const SPRITE_GRID = GRID;
