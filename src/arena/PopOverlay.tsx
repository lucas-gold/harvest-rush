import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import * as Haptics from "expo-haptics";
import { PixelText } from "../theme/PixelText";
import { useArenaStore } from "../multiplayer/arenaStore";
import { useSettingsStore } from "../state/settingsStore";

interface Props {
  onPlayAgain: () => void;
  onExit: () => void;
}

export function PopOverlay({ onPlayAgain, onExit }: Props) {
  const lastPop = useArenaStore((s) => s.lastPop);
  const clearPop = useArenaStore((s) => s._clearPop);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastPop) return;
    setVisible(true);
    if (useSettingsStore.getState().hapticsOn) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  }, [lastPop]);

  if (!lastPop) return null;

  const dismiss = (action: () => void) => {
    setVisible(false);
    clearPop();
    action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <PixelText style={styles.title}>Popped!</PixelText>
          <PixelText weight="semibold" style={styles.subtitle}>
            {lastPop.byName ? `${lastPop.byName} shot you down.` : "Better luck next run."}
          </PixelText>
          <View style={styles.statRow}>
            <PixelText weight="semibold" style={styles.statLabel}>
              Final stack:{" "}
            </PixelText>
            <Text style={styles.statNumber}>{lastPop.finalCrops}</Text>
            <PixelText weight="semibold" style={styles.statLabel}>
              {" "}
              crops
            </PixelText>
          </View>
          <Pressable style={styles.button} onPress={() => dismiss(onPlayAgain)}>
            <PixelText style={styles.buttonText}>Play Again</PixelText>
          </Pressable>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => dismiss(onExit)}>
            <PixelText style={styles.buttonText}>Exit</PixelText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff8e7",
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#3a2010",
  },
  title: { fontSize: 24, color: "#3a2010" },
  subtitle: { fontSize: 13, color: "#3a2010", marginTop: 6, textAlign: "center" },
  statRow: { flexDirection: "row", marginTop: 10, alignItems: "baseline" },
  statLabel: { fontSize: 14, color: "#3a2010" },
  statNumber: { fontSize: 16, fontWeight: "800", color: "#3a2010" },
  button: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 14,
    width: "100%",
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#8a5a34", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 15 },
});
