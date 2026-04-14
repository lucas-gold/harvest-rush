import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GameEngine } from "react-native-game-engine";
import { FarmGrid } from "./components/FarmGrid";
import { Joystick } from "./components/Joystick";
import { HUD } from "./components/HUD";
import { CropBar } from "./components/CropBar";
import { ActionButtons } from "./components/ActionButtons";
import { createPlayerEntity } from "./entities/factory";
import { createWaveState } from "./systems/waveSpawner";
import { movementSystem } from "./systems/movement";
import { enemyAISystem } from "./systems/enemyAI";
import { waveSpawnerSystem } from "./systems/waveSpawner";
import { EntitiesMap, InputRef, PlayerStatusRef } from "./types";
import { FARM_PX_HEIGHT, FARM_PX_WIDTH } from "./constants";
import { useRunStore } from "../state/runStore";

interface Props {
  onPause: () => void;
}

function buildInitialEntities(status: PlayerStatusRef): EntitiesMap {
  const input: InputRef = { vector: { x: 0, y: 0 } };
  return {
    player: createPlayerEntity(input, status),
    waveState: createWaveState() as any,
  } as EntitiesMap;
}

export function GameCanvas({ onPause }: Props) {
  const statusRef = useRef<PlayerStatusRef>({ standingTile: 0 });
  const entitiesRef = useRef<EntitiesMap>(buildInitialEntities(statusRef.current));
  const status = useRunStore((s) => s.status);
  const input = (entitiesRef.current.player as any).input as InputRef;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.world, { width: FARM_PX_WIDTH, height: FARM_PX_HEIGHT }]}>
        <FarmGrid />
        <GameEngine
          style={StyleSheet.absoluteFill}
          entities={entitiesRef.current}
          systems={[movementSystem, enemyAISystem, waveSpawnerSystem]}
          running={status === "playing"}
        />
      </View>

      <View style={[styles.hudTop, { top: insets.top + 8 }]} pointerEvents="box-none">
        <HUD onPause={onPause} />
      </View>

      <View style={[styles.bottomBar, { bottom: insets.bottom + 118 }]} pointerEvents="box-none">
        <CropBar />
      </View>

      <View
        style={[styles.actionButtonsWrap, { bottom: insets.bottom + 24 }]}
        pointerEvents="box-none"
      >
        <ActionButtons status={statusRef.current} />
      </View>

      <View style={[styles.joystickWrap, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
        <Joystick input={input} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#5c3b1e",
  },
  world: {
    position: "absolute",
    top: 0,
    left: 0,
    overflow: "hidden",
  },
  hudTop: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  actionButtonsWrap: {
    position: "absolute",
    right: 20,
  },
  joystickWrap: {
    position: "absolute",
    left: 24,
  },
});
