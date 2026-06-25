import React, { useMemo, useRef } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { useArenaStore } from "../multiplayer/arenaStore";
import { AvatarView } from "../avatar/AvatarView";
import { PixelText } from "../theme/PixelText";
import { computeZoom, isInViewport, worldToScreen } from "./camera";
import { directionFromVector, radiusForCrops } from "./gameMath";

const CROP_WORLD_SIZE = 12;
const SEEDLING_WORLD_SIZE = 7;
const CULL_MARGIN = 80;

export function ArenaCanvas() {
  const { width, height } = useWindowDimensions();
  const selfId = useArenaStore((s) => s.selfId);
  const players = useArenaStore((s) => s.players);
  const crops = useArenaStore((s) => s.crops);
  const seedlings = useArenaStore((s) => s.seedlings);
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

  const visibleCrops = useMemo(
    () =>
      Object.values(crops).filter((c) => isInViewport(c.x, c.y, camera, width, height, CULL_MARGIN)),
    [crops, camera, width, height]
  );
  const visibleSeedlings = useMemo(
    () =>
      Object.values(seedlings).filter((s) =>
        isInViewport(s.x, s.y, camera, width, height, CULL_MARGIN)
      ),
    [seedlings, camera, width, height]
  );
  const visiblePlayers = useMemo(
    () =>
      Object.values(players).filter((p) => isInViewport(p.x, p.y, camera, width, height, 150)),
    [players, camera, width, height]
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.boundary,
          {
            left: boundaryScreen.x - boundaryDiameter / 2,
            top: boundaryScreen.y - boundaryDiameter / 2,
            width: boundaryDiameter,
            height: boundaryDiameter,
            borderRadius: boundaryDiameter / 2,
          },
        ]}
      />

      {visibleSeedlings.map((s) => {
        const pos = worldToScreen(s.x, s.y, camera, width, height);
        const size = Math.max(3, SEEDLING_WORLD_SIZE * camera.zoom);
        const grownFrac = Math.min(1, (Date.now() - s.plantedAt) / 30000);
        return (
          <View
            key={s.id}
            style={[
              styles.seedling,
              {
                left: pos.x - size / 2,
                top: pos.y - size / 2,
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: 0.5 + grownFrac * 0.5,
              },
            ]}
          />
        );
      })}

      {visibleCrops.map((c) => {
        const pos = worldToScreen(c.x, c.y, camera, width, height);
        const size = Math.max(4, CROP_WORLD_SIZE * camera.zoom);
        return (
          <View
            key={c.id}
            style={[
              styles.crop,
              { left: pos.x - size / 2, top: pos.y - size / 2, width: size, height: size, borderRadius: size / 2 },
            ]}
          />
        );
      })}

      {visiblePlayers.map((p) => {
        const pos = worldToScreen(p.x, p.y, camera, width, height);
        const r = radiusForCrops(p.crops) * camera.zoom;
        const isSelf = p.id === selfId;
        const moving = p.dirX !== 0 || p.dirY !== 0;
        const dir = directionFromVector(p.dirX, p.dirY, lastDirRef.current[p.id] ?? "down");
        lastDirRef.current[p.id] = dir;
        const invuln = p.invulnUntil > Date.now();

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
            <View
              style={[
                styles.avatarRing,
                {
                  width: r * 2,
                  height: r * 2,
                  borderRadius: r,
                  borderColor: isSelf ? "#fff8e7" : invuln ? "#e0433a" : "transparent",
                },
              ]}
            >
              <AvatarView customization={p.avatar} size={r * 1.8} direction={dir} walkFrame={moving ? walkFrame : 0} />
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
  boundary: {
    position: "absolute",
    borderWidth: 6,
    borderColor: "#e0433a",
    backgroundColor: "#2f5d33",
  },
  crop: {
    position: "absolute",
    backgroundColor: "#63d15a",
    borderWidth: 1,
    borderColor: "#3d9c3a",
  },
  seedling: {
    position: "absolute",
    backgroundColor: "#9adf7a",
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
