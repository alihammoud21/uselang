// ── Spin the Wheel ──────────────────────────────────────────────────────────
// Weekly reward spinner. Animated wheel with Reanimated rotation.
// 8 slices. Tap to spin → deceleration → result overlay.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  ZoomIn,
  runOnJS,
} from "react-native-reanimated";
import {
  canSpinThisWeek,
  spinWheel,
  claimReward,
  REWARD_SLICES,
  type RewardSlice,
} from "@/lib/weekly-rewards";

const { width: SW } = Dimensions.get("window");
const BG = "#0C0A09";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";

const WHEEL_SIZE = Math.min(SW - 60, 310);
const SLICES = REWARD_SLICES.length;
const SLICE_ANGLE = 360 / SLICES;

export default function SpinWheelScreen() {
  const router = useRouter();
  const [canSpin, setCanSpin] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<RewardSlice | null>(null);
  const [loading, setLoading] = useState(true);

  const rotation = useSharedValue(0);

  useEffect(() => {
    canSpinThisWeek().then((ok) => {
      setCanSpin(ok);
      setLoading(false);
    });
  }, []);

  const handleSpin = useCallback(async () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    // Determine result
    const reward = spinWheel();
    const targetIdx = REWARD_SLICES.findIndex((s) => s.id === reward.id);

    // Calculate rotation: 5 full spins + offset to land on the target slice
    // Pointer is at top (0°), so we need to rotate so the target slice is at top
    const sliceCenter = targetIdx * SLICE_ANGLE + SLICE_ANGLE / 2;
    const targetRotation = 360 * 5 + (360 - sliceCenter);

    rotation.value = 0;
    rotation.value = withTiming(targetRotation, {
      duration: 4000,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
    }, (finished) => {
      if (finished) {
        runOnJS(onSpinComplete)(reward);
      }
    });
  }, [canSpin, spinning, rotation]);

  const onSpinComplete = useCallback(async (reward: RewardSlice) => {
    await claimReward(reward);
    setResult(reward);
    setSpinning(false);
    setCanSpin(false);
  }, []);

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </Pressable>
        <Text style={S.title}>Weekly Reward</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={S.centered}>
        {/* Pointer */}
        <View style={S.pointer}>
          <Ionicons name="caret-down" size={28} color={AMBER} />
        </View>

        {/* Wheel */}
        <Animated.View style={[S.wheel, wheelStyle]}>
          {REWARD_SLICES.map((slice, i) => {
            const angle = i * SLICE_ANGLE;
            const rad = (angle + SLICE_ANGLE / 2) * Math.PI / 180;
            const r = WHEEL_SIZE / 2 - 30;
            const x = WHEEL_SIZE / 2 + Math.sin(rad) * r - 20;
            const y = WHEEL_SIZE / 2 - Math.cos(rad) * r - 20;
            return (
              <View key={slice.id}>
                {/* Slice line */}
                <View
                  style={{
                    position: "absolute",
                    left: WHEEL_SIZE / 2 - 0.5,
                    top: 0,
                    width: 1,
                    height: WHEEL_SIZE / 2,
                    backgroundColor: "rgba(255,255,255,0.10)",
                    transformOrigin: `0.5px ${WHEEL_SIZE / 2}px`,
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
                {/* Icon */}
                <View
                  style={{
                    position: "absolute", left: x, top: y,
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: slice.color + "20",
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name={slice.icon as any} size={18} color={slice.color} />
                </View>
              </View>
            );
          })}
        </Animated.View>

        {/* Labels below wheel */}
        <View style={S.legendGrid}>
          {REWARD_SLICES.map((s) => (
            <View key={s.id} style={S.legendItem}>
              <View style={[S.legendDot, { backgroundColor: s.color }]} />
              <Text style={S.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Spin button / status */}
        {loading ? (
          <Text style={S.statusText}>Loading...</Text>
        ) : canSpin && !spinning ? (
          <Pressable onPress={handleSpin} style={S.spinBtn}>
            <Ionicons name="sparkles" size={18} color="#FFF" />
            <Text style={S.spinBtnText}>Spin!</Text>
          </Pressable>
        ) : spinning ? (
          <Text style={S.statusText}>Spinning...</Text>
        ) : !result ? (
          <View style={S.usedCard}>
            <Ionicons name="time-outline" size={20} color={MUTED} />
            <Text style={S.usedText}>You already spun this week.{"\n"}Come back next Monday!</Text>
          </View>
        ) : null}

        {/* Result */}
        {result && (
          <Animated.View entering={ZoomIn.duration(400)} style={S.resultCard}>
            <View style={[S.resultIcon, { backgroundColor: result.color + "20" }]}>
              <Ionicons name={result.icon as any} size={28} color={result.color} />
            </View>
            <Text style={S.resultLabel}>
              {result.action === "nothing" ? "No luck this time!" : "You won!"}
            </Text>
            <Text style={S.resultName}>{result.label}</Text>
            {result.action === "nothing" && (
              <Text style={S.resultSub}>Better luck next week!</Text>
            )}
            {result.action === "coins" && (
              <Text style={S.resultSub}>+{result.value} spheres added to your balance</Text>
            )}
            {result.action === "badge" && (
              <Text style={S.resultSub}>Dev Badge now shows on your profile!</Text>
            )}
            {result.action === "orb" && (
              <Text style={S.resultSub}>New orb skin applied!</Text>
            )}
            {result.action === "hat" && (
              <Text style={S.resultSub}>Sphere hat accessory unlocked!</Text>
            )}
            {result.action === "voice" && (
              <Text style={S.resultSub}>Dev Mode unlocked — change AI voice in settings!</Text>
            )}
            {result.action === "pack" && (
              <Text style={S.resultSub}>A free postcard pack is waiting in the shop!</Text>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 18,
    paddingTop: 8, paddingBottom: 10, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: INK, textAlign: "center", letterSpacing: -0.3 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },

  pointer: { zIndex: 10, marginBottom: -10 },

  wheel: {
    width: WHEEL_SIZE, height: WHEEL_SIZE, borderRadius: WHEEL_SIZE / 2,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 3, borderColor: AMBER,
    position: "relative",
  },

  legendGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "center",
    gap: 8, marginTop: 20, paddingHorizontal: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4, width: "45%" },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: MUTED },

  spinBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: AMBER, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 36,
    marginTop: 20,
  },
  spinBtnText: { fontSize: 18, fontWeight: "800", color: "#FFF" },

  statusText: { fontSize: 14, color: MUTED, marginTop: 20 },

  usedCard: {
    alignItems: "center", gap: 8, marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16,
  },
  usedText: { fontSize: 13, color: MUTED, textAlign: "center", lineHeight: 18 },

  resultCard: {
    alignItems: "center", marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", width: "90%",
  },
  resultIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  resultLabel: { fontSize: 13, color: MUTED },
  resultName: { fontSize: 20, fontWeight: "900", color: INK, marginTop: 4 },
  resultSub: { fontSize: 13, color: MUTED, textAlign: "center", marginTop: 6, lineHeight: 18 },
});
