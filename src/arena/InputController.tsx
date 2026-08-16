import { Platform } from "react-native";
import { useSettingsStore } from "../state/settingsStore";
import { useWebControls } from "./controls/useWebControls";
import { DragFireButtonControls } from "./controls/DragFireButtonControls";
import { DragDistanceFireControls } from "./controls/DragDistanceFireControls";
import { DPadFireControls } from "./controls/DPadFireControls";
import { JoystickControls } from "./controls/JoystickControls";
import { isTouchPrimaryWeb } from "../web/mobileWebFixes";

export function InputController() {
  const controlScheme = useSettingsStore((s) => s.controlScheme);

  // Desktop web (real mouse, no touch): mouse position steers, click/space
  // fires, no on-screen button needed. Mobile web (phone browser) has no
  // mouse — an on-screen joystick plus tap-anywhere-else-to-fire instead.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  if (Platform.OS === "web" && !isTouchPrimaryWeb()) {
    useWebControls();
    return null;
  }
  if (Platform.OS === "web") {
    return <JoystickControls />;
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
