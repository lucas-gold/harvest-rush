import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";
import { AvatarView } from "../avatar/AvatarView";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildGroundCropSprite, buildSeedlingSprite } from "../pixelart/cropSprites";
import { PALETTE } from "../theme/palette";
import { PixelText } from "../theme/PixelText";
import { BackpackStack } from "./BackpackStack";
import { FarmField } from "./FarmField";
import { computeZoom, isInViewport, worldToScreen } from "./camera";
import { PLAYER_BASE_RADIUS, directionFromVector } from "./gameMath";
import { useSmoothedPlayers } from "./useSmoothedPlayers";

const CROP_WORLD_SIZE = 20;
const SEEDLING_WORLD_SIZE = 14;
const CULL_MARGIN = 80;

// Only crops/seedlings within this world-space distance of the camera get
// the full pixel-art SVG sprite (dozens of <Rect> elements each); farther
// ones (still on screen when zoomed out, just not the focus) render as a
// plain colored square instead. This caps the expensive-sprite count to
// roughly a fixed number regardless of zoom or total world population —
// a size/zoom-based threshold alone doesn't: a small/fresh player sits at
// the *highest* zoom (see computeZoom), where crops are large enough to
// clear almost any reasonable size threshold, so a size check alone still
// let a full-detail viewport (measured: ~10,700 SVG shape elements at
// once) through right when a player first connects — exactly the moment
// that showed up as a ~370-430ms main-thread stall.
const CROP_DETAIL_RADIUS = 180;
const SEEDLING_DETAIL_RADIUS = 150;
// Same idea, applied to other players: a full player is an avatar SVG plus
// a backpack base plus up to MAX_BUNDLES more SVGs for a big one — up to
// ~10 sprite instances each, and with up to 40 players that's the single
// largest remaining render cost. Distant players (you're not about to
// interact with them anyway) collapse to one plain colored dot. Self
// always renders in full detail regardless of distance (there's only one).
const PLAYER_DETAIL_RADIUS = 300;

const groundCropMatrix = buildGroundCropSprite();
const seedlingMatrix = buildSeedlingSprite();

export function ArenaCanvas() {
  const { width, height } = useWindowDimensions();
  const selfId = useArenaStore((s) => s.selfId);
  const players = useSmoothedPlayers();
  const crops = useArenaStore((s) => s.crops);
  const cropsVersion = useArenaStore((s) => s.cropsVersion);
  const seedlings = useArenaStore((s) => s.seedlings);
  const seedlingsVersion = useArenaStore((s) => s.seedlingsVersion);
  const arenaRadius = useArenaStore((s) => s.arenaRadius);

  const lastDirRef = useRef<Record<string, "down" | "up" | "left" | "right">>({});

  const self = selfId ? players[selfId] : undefined;
  const camera = useMemo(
    () => ({ x: self?.x ?? 0, y: self?.y ?? 0, zoom: computeZoom(self?.crops ?? 0) }),
    [self?.x, self?.y, self?.crops]
  );

  const walkFrame: 0 | 1 = Math.floor(Date.now() / 150) % 2 === 0 ? 0 : 1;

  const boundaryScreen = worldToScreen(0, 0, camera, width, height);
  const boundaryDiameter = arenaRadius * 2 * camera.zoom;
  const boundaryLeft = boundaryScreen.x - boundaryDiameter / 2;
  const boundaryTop = boundaryScreen.y - boundaryDiameter / 2;

  // Crops/seedlings never move, but `camera` gets a new value every
  // animation frame from the smoothed self position — re-filtering
  // potentially thousands of them 60x/sec just because the camera moved a
  // fraction of a unit is wasted work. Quantizing to a coarse grid (well
  // under CULL_MARGIN, so nothing pops in/out early) means this only
  // recomputes when the camera has actually moved meaningfully.
  const camQuantX = Math.round(camera.x / 40);
  const camQuantY = Math.round(camera.y / 40);
  const visibleCrops = useMemo(
    () =>
      Object.values(crops).filter((c) => isInViewport(c.x, c.y, camera, width, height, CULL_MARGIN)),
    // crops is mutated in place (see arenaStore) so its reference never
    // changes — cropsVersion is the real "did this actually change" signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cropsVersion, camQuantX, camQuantY, camera.zoom, width, height]
  );
  const visibleSeedlings = useMemo(
    () =>
      Object.values(seedlings).filter((s) =>
        isInViewport(s.x, s.y, camera, width, height, CULL_MARGIN)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seedlingsVersion, camQuantX, camQuantY, camera.zoom, width, height]
  );
  const visiblePlayers = useMemo(
    () =>
      Object.values(players).filter((p) => isInViewport(p.x, p.y, camera, width, height, 250)),
    [players, camera, width, height]
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.boundaryFill,
          {
            left: boundaryLeft,
            top: boundaryTop,
            width: boundaryDiameter,
            height: boundaryDiameter,
            borderRadius: boundaryDiameter / 2,
          },
        ]}
      >
        <FarmField
          camera={camera}
          viewportWidth={width}
          viewportHeight={height}
          offsetX={boundaryLeft}
          offsetY={boundaryTop}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.boundaryRing,
          {
            left: boundaryLeft,
            top: boundaryTop,
            width: boundaryDiameter,
            height: boundaryDiameter,
            borderRadius: boundaryDiameter / 2,
          },
        ]}
      />

      {visibleSeedlings.map((s) => {
        const pos = worldToScreen(s.x, s.y, camera, width, height);
        const size = Math.max(6, SEEDLING_WORLD_SIZE * camera.zoom);
        const style = {
          position: "absolute" as const,
          left: pos.x - size / 2,
          top: pos.y - size / 2,
          width: size,
          height: size,
        };
        const near = Math.hypot(s.x - camera.x, s.y - camera.y) <= SEEDLING_DETAIL_RADIUS;
        if (!near) {
          const dot = size * 0.55;
          return (
            <View key={s.id} style={[style, { alignItems: "center", justifyContent: "center" }]}>
              <View style={[styles.seedlingDot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
            </View>
          );
        }
        return (
          <View key={s.id} style={style}>
            <PixelCanvas matrix={seedlingMatrix} size={size} />
          </View>
        );
      })}

      {visibleCrops.map((c) => {
        const pos = worldToScreen(c.x, c.y, camera, width, height);
        const size = Math.max(8, CROP_WORLD_SIZE * camera.zoom);
        const style = {
          position: "absolute" as const,
          left: pos.x - size / 2,
          top: pos.y - size / 2,
          width: size,
          height: size,
        };
        const near = Math.hypot(c.x - camera.x, c.y - camera.y) <= CROP_DETAIL_RADIUS;
        if (!near) {
          const dot = size * 0.6;
          return (
            <View key={c.id} style={[style, { alignItems: "center", justifyContent: "center" }]}>
              <View style={[styles.cropDot, { width: dot, height: dot, borderRadius: dot / 2 }]} />
            </View>
          );
        }
        return (
          <View key={c.id} style={style}>
            <PixelCanvas matrix={groundCropMatrix} size={size} />
          </View>
        );
      })}

      {visiblePlayers.map((p) => {
        const pos = worldToScreen(p.x, p.y, camera, width, height);
        const r = PLAYER_BASE_RADIUS * camera.zoom;
        const moving = p.dirX !== 0 || p.dirY !== 0;
        const dir = directionFromVector(p.dirX, p.dirY, lastDirRef.current[p.id] ?? "down");
        lastDirRef.current[p.id] = dir;
        const invuln = p.invulnUntil > Date.now();
        const isSelf = p.id === selfId;
        const near = isSelf || Math.hypot(p.x - camera.x, p.y - camera.y) <= PLAYER_DETAIL_RADIUS;

        const labelWidth = 110;
        return (
          <View
            key={p.id}
            style={{
              position: "absolute",
              left: pos.x - labelWidth / 2,
              top: pos.y - r,
              width: labelWidth,
              alignItems: "center",
            }}
          >
            <View style={{ width: r * 2, height: r * 2, alignItems: "center", justifyContent: "center" }}>
              {near ? (
                <>
                  <BackpackStack crops={p.crops} size={r * 2.4} />
                  <View
                    style={[
                      styles.avatarRing,
                      {
                        width: r * 2,
                        height: r * 2,
                        borderRadius: r,
                        borderColor: invuln ? "#e0433a" : "transparent",
                      },
                    ]}
                  >
                    <AvatarView
                      customization={p.avatar}
                      size={r * 1.8}
                      direction={dir}
                      walkFrame={moving ? walkFrame : 0}
                    />
                  </View>
                </>
              ) : (
                <View
                  style={[
                    styles.playerDot,
                    {
                      width: r * 1.6,
                      height: r * 1.6,
                      borderRadius: r * 0.8,
                      backgroundColor: PALETTE[p.avatar.shirtColor],
                      borderColor: invuln ? "#e0433a" : PALETTE.outline,
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.nameRow}>
              <PixelText weight="semibold" style={styles.nameLabel} numberOfLines={1}>
                {p.isBot ? `${p.name} (bot)` : p.name}
              </PixelText>
              <Text style={styles.nameCrops}> · {p.crops}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Distant crops/seedlings simplify to these — small, round, and
  // slightly translucent so they read as "not quite in focus yet" rather
  // than a bright, out-of-place shape.
  cropDot: {
    backgroundColor: PALETTE.wheatGold,
    opacity: 0.8,
  },
  seedlingDot: {
    backgroundColor: PALETTE.sproutGreen,
    opacity: 0.75,
  },
  playerDot: {
    opacity: 0.85,
    borderWidth: 2,
  },
  boundaryFill: {
    position: "absolute",
    backgroundColor: "#2f5d33",
    overflow: "hidden",
  },
  boundaryRing: {
    position: "absolute",
    borderWidth: 6,
    borderColor: "#e0433a",
  },
  avatarRing: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nameRow: {
    marginTop: 2,
    flexDirection: "row",
    maxWidth: 110,
  },
  nameLabel: {
    color: "#fff",
    fontSize: 11,
    flexShrink: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameCrops: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
