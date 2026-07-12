import { PaletteKey } from "../theme/palette";
import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, setCells, GRID } from "./builder";

export type Direction = "down" | "up" | "left" | "right";

export interface AvatarCustomization {
  skinTone: Extract<PaletteKey, "skin1" | "skin2" | "skin3">;
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

export const SKIN_OPTIONS: AvatarCustomization["skinTone"][] = ["skin1", "skin2", "skin3"];
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
  custom: AvatarCustomization
): PixelMatrix {
  const m = blank();
  const facingSide = direction === "left" || direction === "right";
  const showFace = direction === "down";

  // Hat (optional cosmetic)
  if (custom.hat) {
    fillRect(m, 4, 0, 8, 2, "hatStraw");
    fillRect(m, 2, 2, 12, 1, "hatStrawDark");
  }

  // Hair (back of head shows more when facing up/away). Without a hat,
  // hair starts higher (row 1 vs row 3) but must also stand taller to
  // stay contiguous with the face rect starting at row 5 — otherwise
  // there's a gap of bare scalp between the hair and the head.
  const hairTop = custom.hat ? 3 : 1;
  const hairHeight = direction === "up" ? 5 : custom.hat ? 2 : 4;
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

  // Arms (skin), swap for walk animation
  const armUp = walkFrame === 0;
  fillRect(m, 2, armUp ? 8 : 9, 2, 3, custom.skinTone);
  fillRect(m, 12, armUp ? 9 : 8, 2, 3, custom.skinTone);

  // Legs, offset per walk frame for a simple stride
  const leftLegX = walkFrame === 0 ? 5 : 6;
  const rightLegX = walkFrame === 0 ? 9 : 8;
  fillRect(m, leftLegX, 12, 2, 4, "outline");
  fillRect(m, rightLegX, 12, 2, 4, "outline");

  return m;
}

export const SPRITE_GRID = GRID;
