import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { GameCanvas } from "../game/GameCanvas";
import { useRunStore } from "../state/runStore";
import { useFarmStore } from "../state/farmStore";
import { useEconomyStore } from "../state/economyStore";
import { submitWaveScore } from "../services/gameServices";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Game">;

export function GameScreen({ navigation }: Props) {
  const status = useRunStore((s) => s.status);
  const wave = useRunStore((s) => s.wave);
  const wavesCleared = useRunStore((s) => s.wavesCleared);
  const coinsEarnedThisRun = useRunStore((s) => s.coinsEarnedThisRun);
  const startRun = useRunStore((s) => s.startRun);
  const setStatus = useRunStore((s) => s.setStatus);
  const resetFarm = useFarmStore((s) => s.resetFarm);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    startRun();
    resetFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  useEffect(() => {
    if (status === "gameover") {
      submitWaveScore(wavesCleared, useEconomyStore.getState().totalCoinsEarned).catch(() => {});
    }
  }, [status, wavesCleared]);

  const handlePause = () => setStatus(status === "paused" ? "playing" : "paused");
  const handleRestart = () => setRunKey((k) => k + 1);
  const handleExit = () => navigation.replace("Home");

  return (
    <View style={styles.root}>
      <GameCanvas key={runKey} onPause={handlePause} />

      <Modal visible={status === "paused"} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Paused</Text>
            <Pressable style={styles.button} onPress={handlePause}>
              <Text style={styles.buttonText}>Resume</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleExit}>
              <Text style={styles.buttonText}>Exit to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={status === "gameover"} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Farm Overrun!</Text>
            <Text style={styles.stat}>Waves survived: {wavesCleared}</Text>
            <Text style={styles.stat}>Coins earned: {coinsEarnedThisRun}</Text>
            <Pressable style={styles.button} onPress={handleRestart}>
              <Text style={styles.buttonText}>Play Again</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.buttonSecondary]} onPress={handleExit}>
              <Text style={styles.buttonText}>Exit to Home</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
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
  title: { fontSize: 22, fontWeight: "800", color: "#3a2010", marginBottom: 12 },
  stat: { fontSize: 15, color: "#3a2010", marginBottom: 4 },
  button: {
    backgroundColor: "#4caf50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonSecondary: { backgroundColor: "#8a5a34" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
