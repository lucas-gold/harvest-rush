import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { FireButton } from "./FireButton";
import { directionFromDelta } from "./shared";

/** Scheme 1 (default): drag anywhere to steer relative to screen center
 * (where the avatar always sits, camera-locked); a dedicated button fires. */
export function DragFireButtonControls() {
  const { width, height } = useWindowDimensions();
  const dirRef = useRef({ x: 0, y: 0 });
  const firingRef = useRef(false);
  const [firing, setFiringState] = useState(false);

  const applyPointer = (px: number, py: number) => {
    dirRef.current = directionFromDelta(px - width / 2, py - height / 2);
    sendInput(dirRef.current.x, dirRef.current.y, firingRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => applyPointer(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  const setFiring = (value: boolean) => {
    firingRef.current = value;
    setFiringState(value);
    sendInput(dirRef.current.x, dirRef.current.y, value);
  };

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-only" }]} {...panResponder.panHandlers} />
      <FireButton active={firing} onPressIn={() => setFiring(true)} onPressOut={() => setFiring(false)} />
    </>
  );
}
