export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 1.15;
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
