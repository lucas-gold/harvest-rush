export const DEADZONE_PX = 12;
/** Scheme B: drag past this many px from screen center to auto-boost. */
export const BOOST_DRAG_THRESHOLD_PX = 110;

export function directionFromDelta(dx: number, dy: number): { x: number; y: number } {
  const mag = Math.hypot(dx, dy);
  return mag < DEADZONE_PX ? { x: 0, y: 0 } : { x: dx / mag, y: dy / mag };
}
