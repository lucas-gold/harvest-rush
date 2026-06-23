import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { AvatarView } from "./AvatarView";
import { PixelText } from "../theme/PixelText";
import { usePlayerStore } from "../state/playerStore";
import {
  HAIR_OPTIONS,
  SHIRT_OPTIONS,
  SKIN_OPTIONS,
} from "../pixelart/sprites";
import { PALETTE } from "../theme/palette";

function Swatch({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.swatch, { backgroundColor: color }, selected && styles.swatchSelected]}
    />
  );
}

export function AvatarPicker() {
  const customization = usePlayerStore((s) => s.customization);
  const setCustomization = usePlayerStore((s) => s.setCustomization);

  return (
    <View style={styles.root}>
      <View style={styles.preview}>
        <AvatarView customization={customization} size={96} />
      </View>

      <PixelText weight="semibold" style={styles.label}>Skin</PixelText>
      <View style={styles.row}>
        {SKIN_OPTIONS.map((key) => (
          <Swatch
            key={key}
            color={PALETTE[key]}
            selected={customization.skinTone === key}
            onPress={() => setCustomization({ skinTone: key })}
          />
        ))}
      </View>

      <PixelText weight="semibold" style={styles.label}>Hair</PixelText>
      <View style={styles.row}>
        {HAIR_OPTIONS.map((key) => (
          <Swatch
            key={key}
            color={PALETTE[key]}
            selected={customization.hairColor === key}
            onPress={() => setCustomization({ hairColor: key })}
          />
        ))}
      </View>

      <PixelText weight="semibold" style={styles.label}>Shirt</PixelText>
      <View style={styles.row}>
        {SHIRT_OPTIONS.map((key) => (
          <Swatch
            key={key}
            color={PALETTE[key]}
            selected={customization.shirtColor === key}
            onPress={() => setCustomization({ shirtColor: key })}
          />
        ))}
      </View>

      <Pressable
        style={[styles.hatToggle, customization.hat && styles.hatToggleOn]}
        onPress={() => setCustomization({ hat: !customization.hat })}
      >
        <PixelText weight="semibold" style={styles.hatToggleText}>
          {customization.hat ? "Hat: On" : "Hat: Off"}
        </PixelText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 10 },
  preview: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    marginBottom: 4,
  },
  label: { color: "#fff", fontSize: 12, opacity: 0.8, marginTop: 2 },
  row: { flexDirection: "row", gap: 10 },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: "#fff" },
  hatToggle: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  hatToggleOn: { backgroundColor: "#e0c26a" },
  hatToggleText: { color: "#fff" },
});
