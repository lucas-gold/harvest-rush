import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildCoinSprite } from "../../pixelart/sprites";
import { useEconomyStore } from "../../state/economyStore";
import { useRunStore } from "../../state/runStore";

interface Props {
  onPause: () => void;
}

const coinMatrix = buildCoinSprite();

export function HUD({ onPause }: Props) {
  const coins = useEconomyStore((s) => s.coins);
  const wave = useRunStore((s) => s.wave);
  const health = useRunStore((s) => s.health);
  const maxHealth = useRunStore((s) => s.maxHealth);

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.pill}>
        <PixelCanvas matrix={coinMatrix} size={18} />
        <Text style={styles.pillText}>{coins}</Text>
      </View>

      <View style={styles.hearts}>
        {Array.from({ length: maxHealth }, (_, i) => (
          <View
            key={i}
            style={[styles.heart, { opacity: i < health ? 1 : 0.25 }]}
          />
        ))}
      </View>

      <View style={styles.pill}>
        <Text style={styles.pillText}>Wave {wave}</Text>
      </View>

      <Pressable onPress={onPause} style={styles.pauseButton} hitSlop={10}>
        <Text style={styles.pauseText}>II</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pillText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  hearts: {
    flexDirection: "row",
    gap: 2,
  },
  heart: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#d9433a",
  },
  pauseButton: {
    backgroundColor: "rgba(0,0,0,0.45)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
});
