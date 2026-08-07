import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildSkullIconSprite } from "../pixelart/iconSprites";

const skullMatrix = buildSkullIconSprite();

export function HUD() {
  const kills = useArenaStore((s) => s.kills);
  const playerCount = useArenaStore((s) => s.playerCount);

  return (
    <View style={styles.root}>
      <View style={styles.pill}>
        <PixelCanvas matrix={skullMatrix} size={16} />
        <Text style={styles.cropCount}>{kills}</Text>
      </View>
      <View style={styles.pillSmall}>
        <Text style={styles.playerCount}>{playerCount} in lobby</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  pill: {
    minWidth: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cropCount: { color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center" },
  pillSmall: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  playerCount: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600" },
});
