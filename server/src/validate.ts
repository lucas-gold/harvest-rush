import { AvatarCustomization, ClientMessage } from "./protocol";

const SKINS = new Set(["skin1", "skin2", "skin3"]);
const HAIRS = new Set(["hairBrown", "hairBlack", "hairBlonde", "hairRed"]);
const SHIRTS = new Set(["shirtRed", "shirtBlue", "shirtGreen", "shirtYellow"]);

function isValidAvatar(v: unknown): v is AvatarCustomization {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    SKINS.has(a.skinTone as string) &&
    HAIRS.has(a.hairColor as string) &&
    SHIRTS.has(a.shirtColor as string) &&
    typeof a.hat === "boolean"
  );
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Untrusted input from the wire — never assume shape. Returns null on
 * anything malformed so the caller can just drop the message. */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (typeof raw !== "string") return null;
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const m = obj as Record<string, unknown>;

  if (m.t === "join") {
    if (typeof m.name !== "string" || !isValidAvatar(m.avatar)) return null;
    return { t: "join", name: m.name.slice(0, 16), avatar: m.avatar };
  }
  if (m.t === "input") {
    return {
      t: "input",
      dirX: Math.max(-1, Math.min(1, num(m.dirX))),
      dirY: Math.max(-1, Math.min(1, num(m.dirY))),
      boost: m.boost === true,
    };
  }
  return null;
}
