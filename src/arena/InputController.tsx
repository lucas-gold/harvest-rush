import React from "react";
import { Platform } from "react-native";
import { useSettingsStore } from "../state/settingsStore";
import { WebControls } from "./controls/WebControls";
import { DragFireButtonControls } from "./controls/DragFireButtonControls";
import { DragDistanceFireControls } from "./controls/DragDistanceFireControls";
import { DPadFireControls } from "./controls/DPadFireControls";

export function InputController() {
  const controlScheme = useSettingsStore((s) => s.controlScheme);

  if (Platform.OS === "web") return <WebControls />;

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
