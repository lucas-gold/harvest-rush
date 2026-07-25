import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";
import { AvatarView } from "../avatar/AvatarView";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildGroundCropSprite, buildPowerUpSprite, buildSeedlingSprite } from "../pixelart/cropSprites";
import { PALETTE } from "../theme/palette";
import { PixelText } from "../theme/PixelText";
import { BackpackStack } from "./BackpackStack";
import { FarmField } from "./FarmField";
import { ZOOM, isInViewport, worldToScreen } from "./camera";
import { PLAYER_BASE_RADIUS, directionFromVector } from "./gameMath";
import { useArenaFrame } from "./useArenaFrame";

const CROP_WORLD_SIZE = 20;
const SEEDLING_WORLD_SIZE = 14;
const SEED_WORLD_SIZE = 10;
const POWERUP_WORLD_SIZE = 26;
const CULL_MARGIN = 80;
const DAMAGE_NUMBER_DURATION_MS = 1100;
const DAMAGE_NUMBER_RISE_PX = 42;
const POOF_DURATION_MS = 320;

// Crops/seedlings used to fall back to a plain colored dot beyond a
// fixed radius, on top of the MAX_VISIBLE_CROPS/SEEDLINGS caps below —
// originally needed because a full-detail viewport measured ~10,700 SVG
// shapes at once (a ~370-430ms stall). That's no longer true: once
// PixelCanvas's memoization actually held (stable zoom, stable sprite
// matrices — see useArenaFrame and AvatarView) and the count caps landed,
// measured full-detail-everywhere ran no worse than the radius-limited
// version under the same load. Dropped the distance check entirely; the
// count caps alone now bound worst-case cost.
// Same idea, applied to other players: a full player is an avatar SVG plus
// a backpack base plus up to MAX_BUNDLES more SVGs for a big one — up to
// ~10 sprite instances each, and with up to 40 players that's the single
// largest remaining render cost. Distant players (you're not about to
// interact with them anyway) collapse to one plain colored dot. Self
// always renders in full detail regardless of distance (there's only one).
//
// Needs to cover the actual visible viewport, not just a fixed gameplay
// range: a full-screen desktop window shows a visible half-width of
// viewportWidth/2/ZOOM world units (see camera.ts) — at a common 1920px
// window and ZOOM=1.365 that's ~703 units, well past the old 420, which
// is why players near the edge on a wide screen were still showing as
// dots despite clearly being on screen. This doesn't chase every
// possible monitor width, just pushes it out enough that typical
// full-screen setups don't see the seam.
const PLAYER_DETAIL_RADIUS = 650;
// Radius alone doesn't bound worst-case cost: a crowd clustered near
// spawn can put dozens of players within PLAYER_DETAIL_RADIUS at once.
// Capping to the nearest N (by actual distance, not render order) keeps
// per-frame sprite count bounded regardless of how players are
// distributed, while still preferring whoever's actually closest — so
// raising the radius above doesn't raise worst-case render cost, it just
// widens which players are *eligible* to compete for those 18 slots.
const MAX_FULL_DETAIL_PLAYERS = 18;
// Zoom is fixed (see ZOOM in camera.ts), but the arena itself grows up to
// ARENA_RADIUS_REFERENCE with population, and the field is ~40% ground
// coverage by design — a full, wide arena can still put well over a
// thousand crop/seedling entities in view at once, each a real native
// View even when simplified to a dot. Capping to the nearest N (like the
// player cap above) bounds worst-case cost regardless.
const MAX_VISIBLE_CROPS = 400;
const MAX_VISIBLE_SEEDLINGS = 200;

function nearestBy<T>(items: T[], max: number, camX: number, camY: number, getX: (t: T) => number, getY: (t: T) => number): T[] {
  if (items.length <= max) return items;
  return items
    .map((item) => ({ item, d2: (getX(item) - camX) ** 2 + (getY(item) - camY) ** 2 }))
    .sort((a, b) => a.d2 - b.d2)
    .slice(0, max)
    .map((e) => e.item);
}

const groundCropMatrix = buildGroundCropSprite();
const seedlingMatrix = buildSeedlingSprite();
const powerUpMatrix = buildPowerUpSprite();

export function ArenaCanvas() {
  const { width, height } = useWindowDimensions();
  const selfId = useArenaStore((s) => s.selfId);
  const { players, seeds, poofs } = useArenaFrame();
  const crops = useArenaStore((s) => s.crops);
  const cropsVersion = useArenaStore((s) => s.cropsVersion);
  const seedlings = useArenaStore((s) => s.seedlings);
  const seedlingsVersion = useArenaStore((s) => s.seedlingsVersion);
  const powerUps = useArenaStore((s) => s.powerUps);
  const powerUpsVersion = useArenaStore((s) => s.powerUpsVersion);
  const impacts = useArenaStore((s) => s.impacts);
  const arenaRadius = useArenaStore((s) => s.arenaRadius);

  // The very first connect measured as a reproducible ~120-170ms main-
  // thread stall (two back-to-back long tasks right at mount), even with
  // the LOD caps below already in place — mounting the full-detail sprite
  // tree (SVG avatars, backpacks, crop matrices) for everything within
  // range, all in the same commit as the Entry->Arena screen transition,
  // is just a lot of DOM/SVG node creation to do in one frame. Painting
  // everything as cheap dots for the first frame and upgrading to full
  // detail one rAF later splits that into two frames the browser can
  // actually keep up with, instead of blocking one.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const lastDirRef = useRef<Record<string, "down" | "up" | "left" | "right">>({});
  // Prune entries for players who've since left — otherwise this grows for
  // the lifetime of the tab, one entry per distinct player (real or bot)
  // ever seen this session, which adds up over a long run with a lot of
  // bot rotation.
  for (const id in lastDirRef.current) {
    if (!(id in players)) delete lastDirRef.current[id];
  }

  const self = selfId ? players[selfId] : undefined;
  const camera = useMemo(
    () => ({ x: self?.x ?? 0, y: self?.y ?? 0, zoom: ZOOM }),
    [self?.x, self?.y]
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
  const visibleCrops = useMemo(() => {
    const inView = Object.values(crops).filter((c) =>
      isInViewport(c.x, c.y, camera, width, height, CULL_MARGIN)
    );
    return nearestBy(inView, MAX_VISIBLE_CROPS, camera.x, camera.y, (c) => c.x, (c) => c.y);
    // crops is mutated in place (see arenaStore) so its reference never
    // changes — cropsVersion is the real "did this actually change" signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropsVersion, camQuantX, camQuantY, camera.zoom, width, height]);
  const visibleSeedlings = useMemo(() => {
    const inView = Object.values(seedlings).filter((s) =>
      isInViewport(s.x, s.y, camera, width, height, CULL_MARGIN)
    );
    return nearestBy(inView, MAX_VISIBLE_SEEDLINGS, camera.x, camera.y, (s) => s.x, (s) => s.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedlingsVersion, camQuantX, camQuantY, camera.zoom, width, height]);
  // Rare enough (POWERUP_MAX_ON_MAP=6) that no distance cap is needed —
  // just cull to the viewport like everything else.
  const visiblePowerUps = useMemo(
    () => Object.values(powerUps).filter((pu) => isInViewport(pu.x, pu.y, camera, width, height, CULL_MARGIN)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [powerUpsVersion, camQuantX, camQuantY, camera.zoom, width, height]
  );
  // Margin must be at least PLAYER_DETAIL_RADIUS: isInViewport does a
  // rectangular (axis-aligned) check, but nearPlayerIds below does a
  // circular one. A margin smaller than the radius can exclude a player
  // near the top/bottom edge (small horizontal offset, larger vertical
  // one) before nearPlayerIds ever sees them — even though they're well
  // within the circular radius — which is exactly how someone visibly
  // close on screen could still render as a plain dot.
  const visiblePlayers = useMemo(
    () =>
      Object.values(players).filter((p) => isInViewport(p.x, p.y, camera, width, height, PLAYER_DETAIL_RADIUS)),
    [players, camera, width, height]
  );
  // Seeds are few and short-lived (well under a second in flight) — no
  // version-counter dance needed, just filter the latest array each render.
  const visibleSeeds = useMemo(
    () => seeds.filter((s) => isInViewport(s.x, s.y, camera, width, height, 40)),
    [seeds, camera, width, height]
  );
  const nearPlayerIds = useMemo(() => {
    const withDist = visiblePlayers
      .filter((p) => p.id !== selfId)
      .map((p) => ({ id: p.id, d2: (p.x - camera.x) ** 2 + (p.y - camera.y) ** 2 }))
      .filter((e) => e.d2 <= PLAYER_DETAIL_RADIUS * PLAYER_DETAIL_RADIUS)
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, MAX_FULL_DETAIL_PLAYERS);
    return new Set(withDist.map((e) => e.id));
  }, [visiblePlayers, camera.x, camera.y, selfId]);

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
        const near = hydrated;
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
        const near = hydrated;
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

      {visiblePowerUps.map((pu) => {
        const pos = worldToScreen(pu.x, pu.y, camera, width, height);
        const size = Math.max(10, POWERUP_WORLD_SIZE * camera.zoom);
        return (
          <View
            key={pu.id}
            style={{
              position: "absolute",
              left: pos.x - size / 2,
              top: pos.y - size / 2,
              width: size,
              height: size,
            }}
          >
            <PixelCanvas matrix={powerUpMatrix} size={size} />
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
        // Self always renders in full detail immediately (only one of
        // them, and it'd be jarring to see your own character as a dot
        // for a frame) — other players go through the same one-frame
        // defer as crops/seedlings above.
        const near = isSelf || (hydrated && nearPlayerIds.has(p.id));

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
              {p.shielded && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.shieldAura,
                    {
                      width: r * 2.7,
                      height: r * 2.7,
                      borderRadius: r * 1.35,
                      left: r - r * 1.35,
                      top: r - r * 1.35,
                    },
                  ]}
                />
              )}
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
                {p.name}
              </PixelText>
              <Text style={styles.nameCrops}> · {p.crops}</Text>
            </View>
          </View>
        );
      })}

      {visibleSeeds.map((s) => {
        const pos = worldToScreen(s.x, s.y, camera, width, height);
        const size = Math.max(5, SEED_WORLD_SIZE * camera.zoom);
        return (
          <View
            key={s.id}
            pointerEvents="none"
            style={[styles.seedDot, { left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size, borderRadius: size / 2 }]}
          />
        );
      })}

      {poofs.map((pf) => {
        const age = Date.now() - pf.at;
        if (age >= POOF_DURATION_MS) return null;
        const progress = age / POOF_DURATION_MS;
        const pos = worldToScreen(pf.x, pf.y, camera, width, height);
        // Starts small and solid, expands and fades out — a quick "plop"
        // instead of the seed just blinking out of existence.
        const size = (7 + progress * 20) * camera.zoom;
        return (
          <View
            key={pf.id}
            pointerEvents="none"
            style={[
              styles.poof,
              {
                left: pos.x - size / 2,
                top: pos.y - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: 1 - progress,
              },
            ]}
          />
        );
      })}

      {impacts.map((imp) => {
        const target = players[imp.targetId];
        if (!target) return null;
        const age = Date.now() - imp.at;
        if (age >= DAMAGE_NUMBER_DURATION_MS) return null;
        const progress = age / DAMAGE_NUMBER_DURATION_MS;
        const pos = worldToScreen(target.x, target.y, camera, width, height);
        const r = PLAYER_BASE_RADIUS * camera.zoom;
        const rise = DAMAGE_NUMBER_RISE_PX * progress;
        return (
          <View
            key={imp.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: pos.x - 30,
              top: pos.y - r - 26 - rise,
              width: 60,
              alignItems: "center",
              opacity: 1 - progress,
            }}
          >
            <Text style={[styles.damageNumber, imp.crit && styles.damageNumberCrit]}>-{imp.amount}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Only shown for the single not-yet-hydrated first frame after connect
  // (see `hydrated` above) — small, round, and slightly translucent so
  // it reads as "not quite in focus yet" rather than a bright shape,
  // then swaps to the real sprite one frame later.
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
  seedDot: {
    position: "absolute",
    backgroundColor: "#e8c14a",
    borderWidth: 1,
    borderColor: "#8a5a1c",
  },
  poof: {
    position: "absolute",
    backgroundColor: "#c79b2e",
    borderWidth: 1,
    borderColor: "#8a5a1c",
  },
  damageNumber: {
    color: "#e0433a",
    fontSize: 18,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  damageNumberCrit: {
    color: "#ff7a1a",
    fontSize: 23,
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
  shieldAura: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "rgba(79,195,247,0.9)",
    backgroundColor: "rgba(79,195,247,0.18)",
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
