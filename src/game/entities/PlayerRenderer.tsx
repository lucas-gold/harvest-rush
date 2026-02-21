import React from "react";
import { View } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildFarmerSprite, Direction } from "../../pixelart/sprites";
import { PLAYER_SIZE } from "../constants";
import { usePlayerStore } from "../../state/playerStore";

interface Props {
  position: { x: number; y: number };
  direction: Direction;
  walkFrame: 0 | 1;
}

function PlayerRendererBase({ position, direction, walkFrame }: Props) {
  const customization = usePlayerStore((s) => s.customization);
  const mirrored = direction === "right";
  const renderDirection: Direction = direction === "right" ? "left" : direction;
  const matrix = buildFarmerSprite(renderDirection, walkFrame, customization);

  return (
    <View
      style={{
        position: "absolute",
        left: position.x - PLAYER_SIZE / 2,
        top: position.y - PLAYER_SIZE / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        transform: mirrored ? [{ scaleX: -1 }] : undefined,
      }}
      pointerEvents="none"
    >
      <PixelCanvas matrix={matrix} size={PLAYER_SIZE} />
    </View>
  );
}

export const PlayerRenderer = React.memo(PlayerRendererBase);
