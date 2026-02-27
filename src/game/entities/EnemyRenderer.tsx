import React from "react";
import { View } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildChickenSprite, buildFoxSprite, buildThiefSprite } from "../../pixelart/sprites";
import { EnemyKind } from "../types";
import { PLAYER_SIZE } from "../constants";

interface Props {
  position: { x: number; y: number };
  kind: EnemyKind;
  walkFrame: 0 | 1;
  state: "approaching" | "fleeing" | "stealing";
}

const SIZE_BY_KIND: Record<EnemyKind, number> = {
  chicken: PLAYER_SIZE * 0.75,
  fox: PLAYER_SIZE * 0.95,
  thief: PLAYER_SIZE,
};

function EnemyRendererBase({ position, kind, walkFrame, state }: Props) {
  const size = SIZE_BY_KIND[kind];
  const matrix =
    kind === "chicken"
      ? buildChickenSprite(walkFrame)
      : kind === "fox"
      ? buildFoxSprite(walkFrame)
      : buildThiefSprite(walkFrame);

  return (
    <View
      style={{
        position: "absolute",
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
        opacity: state === "fleeing" ? 0.7 : 1,
      }}
      pointerEvents="none"
    >
      <PixelCanvas matrix={matrix} size={size} />
    </View>
  );
}

export const EnemyRenderer = React.memo(EnemyRendererBase);
