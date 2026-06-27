import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PixelText } from "../theme/PixelText";
import { useArenaStore } from "../multiplayer/arenaStore";

export function Leaderboard() {
  const leaderboard = useArenaStore((s) => s.leaderboard);
  const selfId = useArenaStore((s) => s.selfId);

  return (
    <View style={styles.root}>
      <PixelText weight="semibold" style={styles.title}>
        Top 10
      </PixelText>
      {leaderboard.map((entry, i) => (
        <View key={entry.id} style={styles.row}>
          <Text style={[styles.rank, entry.id === selfId && styles.selfText]}>{i + 1}</Text>
          <PixelText
            weight="semibold"
            style={[styles.name, entry.id === selfId && styles.selfText]}
            numberOfLines={1}
          >
            {entry.name}
          </PixelText>
          <Text style={[styles.crops, entry.id === selfId && styles.selfText]}>{entry.crops}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 150,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 10,
    padding: 8,
  },
  title: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 1 },
  rank: { color: "rgba(255,255,255,0.6)", fontSize: 11, width: 16 },
  name: { color: "#fff", fontSize: 12, flex: 1 },
  crops: { color: "#e8c14a", fontSize: 12, fontWeight: "700" },
  selfText: { color: "#7bd97a" },
});
