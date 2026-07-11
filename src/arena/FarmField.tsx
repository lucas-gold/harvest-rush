import React, { useMemo } from "react";
import { View } from "react-native";
import { PALETTE } from "../theme/palette";
import { Camera, getViewportWorldBounds, worldToScreen } from "./camera";

const STRIPE_WIDTH = 260;

interface Props {
  camera: Camera;
  viewportWidth: number;
  viewportHeight: number;
  /** Position stripes relative to a clipping container's top-left instead
   * of the raw screen origin — pass the container's screen offset so the
   * field texture stays clipped to the arena circle rather than painting
   * into the void outside it. */
  offsetX: number;
  offsetY: number;
}

/** Faint alternating furrow-like stripes across just the visible area —
 * enough to read as "a field" without competing with crops/players for
 * attention. */
export function FarmField({ camera, viewportWidth, viewportHeight, offsetX, offsetY }: Props) {
  const bounds = useMemo(
    () => getViewportWorldBounds(camera, viewportWidth, viewportHeight, STRIPE_WIDTH),
    [camera, viewportWidth, viewportHeight]
  );

  const cols = useMemo(() => {
    const startCol = Math.floor(bounds.minX / STRIPE_WIDTH);
    const endCol = Math.ceil(bounds.maxX / STRIPE_WIDTH);
    const out: number[] = [];
    for (let col = startCol; col <= endCol; col++) out.push(col);
    return out;
  }, [bounds]);

  const top = worldToScreen(0, bounds.minY, camera, viewportWidth, viewportHeight).y - offsetY;
  const stripeHeight = (bounds.maxY - bounds.minY) * camera.zoom;
  const stripeScreenWidth = STRIPE_WIDTH * camera.zoom;

  return (
    <>
      {cols.map((col) => {
        const screenX =
          worldToScreen(col * STRIPE_WIDTH, 0, camera, viewportWidth, viewportHeight).x - offsetX;
        return (
          <View
            key={col}
            style={{
              position: "absolute",
              left: screenX,
              top,
              width: stripeScreenWidth + 1,
              height: stripeHeight,
              backgroundColor: col % 2 === 0 ? PALETTE.arenaGround : PALETTE.arenaGroundDark,
            }}
          />
        );
      })}
    </>
  );
}
