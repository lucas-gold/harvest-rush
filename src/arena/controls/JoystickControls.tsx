import React, { useRef, useState } from "react";
import { View, StyleSheet, GestureResponderEvent, useWindowDimensions } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { useSettingsStore } from "../../state/settingsStore";

const MARGIN_SIDE = 24;
const MARGIN_BOTTOM = 32;
const OUTER_SIZE = 120;
const OUTER_RADIUS = OUTER_SIZE / 2;
const NUB_SIZE = 52;
// A little more forgiving than the visual ring itself -- grabbing right at
// or just outside the drawn edge should still pick up the stick, not miss
// it into a fire-tap.
const HIT_RADIUS = OUTER_RADIUS + 20;
const DEADZONE_PX = 8;

/** Scheme: a fixed on-screen joystick for movement (outer ring + a nub
 * that follows the finger, clamped to the ring), and firing is just
 * holding anywhere else on screen -- no dedicated button. Which bottom
 * corner the stick sits in is a settings choice (see settingsStore); the
 * minimap takes the other one (see ArenaScreen).
 *
 * One full-screen raw touch layer, not two overlapping views with their
 * own handlers -- classifying each new touch by whether it started inside
 * the stick's radius avoids relying on DOM event propagation/stopPropagation
 * to keep the two zones from double-handling the same touch. Multiple
 * simultaneous touches are independent by identifier, same as the other
 * schemes: one finger can hold the stick while another taps to fire. */
export function JoystickControls() {
  const { width, height } = useWindowDimensions();
  const side = useSettingsStore((s) => s.joystickSide);

  const centerX = side === "left" ? MARGIN_SIDE + OUTER_RADIUS : width - MARGIN_SIDE - OUTER_RADIUS;
  const centerY = height - MARGIN_BOTTOM - OUTER_RADIUS;

  const dirRef = useRef({ x: 0, y: 0 });
  const firingRef = useRef(false);
  const [firing, setFiringState] = useState(false);
  const [nubOffset, setNubOffset] = useState({ x: 0, y: 0 });

  const stickTouchId = useRef<string | null>(null);
  const fireTouchIds = useRef<Set<string>>(new Set());

  const updateStick = (px: number, py: number) => {
    const dx = px - centerX;
    const dy = py - centerY;
    const mag = Math.hypot(dx, dy);
    const clamped = Math.min(mag, OUTER_RADIUS);
    setNubOffset(mag > 0 ? { x: (dx / mag) * clamped, y: (dy / mag) * clamped } : { x: 0, y: 0 });
    dirRef.current = mag < DEADZONE_PX ? { x: 0, y: 0 } : { x: dx / mag, y: dy / mag };
    sendInput(dirRef.current.x, dirRef.current.y, firingRef.current);
  };

  const setFiring = (value: boolean) => {
    firingRef.current = value;
    setFiringState(value);
    sendInput(dirRef.current.x, dirRef.current.y, value);
  };

  const onTouchStart = (evt: GestureResponderEvent) => {
    for (const touch of evt.nativeEvent.changedTouches) {
      const withinStick = Math.hypot(touch.pageX - centerX, touch.pageY - centerY) <= HIT_RADIUS;
      if (withinStick && stickTouchId.current === null) {
        stickTouchId.current = touch.identifier;
        updateStick(touch.pageX, touch.pageY);
      } else if (!withinStick) {
        fireTouchIds.current.add(touch.identifier);
        if (!firingRef.current) setFiring(true);
      }
    }
  };

  const onTouchMove = (evt: GestureResponderEvent) => {
    if (stickTouchId.current === null) return;
    const touch = Array.from(evt.nativeEvent.touches).find((t) => t.identifier === stickTouchId.current);
    if (touch) updateStick(touch.pageX, touch.pageY);
  };

  const onTouchEnd = (evt: GestureResponderEvent) => {
    for (const touch of evt.nativeEvent.changedTouches) {
      if (touch.identifier === stickTouchId.current) {
        stickTouchId.current = null;
        dirRef.current = { x: 0, y: 0 };
        setNubOffset({ x: 0, y: 0 });
        sendInput(0, 0, firingRef.current);
      } else if (fireTouchIds.current.delete(touch.identifier)) {
        if (fireTouchIds.current.size === 0) setFiring(false);
      }
    }
  };

  return (
    <>
      <View
        style={StyleSheet.absoluteFill}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      />
      <View
        pointerEvents="none"
        style={[
          styles.outer,
          side === "left" ? { left: MARGIN_SIDE } : { right: MARGIN_SIDE },
          { bottom: MARGIN_BOTTOM },
        ]}
      >
        <View
          style={[
            styles.nub,
            { transform: [{ translateX: nubOffset.x }, { translateY: nubOffset.y }] },
            firing && styles.nubFiring,
          ]}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_RADIUS,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  nub: {
    width: NUB_SIZE,
    height: NUB_SIZE,
    borderRadius: NUB_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  nubFiring: {
    backgroundColor: "rgba(232,193,74,0.65)",
    borderColor: "#e8c14a",
  },
});
