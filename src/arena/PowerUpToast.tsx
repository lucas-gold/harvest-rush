import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { PixelText } from "../theme/PixelText";
import { useArenaStore } from "../multiplayer/arenaStore";
import { PowerUpKind } from "../multiplayer/protocol";

const VISIBLE_MS = 1500;

// Duration text is hardcoded to match the server's POWERUP_*_DURATION_MS
// (see server/src/constants.ts) rather than sent over the wire — these
// are fixed, not per-instance data, so there's nothing to gain from
// spending bytes on it every pickup.
const LABELS: Record<PowerUpKind, { title: string; subtitle: string | null }> = {
  speed: { title: "Speed Boost!", subtitle: "15s" },
  rapidFire: { title: "Rapid Fire!", subtitle: "7.5s" },
  shield: { title: "Shield!", subtitle: null },
};

/** A quick "what did I just pick up" popup — self only, not broadcast,
 * since it's purely personal feedback. */
export function PowerUpToast() {
  const lastPickup = useArenaStore((s) => s.lastPowerUpPickup);
  const [visiblePickup, setVisiblePickup] = useState<typeof lastPickup>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastPickup) return;
    setVisiblePickup(lastPickup);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    opacity.stopAnimation();
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }).start();
    hideTimer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, VISIBLE_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPickup]);

  if (!visiblePickup) return null;

  const label = LABELS[visiblePickup.kind];

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <PixelText style={styles.title}>{label.title}</PixelText>
      {label.subtitle && (
        <PixelText weight="semibold" style={styles.subtitle}>
          {label.subtitle}
        </PixelText>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "rgba(20,30,45,0.85)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4fc3f7",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  title: { color: "#fff", fontSize: 16 },
  subtitle: { color: "#4fc3f7", fontSize: 12, marginTop: 2 },
});
