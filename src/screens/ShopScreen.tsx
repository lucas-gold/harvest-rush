import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildCoinSprite, buildGemSprite } from "../pixelart/sprites";
import { UPGRADES, UpgradeId, upgradeCost, useEconomyStore } from "../state/economyStore";
import { GEM_PACKS } from "../services/iapConfig";
import { fetchGemOfferings, isIAPConfigured, purchaseGemPack, restorePurchases } from "../services/iap";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;

const UPGRADE_ORDER: UpgradeId[] = [
  "growthSpeed",
  "wateringRange",
  "plantSpeed",
  "irrigation",
  "fence",
  "tractor",
];

function UpgradeRow({ id }: { id: UpgradeId }) {
  const def = UPGRADES[id];
  const level = useEconomyStore((s) => s.upgradeLevels[id]);
  const coins = useEconomyStore((s) => s.coins);
  const buyUpgrade = useEconomyStore((s) => s.buyUpgrade);
  const maxed = level >= def.maxLevel;
  const cost = maxed ? 0 : upgradeCost(id, level);
  const canAfford = coins >= cost;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {def.label} · Lv {level}/{def.maxLevel}
        </Text>
        <Text style={styles.rowDesc}>{def.description}</Text>
      </View>
      <Pressable
        disabled={maxed || !canAfford}
        onPress={() => buyUpgrade(id)}
        style={[styles.buyButton, (maxed || !canAfford) && styles.buyButtonDisabled]}
      >
        <Text style={styles.buyText}>{maxed ? "MAX" : `${cost}c`}</Text>
      </Pressable>
    </View>
  );
}

function GemPackRow({ packId, busy, onBuy }: { packId: string; busy: boolean; onBuy: (id: string) => void }) {
  const def = GEM_PACKS.find((p) => p.packageIdentifier === packId)!;
  return (
    <Pressable style={styles.gemCard} onPress={() => onBuy(packId)} disabled={busy}>
      <PixelCanvas matrix={buildGemSprite()} size={30} />
      <Text style={styles.gemAmount}>{def.gems}</Text>
      <Text style={styles.gemLabel}>{def.label}</Text>
    </Pressable>
  );
}

export function ShopScreen({ navigation }: Props) {
  const coins = useEconomyStore((s) => s.coins);
  const gems = useEconomyStore((s) => s.gems);
  const [busyPack, setBusyPack] = useState<string | null>(null);

  const handleBuyGems = useCallback(async (packageIdentifier: string) => {
    setBusyPack(packageIdentifier);
    const result = await purchaseGemPack(packageIdentifier);
    setBusyPack(null);
    if (result.success) {
      Alert.alert("Purchase complete", `+${result.gemsGranted} gems added!`);
    } else if (result.error && result.error !== "cancelled") {
      Alert.alert("Purchase unavailable", result.error);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    const ok = await restorePurchases();
    Alert.alert(ok ? "Restored" : "Nothing to restore", ok ? "Your purchases were restored." : "");
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </Pressable>
        <View style={styles.currencyRow}>
          <View style={styles.pill}>
            <PixelCanvas matrix={buildCoinSprite()} size={16} />
            <Text style={styles.pillText}>{coins}</Text>
          </View>
          <View style={styles.pill}>
            <PixelCanvas matrix={buildGemSprite()} size={16} />
            <Text style={styles.pillText}>{gems}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Farm Upgrades</Text>
        <Text style={styles.sectionHint}>Bought with coins earned by farming.</Text>
        {UPGRADE_ORDER.map((id) => (
          <UpgradeRow key={id} id={id} />
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Gem Packs</Text>
        <Text style={styles.sectionHint}>
          {isIAPConfigured()
            ? "Real-money purchase. Gems are used for cosmetics and convenience — never required to progress."
            : "In-app purchases aren't configured yet in this build (see README)."}
        </Text>
        <View style={styles.gemGrid}>
          {GEM_PACKS.map((p) => (
            <GemPackRow
              key={p.packageIdentifier}
              packId={p.packageIdentifier}
              busy={busyPack === p.packageIdentifier}
              onBuy={handleBuyGems}
            />
          ))}
        </View>
        {busyPack && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}

        <Pressable style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backText: { color: "#fff8e7", fontSize: 15, fontWeight: "700" },
  currencyRow: { flexDirection: "row", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  pillText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  content: { padding: 20, paddingBottom: 60 },
  sectionTitle: { color: "#fff8e7", fontSize: 18, fontWeight: "800" },
  sectionHint: { color: "#d8e8d0", fontSize: 12, marginBottom: 12, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { color: "#fff8e7", fontWeight: "700", fontSize: 14 },
  rowDesc: { color: "#c9d9c3", fontSize: 11, marginTop: 2 },
  buyButton: { backgroundColor: "#f0c14a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  buyButtonDisabled: { backgroundColor: "#6b6b5a" },
  buyText: { color: "#3a2010", fontWeight: "800", fontSize: 13 },
  gemGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gemCard: {
    width: "47%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  gemAmount: { color: "#fff8e7", fontWeight: "800", fontSize: 16 },
  gemLabel: { color: "#c9d9c3", fontSize: 11 },
  restoreButton: { alignSelf: "center", marginTop: 20 },
  restoreText: { color: "#fff8e7", textDecorationLine: "underline", fontSize: 13 },
});
