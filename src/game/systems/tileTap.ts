import * as Haptics from "expo-haptics";
import { EntitiesMap } from "../types";
import { nearestTileIndex } from "../constants";
import { performTileTap } from "../tileActions";
import { useSettingsStore } from "../../state/settingsStore";

/**
 * GameEngine's own entityContainer view owns the touch surface (it sits
 * above FarmGrid so its moving entities stay tappable/visible), so tile
 * taps have to be read from RNGE's touch queue here rather than from a
 * <Pressable> on FarmGrid — a Pressable underneath would never receive the
 * touch, since the entityContainer captures it first.
 */
export function tileTapSystem(entities: EntitiesMap, { touches }: any): EntitiesMap {
  for (const touch of touches) {
    if (touch.type !== "press") continue;
    const { locationX, locationY } = touch.event;
    if (typeof locationX !== "number" || typeof locationY !== "number") continue;

    const index = nearestTileIndex(locationX, locationY);
    const result = performTileTap(index);

    if (useSettingsStore.getState().hapticsOn) {
      if (result.kind === "blocked") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }
  return entities;
}
