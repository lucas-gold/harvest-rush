import React, { useMemo } from "react";
import { View } from "react-native";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildBackpackSprite, buildWheatBundleSprite } from "../pixelart/cropSprites";
import { bundleCountForCrops } from "./gameMath";

const backpackMatrix = buildBackpackSprite();
const bundleMatrix = buildWheatBundleSprite();

interface Props {
  crops: number;
  /** Matches the avatar's on-screen size at the current zoom. */
  size: number;
}

export function BackpackStack({ crops, size }: Props) {
  const bundleCount = bundleCountForCrops(crops);
  const backpackSize = size * 0.62;
  const bundleSize = size * 0.55;
  const stackStep = bundleSize * 0.42;

  const bundles = useMemo(() => Array.from({ length: bundleCount }, (_, i) => i), [bundleCount]);

  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        alignItems: "center",
        pointerEvents: "none",
      }}
    >
      <View style={{ position: "absolute", top: size * 0.18, width: backpackSize, height: backpackSize }}>
        <PixelCanvas matrix={backpackMatrix} size={backpackSize} />
      </View>
      {bundles.map((i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            top: size * 0.1 - i * stackStep,
            left: (i % 2 === 0 ? -1 : 1) * bundleSize * 0.14,
            width: bundleSize,
            height: bundleSize,
          }}
        >
          <PixelCanvas matrix={bundleMatrix} size={bundleSize} />
        </View>
      ))}
    </View>
  );
}
