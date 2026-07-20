// Shared 16-bit-style palette. Keep indices stable — sprite matrices in
// src/pixelart/sprites.ts reference these by key, not by hex value.
export const PALETTE = {
  _: "transparent",

  skin1: "#f3c99a",
  skin2: "#d9a066",
  skin3: "#a86f45",
  skin4: "#7a4a2e",
  hairBrown: "#5b3a29",
  hairBlack: "#2b2b2b",
  hairBlonde: "#e8c96b",
  hairRed: "#a8452f",
  shirtRed: "#c1443a",
  shirtBlue: "#3a6bc1",
  shirtGreen: "#3a9b5c",
  shirtYellow: "#d9a83a",
  hatStraw: "#e0c26a",
  hatStrawDark: "#b89a4e",

  arenaGround: "#2f5d33",
  arenaGroundDark: "#2b562f",
  arenaBoundary: "#e0433a",

  // Wheat — crops in the ground, the backpack stack, and planted seedlings
  // all share this family for visual consistency.
  wheatGold: "#e8c14a",
  wheatGoldDark: "#c79b2e",
  wheatStalk: "#8a9c3a",
  wheatStalkDark: "#5f6e26",
  soilBrown: "#6b4226",
  soilBrownDark: "#4a2c19",
  sproutGreen: "#7bc95e",
  sproutGreenDark: "#4a9e3a",
  backpackBrown: "#8a5a34",
  backpackBrownDark: "#5c3b1e",
  bindingBrown: "#4a2c19",

  // Power-ups — a shiny blue crystal, distinct from anything else on the
  // ground so it reads as "special" at a glance.
  crystalBlue: "#4fc3f7",
  crystalBlueDark: "#1976d2",
  crystalBlueLight: "#d4f4ff",

  outline: "#1a140f",
  white: "#ffffff",
  shadow: "rgba(0,0,0,0.25)",
} as const;

export type PaletteKey = keyof typeof PALETTE;
