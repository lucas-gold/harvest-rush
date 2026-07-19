import React, { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { sendInput } from "../../multiplayer/connection";
import { FireButton } from "./FireButton";

type Dir = "up" | "down" | "left" | "right";
const BTN = 56;

/** Scheme 3: a classic 4-direction D-pad plus a fire button, both docked
 * along the bottom of the screen. Two adjacent directions can be held at
 * once for diagonal movement. */
export function DPadFireControls() {
  const held = useRef<Record<Dir, boolean>>({ up: false, down: false, left: false, right: false });
  const [, forceRender] = useState(0);
  const firingRef = useRef(false);
  const [firing, setFiringState] = useState(false);

  const sendDir = () => {
    const h = held.current;
    let x = (h.right ? 1 : 0) - (h.left ? 1 : 0);
    let y = (h.down ? 1 : 0) - (h.up ? 1 : 0);
    const mag = Math.hypot(x, y);
    if (mag > 0) {
      x /= mag;
      y /= mag;
    }
    sendInput(x, y, firingRef.current);
  };

  const setDir = (dir: Dir, value: boolean) => {
    held.current[dir] = value;
    forceRender((n) => n + 1);
    sendDir();
  };

  const setFiring = (value: boolean) => {
    firingRef.current = value;
    setFiringState(value);
    sendDir();
  };

  const dpadButton = (dir: Dir, symbol: string, style: object) => (
    <Pressable
      onPressIn={() => setDir(dir, true)}
      onPressOut={() => setDir(dir, false)}
      style={[styles.dpadButton, style, held.current[dir] && styles.dpadButtonActive]}
    >
      <Text style={styles.arrow}>{symbol}</Text>
    </Pressable>
  );

  return (
    <>
      <View style={styles.dpad}>
        {dpadButton("up", "▲", { top: 0, left: BTN })}
        {dpadButton("left", "◀", { top: BTN, left: 0 })}
        {dpadButton("right", "▶", { top: BTN, left: BTN * 2 })}
        {dpadButton("down", "▼", { top: BTN * 2, left: BTN })}
      </View>
      <FireButton active={firing} onPressIn={() => setFiring(true)} onPressOut={() => setFiring(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  dpad: {
    position: "absolute",
    left: 20,
    bottom: 20,
    width: BTN * 3,
    height: BTN * 3,
  },
  dpadButton: {
    position: "absolute",
    width: BTN,
    height: BTN,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  dpadButtonActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  arrow: {
    color: "#fff",
    fontSize: 20,
  },
});
