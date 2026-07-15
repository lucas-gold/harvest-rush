import React, { useState } from "react";
import { BoostButton } from "./BoostButton";
import { useWebControls } from "./useWebControls";

export function WebControls() {
  const { setButtonBoost } = useWebControls();
  const [boosting, setBoosting] = useState(false);

  const setBoost = (v: boolean) => {
    setBoosting(v);
    setButtonBoost(v);
  };

  return <BoostButton active={boosting} onPressIn={() => setBoost(true)} onPressOut={() => setBoost(false)} />;
}
