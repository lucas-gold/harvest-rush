import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { PixelText } from "../../theme/PixelText";

interface Props {
  active: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  style?: StyleProp<ViewStyle>;
}

// Raw touch handlers, not Pressable — Pressable goes through React
// Native's legacy responder system, which only lets one gesture "win"
// globally at a time. This button needs to work with its own finger
// independently of whatever's happening on the drag layer elsewhere on
// screen (see DragFireButtonControls), which raw onTouchStart/End give
// for free — each touch is tracked by the view it actually landed on.
export function FireButton({ active, onPressIn, onPressOut, style }: Props) {
  return (
    <View
      onTouchStart={onPressIn}
      onTouchEnd={onPressOut}
      onTouchCancel={onPressOut}
      hitSlop={20}
      style={[styles.button, active && styles.buttonActive, style]}
    >
      <PixelText style={styles.label}>FIRE</PixelText>
    </View>
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
