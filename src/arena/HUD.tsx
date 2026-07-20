import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";

export function HUD() {
  const selfId = useArenaStore((s) => s.selfId);
  const players = useArenaStore((s) => s.players);
  const playerCount = useArenaStore((s) => s.playerCount);
  const crops = selfId ? players[selfId]?.crops ?? 0 : 0;

  return (
    <View style={styles.root}>
      <View style={styles.pill}>
        <Text style={styles.cropCount}>{crops}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cropCount: { color: "#fff", fontWeight: "800", fontSize: 16 },
  pillSmall: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  playerCount: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600" },
});
