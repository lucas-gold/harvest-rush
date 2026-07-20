import React from "react";
import { View, StyleSheet } from "react-native";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildTreeSprite } from "../pixelart/decorSprites";

const treeMatrix = buildTreeSprite();

// Fixed scatter (percentage-based so it holds up across screen sizes)
// rather than randomized per-mount — a decoration that shifts every time
// you revisit the entry screen would be distracting, not charming.
// Weighted toward the edges/corners so it doesn't compete with the
// centered form content.
const TREES: { left: `${number}%`; top: `${number}%`; size: number; opacity: number }[] = [
  { left: "2%", top: "4%", size: 70, opacity: 0.55 },
  { left: "14%", top: "18%", size: 46, opacity: 0.4 },
  { left: "4%", top: "38%", size: 58, opacity: 0.5 },
  { left: "1%", top: "62%", size: 80, opacity: 0.6 },
  { left: "16%", top: "80%", size: 50, opacity: 0.45 },
  { left: "88%", top: "3%", size: 64, opacity: 0.55 },
  { left: "80%", top: "20%", size: 44, opacity: 0.4 },
  { left: "90%", top: "40%", size: 72, opacity: 0.6 },
  { left: "82%", top: "64%", size: 52, opacity: 0.45 },
  { left: "92%", top: "82%", size: 66, opacity: 0.55 },
  { left: "45%", top: "2%", size: 40, opacity: 0.3 },
  { left: "60%", top: "90%", size: 56, opacity: 0.4 },
];

/** Purely decorative 16-bit trees scattered behind the entry screen's
 * form content — entry screen only, per design. */
export function EntryTrees() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {TREES.map((t, i) => (
        <View key={i} style={{ position: "absolute", left: t.left, top: t.top, opacity: t.opacity }}>
          <PixelCanvas matrix={treeMatrix} size={t.size} />
        </View>
      ))}
    </View>
  );
}
