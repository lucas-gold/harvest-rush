import React, { useRef, useState } from "react";
import { View, StyleSheet, PanResponder, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { BOOST_DRAG_THRESHOLD_PX, directionFromDelta } from "./shared";

/** Scheme 2: drag to steer; no separate boost control — dragging past a
 * distance threshold from screen center (where the avatar always sits)
 * boosts automatically. One input does both jobs. */
export function DragDistanceBoostControls() {
  const { width, height } = useWindowDimensions();
  const [boosting, setBoosting] = useState(false);
  const [touching, setTouching] = useState(false);
  const boostingRef = useRef(false);

  const applyPointer = (px: number, py: number) => {
    const dx = px - width / 2;
    const dy = py - height / 2;
    const dist = Math.hypot(dx, dy);
    const dir = directionFromDelta(dx, dy);
    const boost = dist >= BOOST_DRAG_THRESHOLD_PX;
    if (boost !== boostingRef.current) {
      boostingRef.current = boost;
      setBoosting(boost);
    }
    sendInput(dir.x, dir.y, boost);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setTouching(true),
      onPanResponderMove: (evt) => applyPointer(evt.nativeEvent.pageX, evt.nativeEvent.pageY),
      onPanResponderRelease: () => {
        setTouching(false);
        boostingRef.current = false;
        setBoosting(false);
        sendInput(0, 0, false);
      },
      onPanResponderTerminate: () => {
        setTouching(false);
        boostingRef.current = false;
        setBoosting(false);
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
              left: width / 2 - BOOST_DRAG_THRESHOLD_PX,
              top: height / 2 - BOOST_DRAG_THRESHOLD_PX,
              width: BOOST_DRAG_THRESHOLD_PX * 2,
              height: BOOST_DRAG_THRESHOLD_PX * 2,
              borderRadius: BOOST_DRAG_THRESHOLD_PX,
              borderColor: boosting ? "#e8c14a" : "rgba(255,255,255,0.35)",
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
