// Mirrored at src/bannedNames.ts (client) -- keep the two in sync. Basic
// substring filter, not word-boundary aware: a name is blocked if any
// entry appears anywhere within it, case-insensitively, so e.g. "grass"
// would also be caught by a shorter slur it happens to contain. That
// tradeoff is deliberate here in exchange for staying simple.
//
// The list itself is base64, not plain strings -- purely so the raw
// words aren't sitting in this file for anyone opening it to read; this
// isn't a real secret the way the admin code is; anyone can decode it in
// one line, same as we do below.
//
// The client already gates its Play button on this (see EntryScreen),
// but a real client isn't the only thing that can send a "join" message
// -- checked again here so a bad name can't reach other players' screens
// by going around it.
const ENCODED_WORDS =
  "YWRtaW4sX2FkbWluLGZ1Y2ssc2hpdCxiaXRjaCxjdW50LGFzc2hvbGUsYmFzdGFyZCxkaWNrLHBpc3Msd2hvcmUsc2x1dCxmYWdnb3QsbmlnZ2VyLG5pZ2dhLHJldGFyZCxyYXBlLHBvcm4sbmF6aSxoaXRsZXI=";

export const BANNED_NAME_WORDS = atob(ENCODED_WORDS).split(",");

export function containsBannedWord(name: string): boolean {
  const lower = name.toLowerCase();
  return BANNED_NAME_WORDS.some((word) => lower.includes(word));
}
