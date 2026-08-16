import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { collection, doc, getDoc, getDocs, getCountFromServer, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { PixelText } from "../theme/PixelText";
import { PixelCanvas } from "../pixelart/PixelCanvas";
import { buildSkullIconSprite } from "../pixelart/iconSprites";
import { getAnalyticsId } from "../analytics";

interface Entry {
  id: string;
  name: string;
  highScore: number;
  kills: number;
}

const skullMatrix = buildSkullIconSprite();

/** Global top 10, read directly from Firestore (public data, gated by
 * security rules rather than by hiding the client config — see
 * firestore.rules). Written server-side only, one best-ever run per
 * browser (see updateGlobalLeaderboard in server/src/leaderboard.ts).
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
        const topEntries: Entry[] = topSnap.docs.map((d) => {
          const data = d.data();
          return { id: d.id, name: data.name, highScore: data.highScore, kills: data.kills };
        });
        if (cancelled) return;
        setTop(topEntries);

        const myId = getAnalyticsId();
        if (!myId || topEntries.some((e) => e.id === myId)) return;

        const myDoc = await getDoc(doc(db, "leaderboard", myId));
        if (cancelled || !myDoc.exists()) return;
        const data = myDoc.data();
        const myEntry: Entry = { id: myId, name: data.name, highScore: data.highScore, kills: data.kills };

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

  const row = (rank: number, entry: Entry, highlighted: boolean) => (
    <View key={entry.id} style={[styles.row, highlighted && styles.rowHighlighted]}>
      <Text style={[styles.rank, highlighted && styles.highlightedText]}>{rank}</Text>
      <PixelText weight="semibold" style={[styles.name, highlighted && styles.highlightedText]} numberOfLines={1}>
        {entry.name}
      </PixelText>
      <View style={styles.kills}>
        <PixelCanvas matrix={skullMatrix} size={9} />
        <Text style={[styles.killsText, highlighted && styles.highlightedText]}>{entry.kills}</Text>
      </View>
      <Text style={[styles.score, highlighted && styles.highlightedText]}>{entry.highScore}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <PixelText weight="semibold" style={styles.title}>
        Top 10
      </PixelText>
      {top.map((entry, i) => row(i + 1, entry, entry.id === myId))}
      {self && (
        <>
          <View style={styles.divider} />
          {row(self.rank, self.entry, true)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 220,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 14,
    padding: 12,
    gap: 2,
  },
  title: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 3, borderRadius: 6 },
  rowHighlighted: { backgroundColor: "rgba(124,217,122,0.18)", paddingHorizontal: 4 },
  rank: { color: "rgba(255,255,255,0.5)", fontSize: 12, width: 18 },
  name: { color: "#fff", fontSize: 13, flex: 1 },
  kills: { flexDirection: "row", alignItems: "center", gap: 3 },
  killsText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", minWidth: 14 },
  score: { color: "#e8c14a", fontSize: 13, fontWeight: "700", minWidth: 32, textAlign: "right" },
  highlightedText: { color: "#7bd97a" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 4 },
});
