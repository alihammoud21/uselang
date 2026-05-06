// ── Battle Pass Screen ────────────────────────────────────────────────────────
// Shows level progression, XP milestones, and rewards for each level.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getProgressSummary, getLevel, addXP } from "@/lib/progress-store";

const C = {
  bg: "#FAF8F5",
  card: "#FFFFFF",
  ink: "#1C1714",
  muted: "#9A948D",
  cocoa: "#A85D2E",
  amber: "#D4A017",
  border: "rgba(0,0,0,0.06)",
  success: "#22C55E",
};

const F = {
  sans: "Geist-Regular",
  sansSemi: "Geist-SemiBold",
  sansBold: "Geist-Bold",
  serif: "Fraunces-Regular",
  serifBold: "Fraunces-Bold",
  mono: "JetBrainsMono-Regular",
};

interface TierReward {
  level: number;
  xpRequired: number;
  reward: string;
  icon: string;
  coins: number;
}

const TIERS: TierReward[] = [
  { level: 2, xpRequired: 100, reward: "50 Spheres", icon: "ellipse", coins: 50 },
  { level: 3, xpRequired: 250, reward: "Hint Token", icon: "bulb-outline", coins: 0 },
  { level: 5, xpRequired: 500, reward: "100 Spheres", icon: "ellipse", coins: 100 },
  { level: 7, xpRequired: 800, reward: "Streak Freeze", icon: "snow-outline", coins: 0 },
  { level: 10, xpRequired: 1500, reward: "250 Spheres", icon: "ellipse", coins: 250 },
  { level: 15, xpRequired: 3000, reward: "XP Boost", icon: "flash-outline", coins: 0 },
  { level: 20, xpRequired: 5000, reward: "500 Spheres", icon: "ellipse", coins: 500 },
  { level: 30, xpRequired: 10000, reward: "Mythic Card", icon: "sparkles-outline", coins: 0 },
  { level: 50, xpRequired: 25000, reward: "Legend Badge", icon: "shield-outline", coins: 0 },
  { level: 100, xpRequired: 100000, reward: "God Mode", icon: "infinite-outline", coins: 0 },
];

export default function BattlePassScreen() {
  const router = useRouter();
  const [xp, setXp] = useState(0);
  const [currentLevel, setCurrentLevel] = useState({ level: 1, progress: 0, nextLevelXP: 100 });

  const load = useCallback(async () => {
    const summary = await getProgressSummary();
    const lvl = getLevel(summary.xp);
    setXp(summary.xp);
    setCurrentLevel(lvl);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={S.headerTitle}>Battle Pass</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Current level hero */}
      <View style={S.hero}>
        <View style={S.heroLevelCircle}>
          <Text style={S.heroLevelNum}>{currentLevel.level}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.heroLevelLabel}>Level {currentLevel.level}</Text>
          <Text style={S.heroXP}>{xp.toLocaleString()} XP</Text>
          <View style={S.heroBarBg}>
            <View style={[S.heroBarFill, { width: `${Math.round(currentLevel.progress * 100)}%` as any }]} />
          </View>
          <Text style={S.heroBarHint}>{Math.round(currentLevel.progress * 100)}% to Level {currentLevel.level + 1}</Text>
        </View>
      </View>

      {/* Tier rewards */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={S.tiers}>
        <Text style={S.tiersEyebrow}>MILESTONE REWARDS</Text>
        {TIERS.map((tier) => {
          const reached = currentLevel.level >= tier.level;
          return (
            <View key={tier.level} style={[S.tierRow, reached && S.tierRowActive]}>
              <View style={[S.tierLevel, reached && { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                <Text style={[S.tierLevelText, reached && { color: C.success }]}>{tier.level}</Text>
              </View>
              <Ionicons name={tier.icon as any} size={20} color={reached ? C.success : C.muted} />
              <View style={{ flex: 1 }}>
                <Text style={[S.tierReward, reached && { color: C.ink }]}>{tier.reward}</Text>
                <Text style={S.tierXP}>{tier.xpRequired.toLocaleString()} XP</Text>
              </View>
              {reached ? (
                <Ionicons name="checkmark-circle" size={20} color={C.success} />
              ) : (
                <View style={S.tierLock}>
                  <Ionicons name="lock-closed" size={12} color={C.muted} />
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginRight: 10, borderWidth: 0.5, borderColor: C.border },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },

  hero: {
    flexDirection: "row", alignItems: "center", gap: 16,
    marginHorizontal: 18, marginBottom: 18, padding: 18,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  heroLevelCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(168,93,46,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  heroLevelNum: { fontFamily: F.sansBold, fontSize: 22, color: C.cocoa },
  heroLevelLabel: { fontFamily: F.sansBold, fontSize: 16, color: C.ink, letterSpacing: -0.2 },
  heroXP: { fontFamily: F.mono, fontSize: 11, color: C.muted, marginTop: 2 },
  heroBarBg: { height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.06)", marginTop: 8 },
  heroBarFill: { height: 6, borderRadius: 3, backgroundColor: C.cocoa },
  heroBarHint: { fontFamily: F.mono, fontSize: 9, color: C.muted, marginTop: 4 },

  tiers: { paddingHorizontal: 18, gap: 8 },
  tiersEyebrow: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 1.4, color: C.muted, textTransform: "uppercase", marginBottom: 6 },
  tierRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: C.border, opacity: 0.55,
  },
  tierRowActive: { opacity: 1, borderColor: "rgba(34,197,94,0.20)" },
  tierLevel: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center", justifyContent: "center",
  },
  tierLevelText: { fontFamily: F.sansBold, fontSize: 14, color: C.muted },
  tierReward: { fontFamily: F.sansSemi, fontSize: 14, color: C.muted, letterSpacing: -0.1 },
  tierXP: { fontFamily: F.mono, fontSize: 10, color: C.muted, marginTop: 2 },
  tierLock: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center", justifyContent: "center",
  },
});
