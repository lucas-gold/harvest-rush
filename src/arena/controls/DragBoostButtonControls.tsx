import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { BoostButton } from "./BoostButton";
import { directionFromDelta } from "./shared";

/** Scheme 1 (default): drag anywhere to steer relative to screen center
 * (where the avatar always sits, camera-locked); a dedicated button boosts. */
export function DragBoostButtonControls() {
  const { width, height } = useWindowDimensions();
  const dirRef = useRef({ x: 0, y: 0 });
  const boostingRef = useRef(false);
  const [boosting, setBoostingState] = useState(false);

  const applyPointer = (px: number, py: number) => {
    dirRef.current = directionFromDelta(px - width / 2, py - height / 2);
    sendInput(dirRef.current.x, dirRef.current.y, boostingRef.current);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => applyPointer(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
    })
  ).current;

  const setBoost = (value: boolean) => {
    boostingRef.current = value;
    setBoostingState(value);
    sendInput(dirRef.current.x, dirRef.current.y, value);
  };

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-only" }]} {...panResponder.panHandlers} />
      <BoostButton active={boosting} onPressIn={() => setBoost(true)} onPressOut={() => setBoost(false)} />
    </>
  );
}
