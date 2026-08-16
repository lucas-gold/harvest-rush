import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { PixelText } from "../../theme/PixelText";
import { JoystickSide, useSettingsStore } from "../../state/settingsStore";

const OPTIONS: { value: JoystickSide; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

/** Mobile-web only (see EntryScreen) -- which bottom corner the joystick
 * sits in; the minimap takes the other one (see ArenaScreen). */
export function JoystickSideToggle() {
  const joystickSide = useSettingsStore((s) => s.joystickSide);
  const setJoystickSide = useSettingsStore((s) => s.setJoystickSide);

  return (
    <View style={styles.root}>
      <PixelText weight="semibold" style={styles.title}>
        Joystick side
      </PixelText>
      <View style={styles.row}>
        {OPTIONS.map((opt) => {
          const selected = joystickSide === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setJoystickSide(opt.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <PixelText weight="semibold" style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {opt.label}
              </PixelText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 6 },
  title: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionSelected: { backgroundColor: "rgba(255,255,255,0.22)" },
  optionLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  optionLabelSelected: { color: "#fff" },
});
