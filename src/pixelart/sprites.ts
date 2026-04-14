import { PaletteKey } from "../theme/palette";
import { PixelMatrix } from "./PixelCanvas";
import { blank, fillRect, setCell, setCells, GRID } from "./builder";

export type Direction = "down" | "up" | "left" | "right";

export interface FarmerCustomization {
  skinTone: Extract<PaletteKey, "skin1" | "skin2" | "skin3">;
  hairColor: Extract<PaletteKey, "hairBrown" | "hairBlack" | "hairBlonde" | "hairRed">;
  shirtColor: Extract<PaletteKey, "shirtRed" | "shirtBlue" | "shirtGreen" | "shirtYellow">;
  hat: boolean;
}

export const DEFAULT_CUSTOMIZATION: FarmerCustomization = {
  skinTone: "skin2",
  hairColor: "hairBrown",
  shirtColor: "shirtRed",
  hat: true,
};

export const SKIN_OPTIONS: FarmerCustomization["skinTone"][] = ["skin1", "skin2", "skin3"];
export const HAIR_OPTIONS: FarmerCustomization["hairColor"][] = [
  "hairBrown",
  "hairBlack",
  "hairBlonde",
  "hairRed",
];
export const SHIRT_OPTIONS: FarmerCustomization["shirtColor"][] = [
  "shirtRed",
  "shirtBlue",
  "shirtGreen",
  "shirtYellow",
];

/** Builds a 16x16 farmer sprite. `walkFrame` toggles a 2-frame walk cycle. */
export function buildFarmerSprite(
  direction: Direction,
  walkFrame: 0 | 1,
  custom: FarmerCustomization
): PixelMatrix {
  const m = blank();
  const facingSide = direction === "left" || direction === "right";
  const showFace = direction === "down";

  // Hat
  if (custom.hat) {
    fillRect(m, 4, 0, 8, 2, "hatStraw");
    fillRect(m, 2, 2, 12, 1, "hatStrawDark");
  }

  // Hair (back of head shows more when facing up/away)
  const hairTop = custom.hat ? 3 : 1;
  fillRect(m, 5, hairTop, 6, direction === "up" ? 5 : 2, custom.hairColor);

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

  // Overalls
  fillRect(m, 4, 11, 8, 3, "overalls");

  // Legs, offset per walk frame for a simple stride
  const leftLegX = walkFrame === 0 ? 5 : 6;
  const rightLegX = walkFrame === 0 ? 9 : 8;
  fillRect(m, leftLegX, 13, 2, 3, "overallsDark");
  fillRect(m, rightLegX, 13, 2, 3, "overallsDark");
  fillRect(m, leftLegX, 15, 2, 1, "outline");
  fillRect(m, rightLegX, 15, 2, 1, "outline");

  return m;
}

// ---- Crops ----
export type CropType = "wheat" | "tomato" | "corn" | "carrot";
export type CropStage = 0 | 1 | 2 | 3; // seed -> sprout -> growing -> ready

const CROP_COLORS: Record<CropType, { crop: PaletteKey; leaf: PaletteKey }> = {
  wheat: { crop: "wheatGold", leaf: "leafGreen" },
  tomato: { crop: "tomatoRed", leaf: "leafGreen" },
  corn: { crop: "cornYellow", leaf: "leafDark" },
  carrot: { crop: "carrotOrange", leaf: "leafGreen" },
};

export function buildCropSprite(type: CropType, stage: CropStage): PixelMatrix {
  const m = blank();
  const { crop, leaf } = CROP_COLORS[type];

  if (stage === 0) {
    fillRect(m, 7, 13, 2, 2, "sproutGreen");
    return m;
  }
  if (stage === 1) {
    fillRect(m, 7, 10, 2, 5, leaf);
    fillRect(m, 6, 9, 4, 2, "sproutGreen");
    return m;
  }
  if (stage === 2) {
    fillRect(m, 7, 8, 2, 7, leaf);
    fillRect(m, 5, 6, 2, 3, leaf);
    fillRect(m, 9, 6, 2, 3, leaf);
    fillRect(m, 6, 5, 4, 3, crop);
    return m;
  }
  // stage 3: ready to harvest — full and bright
  fillRect(m, 7, 8, 2, 7, leaf);
  fillRect(m, 4, 5, 3, 4, leaf);
  fillRect(m, 9, 5, 3, 4, leaf);
  fillRect(m, 5, 3, 6, 5, crop);
  setCells(
    m,
    [
      [5, 3],
      [10, 3],
    ],
    "outline"
  );
  return m;
}

// ---- Tiles ----
export type TileState = "grass" | "tilled" | "watered" | "grown";

export function buildTileSprite(state: TileState): PixelMatrix {
  const m = blank();
  if (state === "grass") {
    fillRect(m, 0, 0, 16, 16, "grass");
    fillRect(m, 2, 2, 2, 2, "grassLight");
    fillRect(m, 11, 6, 2, 2, "grassDark");
    fillRect(m, 5, 11, 2, 2, "grassLight");
    return m;
  }
  const base: PaletteKey = state === "watered" || state === "grown" ? "soilWet" : "tilled";
  const dark: PaletteKey = state === "watered" || state === "grown" ? "soilWetDark" : "tilledDark";
  fillRect(m, 0, 0, 16, 16, base);
  for (let row = 0; row < 4; row++) {
    fillRect(m, 0, row * 4 + 3, 16, 1, dark);
  }
  return m;
}

// ---- Animals & NPCs ----
export function buildChickenSprite(frame: 0 | 1): PixelMatrix {
  const m = blank();
  fillRect(m, 4, 6, 8, 6, "chickenWhite");
  fillRect(m, 9, 4, 5, 4, "chickenWhite");
  setCell(m, 13, 5, "chickenBeak");
  setCell(m, 10, 4, "chickenRed");
  fillRect(m, frame === 0 ? 5 : 6, 12, 2, 2, "chickenBeak");
  fillRect(m, frame === 0 ? 9 : 8, 12, 2, 2, "chickenBeak");
  return m;
}

export function buildFoxSprite(frame: 0 | 1): PixelMatrix {
  const m = blank();
  fillRect(m, 3, 7, 10, 5, "foxOrange");
  fillRect(m, 10, 4, 5, 5, "foxOrange");
  fillRect(m, 12, 3, 2, 2, "foxOrange");
  setCell(m, 14, 5, "foxDark");
  fillRect(m, 3, 9, 3, 3, "foxWhite");
  fillRect(m, frame === 0 ? 4 : 5, 12, 2, 3, "foxDark");
  fillRect(m, frame === 0 ? 10 : 9, 12, 2, 3, "foxDark");
  fillRect(m, 1, 8, 3, 3, "foxOrange");
  return m;
}

export function buildThiefSprite(frame: 0 | 1): PixelMatrix {
  const m = blank();
  fillRect(m, 5, 2, 6, 3, "thiefDark"); // hood
  fillRect(m, 5, 5, 6, 4, "thiefBrown"); // body
  fillRect(m, 4, 9, 3, 4, "thiefSack"); // stolen sack
  fillRect(m, leftLegX(frame), 13, 2, 3, "thiefDark");
  fillRect(m, rightLegX(frame), 13, 2, 3, "thiefDark");
  return m;
}
function leftLegX(frame: 0 | 1) {
  return frame === 0 ? 6 : 7;
}
function rightLegX(frame: 0 | 1) {
  return frame === 0 ? 10 : 9;
}

// ---- Icons ----
export function buildCoinSprite(): PixelMatrix {
  const m = blank();
  fillRect(m, 4, 4, 8, 8, "coinGold");
  fillRect(m, 6, 6, 4, 4, "coinDark");
  return m;
}

export function buildGemSprite(): PixelMatrix {
  const m = blank();
  fillRect(m, 5, 3, 6, 4, "gemPurple");
  fillRect(m, 3, 7, 10, 4, "gemPurple");
  fillRect(m, 6, 11, 4, 2, "gemDark");
  return m;
}

export function buildWaterDropSprite(): PixelMatrix {
  const m = blank();
  fillRect(m, 6, 2, 4, 2, "water");
  fillRect(m, 5, 4, 6, 2, "water");
  fillRect(m, 4, 6, 8, 6, "water");
  fillRect(m, 6, 8, 2, 2, "white");
  return m;
}

export const SPRITE_GRID = GRID;
