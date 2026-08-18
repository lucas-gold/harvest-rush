import { AvatarCustomization } from "./protocol";

// Typing this exact string as your name (see Room.join) swaps in a fixed
// identity and cosmetic instead of whatever name/avatar was actually
// submitted. Deliberately never referenced from client code -- the web
// bundle is public and inspectable by anyone who visits the site, so the
// check has to live here, server-side, where it's never shipped anywhere.
const ADMIN_CODE = "REDACTED";

export const ADMIN_NAME = "_admin";

export const ADMIN_AVATAR: AvatarCustomization = {
  skinTone: "skin2",
  hairColor: "hairBrown",
  shirtColor: "shirtRed", // overridden by isAdmin's referee stripes below anyway
  hat: true,
  isAdmin: true,
};

export function isAdminCode(name: string): boolean {
  return name.trim() === ADMIN_CODE;
}
