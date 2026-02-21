import React, { useMemo, useRef, useState } from "react";
import { PanResponder, View, StyleSheet } from "react-native";
import { InputRef } from "../types";

const BASE_SIZE = 108;
const KNOB_SIZE = 48;
const MAX_OFFSET = (BASE_SIZE - KNOB_SIZE) / 2;

interface Props {
  input: InputRef;
}

export function Joystick({ input }: Props) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evt, gesture) => {
          const dx = gesture.dx;
          const dy = gesture.dy;
          const dist = Math.hypot(dx, dy);
          const clamped = Math.min(dist, MAX_OFFSET);
          const angle = Math.atan2(dy, dx);
          const kx = Math.cos(angle) * clamped;
          const ky = Math.sin(angle) * clamped;
          setKnob({ x: kx, y: ky });
          input.vector.x = dist > 0 ? Math.cos(angle) * Math.min(dist / MAX_OFFSET, 1) : 0;
          input.vector.y = dist > 0 ? Math.sin(angle) * Math.min(dist / MAX_OFFSET, 1) : 0;
        },
        onPanResponderRelease: () => {
          setKnob({ x: 0, y: 0 });
          input.vector.x = 0;
          input.vector.y = 0;
        },
        onPanResponderTerminate: () => {
          setKnob({ x: 0, y: 0 });
          input.vector.x = 0;
          input.vector.y = 0;
        },
      }),
    [input]
  );

  return (
    <View style={styles.base} {...panResponder.panHandlers}>
      <View
        style={[
          styles.knob,
          { transform: [{ translateX: knob.x }, { translateY: knob.y }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: BASE_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.25)",
  },
});
