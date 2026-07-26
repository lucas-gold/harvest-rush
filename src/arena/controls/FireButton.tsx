import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { PixelText } from "../../theme/PixelText";

interface Props {
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  style?: StyleProp<ViewStyle>;
}

export function FireButton({ active, onPressIn, onPressOut, style }: Props) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={20}
      style={[styles.button, active && styles.buttonActive, style]}
    >
      <PixelText style={styles.label}>FIRE</PixelText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 24,
    bottom: 32,
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#e8c14a",
    backgroundColor: "rgba(232,193,74,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonActive: {
    backgroundColor: "rgba(232,193,74,0.55)",
    transform: [{ scale: 0.94 }],
  },
  label: { color: "#fff", fontSize: 12 },
});
