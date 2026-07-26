import { Platform } from "react-native";
import { PALETTE } from "../theme/palette";

/** Web has no reliable Platform check for "phone browser" — `Platform.OS`
 * is "web" whether it's a desktop browser with a mouse or a phone browser
 * with only touch. maxTouchPoints > 0 is the standard signal: true on
 * iOS/Android browsers, false on a mouse-only desktop. (Touch-screen
 * laptops will also get touch controls — an acceptable tradeoff, and
 * those still work fine with a mouse too since the drag layer handles
 * both pointer types.) */
export function isTouchPrimaryWeb(): boolean {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 0
  );
}

/** Mobile browsers (iOS Safari especially) rubber-band/bounce the page on
 * overscroll and allow pull-to-refresh — both expose the raw white
 * <body> background outside the app, and both fight with in-game touch
 * dragging (the browser tries to scroll/refresh the page instead of just
 * handling the drag as a game input). None of this applies to native
 * builds, so this is a no-op there. */
export function applyMobileWebViewportFixes() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const bg = PALETTE.arenaGround;
  for (const el of [document.documentElement, document.body]) {
    el.style.backgroundColor = bg;
    el.style.overflow = "hidden";
    el.style.overscrollBehavior = "none";
    el.style.touchAction = "none";
    el.style.height = "100%";
  }

  // Matches the browser's own chrome (address bar / home-indicator area
  // on iOS) to the app background instead of leaving it default white.
  let themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement("meta");
    themeColor.setAttribute("name", "theme-color");
    document.head.appendChild(themeColor);
  }
  themeColor.setAttribute("content", bg);

  // Disable pinch-zoom and extend under the iOS notch/home-indicator —
  // a game screen has no content to zoom into and stray pinch gestures
  // just fight with in-game touch controls.
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
    );
  }
}
