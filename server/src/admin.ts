import { AvatarCustomization } from "./protocol";

// Playing under this exact (lowercase) name swaps in a fixed cosmetic --
// see Room.join. The name itself is left alone; only the avatar changes.
const ADMIN_NAME_TRIGGER = "lucas";

export const ADMIN_AVATAR: AvatarCustomization = {
  skinTone: "skin2",
  hairColor: "hairBrown",
  shirtColor: "shirtRed", // overridden by isAdmin's neon override below anyway
  hat: true,
  isAdmin: true,
};

export function isAdminName(name: string): boolean {
  return name.trim() === ADMIN_NAME_TRIGGER;
}
