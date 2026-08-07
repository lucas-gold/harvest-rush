import { AvatarCustomization, ClientMessage, ServerMessage } from "./protocol";
import { useArenaStore } from "./arenaStore";

// Defaults to the live deployed server so the app works out of the box
// without a local server running. Override with EXPO_PUBLIC_ARENA_WS_URL
// (e.g. "ws://localhost:8787/ws") when iterating against a local server —
// see server/README.md.
const DEFAULT_WS_URL = process.env.EXPO_PUBLIC_ARENA_WS_URL || "wss://harvest-rush-arena.fly.dev/ws";

let socket: WebSocket | null = null;
let inputThrottleId: ReturnType<typeof setTimeout> | null = null;
let pendingInput: { dirX: number; dirY: number; firing: boolean } | null = null;

const INPUT_SEND_INTERVAL_MS = 66; // matches server tick — no point sending faster

function handleMessage(msg: ServerMessage) {
  const store = useArenaStore.getState();
  switch (msg.t) {
    case "welcome":
      store._setWelcome(msg);
      break;
    case "state":
      store._applyState(msg.players, msg.seeds, msg.leaderboard, msg.playerCount, msg.arenaRadius);
      break;
    case "cropSpawn":
      store._addCrops(msg.crops);
      break;
    case "cropRemove":
      store._removeCrops(msg.ids);
      break;
    case "seedlingSpawn":
      store._addSeedlings(msg.seedlings);
      break;
    case "seedlingRemove":
      store._removeSeedlings(msg.ids);
      break;
    case "powerUpSpawn":
      store._addPowerUps(msg.powerUps);
      break;
    case "powerUpRemove":
      store._removePowerUps(msg.ids);
      break;
    case "powerUpPickup":
      store._setPowerUpPickup(msg.kind);
      break;
    case "playerLeft":
      store._removePlayer(msg.id);
      break;
    case "popped":
      store._setPopped(msg.byName);
      break;
    case "hitConfirm":
      // The floating "-20"/"-30" over the target (seedImpact, below) is
      // the shooter's feedback for a landed hit; `eliminated` here drives
      // the HUD kill counter.
      if (msg.eliminated) store._recordKill();
      break;
    case "seedImpact":
      store._addImpact({ targetId: msg.targetId, amount: msg.amount, crit: msg.crit });
      break;
  }
}

export function connectToArena(name: string, avatar: AvatarCustomization, url: string = DEFAULT_WS_URL) {
  disconnectFromArena();
  useArenaStore.getState()._reset();
  useArenaStore.getState()._setStatus("connecting");

  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    const join: ClientMessage = { t: "join", name, avatar };
    ws.send(JSON.stringify(join));
  };
  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data) as ServerMessage;
      handleMessage(msg);
    } catch {
      // ignore malformed frames
    }
  };
  ws.onerror = () => {
    useArenaStore.getState()._setStatus("error");
  };
  ws.onclose = () => {
    if (socket === ws) socket = null;
    const status = useArenaStore.getState().status;
    if (status !== "idle") useArenaStore.getState()._setStatus("error");
  };
}

export function disconnectFromArena() {
  if (inputThrottleId) {
    clearTimeout(inputThrottleId);
    inputThrottleId = null;
  }
  pendingInput = null;
  if (socket) {
    const s = socket;
    socket = null;
    s.onopen = null;
    s.onmessage = null;
    s.onerror = null;
    s.onclose = null;
    s.close();
  }
  useArenaStore.getState()._setStatus("idle");
}

let lastSentFiring = false;

function flushInput() {
  inputThrottleId = null;
  if (!pendingInput || !socket || socket.readyState !== WebSocket.OPEN) return;
  lastSentFiring = pendingInput.firing;
  const msg: ClientMessage = { t: "input", ...pendingInput };
  socket.send(JSON.stringify(msg));
  pendingInput = null;
}

/** Direction + firing are throttled to one send per tick interval — the
 * latest call before each interval elapses wins, so rapid mouse/touch
 * movement doesn't flood the socket.
 *
 * Firing turning ON is the one exception: a quick tap-and-release (a
 * fire button on mobile is often held well under 66ms) can otherwise
 * have its `firing: true` overwritten by the `firing: false` from the
 * release before either ever reaches the socket — the shot silently
 * never happens. Flush that rising edge immediately; firing turning back
 * off, and plain direction updates, stay throttled as before. */
export function sendInput(dirX: number, dirY: number, firing: boolean) {
  pendingInput = { dirX, dirY, firing };
  if (firing && !lastSentFiring) {
    if (inputThrottleId) clearTimeout(inputThrottleId);
    flushInput();
    inputThrottleId = setTimeout(() => {
      inputThrottleId = null;
    }, INPUT_SEND_INTERVAL_MS);
    return;
  }
  if (inputThrottleId) return;
  inputThrottleId = setTimeout(flushInput, INPUT_SEND_INTERVAL_MS);
}
