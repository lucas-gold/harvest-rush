// Shared 16-bit-style palette. Keep indices stable — sprite matrices in
// src/pixelart/sprites.ts reference these by key, not by hex value.
export const PALETTE = {
  _: "transparent",

  skin1: "#f3c99a",
  skin2: "#d9a066",
  skin3: "#a86f45",
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
  arenaGroundDark: "#294f2c",
  arenaBoundary: "#e0433a",
  cropGreen: "#63d15a",
  cropGreenDark: "#3d9c3a",
  seedling: "#9adf7a",

  outline: "#1a140f",
  white: "#ffffff",
  shadow: "rgba(0,0,0,0.25)",
} as const;

export type PaletteKey = keyof typeof PALETTE;
