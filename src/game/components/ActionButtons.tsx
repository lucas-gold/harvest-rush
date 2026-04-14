import React, { useCallback } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildCropSprite, buildWaterDropSprite } from "../../pixelart/sprites";
import { PlayerStatusRef } from "../types";
import { plantAt, waterAt, TileActionResult } from "../tileActions";
import { useRunStore } from "../../state/runStore";
import { useSettingsStore } from "../../state/settingsStore";

interface Props {
  status: PlayerStatusRef;
}

const waterDropMatrix = buildWaterDropSprite();

function fireHaptics(result: TileActionResult) {
  if (!useSettingsStore.getState().hapticsOn) return;
  if (result.kind === "blocked") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function ActionButtons({ status }: Props) {
  const selectedCrop = useRunStore((s) => s.selectedCrop);

  const handlePlant = useCallback(() => {
    fireHaptics(plantAt(status.standingTile));
  }, [status]);

  const handleWater = useCallback(() => {
    fireHaptics(waterAt(status.standingTile));
  }, [status]);

  return (
    <View style={styles.row}>
      <Pressable style={[styles.button, styles.waterButton]} onPress={handleWater}>
        <PixelCanvas matrix={waterDropMatrix} size={30} />
        <Text style={styles.label}>Water</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.plantButton]} onPress={handlePlant}>
        <PixelCanvas matrix={buildCropSprite(selectedCrop, 3)} size={30} />
        <Text style={styles.label}>Plant</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 14,
  },
  button: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    gap: 2,
  },
  waterButton: {
    backgroundColor: "rgba(79,168,224,0.35)",
    borderColor: "#4fa8e0",
  },
  plantButton: {
    backgroundColor: "rgba(76,175,80,0.35)",
    borderColor: "#4caf50",
  },
  label: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
  },
});
