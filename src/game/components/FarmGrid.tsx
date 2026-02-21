import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildCropSprite, buildTileSprite } from "../../pixelart/sprites";
import { useFarmStore, FARM_COLS } from "../../state/farmStore";
import { useEconomyStore } from "../../state/economyStore";
import { computeStage } from "../growth";
import { TILE_SIZE } from "../constants";

/**
 * Purely visual — tile taps are handled by tileTapSystem, which reads
 * GameEngine's own touch queue. GameEngine's entityContainer sits on top of
 * this view (so moving entities stay interactive/visible), which means a
 * <Pressable> here would never actually receive the touch.
 */
export function FarmGrid() {
  const tiles = useFarmStore((s) => s.tiles);
  const growthSpeedLevel = useEconomyStore((s) => s.upgradeLevels.growthSpeed);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.grid} pointerEvents="none">
      {tiles.map((tile, index) => {
        const col = index % FARM_COLS;
        const row = Math.floor(index / FARM_COLS);
        const tileState = !tile.tilled
          ? "grass"
          : tile.crop
          ? tile.crop.wateredAt
            ? "watered"
            : "tilled"
          : "tilled";
        const tileMatrix = buildTileSprite(tileState as any);

        let cropMatrix = null;
        if (tile.crop) {
          const stage = computeStage(tile.crop.plantedAt, tile.crop.wateredAt, growthSpeedLevel, now);
          cropMatrix = buildCropSprite(tile.crop.type, stage);
        }

        return (
          <View key={index} style={[styles.tile, { left: col * TILE_SIZE, top: row * TILE_SIZE }]}>
            <PixelCanvas matrix={tileMatrix} size={TILE_SIZE} />
            {cropMatrix && (
              <View style={StyleSheet.absoluteFill}>
                <PixelCanvas matrix={cropMatrix} size={TILE_SIZE} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: "100%",
    height: "100%",
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
});
