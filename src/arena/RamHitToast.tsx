import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { PixelText } from "../theme/PixelText";
import { useArenaStore } from "../multiplayer/arenaStore";
import { useSettingsStore } from "../state/settingsStore";

const VISIBLE_MS = 1600;

/** A ram landing was previously silent for the winner — the other player
 * just vanished, easy to miss and easy to read as "nothing happened."
 * This is a brief, non-blocking toast (unlike PopOverlay, which is the
 * loser's full-screen game-over) confirming the hit and what it won. */
export function RamHitToast() {
  const lastRamHit = useArenaStore((s) => s.lastRamHit);
  const [visibleHit, setVisibleHit] = useState<typeof lastRamHit>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!lastRamHit) return;
    setVisibleHit(lastRamHit);
    if (useSettingsStore.getState().hapticsOn) {
      Haptics.impactAsync(
        lastRamHit.eliminated ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});
    }
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
  }, [lastRamHit]);

  if (!visibleHit) return null;

  const verb = visibleHit.eliminated ? "Popped" : "Hit";
  const target = visibleHit.targetIsBot ? `${visibleHit.targetName} (bot)` : visibleHit.targetName;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <PixelText style={styles.title}>
        {verb} {target}!
      </PixelText>
      <PixelText weight="semibold" style={styles.subtitle}>
        +{visibleHit.scattered} crops scattered — go grab them
      </PixelText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "38%",
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "rgba(26,20,15,0.85)",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0433a",
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  title: { color: "#fff", fontSize: 18 },
  subtitle: { color: "#e8c14a", fontSize: 12, marginTop: 2 },
});
