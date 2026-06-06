import { AvatarCustomization } from "./protocol";

// Flavor names only — bots are tagged isBot in the protocol so clients can
// label them honestly rather than pretending they're real players.
const BOT_NAMES = [
  "Sprout",
  "Clover",
  "Pip",
  "Barley",
  "Hazel",
  "Fern",
  "Wren",
  "Basil",
  "Poppy",
  "Rye",
  "Sage",
  "Maize",
];

const SKINS: AvatarCustomization["skinTone"][] = ["skin1", "skin2", "skin3"];
const HAIRS: AvatarCustomization["hairColor"][] = [
  "hairBrown",
  "hairBlack",
  "hairBlonde",
  "hairRed",
];
const SHIRTS: AvatarCustomization["shirtColor"][] = [
  "shirtRed",
  "shirtBlue",
  "shirtGreen",
  "shirtYellow",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomBotName(): string {
  return pick(BOT_NAMES);
}

export function randomBotAvatar(): AvatarCustomization {
  return {
    skinTone: pick(SKINS),
    hairColor: pick(HAIRS),
    shirtColor: pick(SHIRTS),
    hat: Math.random() < 0.3,
  };
}
