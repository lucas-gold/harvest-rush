import React, { useRef } from "react";
import { View, StyleSheet } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { FarmGrid } from "./components/FarmGrid";
import { Joystick } from "./components/Joystick";
import { HUD } from "./components/HUD";
import { CropBar } from "./components/CropBar";
import { createPlayerEntity } from "./entities/factory";
import { createWaveState } from "./systems/waveSpawner";
import { movementSystem } from "./systems/movement";
import { enemyAISystem } from "./systems/enemyAI";
import { waveSpawnerSystem } from "./systems/waveSpawner";
import { tileTapSystem } from "./systems/tileTap";
import { EntitiesMap, InputRef } from "./types";
import { FARM_PX_HEIGHT, FARM_PX_WIDTH } from "./constants";
import { useRunStore } from "../state/runStore";

interface Props {
  onPause: () => void;
}

function buildInitialEntities(): EntitiesMap {
  const input: InputRef = { vector: { x: 0, y: 0 }, scareRequested: false };
  return {
    player: createPlayerEntity(input),
    waveState: createWaveState(Date.now()) as any,
  } as EntitiesMap;
}

export function GameCanvas({ onPause }: Props) {
  const entitiesRef = useRef<EntitiesMap>(buildInitialEntities());
  const status = useRunStore((s) => s.status);
  const input = (entitiesRef.current.player as any).input as InputRef;

  return (
    <View style={styles.root}>
      <View style={styles.worldWrap}>
        <View style={[styles.world, { width: FARM_PX_WIDTH, height: FARM_PX_HEIGHT }]}>
          <FarmGrid />
          <GameEngine
            style={StyleSheet.absoluteFill}
            entities={entitiesRef.current}
            systems={[movementSystem, enemyAISystem, waveSpawnerSystem, tileTapSystem]}
            running={status === "playing"}
          />
        </View>
      </View>

      <View style={styles.hudTop} pointerEvents="box-none">
        <HUD onPause={onPause} />
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <CropBar />
      </View>

      <View style={styles.joystickWrap} pointerEvents="box-none">
        <Joystick input={input} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2f5d33",
  },
  worldWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  world: {
    borderWidth: 3,
    borderColor: "#3a2010",
  },
  hudTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomBar: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  joystickWrap: {
    position: "absolute",
    bottom: 24,
    left: 24,
  },
});
