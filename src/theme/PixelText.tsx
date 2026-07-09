import React from "react";
import { Text, TextProps } from "react-native";
import { FONT_PIXEL_BOLD, FONT_PIXEL_SEMIBOLD } from "./fonts";

interface Props extends TextProps {
  weight?: "semibold" | "bold";
}

/** Text for words — titles, labels, buttons, names. Not for numbers you
 * need to read quickly (scores, counts) — use plain <Text> for those. */
export function PixelText({ weight = "bold", style, ...rest }: Props) {
  const fontFamily = weight === "semibold" ? FONT_PIXEL_SEMIBOLD : FONT_PIXEL_BOLD;
  return <Text {...rest} style={[{ fontFamily }, style]} />;
}
