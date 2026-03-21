import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildFarmerSprite, buildCoinSprite, buildGemSprite } from "../pixelart/sprites";
import { usePlayerStore } from "../state/playerStore";
import { useEconomyStore } from "../state/economyStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const customization = usePlayerStore((s) => s.customization);
  const name = usePlayerStore((s) => s.name);
  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.currencyRow}>
        <View style={styles.pill}>
          <PixelCanvas matrix={buildCoinSprite()} size={18} />
          <Text style={styles.pillText}>{coins}</Text>
        </View>
        <View style={styles.pill}>
          <PixelCanvas matrix={buildGemSprite()} size={18} />
          <Text style={styles.pillText}>{gems}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <PixelCanvas matrix={buildFarmerSprite("down", 0, customization)} size={96} />
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.title}>Harvest Rush</Text>
      </View>

      <View style={styles.menu}>
        <Pressable style={[styles.button, styles.primary]} onPress={() => navigation.navigate("Game")}>
          <Text style={styles.buttonText}>Play</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Customize")}>
          <Text style={styles.buttonText}>Customize Farmer</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Shop")}>
          <Text style={styles.buttonText}>Shop</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.buttonText}>Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33", alignItems: "center" },
  currencyRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "flex-end",
    marginRight: 16,
    marginTop: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  hero: { alignItems: "center", marginTop: 32, marginBottom: 24 },
  name: { color: "#fff8e7", fontSize: 15, marginTop: 8, fontWeight: "600" },
  title: { color: "#fff8e7", fontSize: 28, fontWeight: "900", marginTop: 4 },
  menu: { width: "80%", gap: 14, marginTop: 12 },
  button: {
    backgroundColor: "#8a5a34",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#5c3b1e",
  },
  primary: { backgroundColor: "#4caf50", borderColor: "#3d8c40" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
