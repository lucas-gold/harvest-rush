import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AvatarPicker, OPTION_ROW_WIDTH } from "../avatar/AvatarPicker";
import { ControlSchemePicker } from "../arena/controls/ControlSchemePicker";
import { JoystickSideToggle } from "../arena/controls/JoystickSideToggle";
import { LobbyLeaderboard } from "../leaderboard/LobbyLeaderboard";
import { PixelText } from "../theme/PixelText";
import { FONT_PIXEL_SEMIBOLD } from "../theme/fonts";
import { usePlayerStore } from "../state/playerStore";
import { trackLandedOnLobby } from "../analytics";
import { containsBannedWord } from "../bannedNames";
import { isTouchPrimaryWeb } from "../web/mobileWebFixes";
import { EntryTrees } from "./EntryTrees";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Entry">;

// Below this, the leaderboard panel doesn't fit next to the main content
// without cramping it -- push it below the Play button instead.
const WIDE_BREAKPOINT = 700;

export function EntryScreen({ navigation }: Props) {
  const storedName = usePlayerStore((s) => s.name);
  const setName = usePlayerStore((s) => s.setName);
  const [nameInput, setNameInput] = useState(storedName);
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  useEffect(() => {
    trackLandedOnLobby();
  }, []);

  const canPlay = nameInput.trim().length > 0 && !containsBannedWord(nameInput);

  const handlePlay = () => {
    if (!canPlay) return; // also reached via the text input's own submit (Enter), which
    // isn't blocked just by the button being disabled
    const trimmed = nameInput.trim().slice(0, 16);
    setName(trimmed);
    navigation.replace("Arena");
  };

  return (
    <SafeAreaView style={styles.root}>
      <EntryTrees />

      {/* Docked to the right edge independent of the centered content below
          it, so a wide leaderboard panel never pushes the lobby off true
          center -- see the inline copy rendered in the scrolling content
          instead, once the screen's too narrow for both side by side. */}
      {isWide && (
        <View style={styles.leaderboardDock} pointerEvents="box-none">
          <LobbyLeaderboard />
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
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
            {Platform.OS === "web" && isTouchPrimaryWeb() && <JoystickSideToggle />}
            {!isWide && <LobbyLeaderboard />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  flex: { flex: 1 },
  leaderboardDock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 24,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  content: { alignItems: "center", gap: 14 },
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
