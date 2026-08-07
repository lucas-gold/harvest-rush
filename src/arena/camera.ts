export const ZOOM = 1.4;

// Below this in either screen dimension, ZOOM shows too little of the
// arena to react to what's around you — a fixed zoom means a physically
// smaller screen (a phone, especially in portrait) sees fewer world units
// than a desktop window, not the same amount at a smaller scale. Desktop
// and tablet windows are comfortably above this in both dimensions, so
// they're unaffected; only phone-scale viewports scale down.
const ZOOM_REFERENCE_DIM = 700;
const ZOOM_MIN = 0.85; // floor, so very narrow phones still zoom out, just not indefinitely

/** ZOOM at or above ZOOM_REFERENCE_DIM, scaling down toward ZOOM_MIN as the
 * smaller of the two screen dimensions shrinks below it — see
 * ZOOM_REFERENCE_DIM. Uses whichever dimension is smaller so a landscape
 * phone (wide but short) still gets pulled back the same as portrait. */
export function zoomForViewport(viewportWidth: number, viewportHeight: number): number {
  const minDim = Math.min(viewportWidth, viewportHeight);
  if (minDim >= ZOOM_REFERENCE_DIM) return ZOOM;
  return Math.max(ZOOM_MIN, ZOOM * (minDim / ZOOM_REFERENCE_DIM));
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
