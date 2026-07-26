import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { FireButton } from "./FireButton";
import { directionFromDelta } from "./shared";

// A tap (not a drag) anywhere on the map also fires — undocumented on
// purpose, no visual hint. Thresholds classify "tap" the usual way: not
// much finger movement, not held long.
const TAP_MAX_MOVE_PX = 12;
const TAP_MAX_DURATION_MS = 250;
// How long the resulting firing pulse stays "on" — must clear
// INPUT_SEND_INTERVAL_MS (see sendInput) so it actually reaches the
// server before flipping back off.
const TAP_FIRE_PULSE_MS = 90;

/** Scheme 1 (default): drag anywhere to steer relative to screen center
 * (where the avatar always sits, camera-locked); a dedicated button fires. */
export function DragFireButtonControls() {
  const { width, height } = useWindowDimensions();
  const dirRef = useRef({ x: 0, y: 0 });
  const firingRef = useRef(false);
  const [firing, setFiringState] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, t: 0 });

  const applyPointer = (px: number, py: number) => {
    dirRef.current = directionFromDelta(px - width / 2, py - height / 2);
    sendInput(dirRef.current.x, dirRef.current.y, firingRef.current);
  };

  const setFiring = (value: boolean) => {
    firingRef.current = value;
    setFiringState(value);
    sendInput(dirRef.current.x, dirRef.current.y, value);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        touchStartRef.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY, t: Date.now() };
      },
      onPanResponderMove: (evt) => applyPointer(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderRelease: (evt) => {
        const start = touchStartRef.current;
        const moved = Math.hypot(evt.nativeEvent.pageX - start.x, evt.nativeEvent.pageY - start.y);
        if (moved <= TAP_MAX_MOVE_PX && Date.now() - start.t <= TAP_MAX_DURATION_MS) {
          setFiring(true);
          setTimeout(() => setFiring(false), TAP_FIRE_PULSE_MS);
        }
      },
    })
  ).current;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-only" }]} {...panResponder.panHandlers} />
      <FireButton active={firing} onPressIn={() => setFiring(true)} onPressOut={() => setFiring(false)} />
    </>
  );
}
