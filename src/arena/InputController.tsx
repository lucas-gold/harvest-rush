import React from "react";
import { Platform } from "react-native";
import { useSettingsStore } from "../state/settingsStore";
import { WebControls } from "./controls/WebControls";
import { DragBoostButtonControls } from "./controls/DragBoostButtonControls";
import { DragDistanceBoostControls } from "./controls/DragDistanceBoostControls";
import { DPadBoostControls } from "./controls/DPadBoostControls";

export function InputController() {
  const controlScheme = useSettingsStore((s) => s.controlScheme);

  if (Platform.OS === "web") return <WebControls />;

  switch (controlScheme) {
    case "dragDistanceBoost":
      return <DragDistanceBoostControls />;
    case "dpadBoostButton":
      return <DPadBoostControls />;
    case "dragBoostButton":
    default:
      return <DragBoostButtonControls />;
  }
}
