import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildCropSprite, buildTileSprite } from "../../pixelart/sprites";
import { useFarmStore, FARM_COLS } from "../../state/farmStore";
import { useEconomyStore } from "../../state/economyStore";
import { computeStage } from "../growth";
import { TILE_SIZE } from "../constants";

/**
 * Purely visual, full-screen soil backdrop — planting/watering/harvesting
 * happen via the Plant/Water buttons and walk-over auto-harvest (see
 * ActionButtons.tsx and movementSystem), not tile taps, so this never needs
 * to handle touch itself.
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
    <View style={[styles.grid, { pointerEvents: "none" }]}>
      {tiles.map((tile, index) => {
        const col = index % FARM_COLS;
        const row = Math.floor(index / FARM_COLS);
        const tileState = tile.crop?.wateredAt ? "watered" : "tilled";
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
