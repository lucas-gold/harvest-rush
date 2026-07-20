import { Platform } from "react-native";
import { useSettingsStore } from "../state/settingsStore";
import { useWebControls } from "./controls/useWebControls";
import { DragFireButtonControls } from "./controls/DragFireButtonControls";
import { DragDistanceFireControls } from "./controls/DragDistanceFireControls";
import { DPadFireControls } from "./controls/DPadFireControls";

export function InputController() {
  const controlScheme = useSettingsStore((s) => s.controlScheme);

  // No on-screen fire button on web — space bar or left click only.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (Platform.OS === "web") {
    useWebControls();
    return null;
  }

  switch (controlScheme) {
    case "dragDistanceFire":
      return <DragDistanceFireControls />;
    case "dpadFireButton":
      return <DPadFireControls />;
    case "dragFireButton":
    default:
      return <DragFireButtonControls />;
  }
}
