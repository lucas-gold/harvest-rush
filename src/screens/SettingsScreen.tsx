import React from "react";
import { View, Text, Pressable, StyleSheet, Switch, Linking, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSettingsStore } from "../state/settingsStore";
import { useEconomyStore } from "../state/economyStore";
import { useFarmStore } from "../state/farmStore";
import { usePlayerStore } from "../state/playerStore";
import { restorePurchases } from "../services/iap";
import { showAchievements, showLeaderboard } from "../services/gameServices";
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_OF_SERVICE_URL } from "../legal";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>{">"}</Text>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const soundOn = useSettingsStore((s) => s.soundOn);
  const hapticsOn = useSettingsStore((s) => s.hapticsOn);
  const cloudSyncEnabled = useSettingsStore((s) => s.cloudSyncEnabled);
  const toggleSound = useSettingsStore((s) => s.toggleSound);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);
  const toggleCloudSync = useSettingsStore((s) => s.toggleCloudSync);

  const handleResetData = () => {
    Alert.alert(
      "Reset all progress?",
      "This deletes your farm, coins, gems, and customization on this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: () => {
            useFarmStore.getState().resetFarm();
            useEconomyStore.setState({
              coins: 100,
              gems: 20,
              totalCoinsEarned: 0,
              upgradeLevels: {
                growthSpeed: 0,
                wateringRange: 0,
                plantSpeed: 0,
                tractor: 0,
                irrigation: 0,
                fence: 0,
              },
            });
            usePlayerStore.setState({ name: "Farmer" });
            navigation.replace("Home");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>{"<"} Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Preferences</Text>
        <Row label="Sound">
          <Switch value={soundOn} onValueChange={toggleSound} />
        </Row>
        <Row label="Haptics">
          <Switch value={hapticsOn} onValueChange={toggleHaptics} />
        </Row>
        <Row label="Cloud Sync">
          <Switch value={cloudSyncEnabled} onValueChange={toggleCloudSync} />
        </Row>

        <Text style={styles.section}>Game Services</Text>
        <LinkRow label="Leaderboards" onPress={() => showLeaderboard()} />
        <LinkRow label="Achievements" onPress={() => showAchievements()} />

        <Text style={styles.section}>Purchases</Text>
        <LinkRow
          label="Restore Purchases"
          onPress={async () => {
            const ok = await restorePurchases();
            Alert.alert(ok ? "Restored" : "Nothing to restore");
          }}
        />

        <Text style={styles.section}>Legal</Text>
        <LinkRow label="Privacy Policy" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        <LinkRow label="Terms of Service" onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)} />
        <LinkRow label="Contact Support" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />

        <Text style={styles.section}>Data</Text>
        <Pressable style={styles.dangerButton} onPress={handleResetData}>
          <Text style={styles.dangerText}>Reset All Progress</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#2f5d33" },
  content: { padding: 20, paddingBottom: 60 },
  back: { marginBottom: 8 },
  backText: { color: "#fff8e7", fontSize: 15, fontWeight: "700" },
  title: { color: "#fff8e7", fontSize: 24, fontWeight: "900", marginBottom: 16 },
  section: { color: "#c9d9c3", fontSize: 12, fontWeight: "800", marginTop: 18, marginBottom: 6, textTransform: "uppercase" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  rowLabel: { color: "#fff8e7", fontSize: 14, fontWeight: "600" },
  chevron: { color: "#c9d9c3", fontSize: 14 },
  dangerButton: {
    backgroundColor: "#8a2f24",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  dangerText: { color: "#fff", fontWeight: "800" },
});
