import React from "react";
import { View } from "react-native";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { AvatarCustomization, Direction, buildAvatarSprite } from "../pixelart/sprites";

interface Props {
  customization: AvatarCustomization;
  size: number;
  direction?: Direction;
  walkFrame?: 0 | 1;
}

/** The single source of truth for "what does this player look like" —
 * used identically in the avatar picker preview and in-arena rendering. */
export function AvatarView({ customization, size, direction = "down", walkFrame = 0 }: Props) {
  const matrix = buildAvatarSprite(direction, walkFrame, customization);
  return (
    <View style={{ width: size, height: size, pointerEvents: "none" }}>
      <PixelCanvas matrix={matrix} size={size} />
    </View>
  );
}
