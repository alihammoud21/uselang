import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "@/lib/constants";
import {
  getProgressSummary,
  getRecentAttempts,
  type ProgressSummary,
  type AttemptRecord,
} from "@/lib/progress-store";
import {
  getUsageSummary,
  formatMinutes,
  formatMinutesLong,
  type UsageSummary,
} from "@/lib/usage-store";
import { redeemPromo, listRedeemedPromos, type PromoRedemption } from "@/lib/promo-store";

// ── Progress screen ─────────────────────────────────────────────────────────
// Three pillars:
//   1. Today's usage (ring + remaining minutes + plan badge)
//   2. Learning momentum (streak, confidence, recent attempts, weak sounds)
//   3. Promo codes (enter, redeem, see applied grants)
// Pull-to-refresh re-pulls everything.

export default function ProgressScreen() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [recent, setRecent] = useState<AttemptRecord[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [promos, setPromos] = useState<PromoRedemption[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoPending, setPromoPending] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const load = useCallback(async () => {
    const [s, r, u, pr] = await Promise.all([
      getProgressSummary(),
      getRecentAttempts(8),
      getUsageSummary(),
      listRedeemedPromos(),
    ]);
    setSummary(s);
    setRecent(r);
    setUsage(u);
    setPromos(pr);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleRedeem = useCallback(async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoPending(true);
    setPromoMessage(null);
    try {
      const grant = await redeemPromo(code);
      setPromoInput("");
      setPromoMessage({ text: grant.label, kind: "ok" });
      await load();
    } catch (err: any) {
      setPromoMessage({ text: err?.message || "Couldn't redeem that code.", kind: "err" });
    } finally {
      setPromoPending(false);
    }
  }, [promoInput, load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.text, letterSpacing: -0.5 }}>
          Progress
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 2 }}>
          Today's practice, your momentum, and how much tutor time you've got left.
        </Text>

        {/* ── Today's usage ───────────────────────────────────────── */}
        {usage ? <UsageCard usage={usage} /> : null}

        {/* Hero row */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
          <Hero
            label="Streak"
            value={String(summary?.streak ?? 0)}
            unit="days"
            icon="flame-outline"
            accent={COLORS.gold}
          />
          <Hero
            label="Confidence"
            value={String(summary?.confidence ?? 0)}
            unit="/100"
            icon="trending-up-outline"
            accent={COLORS.accent}
          />
        </View>

        {/* Recent trend */}
        <Section title="Recent 10 attempts">
          <Row label="Trend score" value={`${summary?.trendScore ?? 0}/100`} />
          <Row label="All-time average" value={`${summary?.avgScore ?? 0}/100`} />
          <Row label="Total attempts" value={String(summary?.totalAttempts ?? 0)} />
          <Row label="Active days (7d)" value={`${summary?.last7DaysActive ?? 0}/7`} />
        </Section>

        {/* Weak sounds */}
        <Section title="Focus sounds">
          {summary?.weakSounds?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {summary.weakSounds.map((s) => (
                <View
                  key={s}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12,
                    backgroundColor: COLORS.goldLight,
                    borderWidth: 1,
                    borderColor: COLORS.goldDim,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.text }}>/{s}/</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyText>No weak sounds detected yet — keep practicing.</EmptyText>
          )}
        </Section>

        {/* Recent attempts */}
        <Section title="Recent attempts">
          {recent.length === 0 ? (
            <EmptyText>Your first practice shows up here.</EmptyText>
          ) : (
            recent.map((a, i) => <AttemptRow key={`${a.ts}-${i}`} attempt={a} />)
          )}
        </Section>

        {/* Scenarios */}
        <Section title="Scenarios completed">
          {summary?.scenariosCompleted?.length ? (
            <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 20 }}>
              {summary.scenariosCompleted.join(" · ")}
            </Text>
          ) : (
            <EmptyText>Finish a scenario in Tutor to see it here.</EmptyText>
          )}
        </Section>

        {/* Promo codes */}
        <PromoSection
          value={promoInput}
          onChange={setPromoInput}
          onRedeem={handleRedeem}
          pending={promoPending}
          message={promoMessage}
          redeemed={promos}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Usage card ───────────────────────────────────────────────────────────────
// Shows a circular ring (used/limit) plus remaining time + plan chip. The
// ring animates on mount so the number feels alive rather than printed.

function UsageCard({ usage }: { usage: UsageSummary }) {
  const unlimited = !Number.isFinite(usage.todayLimitSeconds);
  const pct = unlimited
    ? 1
    : Math.min(1, usage.todaySeconds / Math.max(1, usage.todayLimitSeconds));
  const ringProgress = useSharedValue(0);
  useEffect(() => {
    ringProgress.value = withTiming(pct, { duration: 700 });
  }, [pct]);

  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const dashStyle = useAnimatedStyle(() => ({
    // We use strokeDashoffset via animated prop on a wrapping View trick.
    // Simpler: interpolate opacity/scale for a subtle feel and use a
    // secondary Circle whose length reflects the target pct directly.
    opacity: 1,
  }));
  // react-native-svg exposes strokeDashoffset; we pass a computed value and
  // re-render on pct change. No animated prop needed for a clean fill.
  const offset = circumference - circumference * pct;
  const planLabel =
    usage.plan === "pro" ? "Pro" : usage.plan === "trial" ? "Trial" : "Free";
  const planAccent =
    usage.plan === "pro" ? COLORS.success : usage.plan === "trial" ? COLORS.gold : COLORS.textMuted;

  return (
    <View
      style={{
        marginTop: 22,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <Animated.View style={[{ width: size, height: size }, dashStyle]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={COLORS.borderLight}
            strokeWidth={stroke}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={usage.todayRemainingSeconds === 0 ? COLORS.danger : COLORS.gold}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}, ${circumference}`}
            strokeDashoffset={unlimited ? 0 : offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View
          style={{
            position: "absolute",
            inset: 0 as any,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: COLORS.text,
              letterSpacing: -0.5,
            }}
          >
            {unlimited ? "∞" : formatMinutes(usage.todayRemainingSeconds)}
          </Text>
          <Text style={{ fontSize: 9, color: COLORS.textMuted, fontWeight: "700", letterSpacing: 0.6 }}>
            LEFT TODAY
          </Text>
        </View>
      </Animated.View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.8 }}>
            TUTOR TIME
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: planAccent + "22",
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "800", color: planAccent, letterSpacing: 0.4 }}>
              {planLabel.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 }}>
          {formatMinutes(usage.todaySeconds)} used
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 2 }}>
          {unlimited
            ? "Unlimited tutor time on Pro."
            : `${formatMinutesLong(usage.todayLimitSeconds)} daily limit${
                usage.bonusSecondsToday > 0
                  ? ` (incl. +${Math.round(usage.bonusSecondsToday / 60)} bonus)`
                  : ""
              }`}
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
          {formatMinutesLong(usage.weekSeconds)} this week · {usage.last7DaysActive}/7 active days
        </Text>
      </View>
    </View>
  );
}

// ── Promo section ───────────────────────────────────────────────────────────

function PromoSection({
  value,
  onChange,
  onRedeem,
  pending,
  message,
  redeemed,
}: {
  value: string;
  onChange: (v: string) => void;
  onRedeem: () => void;
  pending: boolean;
  message: { text: string; kind: "ok" | "err" } | null;
  redeemed: PromoRedemption[];
}) {
  const messageFade = useSharedValue(0);
  useEffect(() => {
    messageFade.value = withSpring(message ? 1 : 0, { damping: 20, stiffness: 220 });
  }, [message]);
  const messageStyle = useAnimatedStyle(() => ({
    opacity: messageFade.value,
    transform: [{ translateY: (1 - messageFade.value) * 4 }],
  }));

  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: COLORS.textMuted,
          letterSpacing: 0.8,
          marginBottom: 10,
        }}
      >
        PROMO CODE
      </Text>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 1,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="Enter code (e.g. LANGWELCOME)"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onRedeem}
            editable={!pending}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingHorizontal: 14,
              fontSize: 15,
              color: COLORS.text,
              backgroundColor: COLORS.bg,
              letterSpacing: 0.4,
            }}
          />
          <Pressable
            onPress={onRedeem}
            disabled={pending || !value.trim()}
            style={({ pressed }) => ({
              height: 44,
              paddingHorizontal: 20,
              borderRadius: 12,
              backgroundColor: pending || !value.trim() ? COLORS.surface2 : COLORS.text,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                color: pending || !value.trim() ? COLORS.textSub : "#FFF",
                fontWeight: "700",
                fontSize: 14,
              }}
            >
              {pending ? "…" : "Redeem"}
            </Text>
          </Pressable>
        </View>

        {message ? (
          <Animated.View
            style={[
              {
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor:
                  message.kind === "ok"
                    ? "rgba(34,197,94,0.10)"
                    : "rgba(239,68,68,0.10)",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              },
              messageStyle,
            ]}
          >
            <Ionicons
              name={message.kind === "ok" ? "checkmark-circle" : "alert-circle"}
              size={15}
              color={message.kind === "ok" ? COLORS.success : COLORS.danger}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: message.kind === "ok" ? COLORS.success : COLORS.danger,
                fontWeight: "600",
              }}
            >
              {message.text}
            </Text>
          </Animated.View>
        ) : null}

        {redeemed.length > 0 ? (
          <View style={{ marginTop: 14 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: COLORS.textMuted,
                letterSpacing: 0.7,
                marginBottom: 6,
              }}
            >
              YOU'VE REDEEMED
            </Text>
            {redeemed.slice(0, 6).map((r) => (
              <View
                key={r.code + r.redeemedAt}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 6,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                    backgroundColor: COLORS.goldLight,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.gold }}>
                    {r.code}
                  </Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: COLORS.textSub }} numberOfLines={1}>
                  {r.grant.label}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 10, lineHeight: 16 }}>
            Tip: try <Text style={{ fontWeight: "700", color: COLORS.text }}>LANGWELCOME</Text> for
            +15 minutes, or <Text style={{ fontWeight: "700", color: COLORS.text }}>TRIAL7</Text> to
            unlock the 7-day trial.
          </Text>
        )}
      </View>
    </View>
  );
}

// ── UI pieces ───────────────────────────────────────────────────────────────

function Hero({
  label,
  value,
  unit,
  icon,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  accent: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={14} color={accent} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: COLORS.textMuted,
            letterSpacing: 0.8,
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 10, gap: 4 }}>
        <Text style={{ fontSize: 30, fontWeight: "700", color: COLORS.text, letterSpacing: -1 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textMuted, fontWeight: "600" }}>{unit}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: COLORS.textMuted,
          letterSpacing: 0.8,
          marginBottom: 10,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 1,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 13, color: COLORS.textSub }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>{value}</Text>
    </View>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptRecord }) {
  const date = new Date(attempt.ts);
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: scoreBg(attempt.score),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: scoreFg(attempt.score) }}>
          {attempt.score}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}>
          {attempt.phrase || "—"}
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
          {label} · {attempt.languageCode.toUpperCase()} · {attempt.mode}
        </Text>
      </View>
    </View>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 19 }}>{children}</Text>
  );
}

function scoreBg(score: number): string {
  if (score >= 85) return "rgba(34,197,94,0.12)";
  if (score >= 65) return COLORS.goldLight;
  return "rgba(239,68,68,0.10)";
}

function scoreFg(score: number): string {
  if (score >= 85) return COLORS.success;
  if (score >= 65) return COLORS.gold;
  return COLORS.danger;
}
