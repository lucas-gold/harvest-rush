import React, { useMemo } from "react";
import { View } from "react-native";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { AvatarCustomization, Direction, buildAvatarSprite } from "../pixelart/sprites";

interface Props {
  customization: AvatarCustomization;
  size: number;
  direction?: Direction;
  walkFrame?: 0 | 1;
  /** Forces both arms to the same height — the walk cycle's stride pose
   * (one arm up, one down) is correct in motion but reads as lopsided in
   * a static preview like the avatar picker. */
  armsLevel?: boolean;
  /** Worn by whoever's #1 on the leaderboard — replaces the hat slot
   * entirely, hat or not. */
  crown?: boolean;
}

/** The single source of truth for "what does this player look like" —
 * used identically in the avatar picker preview and in-arena rendering. */
export function AvatarView({
  customization,
  size,
  direction = "down",
  walkFrame = 0,
  armsLevel = false,
  crown = false,
}: Props) {
  // Was rebuilt unconditionally on every render — with up to 18 visible
  // players re-rendering at ~25fps, that's a full pixel-matrix rebuild
  // (every cell, every filled color) happening hundreds of times a second
  // for no reason, since direction/walkFrame/customization usually don't
  // change between consecutive frames. PixelCanvas below is memoized on
  // this exact matrix reference, so a stable matrix here is what actually
  // lets that memoization do anything.
  const matrix = useMemo(
    () => buildAvatarSprite(direction, walkFrame, customization, armsLevel, crown),
    [direction, walkFrame, customization, armsLevel, crown]
  );
  return (
    <View style={{ width: size, height: size, pointerEvents: "none" }}>
      <PixelCanvas matrix={matrix} size={size} />
    </View>
  );
}
