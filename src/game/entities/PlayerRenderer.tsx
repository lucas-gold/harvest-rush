import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { PixelCanvas } from "../../pixelart/PixelCanvas";
import { buildFarmerSprite, Direction } from "../../pixelart/sprites";
import { PLAYER_SIZE } from "../constants";
import { usePlayerStore } from "../../state/playerStore";

interface Props {
  position: { x: number; y: number };
  direction: Direction;
  walkFrame: 0 | 1;
  moving: boolean;
}

function PlayerRendererBase({ position, direction, walkFrame, moving }: Props) {
  const customization = usePlayerStore((s) => s.customization);
  const mirrored = direction === "right";
  const renderDirection: Direction = direction === "right" ? "left" : direction;
  const matrix = buildFarmerSprite(renderDirection, walkFrame, customization);

  const bob = useRef(new Animated.Value(0)).current;
  const bobLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (moving) {
      bobLoop.current?.stop();
      bob.setValue(0);
      return;
    }
    // Default rest animation: a slow, gentle idle bob so the farmer never
    // looks frozen when standing still.
    bobLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: -3,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bobLoop.current.start();
    return () => bobLoop.current?.stop();
  }, [moving, bob]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: position.x - PLAYER_SIZE / 2,
        top: position.y - PLAYER_SIZE / 2,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        transform: [{ scaleX: mirrored ? -1 : 1 }, { translateY: bob }],
      }}
      pointerEvents="none"
    >
      <PixelCanvas matrix={matrix} size={PLAYER_SIZE} />
    </Animated.View>
  );
}

export const PlayerRenderer = React.memo(PlayerRendererBase);
