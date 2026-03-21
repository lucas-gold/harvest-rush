import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildCropSprite } from "../pixelart/sprites";
import { usePlayerStore } from "../state/playerStore";
import { useEconomyStore } from "../state/economyStore";
import { useFarmStore } from "../state/farmStore";
import { useSettingsStore } from "../state/settingsStore";
import { configureIAP } from "../services/iap";
import { startCloudSync } from "../services/save";
import { signIn as signInGameServices } from "../services/gameServices";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Loading">;

function waitForHydration(store: any): Promise<void> {
  return new Promise((resolve) => {
    if (store.persist?.hasHydrated?.()) {
      resolve();
      return;
    }
    const unsub = store.persist?.onFinishHydration?.(() => {
      unsub?.();
      resolve();
    });
    if (!unsub) resolve();
  });
}

export function LoadingScreen({ navigation }: Props) {
  const [progress, setProgress] = useState(0.05);
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -6, duration: 420, easing: Easing.quad, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 420, easing: Easing.quad, useNativeDriver: true }),
      ])
    ).start();
  }, [bounce]);

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function boot() {
      setProgress(0.15);
      await Promise.all([
        waitForHydration(usePlayerStore),
        waitForHydration(useEconomyStore),
        waitForHydration(useFarmStore),
        waitForHydration(useSettingsStore),
      ]);
      if (cancelled) return;
      setProgress(0.45);

      await Promise.allSettled([configureIAP(), signInGameServices(), startCloudSync()]);
      if (cancelled) return;
      setProgress(0.9);

      const elapsed = Date.now() - started;
      const minDisplayMs = 900;
      if (elapsed < minDisplayMs) {
        await new Promise((r) => setTimeout(r, minDisplayMs - elapsed));
      }
      if (cancelled) return;
      setProgress(1);
      navigation.replace("Home");
    }

    boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <PixelCanvas matrix={buildCropSprite("corn", 3)} size={64} />
      </Animated.View>
      <Text style={styles.title}>Harvest Rush</Text>
      <Text style={styles.subtitle}>Farm fast. Defend faster.</Text>
      <View style={styles.trackOuter}>
        <View style={[styles.trackInner, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2f5d33",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#fff8e7",
    letterSpacing: 1,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#d8e8d0",
    marginBottom: 20,
  },
  trackOuter: {
    width: 220,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(0,0,0,0.35)",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#1a140f",
  },
  trackInner: {
    height: "100%",
    backgroundColor: "#f0c14a",
  },
});
