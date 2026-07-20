import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PixelText } from "../theme/PixelText";
import { ArenaCanvas } from "../arena/ArenaCanvas";
import { Minimap } from "../arena/Minimap";
import { Leaderboard } from "../arena/Leaderboard";
import { HUD } from "../arena/HUD";
import { InputController } from "../arena/InputController";
import { PopOverlay } from "../arena/PopOverlay";
import { usePlayerStore } from "../state/playerStore";
import { useArenaStore } from "../multiplayer/arenaStore";
import { connectToArena, disconnectFromArena } from "../multiplayer/connection";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Arena">;

export function ArenaScreen({ navigation }: Props) {
  const name = usePlayerStore((s) => s.name);
  const customization = usePlayerStore((s) => s.customization);
  const status = useArenaStore((s) => s.status);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    connectToArena(name || "Farmer", customization);
    return () => disconnectFromArena();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = () => {
    disconnectFromArena();
    navigation.replace("Entry");
  };

  // A fresh connect, not resuming in place — dying is final; this is a new
  // run (new socket, new player, server assigns whatever room has space).
  const handlePlayAgain = () => {
    connectToArena(name || "Farmer", customization);
  };

  return (
    <View style={styles.root}>
      {status === "connected" && (
        <>
          <ArenaCanvas />
          <InputController />
        </>
      )}

      <View style={[styles.topBar, { top: insets.top + 8, pointerEvents: "box-none" }]}>
        <HUD />
        <Leaderboard />
      </View>

      <View style={[styles.minimapWrap, { bottom: insets.bottom + 24, pointerEvents: "none" }]}>
        <Minimap />
      </View>

      {status !== "connected" && (
        <View style={styles.statusOverlay}>
          <PixelText style={styles.statusText}>
            {status === "connecting" ? "Joining lobby…" : status === "error" ? "Connection lost" : "…"}
          </PixelText>
          {status === "error" && (
            <PixelText weight="semibold" style={styles.statusHint} onPress={handleExit}>
              Tap to return home
            </PixelText>
          )}
        </View>
      )}

      <PopOverlay onPlayAgain={handlePlayAgain} onExit={handleExit} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1c2b1e" },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  minimapWrap: { position: "absolute", left: 16 },
  statusOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusText: { color: "#fff", fontSize: 18 },
  statusHint: { color: "#e8c14a", fontSize: 13, textDecorationLine: "underline" },
});
