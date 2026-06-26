import React from "react";
import { View, StyleSheet } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";

const SIZE = 110;

export function Minimap() {
  const selfId = useArenaStore((s) => s.selfId);
  const players = useArenaStore((s) => s.players);
  const arenaRadius = useArenaStore((s) => s.arenaRadius);

  const toLocal = (x: number, y: number) => ({
    left: SIZE / 2 + (x / arenaRadius) * (SIZE / 2 - 4),
    top: SIZE / 2 + (y / arenaRadius) * (SIZE / 2 - 4),
  });

  return (
    <View style={styles.root}>
      {Object.values(players).map((p) => {
        const { left, top } = toLocal(p.x, p.y);
        const isSelf = p.id === selfId;
        return (
          <View
            key={p.id}
            style={[
              styles.dot,
              {
                left: left - (isSelf ? 4 : 2),
                top: top - (isSelf ? 4 : 2),
                width: isSelf ? 8 : 4,
                height: isSelf ? 8 : 4,
                borderRadius: isSelf ? 4 : 2,
                backgroundColor: isSelf ? "#fff8e7" : p.isBot ? "rgba(255,255,255,0.4)" : "#e8c14a",
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  dot: { position: "absolute" },
});
