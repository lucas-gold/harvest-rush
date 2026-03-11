import { initFirebase, currentUserId, getFirestoreDb } from "./firebase";
import { useEconomyStore } from "../state/economyStore";
import { usePlayerStore } from "../state/playerStore";
import { useFarmStore } from "../state/farmStore";
import { useSettingsStore } from "../state/settingsStore";

const SAVE_DEBOUNCE_MS = 4000;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribers: Array<() => void> = [];

function snapshot() {
  const economy = useEconomyStore.getState();
  const player = usePlayerStore.getState();
  const farm = useFarmStore.getState();
  return {
    coins: economy.coins,
    gems: economy.gems,
    totalCoinsEarned: economy.totalCoinsEarned,
    upgradeLevels: economy.upgradeLevels,
    playerName: player.name,
    customization: player.customization,
    tiles: farm.tiles,
    savedAt: Date.now(),
  };
}

async function pushToCloud() {
  if (!useSettingsStore.getState().cloudSyncEnabled) return;
  const uid = currentUserId();
  const db = getFirestoreDb();
  if (!uid || !db) return;
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "saves", uid), snapshot(), { merge: true });
  } catch (err) {
    console.warn("[save] push failed", err);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(pushToCloud, SAVE_DEBOUNCE_MS);
}

/** Pulls the cloud save (if any) and applies it to local stores. Call once at startup, after initFirebase(). */
export async function loadCloudSave(): Promise<boolean> {
  const uid = currentUserId();
  const db = getFirestoreDb();
  if (!uid || !db) return false;
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "saves", uid));
    if (!snap.exists()) return false;
    const data = snap.data() as ReturnType<typeof snapshot>;

    useEconomyStore.setState({
      coins: data.coins,
      gems: data.gems,
      totalCoinsEarned: data.totalCoinsEarned,
      upgradeLevels: data.upgradeLevels,
    });
    usePlayerStore.setState({ name: data.playerName, customization: data.customization });
    if (data.tiles) useFarmStore.setState({ tiles: data.tiles });
    return true;
  } catch (err) {
    console.warn("[save] pull failed", err);
    return false;
  }
}

/** Wires local store changes to a debounced cloud push. Call once at startup. */
export async function startCloudSync() {
  const ok = await initFirebase();
  if (!ok) return;
  await loadCloudSave();

  stopCloudSync();
  unsubscribers = [
    useEconomyStore.subscribe(scheduleSave),
    usePlayerStore.subscribe(scheduleSave),
    useFarmStore.subscribe(scheduleSave),
  ];
}

export function stopCloudSync() {
  unsubscribers.forEach((unsub) => unsub());
  unsubscribers = [];
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}

export async function forceSaveNow() {
  await pushToCloud();
}
