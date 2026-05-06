import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, withTiming, Easing, useAnimatedStyle, runOnJS } from "react-native-reanimated";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useAppTheme } from "@/lib/theme-context";
import { getCurriculum } from "@/data/lessons";
import { getTodayTwister, type TongueTwister } from "@/lib/daily-challenge";
import { getLanguageProgress, isLessonUnlocked } from "@/lib/lesson-store";
import type { Lesson } from "@/lib/lesson-types";
import { getProgressSummary, type ProgressSummary, getLevel } from "@/lib/progress-store";
import { getUserProfile, type UserProfile } from "@/lib/user-store";
import { getChallenges, claimChallenge, type ChallengeWithDef } from "@/lib/challenge-store";
import { canSpinToday, spinWheel, claimReward, REWARD_SLICES, type RewardSlice } from "@/lib/weekly-rewards";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

// ─────────────────────────────────────────────────────────────────────────────
// TODAY — Warm paper aesthetic
// ─────────────────────────────────────────────────────────────────────────────

// ── Design tokens ─────────────────────────────────────────────────────────
const C = {
  paper:      "#F5EFE2",
  card:       "#FBF6EA",
  ink:        "#1C1714",
  muted:      "#7A6E5F",
  cocoa:      "#7A4A22",
  cocoaLight: "#9A6042",
  cocoaSoft:  "rgba(122,74,34,0.09)",
  beigeChip:  "#E8DEC8",
  hair:       "rgba(60,40,20,0.08)",
  hairMid:    "rgba(60,40,20,0.14)",
  dark:       "#1C1714",
  green:      "#5C8A4F",
  flame:      "#D4602A",
  shadow:     "rgba(60,30,10,0.14)",
  success:    "#22C55E",
} as const;

const F = {
  serif:       "Fraunces-Regular",
  serifBold:   "Fraunces-Bold",
  serifItalic: "Fraunces-Italic",
  sans:        "Geist-Regular",
  sansMed:     "Geist-Medium",
  sansSemi:    "Geist-SemiBold",
  sansBold:    "Geist-Bold",
  mono:        "GeistMono-Regular",
} as const;

type IonName = React.ComponentProps<typeof Ionicons>["name"];

function MiniSphere({ size = 26 }: { size?: number }) {
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="msp_body" cx={c * 0.68} cy={c * 0.58} r={c * 1.10} gradientUnits="userSpaceOnUse">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
          <Stop offset="18%"  stopColor="#EBEBEB" stopOpacity="1" />
          <Stop offset="50%"  stopColor="#C2BAB0" stopOpacity="1" />
          <Stop offset="82%"  stopColor="#9A9090" stopOpacity="1" />
          <Stop offset="100%" stopColor="#858080" stopOpacity="0.9" />
        </RadialGradient>
        <RadialGradient id="msp_spec" cx={c * 0.42} cy={c * 0.35} r={c * 0.14} gradientUnits="userSpaceOnUse">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.90" />
          <Stop offset="60%"  stopColor="#FFFFFF" stopOpacity="0.25" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#msp_body)" />
      <Circle cx={c} cy={c} r={c} fill="url(#msp_spec)" />
    </Svg>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night";
}

const REACH: Record<string, { countries: number; speakers: string; codes: string[]; extra: string }> = {
  es: { countries: 21, speakers: "560M", codes: ["ES","MX","AR","CO","PE","CL","VE","+13"], extra: "5 accents · 17 dialects · 2nd most spoken" },
  fr: { countries: 29, speakers: "320M", codes: ["FR","CA","BE","CH","MA","DZ","+23"],     extra: "6 accents · 8 dialects · 5th most spoken" },
  zh: { countries: 5,  speakers: "1.1B", codes: ["CN","TW","SG","HK","MO"],               extra: "Mandarin · Simplified · Most spoken language" },
};

// ── Main screen ───────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: _SW } = useWindowDimensions();
  const { theme } = useAppTheme();
  // Override key design tokens with the active theme
  const TC = { ...C, paper: theme.bg, card: theme.card, ink: theme.ink, muted: theme.muted } as typeof C;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [twister, setTwister] = useState<TongueTwister | null>(null);
  const [challenges, setChallenges] = useState<ChallengeWithDef[]>([]);
  const [nextLesson, setNextLesson] = useState<{
    lesson: Lesson;
    unitTitle: string;
    lessonIdx: number;
    totalLessons: number;
    partsDone: number;
    totalParts: number;
  } | null>(null);
  const [weeklySpinAvailable, setWeeklySpinAvailable] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const [spinResult, setSpinResult] = useState<RewardSlice | null>(null);
  const [spinning, setSpinning] = useState(false);
  const spinRotation = useSharedValue(0);
  const spinCheckedRef = useRef(false);

  const spinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinRotation.value}deg` }],
  }));

  const doSpin = useCallback(() => {
    if (spinning) return;
    setSpinning(true);
    const result = spinWheel();
    const sliceIdx = REWARD_SLICES.findIndex((s) => s.id === result.id);
    const sliceAngle = 360 / REWARD_SLICES.length;
    const targetAngle = 360 * 5 + (360 - sliceIdx * sliceAngle - sliceAngle / 2);
    spinRotation.value = withTiming(targetAngle, { duration: 4000, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        runOnJS(setSpinResult)(result);
        runOnJS(setSpinning)(false);
      }
    });
  }, [spinning, spinRotation]);

  const claimAndClose = useCallback(async () => {
    if (spinResult) {
      await claimReward(spinResult);
    }
    setShowSpinModal(false);
    setSpinResult(null);
    setWeeklySpinAvailable(false);
    spinRotation.value = 0;
  }, [spinResult, spinRotation]);

  const refresh = useCallback(async () => {
    const [p, s, ch, spinOk] = await Promise.all([getUserProfile(), getProgressSummary(), getChallenges(), canSpinToday()]);
    setWeeklySpinAvailable(spinOk);
    // Auto-show spin popup once per app session when available
    if (spinOk && !spinCheckedRef.current) {
      spinCheckedRef.current = true;
      setTimeout(() => setShowSpinModal(true), 600);
    }
    setChallenges(ch);
    setProfile(p);
    setSummary(s);

    const lang = p.learningLanguage || "es";
    setTwister(getTodayTwister(lang));

    const curriculum = getCurriculum(lang);
    if (!curriculum) { setNextLesson(null); return; }

    const progress = await getLanguageProgress(lang);
    let idx = 0;
    let total = 0;
    let found = false;
    for (const u of curriculum.units) total += u.lessons.length;
    outer: for (const unit of curriculum.units) {
      for (const lesson of unit.lessons) {
        idx += 1;
        const lp = progress.lessons[lesson.id];
        if (!lp?.completed && isLessonUnlocked(curriculum, progress, lesson.id)) {
          setNextLesson({
            lesson,
            unitTitle: unit.title,
            lessonIdx: idx,
            totalLessons: total,
            partsDone: lp?.completedParts?.length ?? 0,
            totalParts: lesson.parts.length,
          });
          found = true;
          break outer;
        }
      }
    }
    if (!found) setNextLesson(null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const lang = profile?.learningLanguage || "es";
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  const targetLabel = language?.label || "Spanish";
  const firstName = profile?.userName?.split(" ")[0] || "";
  const streak = summary?.streak ?? 0;
  const confidence = summary?.confidence ?? 0;
  const xp = Math.max(0, summary?.xp ?? 0);
  const coins = summary?.coins ?? 0;
  const level = useMemo(() => getLevel(xp), [xp]);
  const nativeLang = profile?.knownLanguages?.[0] || "en";

  const reach = REACH[lang] ?? REACH.es;

  const tiles: { label: string; icon: IonName; color: string; iconBg: string; route: any }[] = [
    { label: "Saved",  icon: "bookmark-outline", color: "#7A6340", iconBg: "rgba(122,99,64,0.11)",  route: "/library" },
    { label: "Live",   icon: "radio-outline",    color: "#3B6B8A", iconBg: "rgba(59,107,138,0.11)", route: "/live" },
    { label: "Phrase", icon: "text-outline",     color: "#4A7A5C", iconBg: "rgba(74,122,92,0.11)", route: { pathname: "/(tabs)/train", params: { mode: "phrase" } } },
    { label: "Map",    icon: "earth-outline",    color: "#3B6B8A", iconBg: "rgba(59,107,138,0.11)", route: "/(tabs)/globe" },
    { label: "Quick",  icon: "mic-outline",      color: C.cocoa,   iconBg: "rgba(122,74,34,0.11)", route: { pathname: "/(tabs)/train", params: { mode: "quick" } } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TC.paper }} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>

        {/* ══ MASTHEAD ══ */}
        <View style={[S.px, { paddingTop: 34, paddingBottom: 4 }]}>
          <View style={S.mastheadBar}>
            <Text style={S.greetText}>{greeting()}{firstName ? `, ${firstName}` : ""}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable onPress={() => router.push("/shop" as any)} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, alignItems: "center" })}>
                <View style={S.coinPill}>
                  <Text style={S.coinEmoji}>⚪</Text>
                  <Text style={S.coinVal}>{coins}</Text>
                </View>
                <Text style={S.shopArrow}>· Shop →</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/settings" as any)} style={({ pressed }) => [S.gearBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="settings-outline" size={18} color={C.muted} />
              </Pressable>
            </View>
          </View>
          <Text style={S.headline}>
            {"Start learning "}
            <Text style={S.headlineItalic}>{targetLabel}</Text>
            {"\nby speaking naturally."}
          </Text>
        </View>

        {/* ══ STAT CHIP ROW ══ */}
        <View style={[S.px, S.chipRow]}>
          <View style={[S.chip, S.chipOuter]}>
            <Text style={S.chipEyebrow}>STREAK</Text>
            <Text style={S.chipValue}>{streak > 0 ? `${streak}` : "—"}</Text>
            <Text style={S.chipSub}>{streak > 0 ? "days" : "start"}</Text>
          </View>
          <View style={[S.chip, S.chipDark]}>
            <Text style={[S.chipEyebrow, { color: "rgba(245,239,226,0.55)" }]}>TODAY</Text>
            <Text style={[S.chipValue, { color: "#F5EFE2" }]}>{Math.round(confidence)}%</Text>
            <Text style={[S.chipSub, { color: "rgba(245,239,226,0.50)" }]}>fluent</Text>
          </View>
          <View style={[S.chip, S.chipOuter]}>
            <Text style={S.chipEyebrow}>TARGET</Text>
            <Text style={S.chipValue}>{lang.toUpperCase()}</Text>
            <Text style={S.chipSub}>active</Text>
          </View>
        </View>

        {/* ══ XP LEVEL BAR ══ */}
        <View style={[S.px, { marginTop: 14 }]}>
          <Pressable onPress={() => router.push("/battle-pass" as any)} style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: C.card, borderRadius: 14, padding: 14,
            borderWidth: 0.5, borderColor: C.hair,
          }}>
            <View style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: "rgba(122,74,34,0.10)",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontFamily: F.sansBold, fontSize: 14, color: C.cocoa }}>{level.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: 12, color: C.ink }}>Level {level.level}</Text>
                <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.muted }}>{xp} / {level.nextLevelXP} XP</Text>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: C.hair }}>
                <View style={{
                  height: 6, borderRadius: 3, backgroundColor: C.cocoa,
                  width: `${Math.round(level.progress * 100)}%` as any,
                }} />
              </View>
            </View>
          </Pressable>
        </View>

        {/* ══ STREAK WEEK ══ */}
        {streak >= 0 && (() => {
          const today = new Date();
          const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
          const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            const isToday = i === 6;
            const isActive = (6 - i) < streak;
            return { label: dayNames[d.getDay()], isToday, isActive };
          });
          return (
            <View style={[S.px, { marginTop: 10 }]}>
              <View style={{
                flexDirection: "row", justifyContent: "space-between",
                backgroundColor: C.card, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16,
                borderWidth: 0.5, borderColor: C.hair,
              }}>
                {days.map((d, i) => (
                  <View key={i} style={{ alignItems: "center", gap: 4 }}>
                    <Text style={{
                      fontFamily: d.isToday ? F.sansBold : F.sans, fontSize: 10,
                      color: d.isToday ? C.cocoa : C.muted,
                    }}>{d.label}</Text>
                    <View style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: d.isActive ? C.cocoa : d.isToday ? "rgba(122,74,34,0.12)" : C.hair,
                      alignItems: "center", justifyContent: "center",
                      borderWidth: d.isToday && !d.isActive ? 1.5 : 0,
                      borderColor: d.isToday && !d.isActive ? C.cocoa : "transparent",
                    }}>
                      {d.isActive && <Ionicons name="flame" size={14} color="#FFF" />}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* ══ HERO CONTINUE CARD ══ */}
        <View style={[S.px, { marginTop: 14 }]}>
          <Pressable
            onPress={() => nextLesson
              ? router.push({ pathname: "/lesson", params: { lessonId: nextLesson.lesson.id, lang } } as any)
              : router.push("/(tabs)/lessons" as any)}
            style={({ pressed }) => [S.heroCardShell, pressed && { opacity: 0.93, transform: [{ scale: 0.98 }] }]}
          >
            <View style={S.heroCard}>
              <View style={S.heroBloom} pointerEvents="none" />
              <View style={S.heroPad}>
                <View style={S.eyebrowRow}>
                  <View style={S.dot} />
                  <Text style={[S.heroEyebrow, { color: "#C8915A" }]}>CONTINUE · LESSON {nextLesson?.lessonIdx ?? "—"}</Text>
                </View>
                <Text style={[S.heroSubEyebrow, { color: "rgba(245,230,200,0.55)" }]}>
                  {nextLesson ? `${nextLesson.unitTitle} · ${targetLabel}`.toUpperCase() : `ALL COMPLETE · ${targetLabel.toUpperCase()}`}
                </Text>
                <Text style={[S.heroHeading, { color: "#F5EAD5" }]}>
                  {"Keep going in "}<Text style={[S.heroItalic, { color: "#C8915A" }]}>{targetLabel}</Text>{"."}
                </Text>
                <Text style={[S.heroDesc, { color: "rgba(245,225,190,0.65)" }]} numberOfLines={2}>
                  {nextLesson?.lesson.description ?? "Browse lessons to continue."}
                </Text>
                <View style={S.heroBottom}>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.heroActionTitle, { color: "#F5EAD5" }]}>{nextLesson ? "Resume lesson" : "Browse lessons"}</Text>
                    <Text style={[S.heroActionSub, { color: "rgba(245,225,190,0.55)" }]}>Tutor speaks first</Text>
                  </View>
                  <Pressable
                    hitSlop={14}
                    onPress={() => nextLesson
                      ? router.push({ pathname: "/lesson", params: { lessonId: nextLesson.lesson.id, lang } } as any)
                      : router.push("/(tabs)/lessons" as any)}
                    style={({ pressed }) => [S.heroPlay, pressed && { transform: [{ scale: 0.88 }], opacity: 0.85 }]}
                  >
                    <Ionicons name={nextLesson ? "play" : "chevron-forward"} size={18} color="#FFF8EE" />
                  </Pressable>
                </View>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ══ QUICK TILES ══ */}
        <View style={[S.px, { marginTop: 18 }]}>
          <View style={S.quickCard}>
            {tiles.map((t) => (
              <Pressable key={t.label} onPress={() => router.push(t.route)}
                style={({ pressed }) => [S.quickTile, pressed && { opacity: 0.70 }]}>
                <View style={[S.quickIconCircle, { backgroundColor: t.iconBg }]}>
                  <Ionicons name={t.icon} size={22} color={t.color} />
                </View>
                <Text style={S.quickTileLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══ DAILY CHALLENGE ══ */}
        {twister && (
          <View style={[S.px, { marginTop: 22 }]}>
            <View style={[S.eyebrowRow, { marginBottom: 10 }]}>
              <View style={S.dot} />
              <Text style={S.sectionEye}>DAILY CHALLENGE</Text>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", gap: 4 }}>
                {[0,1,2,3,4].map((i) => (
                  <View key={i} style={[S.progDot, i < 4 ? S.progDotOn : S.progDotOff]} />
                ))}
              </View>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: "/quick-session", params: { phrase: twister.phrase, learnLang: lang, nativeLang } } as any)}
              style={({ pressed }) => [S.challengeCard, pressed && { opacity: 0.92 }]}
            >
              <View style={S.challengeTextBox}>
                <Text style={[S.challengeSubEye, { color: "rgba(200,160,100,0.80)" }]}>TRABALENGUAS · TONGUE TWISTER</Text>
                <Text style={[S.challengePhrase, { color: "#F5EAD5" }]}>{twister.phrase}</Text>
                <Text style={[S.challengeIpa, { color: "#E8A96A" }]}>{twister.phonetic}</Text>
                <View style={[S.hairline, { backgroundColor: "rgba(200,145,90,0.25)" }]} />
                <Text style={[S.challengeGloss, { color: "rgba(245,225,190,0.80)" }]}>{twister.gloss}</Text>
              </View>
              <View style={S.attemptBtn}>
                <Ionicons name="mic" size={15} color="#FFF8EE" />
                <Text style={S.attemptText}>Tap to attempt</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="arrow-forward" size={14} color="rgba(245,220,180,0.50)" />
              </View>
            </Pressable>
          </View>
        )}

        {/* ══ THIS WEEK ══ */}
        {challenges.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <View style={[S.px, S.eyebrowRow, { marginBottom: 10 }]}>
              <View style={S.dot} />
              <Text style={S.sectionEye}>THIS WEEK</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingRight: 4 }}>
              {challenges.map((ch) => {
                const pct = Math.min(1, ch.goal > 0 ? ch.progress / ch.goal : 0);
                const canClaim = ch.completed && !ch.claimed;
                return (
                  <Pressable key={ch.id}
                    onPress={async () => { if (!canClaim) return; await claimChallenge(ch.id); refresh(); }}
                    style={({ pressed }) => [S.weekCard, ch.claimed && { opacity: 0.5 }, pressed && { opacity: 0.88 }]}>
                    <View style={[S.weekIcon, { backgroundColor: ch.claimed ? C.hair : ch.bg }]}>
                      <Ionicons name={ch.icon as IonName} size={18} color={ch.claimed ? C.muted : ch.color} />
                    </View>
                    <Text style={[S.weekTitle, ch.claimed && { color: C.muted }]} numberOfLines={1}>{ch.title}</Text>
                    <Text style={S.weekDesc} numberOfLines={2}>{ch.description}</Text>
                    <View style={S.weekBarTrack}>
                      <View style={[S.weekBarFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: ch.claimed ? C.muted : ch.color }]} />
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                      <Text style={[S.weekProg, ch.claimed && { color: C.muted }]}>{ch.claimed ? "Done" : `${ch.progress} / ${ch.goal} ${ch.unit}`}</Text>
                      {!ch.claimed && <View style={[S.coinBadge, canClaim && S.coinBadgeReady]}><Text style={S.coinBadgeText}>⚪ {ch.coins}</Text></View>}
                      {ch.claimed && <Ionicons name="checkmark-circle" size={15} color={C.muted} />}
                    </View>
                    {canClaim && <View style={S.claimBtn}><Text style={S.claimText}>Claim reward</Text></View>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ══ YOUR REACH ══ */}
        <View style={[S.px, { marginTop: 22 }]}>
          <View style={[S.eyebrowRow, { marginBottom: 10 }]}>
            <View style={[S.dot, { backgroundColor: C.green }]} />
            <Text style={S.sectionEye}>YOUR REACH</Text>
          </View>
          <View style={S.reachCard}>
            <Text style={S.reachHeading}>
              <Text style={S.reachItalic}>{targetLabel}</Text>
              {` unlocks ${reach.countries} countries and ${reach.speakers} speakers.`}
            </Text>
            <View style={S.countryRow}>
              {reach.codes.map((code, i) => (
                <View key={code} style={[S.countryChip, i === 0 && S.countryChipFilled]}>
                  <Text style={[S.countryCode, i === 0 && { color: "#FBF6EA" }]}>{code}</Text>
                </View>
              ))}
            </View>
            <View style={S.hairline} />
            <Text style={S.reachFooter}>{reach.extra}</Text>
          </View>
        </View>

        {/* ══ DAILY REWARD ══ */}
        {weeklySpinAvailable && (
          <Pressable
            onPress={() => setShowSpinModal(true)}
            style={({ pressed }) => [S.weeklyCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <View style={S.weeklyIcon}>
              <Ionicons name="sparkles" size={22} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.weeklyTitle}>Daily Reward</Text>
              <Text style={S.weeklySub}>Spin the wheel for a free prize!</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.muted} />
          </Pressable>
        )}

        {/* ══ EXPLORE ══ */}
        <View style={[S.px, { marginTop: 22 }]}>
          <View style={[S.eyebrowRow, { marginBottom: 12 }]}>
            <View style={S.dot} />
            <Text style={S.sectionEye}>EXPLORE</Text>
          </View>
          <View style={S.exploreGrid}>
            {([
              { label: "World Map", icon: "earth-outline"       as IonName, color: "#3B6B8A", iconBg: "rgba(59,107,138,0.10)",  route: "/(tabs)/globe"    },
              { label: "Lessons",   icon: "book-outline"        as IonName, color: C.cocoa,   iconBg: "rgba(122,74,34,0.10)",   route: "/(tabs)/lessons"  },
              { label: "Progress",  icon: "stats-chart-outline" as IonName, color: C.green,   iconBg: "rgba(92,138,79,0.10)",  route: "/(tabs)/settings" },
              { label: "Shop",      icon: "storefront-outline"  as IonName, color: "#8A5E2E", iconBg: "rgba(138,94,46,0.10)",  route: "/shop"            },
            ] as { label: string; icon: IonName; color: string; iconBg: string; route: any }[]).map((e) => (
              <Pressable key={e.label} onPress={() => router.push(e.route as any)}
                style={({ pressed }) => [S.exploreTile, pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] }]}>
                <View style={[S.exploreIconWrap, { backgroundColor: e.iconBg }]}>
                  <Ionicons name={e.icon} size={20} color={e.color} />
                </View>
                <Text style={S.exploreTileLabel}>{e.label}</Text>
                <Ionicons name="chevron-down" size={11} color={C.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        {/* ══ FOOTER PROVERB ══ */}
        <View style={[S.px, { marginTop: 32 }]}>
          <View style={S.hairline} />
          <Text style={S.proverb}>
            {lang === "fr" ? '"Connais-toi toi-même."' : lang === "zh" ? '"学而不思则罔。"' : '"El que habla dos lenguas vale por dos."'}
          </Text>
          <Text style={S.proverbAttr}>
            {lang === "fr" ? "— PROVERBE FRANÇAIS" : lang === "zh" ? "— 孔子 · CONFUCIO" : "— PROVERBIO ESPAÑOL"}
          </Text>
        </View>

      </ScrollView>

      {/* ══ DAILY SPIN POPUP MODAL ══ */}
      <Modal visible={showSpinModal} transparent animationType="fade" statusBarTranslucent>
        <View style={S.spinOverlay}>
          <View style={S.spinSheet}>
            <Text style={S.spinTitle}>Daily Reward!</Text>
            <Text style={S.spinSub}>Spin the wheel for today's prize</Text>

            {/* Wheel */}
            <View style={S.spinWheelWrap}>
              {/* Pointer */}
              <View style={S.spinPointer}>
                <Ionicons name="caret-down" size={28} color="#F59E0B" />
              </View>
              <Animated.View style={[S.spinWheelOuter, spinAnimStyle]}>
                {REWARD_SLICES.map((slice, i) => {
                  const angle = (i * 360) / REWARD_SLICES.length;
                  return (
                    <View
                      key={slice.id}
                      style={[
                        S.spinSlice,
                        {
                          transform: [
                            { rotate: `${angle}deg` },
                            { translateY: -70 },
                          ],
                        },
                      ]}
                    >
                      <Ionicons name={slice.icon as any} size={18} color={slice.color} />
                      <Text style={[S.spinSliceLabel, { color: slice.color }]}>{slice.label}</Text>
                    </View>
                  );
                })}
              </Animated.View>
            </View>

            {/* Result or spin button */}
            {spinResult ? (
              <View style={{ alignItems: "center", gap: 8, marginTop: 16 }}>
                <Ionicons name={spinResult.icon as any} size={36} color={spinResult.color} />
                <Text style={S.spinResultLabel}>{spinResult.label}</Text>
                <Text style={S.spinResultSub}>
                  {spinResult.action === "nothing" ? "Better luck tomorrow!" : "Claimed!"}
                </Text>
                <Pressable onPress={claimAndClose} style={S.spinClaimBtn}>
                  <Text style={S.spinClaimText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={doSpin}
                disabled={spinning}
                style={[S.spinGoBtn, spinning && { opacity: 0.5 }]}
              >
                <Text style={S.spinGoText}>{spinning ? "Spinning..." : "SPIN!"}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  px: { paddingHorizontal: 20 },

  mastheadBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  greetText:   { fontFamily: F.sans, fontSize: 13, color: C.muted, letterSpacing: 0.1 },
  coinPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF8E8", borderWidth: 1, borderColor: "rgba(212,160,23,0.30)",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
  },
  coinEmoji: { fontSize: 14 },
  coinVal:   { fontFamily: F.sansBold, fontSize: 13, color: "#8A6200", letterSpacing: -0.2 },
  shopArrow: { fontFamily: F.sansSemi, fontSize: 10, color: C.cocoa, marginTop: 3, textAlign: "center" },
  gearBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.card,
    alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: C.hair,
  },
  headline: { fontFamily: F.serif, fontSize: 30, lineHeight: 36, color: C.ink, letterSpacing: -0.8, marginTop: 2 },
  headlineItalic: { fontFamily: F.serifItalic, fontSize: 30, lineHeight: 36, color: C.cocoa, letterSpacing: -0.8 },

  chipRow:   { flexDirection: "row", gap: 8, marginTop: 16 },
  chip:      { flex: 1, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  chipOuter: { backgroundColor: C.card, borderWidth: 0.5, borderColor: C.hair },
  chipDark:  { backgroundColor: "#1C1714" },
  chipEyebrow: { fontFamily: F.sansSemi, fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", color: C.muted, marginBottom: 4 },
  chipValue:   { fontFamily: F.serifBold, fontSize: 23, color: C.ink, letterSpacing: -0.5, lineHeight: 26 },
  chipSub:     { fontFamily: F.sans, fontSize: 11.5, color: C.muted, marginTop: 2 },

  heroCardShell: {
    borderRadius: 26,
    shadowColor: "#5A2E10", shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18, shadowRadius: 40, elevation: 8,
  },
  heroCard: {
    borderRadius: 26, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(200,140,80,0.30)",
    backgroundColor: "#2A1608",
  },
  heroBloom: {
    position: "absolute", top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(160,90,40,0.28)",
  },
  heroPad: { padding: 22 },
  eyebrowRow:     { flexDirection: "row", alignItems: "center", gap: 7 },
  dot:            { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.cocoa },
  heroEyebrow:    { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 1.4, color: C.cocoa, textTransform: "uppercase" },
  heroSubEyebrow: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase", marginTop: 4, marginBottom: 14 },
  heroHeading:    { fontFamily: F.serif, fontSize: 26, lineHeight: 32, color: C.ink, letterSpacing: -0.5, marginBottom: 8 },
  heroItalic:     { fontFamily: F.serifItalic, fontSize: 26, lineHeight: 32, color: C.cocoa, letterSpacing: -0.5 },
  heroDesc:       { fontFamily: F.sans, fontSize: 13.5, color: C.muted, lineHeight: 19, marginBottom: 14 },
  heroBottom: { flexDirection: "row", alignItems: "center", paddingBottom: 4 },
  heroPlay: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: "#1E0D04",
    borderWidth: 2.5, borderColor: "#C8915A",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#D4A060",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95, shadowRadius: 16, elevation: 10,
  },
  heroActionTitle: { fontFamily: F.sansBold, fontSize: 14, color: C.ink, letterSpacing: -0.1, marginBottom: 2 },
  heroActionSub:   { fontFamily: F.sans, fontSize: 12, color: C.muted },

  // Quick actions card
  quickCard: {
    backgroundColor: C.card, borderRadius: 22,
    borderWidth: 0.5, borderColor: C.hair,
    flexDirection: "row", justifyContent: "space-evenly",
    paddingVertical: 22, paddingHorizontal: 8,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 14, elevation: 3,
  },
  quickTile: { alignItems: "center", gap: 8, minWidth: 48 },
  quickIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  quickTileLabel: {
    fontFamily: F.sansSemi, fontSize: 10, color: C.ink,
    textAlign: "center", letterSpacing: 0.1, lineHeight: 13,
  },

  // Explore grid
  exploreGrid: { flexDirection: "row", justifyContent: "space-evenly" },
  exploreTile: {
    alignItems: "center", gap: 6,
    backgroundColor: C.card,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 10,
    borderWidth: 0.5, borderColor: C.hair,
    minWidth: 72,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  exploreIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  exploreTileLabel: {
    fontFamily: F.sansSemi, fontSize: 11, color: C.ink,
    textAlign: "center", letterSpacing: -0.1,
  },

  // Legacy (kept for safety)
  tileGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: {
    width: "22.5%" as any, aspectRatio: 1, backgroundColor: C.card,
    borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 0.5, borderColor: C.hair,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  tileLabel: { fontFamily: F.sansSemi, fontSize: 9, color: C.ink, textAlign: "center", letterSpacing: 0.2 },

  sectionEye: { fontFamily: F.sansSemi, fontSize: 10, letterSpacing: 1.6, color: C.muted, textTransform: "uppercase" },
  progDot:    { width: 6, height: 6, borderRadius: 3 },
  progDotOn:  { backgroundColor: C.cocoa },
  progDotOff: { backgroundColor: C.beigeChip },

  challengeTextBox: {
    backgroundColor: "#2A1608",
    borderRadius: 20, padding: 14, marginBottom: 14,
    borderWidth: 0.5, borderColor: "rgba(200,145,90,0.20)",
  },
  challengeCard: {
    backgroundColor: "#2A1608", borderRadius: 22, padding: 16,
    borderWidth: 1, borderColor: "rgba(200,140,80,0.28)",
    shadowColor: "#5A2E10", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22, shadowRadius: 24, elevation: 6,
  },
  challengeSubEye: { fontFamily: F.sansSemi, fontSize: 9.5, letterSpacing: 1.4, color: C.muted, textTransform: "uppercase", marginBottom: 12 },
  challengePhrase: { fontFamily: F.serifBold, fontSize: 20, lineHeight: 26, color: C.ink, letterSpacing: -0.3, marginBottom: 6 },
  challengeIpa:    { fontFamily: F.mono, fontSize: 11, color: C.cocoa, marginBottom: 12, lineHeight: 16 },
  challengeGloss:  { fontFamily: F.serifItalic, fontSize: 13, color: C.muted, lineHeight: 18, marginTop: 10, marginBottom: 14 },
  attemptBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#1E0D04", borderRadius: 99, paddingVertical: 14, paddingHorizontal: 20,
    borderWidth: 1.5, borderColor: "#C8915A",
    shadowColor: "#D4A060", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 12, elevation: 8,
  },
  attemptText: { fontFamily: F.sansSemi, fontSize: 14, color: "#FFF8EE", letterSpacing: 0.1 },

  hairline: { height: 0.5, backgroundColor: C.hair, marginVertical: 12 },

  weekCard: {
    width: 192, backgroundColor: C.card, borderRadius: 20, padding: 16,
    borderWidth: 0.5, borderColor: C.hair,
    shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  weekIcon:     { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  weekTitle:    { fontFamily: F.sansBold, fontSize: 14, color: C.ink, letterSpacing: -0.2, marginBottom: 3 },
  weekDesc:     { fontFamily: F.sans, fontSize: 12, color: C.muted, lineHeight: 16, marginBottom: 10 },
  weekBarTrack: { height: 3, borderRadius: 2, backgroundColor: C.hair, overflow: "hidden" },
  weekBarFill:  { height: 3, borderRadius: 2 },
  weekProg:     { fontFamily: F.sans, fontSize: 11, color: C.muted },
  coinBadge:      { backgroundColor: "rgba(212,160,23,0.10)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  coinBadgeReady: { backgroundColor: "rgba(212,160,23,0.22)" },
  coinBadgeText:  { fontFamily: F.sansSemi, fontSize: 11, color: "#8A6200" },
  claimBtn:  { marginTop: 10, backgroundColor: C.cocoa, borderRadius: 99, paddingVertical: 9, alignItems: "center" },
  claimText: { fontFamily: F.sansSemi, fontSize: 13, color: "#FFF" },

  reachCard:    { backgroundColor: C.card, borderRadius: 22, padding: 18, borderWidth: 0.5, borderColor: C.hair },
  reachHeading: { fontFamily: F.serif, fontSize: 21, lineHeight: 27, color: C.ink, letterSpacing: -0.3, marginBottom: 14 },
  reachItalic:  { fontFamily: F.serifItalic, fontSize: 21, lineHeight: 27, color: C.cocoa },
  countryRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  countryChip:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: C.hairMid },
  countryChipFilled: { backgroundColor: "#7A4A22", borderColor: "#7A4A22" },
  countryCode:  { fontFamily: F.mono, fontSize: 11, color: C.cocoa },
  reachFooter:  { fontFamily: F.sans, fontSize: 12, color: C.muted },

  proverb:     { fontFamily: F.serifItalic, fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 20, marginTop: 14, marginBottom: 6 },
  proverbAttr: { fontFamily: F.sansSemi, fontSize: 9.5, letterSpacing: 1.4, color: C.muted, textAlign: "center", textTransform: "uppercase", marginBottom: 8 },


  cardPressed: { opacity: 0.90, transform: [{ scale: 0.97 }] },

  // Weekly reward card
  weeklyCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
    marginHorizontal: 20, marginTop: 18, paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 16,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.15)",
  },
  weeklyIcon: {
    width: 42, height: 42, borderRadius: 14,
    backgroundColor: "rgba(245,158,11,0.12)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  weeklyTitle: { fontFamily: F.sansBold, fontSize: 15, color: C.ink, letterSpacing: -0.2 },
  weeklySub: { fontFamily: F.sans, fontSize: 12, color: C.muted, marginTop: 1 },

  // Spin modal
  spinOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  spinSheet: {
    width: 320, backgroundColor: "#1A1510", borderRadius: 28,
    paddingVertical: 28, paddingHorizontal: 24, alignItems: "center" as const,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.18)",
    shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 30, elevation: 10,
  },
  spinTitle: { fontFamily: F.serifBold, fontSize: 24, color: "#F3EDE3", letterSpacing: -0.3 },
  spinSub: { fontFamily: F.sans, fontSize: 13, color: "rgba(243,237,227,0.50)", marginTop: 4, marginBottom: 20 },
  spinWheelWrap: {
    width: 220, height: 220, alignItems: "center" as const, justifyContent: "center" as const,
  },
  spinPointer: {
    position: "absolute" as const, top: -4, zIndex: 10, alignSelf: "center" as const,
  },
  spinWheelOuter: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 2, borderColor: "rgba(245,158,11,0.30)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  spinSlice: {
    position: "absolute" as const, alignItems: "center" as const, gap: 2,
  },
  spinSliceLabel: { fontSize: 8, fontFamily: "Geist-SemiBold", textAlign: "center" as const },
  spinResultLabel: { fontFamily: "Geist-Bold", fontSize: 20, color: "#F3EDE3", letterSpacing: -0.3 },
  spinResultSub: { fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(243,237,227,0.50)" },
  spinClaimBtn: {
    marginTop: 12, backgroundColor: "#C8804A", paddingHorizontal: 40, paddingVertical: 14,
    borderRadius: 99,
  },
  spinClaimText: { fontFamily: "Geist-Bold", fontSize: 15, color: "#FFF", letterSpacing: 0.3 },
  spinGoBtn: {
    marginTop: 16, backgroundColor: "#F59E0B", paddingHorizontal: 48, paddingVertical: 16,
    borderRadius: 99,
    shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  spinGoText: { fontFamily: "Geist-Bold", fontSize: 18, color: "#1A1510", letterSpacing: 1 },
});
