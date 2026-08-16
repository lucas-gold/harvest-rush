import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

// Optional, same pattern as analytics.ts -- an environment without a
// service account configured just no-ops instead of requiring Firestore
// to run the server at all.
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
let db: Firestore | null = null;
if (serviceAccountJson) {
  const app = initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  db = getFirestore(app);
}

/** Keeps a single best-ever record per browser (see analyticsId in
 * analytics.ts) in the public "leaderboard" collection the client reads
 * directly -- a later worse run never overwrites a better one, and
 * highScore/kills always describe the same run rather than mixing best-
 * ever numbers from different lives. Skipped entirely for a 0-crop
 * session; nothing worth recording. Best-effort: a Firestore hiccup
 * shouldn't affect gameplay, so failures are swallowed after logging. */
export async function updateGlobalLeaderboard(params: {
  distinctId: string;
  name: string;
  peakCrops: number;
  kills: number;
}) {
  if (!db || params.peakCrops <= 0) return;
  const ref = db.collection("leaderboard").doc(params.distinctId);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existingBest = snap.exists ? (snap.data()!.highScore as number) : 0;
      if (params.peakCrops <= existingBest) return;
      tx.set(ref, {
        name: params.name,
        highScore: params.peakCrops,
        kills: params.kills,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    console.error("[leaderboard] failed to update", params.distinctId, err);
  }
}
