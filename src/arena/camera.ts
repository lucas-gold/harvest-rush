// Used to scale out as the local player's crop stack grew, agar.io-style.
// Dropped: the avatar sprite itself never changed size (only the backpack
// pile did, capped at MAX_BUNDLES), and seed-hit detection uses a fixed
// SEED_HIT_RADIUS rather than the player's collision radius — so a bigger
// stack was never actually an easier target in the current combat system,
// and the zoom-out was pure cost (more of the world in view, more entities
// to render) for no gameplay benefit. Zoom is just a fixed constant now.
//
// The visible world radius is viewport-size / zoom (see isInViewport
// below), so a big desktop window shows proportionally more of the arena
// — and renders more crops/seedlings/players — than a phone screen at the
// same zoom. Bumped from 1.1 so a full-screen desktop session shows less
// world at once instead of scaling entity count with window size.
export const ZOOM = 1.3;

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
