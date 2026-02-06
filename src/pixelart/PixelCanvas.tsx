import React, { useMemo } from "react";
import Svg, { Rect } from "react-native-svg";
import { PALETTE, PaletteKey } from "../theme/palette";

export type PixelMatrix = (PaletteKey | null)[][];

interface PixelCanvasProps {
  matrix: PixelMatrix;
  size: number;
  style?: object;
}

/**
 * Renders a 2D matrix of palette keys as a grid of <Rect> blocks, giving a
 * crisp 16-bit look with zero binary image assets. One matrix cell = one
 * square block scaled to fill `size` x `size`.
 */
function PixelCanvasBase({ matrix, size, style }: PixelCanvasProps) {
  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;
  const cell = cols > 0 ? size / cols : 0;

  const rects = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let y = 0; y < rows; y++) {
      const row = matrix[y];
      for (let x = 0; x < cols; x++) {
        const key = row[x];
        if (!key) continue;
        const color = PALETTE[key];
        if (color === "transparent") continue;
        out.push(
          <Rect
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            width={cell + 0.5}
            height={cell + 0.5}
            fill={color}
          />
        );
      }
    }
    return out;
  }, [matrix, rows, cols, cell]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      {rects}
    </Svg>
  );
}

export const PixelCanvas = React.memo(PixelCanvasBase);
