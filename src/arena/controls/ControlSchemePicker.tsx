import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { PixelText } from "../../theme/PixelText";
import { ControlScheme, useSettingsStore } from "../../state/settingsStore";

const OPTIONS: { value: ControlScheme; label: string; description: string }[] = [
  {
    value: "dragFireButton",
    label: "Drag + Fire Button",
    description: "Drag anywhere to steer, tap the button to shoot.",
  },
  {
    value: "dragDistanceFire",
    label: "Drag Far to Fire",
    description: "Drag to steer — drag far enough and you auto-fire.",
  },
  {
    value: "dpadFireButton",
    label: "D-Pad + Fire Button",
    description: "Classic 4-direction pad, plus a fire button.",
  },
];

export function ControlSchemePicker() {
  const controlScheme = useSettingsStore((s) => s.controlScheme);
  const setControlScheme = useSettingsStore((s) => s.setControlScheme);

  return (
    <View style={styles.root}>
      <PixelText weight="semibold" style={styles.title}>
        Controls
      </PixelText>
      {OPTIONS.map((opt) => {
        const selected = controlScheme === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setControlScheme(opt.value)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]} />
            <View style={styles.optionText}>
              <PixelText weight="semibold" style={styles.optionLabel}>
                {opt.label}
              </PixelText>
              <PixelText weight="semibold" style={styles.optionDescription}>
                {opt.description}
              </PixelText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: 280, gap: 6 },
  title: { color: "#fff", fontSize: 13, opacity: 0.85, marginBottom: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  optionSelected: { backgroundColor: "rgba(255,255,255,0.16)" },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  radioSelected: { backgroundColor: "#4caf50", borderColor: "#4caf50" },
  optionText: { flex: 1 },
  optionLabel: { color: "#fff", fontSize: 13 },
  optionDescription: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 },
});
