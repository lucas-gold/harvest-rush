import { useEffect, useRef } from "react";
import { sendInput } from "../../multiplayer/connection";
import { directionFromDelta } from "./shared";

const MOVE_KEYS = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"]);

/**
 * Web controls: every method works simultaneously, no picking one —
 * mouse position steers continuously (no click needed, true to the
 * genre), WASD/arrow keys steer too (keyboard wins over the mouse
 * whenever a movement key is actively held), and boost fires from a
 * left click anywhere, holding space, or the on-screen boost button
 * (via the returned setButtonBoost, so all three merge into one state).
 */
export function useWebControls() {
  const setButtonBoostRef = useRef<(v: boolean) => void>(() => {});

  useEffect(() => {
    let mouseDir = { x: 0, y: 0 };
    let keyDir = { x: 0, y: 0 };
    let mouseBoost = false;
    let spaceBoost = false;
    let buttonBoost = false;
    const keysHeld = new Set<string>();

    const recomputeKeyDir = () => {
      let x = 0;
      let y = 0;
      if (keysHeld.has("arrowleft") || keysHeld.has("a")) x -= 1;
      if (keysHeld.has("arrowright") || keysHeld.has("d")) x += 1;
      if (keysHeld.has("arrowup") || keysHeld.has("w")) y -= 1;
      if (keysHeld.has("arrowdown") || keysHeld.has("s")) y += 1;
      const mag = Math.hypot(x, y);
      keyDir = mag > 0 ? { x: x / mag, y: y / mag } : { x: 0, y: 0 };
    };

    const send = () => {
      const dir = keyDir.x !== 0 || keyDir.y !== 0 ? keyDir : mouseDir;
      sendInput(dir.x, dir.y, mouseBoost || spaceBoost || buttonBoost);
    };

    setButtonBoostRef.current = (v: boolean) => {
      buttonBoost = v;
      send();
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseDir = directionFromDelta(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2);
      send();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      mouseBoost = true;
      send();
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      mouseBoost = false;
      send();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") {
        e.preventDefault();
        spaceBoost = true;
        send();
        return;
      }
      if (MOVE_KEYS.has(k) && !keysHeld.has(k)) {
        keysHeld.add(k);
        recomputeKeyDir();
        send();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") {
        spaceBoost = false;
        send();
        return;
      }
      if (keysHeld.has(k)) {
        keysHeld.delete(k);
        recomputeKeyDir();
        send();
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return {
    setButtonBoost: (v: boolean) => setButtonBoostRef.current(v),
  };
}
