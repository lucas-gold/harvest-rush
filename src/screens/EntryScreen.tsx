import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AvatarPicker, OPTION_ROW_WIDTH } from "../avatar/AvatarPicker";
import { ControlSchemePicker } from "../arena/controls/ControlSchemePicker";
import { PixelText } from "../theme/PixelText";
import { FONT_PIXEL_SEMIBOLD } from "../theme/fonts";
import { usePlayerStore } from "../state/playerStore";
import { useSessionStore } from "../state/sessionStore";
import { EntryTrees } from "./EntryTrees";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Entry">;

export function EntryScreen({ navigation }: Props) {
  const storedName = usePlayerStore((s) => s.name);
  const setName = usePlayerStore((s) => s.setName);
  const [nameInput, setNameInput] = useState(storedName);

  const hasPlayed = useSessionStore((s) => s.hasPlayed);
  const highestScore = useSessionStore((s) => s.highestScore);
  const mostKills = useSessionStore((s) => s.mostKills);
  const totalKills = useSessionStore((s) => s.totalKills);
  const totalCropsCollected = useSessionStore((s) => s.totalCropsCollected);

  const canPlay = nameInput.trim().length > 0;

  const handlePlay = () => {
    const trimmed = nameInput.trim().slice(0, 16);
    if (!trimmed) return;
    setName(trimmed);
    navigation.replace("Arena");
  };

  return (
    <SafeAreaView style={styles.root}>
      <EntryTrees />

      {hasPlayed && (
        <View style={styles.statsCorner} pointerEvents="none">
          <View style={styles.statsRow}>
            <PixelText style={styles.statsLabel}>High score</PixelText>
            <Text style={styles.statsValue}>{highestScore}</Text>
          </View>
          <View style={styles.statsRow}>
            <PixelText style={styles.statsLabel}>Most kills</PixelText>
            <Text style={styles.statsValue}>{mostKills}</Text>
          </View>
          <View style={styles.statsRow}>
            <PixelText style={styles.statsLabel}>Total kills</PixelText>
            <Text style={styles.statsValue}>{totalKills}</Text>
          </View>
          <View style={styles.statsRow}>
            <PixelText style={styles.statsLabel}>Total crops</PixelText>
            <Text style={styles.statsValue}>{totalCropsCollected}</Text>
          </View>
        </View>
      )}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          <PixelText style={styles.title}>Harvest Rush</PixelText>
          <PixelText weight="semibold" style={styles.subtitle}>
            Collect crops & grow your score
          </PixelText>

          <AvatarPicker />

          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            maxLength={16}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handlePlay}
          />

          <Pressable
            style={[styles.playButton, !canPlay && styles.playButtonDisabled]}
            onPress={handlePlay}
            disabled={!canPlay}
          >
            <PixelText style={styles.playButtonText}>Play</PixelText>
          </Pressable>

          {Platform.OS !== "web" && <ControlSchemePicker />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  flex: { flex: 1 },
  statsCorner: {
    position: "absolute",
    top: 10,
    right: 10,
    alignItems: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 1,
  },
  statsRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  statsLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10 },
  statsValue: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 14,
  },
  title: { fontSize: 34, color: "#fff8e7" },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 6 },
  input: {
    width: OPTION_ROW_WIDTH,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: "#fff",
    fontFamily: FONT_PIXEL_SEMIBOLD,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  playButton: {
    width: OPTION_ROW_WIDTH,
    alignItems: "center",
    backgroundColor: "#4caf50",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  playButtonDisabled: { opacity: 0.4 },
  playButtonText: { color: "#fff", fontSize: 18 },
});
