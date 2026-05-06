import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  Share,
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  getProgressSummary,
  getLevel,
  LEVEL_UNLOCKS,
  getActivityLog,
  exportProgressData,
  type ProgressSummary,
  type ActivityEntry,
} from "@/lib/progress-store";
import { getCoinBalance } from "@/lib/challenge-store";
import { useAppTheme } from "@/lib/theme-context";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#F4EFE6",
  card:    "#FFFFFF",
  ink:     "#1A1614",
  inkSub:  "#6B6360",
  muted:   "#A09790",
  border:  "rgba(26,22,20,0.09)",
  cocoa:   "#7A4A22",
  gold:    "#D4A017",
  green:   "#22C55E",
  accent:  "#2563EB",
};

const F = {
  serif:    "Fraunces-Regular",
  serifBd:  "Fraunces-Bold",
  sans:     "Geist-Regular",
  sansMed:  "Geist-Medium",
  sansSemi: "Geist-SemiBold",
  sansBold: "Geist-Bold",
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { theme } = useAppTheme();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [spheres, setSpheres] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  const load = useCallback(async () => {
    const [s, bal, acts] = await Promise.all([getProgressSummary(), getCoinBalance(), getActivityLog(15)]);
    setSummary(s);
    setSpheres(bal);
    setActivities(acts);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const lvl = summary ? getLevel(summary.xp) : { level: 1, currentXP: 0, nextLevelXP: 50, progress: 0 };
  const streak = summary?.streak ?? 0;
  const confidence = summary?.confidence ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={S.header}>
          <Text style={S.title}>Progress</Text>
          <Text style={S.subtitle}>Your journey to fluency.</Text>
        </View>

        {/* ── Level hero ──────────────────────────────────────────── */}
        <View style={S.heroCard}>
          <View style={S.heroBloom} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={S.levelCircle}>
              <Text style={S.levelNum}>{lvl.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.heroLabel}>LEVEL {lvl.level}</Text>
              <View style={S.xpBarTrack}>
                <View style={[S.xpBarFill, { width: `${Math.round(lvl.progress * 100)}%` }]} />
              </View>
              <Text style={S.heroXp}>{lvl.currentXP} / {lvl.nextLevelXP} XP</Text>
            </View>
          </View>
        </View>

        {/* ── Stats row ───────────────────────────────────────────── */}
        <View style={S.statsRow}>
          <View style={S.statCard}>
            <Ionicons name="flame" size={20} color={streak > 0 ? "#E8853A" : C.muted} />
            <Text style={[S.statVal, streak > 0 && { color: "#E8853A" }]}>{streak}</Text>
            <Text style={S.statLabel}>day streak</Text>
          </View>
          <View style={S.statCard}>
            <Ionicons name="trending-up" size={20} color={C.accent} />
            <Text style={S.statVal}>{confidence}%</Text>
            <Text style={S.statLabel}>confidence</Text>
          </View>
          <View style={S.statCard}>
            <Ionicons name="ellipse" size={20} color={C.gold} />
            <Text style={S.statVal}>{spheres}</Text>
            <Text style={S.statLabel}>spheres</Text>
          </View>
        </View>

        {/* ── Level unlocks journey ───────────────────────────────── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionEye}>LEVEL UNLOCKS</Text>
          <Text style={S.sectionSub}>{LEVEL_UNLOCKS.filter(u => u.level <= lvl.level).length}/{LEVEL_UNLOCKS.length} unlocked</Text>
        </View>

        {LEVEL_UNLOCKS.map((unlock, idx) => {
          const reached = lvl.level >= unlock.level;
          return (
            <Animated.View
              key={unlock.level}
              entering={FadeInDown.delay(idx * 30).duration(300)}
            >
              <View style={[S.unlockRow, !reached && { opacity: 0.45 }]}>
                {/* Timeline rail */}
                <View style={S.timelineCol}>
                  {idx > 0 && <View style={[S.timelineLine, reached && { backgroundColor: C.cocoa }]} />}
                  <View style={[S.timelineDot, reached ? { backgroundColor: C.cocoa } : { backgroundColor: C.muted, borderWidth: 1.5, borderColor: "rgba(26,22,20,0.15)" }]}>
                    {reached && <Ionicons name="checkmark" size={10} color="#FFF" />}
                  </View>
                  {idx < LEVEL_UNLOCKS.length - 1 && <View style={[S.timelineLine, reached && { backgroundColor: C.cocoa }]} />}
                </View>

                {/* Content */}
                <View style={[S.unlockCard, reached && { borderColor: "rgba(122,74,34,0.18)" }]}>
                  <View style={[S.unlockIcon, { backgroundColor: unlock.color + "18" }]}>
                    <Ionicons name={unlock.icon as any} size={18} color={unlock.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.unlockTitle}>{unlock.label}</Text>
                    <Text style={S.unlockLevel}>Level {unlock.level}</Text>
                  </View>
                  {reached ? (
                    <View style={S.unlockedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={C.green} />
                    </View>
                  ) : (
                    <Ionicons name="lock-closed" size={14} color={C.muted} />
                  )}
                </View>
              </View>
            </Animated.View>
          );
        })}

        {/* ── Recent Activity ──────────────────────────────────── */}
        <View style={S.sectionHeader}>
          <Text style={S.sectionEye}>RECENT ACTIVITY</Text>
          <Pressable
            onPress={async () => {
              try {
                const data = await exportProgressData();
                await Share.share({ message: data, title: "UseLang Progress" });
              } catch {
                Alert.alert("Export Failed", "Could not export progress data.");
              }
            }}
            hitSlop={12}
          >
            <Ionicons name="share-outline" size={18} color={C.cocoa} />
          </Pressable>
        </View>

        {activities.length === 0 ? (
          <View style={S.emptyActivity}>
            <Ionicons name="time-outline" size={28} color={C.muted} />
            <Text style={S.emptyActivityText}>No recent activity yet.{"\n"}Start a lesson or play a game!</Text>
          </View>
        ) : (
          activities.map((act, idx) => {
            const icons: Record<string, string> = {
              lesson: "book-outline", game: "game-controller-outline",
              practice: "mic-outline", exam: "school-outline",
              challenge: "trophy-outline", shop: "cart-outline",
            };
            const colors: Record<string, string> = {
              lesson: C.cocoa, game: "#8B5CF6", practice: C.accent,
              exam: "#EF4444", challenge: C.gold, shop: "#14B8A6",
            };
            const ico = icons[act.type] || "ellipse-outline";
            const col = colors[act.type] || C.muted;
            const ago = formatTimeAgo(act.ts);
            return (
              <Animated.View key={act.id} entering={FadeInDown.delay(idx * 40).duration(300)}>
                <View style={S.actRow}>
                  <View style={[S.actIcon, { backgroundColor: col + "14" }]}>
                    <Ionicons name={ico as any} size={16} color={col} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.actLabel}>{act.label}</Text>
                    <Text style={S.actDetail}>{act.detail}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={S.actTime}>{ago}</Text>
                    {act.xp ? <Text style={S.actXp}>+{act.xp} XP</Text> : null}
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 24, marginBottom: 6 },
  title: { fontFamily: F.serif, fontSize: 32, color: C.ink, letterSpacing: -0.6 },
  subtitle: { fontFamily: F.sans, fontSize: 13, color: C.muted, marginTop: 2 },

  heroCard: {
    marginHorizontal: 20, marginTop: 18, backgroundColor: "#141210",
    borderRadius: 22, padding: 20, overflow: "hidden",
  },
  heroBloom: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(201,164,101,0.13)", top: -60, right: -50,
  },
  levelCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.cocoa,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.cocoa, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 4,
  },
  levelNum: { fontFamily: F.serifBd, fontSize: 22, color: "#FFF" },
  heroLabel: {
    fontFamily: F.sansSemi, fontSize: 11, color: "rgba(245,230,200,0.65)",
    letterSpacing: 1.2, marginBottom: 8,
  },
  xpBarTrack: {
    height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: "#C9A465" },
  heroXp: {
    fontFamily: F.sans, fontSize: 12, color: "rgba(245,225,190,0.55)", marginTop: 6,
  },

  statsRow: {
    flexDirection: "row", gap: 10, marginHorizontal: 20, marginTop: 16,
  },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14,
    alignItems: "center", gap: 4,
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
  },
  statVal: { fontFamily: F.sansBold, fontSize: 20, color: C.ink, letterSpacing: -0.3 },
  statLabel: { fontFamily: F.sans, fontSize: 11, color: C.muted },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginTop: 28, marginBottom: 12,
  },
  sectionEye: {
    fontFamily: F.sansSemi, fontSize: 11, color: C.muted,
    letterSpacing: 1.2,
  },
  sectionSub: { fontFamily: F.sans, fontSize: 12, color: C.cocoa },

  unlockRow: {
    flexDirection: "row", paddingRight: 20,
  },
  timelineCol: {
    width: 50, alignItems: "center",
  },
  timelineLine: {
    flex: 1, width: 2, backgroundColor: "rgba(26,22,20,0.10)",
  },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  unlockCard: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 16, padding: 14,
    borderWidth: 0.5, borderColor: C.border, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  unlockIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  unlockTitle: { fontFamily: F.sansSemi, fontSize: 14, color: C.ink },
  unlockLevel: { fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 1 },
  unlockedBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(34,197,94,0.10)",
    alignItems: "center", justifyContent: "center",
  },

  // Recent activity
  emptyActivity: {
    alignItems: "center" as const, paddingVertical: 30, paddingHorizontal: 20,
    marginHorizontal: 20, backgroundColor: C.card, borderRadius: 16,
    borderWidth: 0.5, borderColor: C.border, gap: 8,
  },
  emptyActivityText: {
    fontFamily: F.sans, fontSize: 13, color: C.muted, textAlign: "center" as const, lineHeight: 18,
  },
  actRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
    paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 20,
    backgroundColor: C.card, borderRadius: 14, marginBottom: 6,
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  actIcon: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  actLabel: { fontFamily: F.sansSemi, fontSize: 13, color: C.ink },
  actDetail: { fontFamily: F.sans, fontSize: 11, color: C.muted, marginTop: 1 },
  actTime: { fontFamily: F.sans, fontSize: 10, color: C.muted },
  actXp: { fontFamily: F.sansBold, fontSize: 11, color: C.green, marginTop: 1 },
});
