import React from "react";
import { View, StyleSheet } from "react-native";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildTreeSprite } from "../pixelart/decorSprites";

// Fixed scatter (percentage-based so it holds up across screen sizes)
// rather than randomized per-mount — a decoration that shifts every time
// you revisit the entry screen would be distracting, not charming.
// Weighted toward the edges/corners so it doesn't compete with the
// centered form content.
const TREES: { left: `${number}%`; top: `${number}%`; size: number; opacity: number }[] = [
  { left: "0%", top: "2%", size: 118, opacity: 0.55 },
  { left: "10%", top: "32%", size: 84, opacity: 0.4 },
  { left: "-2%", top: "58%", size: 132, opacity: 0.6 },
  { left: "13%", top: "78%", size: 90, opacity: 0.45 },
  { left: "84%", top: "0%", size: 108, opacity: 0.55 },
  { left: "76%", top: "28%", size: 78, opacity: 0.4 },
  { left: "87%", top: "52%", size: 124, opacity: 0.6 },
  { left: "79%", top: "80%", size: 96, opacity: 0.45 },
];

// Built once per slot at module scope (not per-render) — each index gets
// a different apple layout (see buildTreeSprite's variant param) so trees
// scattered across the screen don't all look like copies of each other.
const treeMatrices = TREES.map((_, i) => buildTreeSprite(i));

/** Purely decorative 16-bit trees scattered behind the entry screen's
 * form content — entry screen only, per design. */
export function EntryTrees() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {TREES.map((t, i) => (
        <View key={i} style={{ position: "absolute", left: t.left, top: t.top, opacity: t.opacity }}>
          <PixelCanvas matrix={treeMatrices[i]} size={t.size} />
        </View>
      ))}
    </View>
  );
}
