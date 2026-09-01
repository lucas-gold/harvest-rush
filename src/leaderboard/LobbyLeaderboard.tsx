import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { collection, doc, getDoc, getDocs, getCountFromServer, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { PixelText } from "../theme/PixelText";
import { getAnalyticsId } from "../analytics";

interface Entry {
  id: string;
  name: string;
  highScore: number;
  mostKills: number;
  totalCropsCollected: number;
}

// Defensive defaults, not just a type cast -- a doc written before
// mostKills/totalCropsCollected existed in the schema won't have them at
// all, and should read as 0 rather than a blank cell.
function toEntry(id: string, data: Record<string, unknown>): Entry {
  return {
    id,
    name: typeof data.name === "string" ? data.name : "?",
    highScore: typeof data.highScore === "number" ? data.highScore : 0,
    mostKills: typeof data.mostKills === "number" ? data.mostKills : 0,
    totalCropsCollected: typeof data.totalCropsCollected === "number" ? data.totalCropsCollected : 0,
  };
}

/** Global top 10, read directly from Firestore (public data, gated by
 * security rules rather than by hiding the client config — see
 * firestore.rules). Written server-side only, tracked per browser (see
 * updateGlobalLeaderboard in server/src/leaderboard.ts).
 *
 * Fails silently (renders nothing) rather than showing a broken panel —
 * a lobby screen with no leaderboard reads fine; one with an error
 * message doesn't. */
export function LobbyLeaderboard() {
  const [top, setTop] = useState<Entry[] | null>(null);
  const [self, setSelf] = useState<{ entry: Entry; rank: number } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const topSnap = await getDocs(query(collection(db, "leaderboard"), orderBy("highScore", "desc"), limit(10)));
        const topEntries: Entry[] = topSnap.docs.map((d) => toEntry(d.id, d.data()));
        if (cancelled) return;
        setTop(topEntries);

        const myId = getAnalyticsId();
        if (!myId || topEntries.some((e) => e.id === myId)) return;

        const myDoc = await getDoc(doc(db, "leaderboard", myId));
        if (cancelled || !myDoc.exists()) return;
        const myEntry = toEntry(myId, myDoc.data());

        const countSnap = await getCountFromServer(
          query(collection(db, "leaderboard"), where("highScore", ">", myEntry.highScore))
        );
        if (cancelled) return;
        setSelf({ entry: myEntry, rank: countSnap.data().count + 1 });
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || !top || top.length === 0) return null;

  const myId = getAnalyticsId();

  const row = (rank: number, entry: Entry) => {
    const isFirst = rank === 1;
    const isSelf = entry.id === myId;
    const textStyle = isSelf ? styles.selfText : null;
    return (
      <View key={entry.id} style={[styles.row, isFirst && styles.rowFirst]}>
        <Text style={[styles.rank, textStyle]} numberOfLines={1}>
          {rank}
        </Text>
        <PixelText weight={isSelf ? "bold" : "semibold"} style={[styles.name, textStyle]} numberOfLines={1}>
          {entry.name}
        </PixelText>
        <Text style={[styles.stat, styles.score, textStyle]}>{entry.highScore}</Text>
        <Text style={[styles.stat, textStyle]}>{entry.mostKills}</Text>
        <Text style={[styles.stat, textStyle]}>{entry.totalCropsCollected}</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <PixelText weight="semibold" style={styles.title}>
        Top 10
      </PixelText>
      <View style={styles.headerRow}>
        <Text style={[styles.rank, styles.header]}> </Text>
        <Text style={[styles.name, styles.header]}> </Text>
        <Text style={[styles.stat, styles.header]}>Score</Text>
        <Text style={[styles.stat, styles.header]}>Kills</Text>
        <Text style={[styles.stat, styles.header]}>Crops</Text>
      </View>
      {top.map((entry, i) => row(i + 1, entry))}
      {self && (
        <>
          <View style={styles.divider} />
          {row(self.rank, self.entry)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 296,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  title: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, marginBottom: 2 },
  header: { color: "rgba(255,255,255,0.4)", fontSize: 9, fontWeight: "700", textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  rowFirst: { backgroundColor: "rgba(255,215,0,0.16)" },
  rank: { color: "rgba(255,255,255,0.5)", fontSize: 12, width: 32 },
  name: { color: "#fff", fontSize: 13, flex: 1 },
  stat: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", width: 40, textAlign: "right" },
  score: { color: "#e8c14a" },
  selfText: { color: "#7bd97a", fontWeight: "800" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 4 },
});
