import React, { useRef, useState } from "react";
import { View, StyleSheet, GestureResponderEvent, useWindowDimensions } from "react-native";
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
 * (where the avatar always sits, camera-locked); a dedicated button fires.
 *
 * Built on raw touch events (onTouchStart/Move/End), not PanResponder —
 * PanResponder (and Pressable, see FireButton) go through React Native's
 * legacy responder system, which only lets one gesture "win" globally at
 * a time. That's fine for a single finger, but it means a second finger
 * pressing the fire button while the first is mid-drag never gets its
 * own independent touch. Raw touch events don't have that exclusivity —
 * each touch is tracked by its own `identifier` and delivered to
 * whichever view it actually landed on, so drag and fire are genuinely
 * simultaneous and independent. */
export function DragFireButtonControls() {
  const { width, height } = useWindowDimensions();
  const dirRef = useRef({ x: 0, y: 0 });
  const firingRef = useRef(false);
  const [firing, setFiringState] = useState(false);

  // The specific touch currently steering movement — a second touch
  // starting elsewhere (e.g. on the fire button) is a different
  // identifier and never affects this.
  const dragTouchId = useRef<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, t: 0 });

  const applyPointer = (px: number, py: number) => {
    dirRef.current = directionFromDelta(px - width / 2, py - height / 2);
    sendInput(dirRef.current.x, dirRef.current.y, firingRef.current);
  };

  const setFiring = (value: boolean) => {
    firingRef.current = value;
    setFiringState(value);
    sendInput(dirRef.current.x, dirRef.current.y, value);
  };

  const onTouchStart = (evt: GestureResponderEvent) => {
    if (dragTouchId.current !== null) return; // already steering with another finger
    const touch = evt.nativeEvent.changedTouches[0];
    dragTouchId.current = touch.identifier;
    dragStart.current = { x: touch.pageX, y: touch.pageY, t: Date.now() };
    applyPointer(touch.pageX, touch.pageY);
  };

  const onTouchMove = (evt: GestureResponderEvent) => {
    // nativeEvent.touches is typed as a plain array, but on web it's the
    // browser's actual DOM TouchList — array-like, not a real Array, so
    // .find() isn't guaranteed to exist on it. Array.from first to be safe.
    const touch = Array.from(evt.nativeEvent.touches).find((t) => t.identifier === dragTouchId.current);
    if (touch) applyPointer(touch.pageX, touch.pageY);
  };

  const onTouchEnd = (evt: GestureResponderEvent) => {
    const touch = Array.from(evt.nativeEvent.changedTouches).find((t) => t.identifier === dragTouchId.current);
    if (!touch) return;
    dragTouchId.current = null;
    const moved = Math.hypot(touch.pageX - dragStart.current.x, touch.pageY - dragStart.current.y);
    if (moved <= TAP_MAX_MOVE_PX && Date.now() - dragStart.current.t <= TAP_MAX_DURATION_MS) {
      setFiring(true);
      setTimeout(() => setFiring(false), TAP_FIRE_PULSE_MS);
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
      <FireButton active={firing} onPressIn={() => setFiring(true)} onPressOut={() => setFiring(false)} />
    </>
  );
}
