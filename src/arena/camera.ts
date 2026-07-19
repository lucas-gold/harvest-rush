export const MIN_ZOOM = 0.62;
export const MAX_ZOOM = 1.4;
const ZOOM_CROP_SCALE = 45;

/** Zoom out as the local player's stack grows — agar.io-style "you can see
 * more but you're an easier target" tradeoff. */
export function computeZoom(crops: number): number {
  const z = MAX_ZOOM / Math.sqrt(1 + crops / ZOOM_CROP_SCALE);
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  return {
    x: (worldX - camera.x) * camera.zoom + viewportWidth / 2,
    y: (worldY - camera.y) * camera.zoom + viewportHeight / 2,
  };
}

/** Is a world-space point within the viewport, plus a margin (in world
 * units, pre-zoom) so things don't pop in right at the screen edge. */
export function isInViewport(
  worldX: number,
  worldY: number,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  marginWorld: number
): boolean {
  const halfW = viewportWidth / 2 / camera.zoom + marginWorld;
  const halfH = viewportHeight / 2 / camera.zoom + marginWorld;
  return (
    Math.abs(worldX - camera.x) <= halfW && Math.abs(worldY - camera.y) <= halfH
  );
}

/** World-space bounds currently visible, plus a margin — for tiling a
 * background pattern across just what's on screen instead of the whole
 * arena. */
export function getViewportWorldBounds(
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  marginWorld: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const halfW = viewportWidth / 2 / camera.zoom + marginWorld;
  const halfH = viewportHeight / 2 / camera.zoom + marginWorld;
  return {
    minX: camera.x - halfW,
    maxX: camera.x + halfW,
    minY: camera.y - halfH,
    maxY: camera.y + halfH,
  };
}
