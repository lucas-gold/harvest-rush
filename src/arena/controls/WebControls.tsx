import React, { useState } from "react";
import { FireButton } from "./FireButton";
import { useWebControls } from "./useWebControls";

export function WebControls() {
  const { setButtonFiring } = useWebControls();
  const [firing, setFiringState] = useState(false);

  const setFiring = (v: boolean) => {
    setFiringState(v);
    setButtonFiring(v);
  };

  return <FireButton active={firing} onPressIn={() => setFiring(true)} onPressOut={() => setFiring(false)} />;
}
