import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildCropSprite } from "../../pixelart/sprites";
import { CROP_ORDER, CROPS } from "../crops";
import { useRunStore } from "../../state/runStore";

export function CropBar() {
  const selected = useRunStore((s) => s.selectedCrop);
  const setSelected = useRunStore((s) => s.setSelectedCrop);

  return (
    <View style={styles.row} pointerEvents="box-none">
      {CROP_ORDER.map((type) => {
        const def = CROPS[type];
        const active = selected === type;
        return (
          <Pressable
            key={type}
            onPress={() => setSelected(type)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <PixelCanvas matrix={buildCropSprite(type, 3)} size={22} />
            <Text style={styles.cost}>{def.seedCost}c</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    padding: 6,
    alignSelf: "center",
  },
  chip: {
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  cost: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
