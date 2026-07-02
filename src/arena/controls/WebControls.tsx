import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { PixelText } from "../../theme/PixelText";
import { BoostButton } from "./BoostButton";
import { useWebControls } from "./useWebControls";

export function WebControls() {
  const { setButtonBoost } = useWebControls();
  const [boosting, setBoosting] = useState(false);

  const setBoost = (v: boolean) => {
    setBoosting(v);
    setButtonBoost(v);
  };

  return (
    <>
      <View style={[styles.hint, { pointerEvents: "none" }]}>
        <PixelText weight="semibold" style={styles.hintText}>
          Mouse or WASD to move · Click, Space, or Boost to burn crops for speed
        </PixelText>
      </View>
      <BoostButton active={boosting} onPressIn={() => setBoost(true)} onPressOut={() => setBoost(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: "absolute",
    bottom: 130,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hintText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
  },
});
