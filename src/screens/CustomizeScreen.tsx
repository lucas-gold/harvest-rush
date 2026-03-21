import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import {
  buildFarmerSprite,
  HAIR_OPTIONS,
  SHIRT_OPTIONS,
  SKIN_OPTIONS,
} from "../pixelart/sprites";
import { PALETTE, PaletteKey } from "../theme/palette";
import { usePlayerStore } from "../state/playerStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Customize">;

function Swatch({
  colorKey,
  active,
  onPress,
}: {
  colorKey: PaletteKey;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.swatch,
        { backgroundColor: PALETTE[colorKey] },
        active && styles.swatchActive,
      ]}
    />
  );
}

export function CustomizeScreen({ navigation }: Props) {
  const customization = usePlayerStore((s) => s.customization);
  const setCustomization = usePlayerStore((s) => s.setCustomization);
  const name = usePlayerStore((s) => s.name);
  const setName = usePlayerStore((s) => s.setName);
  const [localName, setLocalName] = useState(name);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </Pressable>

        <View style={styles.preview}>
          <PixelCanvas matrix={buildFarmerSprite("down", 0, customization)} size={120} />
        </View>

        <TextInput
          value={localName}
          onChangeText={setLocalName}
          onBlur={() => setName(localName)}
          placeholder="Farmer name"
          placeholderTextColor="#a89a7c"
          style={styles.input}
          maxLength={16}
        />

        <Text style={styles.label}>Skin Tone</Text>
        <View style={styles.row}>
          {SKIN_OPTIONS.map((key) => (
            <Swatch
              key={key}
              colorKey={key}
              active={customization.skinTone === key}
              onPress={() => setCustomization({ skinTone: key })}
            />
          ))}
        </View>

        <Text style={styles.label}>Hair Color</Text>
        <View style={styles.row}>
          {HAIR_OPTIONS.map((key) => (
            <Swatch
              key={key}
              colorKey={key}
              active={customization.hairColor === key}
              onPress={() => setCustomization({ hairColor: key })}
            />
          ))}
        </View>

        <Text style={styles.label}>Shirt Color</Text>
        <View style={styles.row}>
          {SHIRT_OPTIONS.map((key) => (
            <Swatch
              key={key}
              colorKey={key}
              active={customization.shirtColor === key}
              onPress={() => setCustomization({ shirtColor: key })}
            />
          ))}
        </View>

        <Pressable
          style={styles.hatToggle}
          onPress={() => setCustomization({ hat: !customization.hat })}
        >
          <Text style={styles.buttonText}>{customization.hat ? "Remove Hat" : "Wear Straw Hat"}</Text>
        </Pressable>

        <Pressable style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  content: { alignItems: "center", paddingBottom: 40, paddingHorizontal: 24 },
  back: { alignSelf: "flex-start", marginTop: 8, marginBottom: 8 },
  backText: { color: "#fff8e7", fontSize: 15, fontWeight: "700" },
  preview: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
  },
  input: {
    width: "100%",
    backgroundColor: "#fff8e7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
    color: "#3a2010",
    fontWeight: "600",
  },
  label: { color: "#fff8e7", fontWeight: "700", fontSize: 14, alignSelf: "flex-start", marginTop: 8 },
  row: { flexDirection: "row", gap: 10, marginTop: 8, marginBottom: 4 },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  swatchActive: { borderColor: "#fff", borderWidth: 3 },
  hatToggle: {
    marginTop: 20,
    backgroundColor: "#8a5a34",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  doneButton: {
    marginTop: 14,
    backgroundColor: "#4caf50",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
