import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { FIRE_DRAG_THRESHOLD_PX, directionFromDelta } from "./shared";

/** Scheme 2: drag to steer; no separate fire control — dragging past a
 * distance threshold from screen center (where the avatar always sits)
 * fires automatically. One input does both jobs. */
export function DragDistanceFireControls() {
  const { width, height } = useWindowDimensions();
  const [firing, setFiring] = useState(false);
  const [touching, setTouching] = useState(false);
  const firingRef = useRef(false);

  const applyPointer = (px: number, py: number) => {
    const dx = px - width / 2;
    const dy = py - height / 2;
    const dist = Math.hypot(dx, dy);
    const dir = directionFromDelta(dx, dy);
    const fire = dist >= FIRE_DRAG_THRESHOLD_PX;
    if (fire !== firingRef.current) {
      firingRef.current = fire;
      setFiring(fire);
    }
    sendInput(dir.x, dir.y, fire);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setTouching(true),
      onPanResponderMove: (evt) => applyPointer(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderRelease: () => {
        setTouching(false);
        firingRef.current = false;
        setFiring(false);
        sendInput(0, 0, false);
      },
      onPanResponderTerminate: () => {
        setTouching(false);
        firingRef.current = false;
        setFiring(false);
      },
    })
  ).current;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: "box-only" }]} {...panResponder.panHandlers}>
      {touching && (
        <View
          pointerEvents="none"
          style={[
            styles.thresholdRing,
            {
              left: width / 2 - FIRE_DRAG_THRESHOLD_PX,
              top: height / 2 - FIRE_DRAG_THRESHOLD_PX,
              width: FIRE_DRAG_THRESHOLD_PX * 2,
              height: FIRE_DRAG_THRESHOLD_PX * 2,
              borderRadius: FIRE_DRAG_THRESHOLD_PX,
              borderColor: firing ? "#e8c14a" : "rgba(255,255,255,0.35)",
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thresholdRing: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
  },
});
