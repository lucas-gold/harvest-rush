import React, { useState } from "react";
import {
  View,
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
import { EntryTrees } from "./EntryTrees";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Entry">;

export function EntryScreen({ navigation }: Props) {
  const storedName = usePlayerStore((s) => s.name);
  const setName = usePlayerStore((s) => s.setName);
  const [nameInput, setNameInput] = useState(storedName);

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
