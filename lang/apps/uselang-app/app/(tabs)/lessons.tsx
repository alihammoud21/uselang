// ── Lessons Tab ────────────────────────────────────────────────
// Warm paper aesthetic. Units shown as chapters, lessons as accent-bar cards.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserProfile } from "@/lib/user-store";
import { getCurriculum } from "@/data/lessons";
import { getCoinBalance, spendCoins, getChallenges } from "@/lib/challenge-store";
import {
  getLanguageProgress,
  isLessonUnlocked,
  subscribeLessonProgress,
} from "@/lib/lesson-store";
import type {
  LanguageCurriculum,
  LanguageProgress,
  Unit,
  Lesson,
} from "@/lib/lesson-types";

// ── Design tokens ───────────────────────────────────────────────────────────────
const T = {
  paper:    "#F3EDE3",
  card:     "#FAF6EE",
  white:    "#FFFFFF",
  ink:      "#111010",
  ink2:     "#2B2623",
  muted:    "#6B625A",
  muted2:   "#8C827A",
  hair:     "rgba(17,16,16,0.08)",
  amber:    "#A85D2E",
  amberDeep:"#7A3F18",
  amberSoft:"#C8894F",
  done:     "#4A7C59",
  locked:   "rgba(17,16,16,0.12)",
};
const F = {
  serif:      "Fraunces-Regular",
  serifItalic:"Fraunces-Italic",
  serifBold:  "Fraunces-Bold",
  sans:       "Geist-Regular",
  sansMed:    "Geist-Medium",
  sansSemi:   "Geist-SemiBold",
  sansBold:   "Geist-Bold",
  mono:       "GeistMono-Regular",
};

const LANG_TABS = [
  { code: "zh", label: "Mandarin" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];

export default function LessonsScreen() {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<LanguageCurriculum | null>(null);
  const [progress, setProgress] = useState<LanguageProgress | null>(null);
  const [langCode, setLangCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [completedMissions, setCompletedMissions] = useState(0);
  const [examUnlocked, setExamUnlocked] = useState(false);
  const langCodeRef = useRef(""); // stable ref for subscriber closure

  const switchToLang = useCallback(async (code: string) => {
    setLoading(true);
    setLangCode(code);
    langCodeRef.current = code;
    try {
      const curr = getCurriculum(code);
      setCurriculum(curr);
      if (curr) {
        const prog = await getLanguageProgress(code);
        setProgress(prog);
      } else {
        setProgress(null);
      }
    } catch { /* swallow */ }
    setLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      const code = profile.learningLanguage || "zh";
      await switchToLang(code);
    } catch {
      setLoading(false);
    }
  }, [switchToLang]);

  const loadExamMeta = useCallback(async () => {
    const [bal, chs, unlockFlag] = await Promise.all([
      getCoinBalance(),
      getChallenges(),
      AsyncStorage.getItem(`lang:examUnlock:${langCodeRef.current}`),
    ]);
    setCoinBalance(bal);
    setCompletedMissions(chs.filter((c) => c.completed).length);
    setExamUnlocked(unlockFlag === "1");
  }, []);

  useFocusEffect(useCallback(() => { loadExamMeta(); }, [loadExamMeta]));

  useEffect(() => {
    loadData();
    const unsub = subscribeLessonProgress(() => {
      if (langCodeRef.current) switchToLang(langCodeRef.current);
    });
    return unsub;
  }, [loadData, switchToLang]);

  const stats = useMemo(() => {
    if (!curriculum || !progress) return { completed: 0, total: 0, abilities: 0 };
    let total = 0, completed = 0;
    for (const unit of curriculum.units)
      for (const lesson of unit.lessons) {
        total++;
        if (progress.lessons[lesson.id]?.completed) completed++;
      }
    return { completed, total, abilities: progress.abilities.length };
  }, [curriculum, progress]);

  if (loading) {
    return (
      <SafeAreaView style={[S.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={T.amber} />
      </SafeAreaView>
    );
  }

  if (!curriculum) {
    return (
      <SafeAreaView style={[S.root, { justifyContent: "center", alignItems: "center", paddingHorizontal: 36 }]}>
        <View style={S.emptyIcon}>
          <Ionicons name="book-outline" size={32} color={T.muted} />
        </View>
        <Text style={S.emptyTitle}>No lessons for this language yet</Text>
        <Text style={S.emptyBody}>
          Structured lessons are available for Mandarin, Spanish, and French. Switch your target language in Settings to access them.
        </Text>
      </SafeAreaView>
    );
  }

  const progressPct = stats.total > 0 ? stats.completed / stats.total : 0;

  return (
    <SafeAreaView style={S.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Masthead ──────────────────────────────────────────────── */}
        <View style={S.masthead}>
          <View style={{ flex: 1 }}>
            <Text style={S.mastTitle}>Learn</Text>
            <Text style={S.mastSub}>
              {curriculum.languageLabel}
              <Text style={{ fontFamily: F.serifItalic }}> · your path</Text>
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {/* Overall progress pill */}
            <View style={S.progressPill}>
              <Text style={S.progressPillText}>{stats.completed}/{stats.total}</Text>
              <Text style={S.progressPillSub}>done</Text>
            </View>
            {/* FUN Easter egg — visible only when admin exam unlocked */}
            {examUnlocked && (
              <Pressable
                onPress={() => router.push({ pathname: "/flappy", params: { lang: langCode } } as any)}
                style={S.funBtn}
              >
                <Text style={S.funBtnText}>✦ FUN</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Language switcher ────────────────────────────────────────── */}
        <View style={S.langSwitcher}>
          {LANG_TABS.map((tab) => {
            const active = langCode.startsWith(tab.code);
            return (
              <Pressable
                key={tab.code}
                onPress={() => switchToLang(tab.code)}
                style={[S.langTab, active && S.langTabActive]}
              >
                <Text style={[S.langTabText, active && S.langTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Progress rail ───────────────────────────────────────────── */}
        <View style={S.rail}>
          <View style={[S.railFill, { width: `${progressPct * 100}%` }]} />
        </View>

        {/* ── Language Exam Card ───────────────────────────────────────── */}
        {(() => {
          const allLangDone = stats.total > 0 && stats.completed === stats.total;
          const hasMissions = completedMissions >= 2;
          const hasCoins = coinBalance >= 1000;
          const examReady = examUnlocked || (allLangDone && hasMissions && hasCoins);
          const langLabel = curriculum.languageLabel;
          const missingParts = [
            !allLangDone  && `${stats.total - stats.completed} lessons left`,
            !hasCoins     && `need ${1000 - coinBalance} more 🪙`,
            !hasMissions  && `${2 - completedMissions} weekly mission${completedMissions === 1 ? "" : "s"}`,
          ].filter(Boolean).join(" · ");
          return (
            <Pressable
              onPress={async () => {
                if (!examReady) return;
                if (!examUnlocked) {
                  const result = await spendCoins(1000);
                  if (!result.success) return;
                }
                router.push({ pathname: "/unit-exam", params: { examId: langCode, lang: langCode } } as any);
              }}
              style={({ pressed }) => ([
                S.examCard,
                examReady ? S.examCardReady : S.examCardLocked,
                pressed && examReady ? { opacity: 0.88 } : {},
              ])}
            >
              <View style={[S.examIconWrap, { backgroundColor: examReady ? "rgba(255,255,255,0.18)" : "rgba(17,16,16,0.08)" }]}>
                <Ionicons name={examReady ? "ribbon" : "lock-closed"} size={20} color={examReady ? "#FFF" : T.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.examTitle, !examReady && { color: T.muted }]}>
                  {langLabel} Final Exam
                </Text>
                <Text style={[S.examSub, !examReady && { color: T.muted2 }]}>
                  {examReady
                    ? examUnlocked
                      ? "Admin unlocked · MC · Listening · Typing · Oral"
                      : "MC · Listening · Typing · Oral → Certificate"
                    : missingParts}
                </Text>
              </View>
              {examReady && !examUnlocked && (
                <View style={S.examCost}>
                  <Text style={S.examCostText}>🪙 1,000</Text>
                </View>
              )}
              {examReady && examUnlocked && (
                <View style={[S.examCost, { backgroundColor: "rgba(255,255,255,0.20)" }]}>
                  <Text style={[S.examCostText, { color: "#FFF" }]}>FREE</Text>
                </View>
              )}
            </Pressable>
          );
        })()} 

        {/* ── Abilities earned ─────────────────────────────────────────── */}
        {progress && progress.abilities.length > 0 && (
          <>
            <Text style={S.sectionLabel}>ABILITIES EARNED</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              style={{ marginBottom: 20 }}
            >
              {progress.abilities.map((a, i) => (
                <View key={i} style={S.abilityChip}>
                  <Ionicons name="ribbon" size={12} color={T.amberDeep} />
                  <Text style={S.abilityChipText}>{a}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Units ────────────────────────────────────────────────────── */}
        {curriculum.units.map((unit, unitIdx) => (
          <UnitSection
            key={unit.id}
            unit={unit}
            unitNumber={unitIdx + 1}
            progress={progress!}
            curriculum={curriculum}
            onLessonPress={(lesson) =>
              router.push({ pathname: "/lesson", params: { lessonId: lesson.id, unitId: unit.id, lang: langCode } })
            }
          />
        ))}

        {/* ── Activity Hub ──────────────────────────────────────────────── */}
        <Text style={[S.sectionLabel, { marginTop: 8, marginBottom: 12 }]}>ACTIVITIES</Text>
        <View style={{ gap: 10, marginBottom: 32 }}>

          {/* Listen & Match */}
          <Pressable
            onPress={() => router.push({ pathname: "/listen-match", params: { lang: langCode } } as any)}
            style={({ pressed }) => [S.activityCard, { borderColor: "rgba(200,128,74,0.20)" }, pressed && { opacity: 0.85 }]}
          >
            <View style={[S.activityIcon, { backgroundColor: "rgba(200,128,74,0.12)" }]}>
              <Ionicons name="headset" size={22} color={T.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.activityTitle}>Listen & Match</Text>
              <Text style={S.activitySub}>Hear it, then pick the right meaning.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.muted2} />
          </Pressable>

          {/* Daily Joke */}
          <Pressable
            onPress={() => router.push({ pathname: "/jokes", params: { lang: langCode } } as any)}
            style={({ pressed }) => [S.activityCard, { borderColor: "rgba(74,124,89,0.20)" }, pressed && { opacity: 0.85 }]}
          >
            <View style={[S.activityIcon, { backgroundColor: "rgba(74,124,89,0.10)" }]}>
              <Ionicons name="happy-outline" size={22} color={T.done} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.activityTitle}>Daily Joke</Text>
              <Text style={S.activitySub}>One joke a day keeps the boredom away.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.muted2} />
          </Pressable>

          {/* Interactive Story */}
          <Pressable
            onPress={() => router.push({ pathname: "/story", params: { lang: langCode } } as any)}
            style={({ pressed }) => [S.activityCard, { borderColor: "rgba(28,23,20,0.12)" }, pressed && { opacity: 0.85 }]}
          >
            <View style={[S.activityIcon, { backgroundColor: "rgba(28,23,20,0.06)" }]}>
              <Ionicons name="book" size={22} color={T.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.activityTitle}>Adventure Story</Text>
              <Text style={S.activitySub}>Make choices, learn vocab, earn XP.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.muted2} />
          </Pressable>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Unit section ──────────────────────────────────────────────────────────────────
function UnitSection({
  unit,
  unitNumber,
  progress,
  curriculum,
  onLessonPress,
}: {
  unit: Unit;
  unitNumber: number;
  progress: LanguageProgress;
  curriculum: LanguageCurriculum;
  onLessonPress: (lesson: Lesson) => void;
}) {
  const completedCount = unit.lessons.filter((l) => progress.lessons[l.id]?.completed).length;
  const allDone = completedCount === unit.lessons.length;

  return (
    <View style={S.unitWrap}>
      {/* Unit chapter header */}
      <View style={S.unitHeader}>
        <View style={[S.unitBadge, allDone && S.unitBadgeDone]}>
          {allDone ? (
            <Ionicons name="checkmark" size={16} color="#FFF" />
          ) : (
            <Text style={[S.unitBadgeNum, !allDone && { color: T.amber }]}>{unitNumber}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.unitTitle}>{unit.title}</Text>
          <Text style={S.unitDesc} numberOfLines={1}>{unit.description}</Text>
        </View>
        <Text style={S.unitCount}>{completedCount}/{unit.lessons.length}</Text>
      </View>

      {/* Thin divider under unit header */}
      <View style={S.unitDivider} />

      {/* Lesson cards */}
      {unit.lessons.map((lesson, i) => {
        const lp = progress.lessons[lesson.id];
        const completed = !!lp?.completed;
        const unlocked = isLessonUnlocked(curriculum, progress, lesson.id);
        const partsTotal = lesson.parts.length;
        const partsDone = lp?.completedParts.length || 0;
        const isNext = !completed && unlocked && i === unit.lessons.findIndex(
          (l) => !progress.lessons[l.id]?.completed && isLessonUnlocked(curriculum, progress, l.id)
        );
        const accentColor = completed ? T.done : unlocked ? T.amber : T.locked;

        return (
          <Pressable
            key={lesson.id}
            onPress={() => unlocked && onLessonPress(lesson)}
            style={({ pressed }) => [
              S.lessonCard,
              !unlocked && S.lessonCardLocked,
              { opacity: pressed && unlocked ? 0.85 : 1 },
            ]}
          >
            {/* Left accent bar */}
            <View style={[S.accentBar, { backgroundColor: accentColor }]} />

            <View style={S.lessonInner}>
              {/* Status circle */}
              <View style={[S.statusCircle, completed && S.statusCircleDone, !unlocked && S.statusCircleLocked]}>
                {completed ? (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                ) : unlocked ? (
                  <Text style={S.statusNum}>{i + 1}</Text>
                ) : (
                  <Ionicons name="lock-closed" size={12} color={T.muted2} />
                )}
              </View>

              {/* Text block */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Text style={[S.lessonTitle, !unlocked && { color: T.muted }]}>{lesson.title}</Text>
                  {isNext && <View style={S.nextBadge}><Text style={S.nextBadgeText}>NEXT</Text></View>}
                </View>
                <Text style={S.lessonDesc} numberOfLines={2}>{lesson.description}</Text>

                {/* In-progress bar */}
                {unlocked && !completed && partsDone > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <View style={S.progressTrack}>
                      <View style={[S.progressFill, { width: `${(partsDone / partsTotal) * 100}%` }]} />
                    </View>
                    <Text style={S.progressLabel}>{partsDone} of {partsTotal} parts</Text>
                  </View>
                )}

                {/* Ability earned */}
                {completed && (
                  <View style={S.abilityRow}>
                    <Ionicons name="ribbon" size={11} color={T.done} />
                    <Text style={S.abilityLabel}>{lesson.realWorldAbility}</Text>
                  </View>
                )}
              </View>

              {/* Right side */}
              {unlocked && !completed && (
                <View style={[S.startBtn, isNext && S.startBtnActive]}>
                  <Ionicons name="arrow-forward" size={14} color={isNext ? "#FFF" : T.amber} />
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.paper },
  scroll:    { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 120 },

  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: T.card, alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: F.serifBold, fontSize: 20, color: T.ink, textAlign: "center", marginBottom: 8 },
  emptyBody:  { fontFamily: F.sans, fontSize: 14, color: T.muted, textAlign: "center", lineHeight: 20 },

  // Masthead
  masthead: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14, paddingTop: 4 },
  mastTitle: { fontFamily: F.serif, fontSize: 36, fontWeight: "400", color: T.ink, letterSpacing: -0.8 },
  mastSub:   { fontFamily: F.serif, fontSize: 14, color: T.muted, marginTop: 4 },
  progressPill: {
    backgroundColor: T.card, borderRadius: 14, borderWidth: 0.5, borderColor: T.hair,
    paddingHorizontal: 12, paddingVertical: 8, alignItems: "center", marginTop: 4,
  },
  progressPillText: { fontFamily: F.serifBold, fontSize: 18, color: T.amberDeep, lineHeight: 22 },
  progressPillSub:  { fontFamily: F.sans, fontSize: 10, color: T.muted, letterSpacing: 0.5 },

  // Progress rail
  rail:     { height: 3, backgroundColor: T.hair, borderRadius: 2, marginBottom: 20, overflow: "hidden" },
  railFill: { height: 3, backgroundColor: T.amber, borderRadius: 2 },

  // Labels
  sectionLabel: {
    fontFamily: F.sansSemi, fontSize: 9, color: T.muted2, letterSpacing: 1.5,
    textTransform: "uppercase", marginBottom: 10,
  },

  // Ability chips
  abilityChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(122,63,24,0.08)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  abilityChipText: { fontFamily: F.sansSemi, fontSize: 11, color: T.amberDeep },

  // Unit
  unitWrap:   { marginBottom: 28 },
  unitHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  unitBadge:  {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: "rgba(168,93,46,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  unitBadgeDone: { backgroundColor: T.done },
  unitBadgeNum:  { fontFamily: F.sansBold, fontSize: 15 },
  unitTitle:  { fontFamily: F.serifBold, fontSize: 17, color: T.ink, letterSpacing: -0.2 },
  unitDesc:   { fontFamily: F.sans, fontSize: 12, color: T.muted, marginTop: 2 },
  unitCount:  { fontFamily: F.sansSemi, fontSize: 12, color: T.muted2 },
  unitDivider:{ height: 0.5, backgroundColor: T.hair, marginBottom: 10 },

  // Lesson card
  lessonCard: {
    flexDirection: "row",
    backgroundColor: T.white,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: T.hair,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  lessonCardLocked: { backgroundColor: "rgba(17,16,16,0.02)", opacity: 0.6 },
  accentBar: { width: 3, borderRadius: 0 },
  lessonInner: {
    flex: 1, flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 14, paddingLeft: 12, paddingRight: 14, gap: 12,
  },

  // Status circle
  statusCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(168,93,46,0.10)",
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  statusCircleDone:   { backgroundColor: T.done },
  statusCircleLocked: { backgroundColor: "rgba(17,16,16,0.06)" },
  statusNum: { fontFamily: F.sansBold, fontSize: 13, color: T.amber },

  // Lesson text
  lessonTitle: { fontFamily: F.sansSemi, fontSize: 15, color: T.ink, lineHeight: 19 },
  lessonDesc:  { fontFamily: F.sans, fontSize: 12, color: T.muted, lineHeight: 17 },

  // NEXT badge
  nextBadge: {
    backgroundColor: T.amber, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  nextBadgeText: { fontFamily: F.sansBold, fontSize: 8, color: "#FFF", letterSpacing: 0.8 },

  // In-progress bar
  progressTrack: { height: 3, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden", marginBottom: 3 },
  progressFill:  { height: 3, backgroundColor: T.amber, borderRadius: 2 },
  progressLabel: { fontFamily: F.sans, fontSize: 10, color: T.muted2 },

  // Ability row (inside lesson card)
  abilityRow:  { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  abilityLabel:{ fontFamily: F.sansSemi, fontSize: 11, color: T.done },

  // Start button
  startBtn: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1.5, borderColor: T.amber,
    alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0,
  },
  startBtnActive: { backgroundColor: T.amber, borderColor: T.amber },

  // Language switcher
  langSwitcher: {
    flexDirection: "row", gap: 8, marginBottom: 16,
  },
  langTab: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 9, borderRadius: 12,
    backgroundColor: "rgba(168,93,46,0.07)",
    borderWidth: 1, borderColor: "transparent",
  },
  langTabActive: {
    backgroundColor: T.amber,
    borderColor: T.amber,
  },
  langTabText: {
    fontFamily: F.sansSemi, fontSize: 13,
    color: T.muted, letterSpacing: 0.1,
  },
  langTabTextActive: {
    color: "#FFFFFF",
  },

  // Language exam card
  examCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, padding: 14, marginBottom: 20,
    borderWidth: 1,
  },
  examCardReady: {
    backgroundColor: T.amberDeep,
    borderColor: "rgba(255,255,255,0.10)",
  },
  examCardLocked: {
    backgroundColor: T.white,
    borderColor: T.hair,
  },
  examIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  examTitle: { fontFamily: F.sansBold, fontSize: 14, color: "#FFF", letterSpacing: 0.1 },
  examSub:   { fontFamily: F.sans,     fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  examCost: {
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, flexShrink: 0,
  },
  examCostText: { fontFamily: F.sansBold, fontSize: 12, color: "#FFF" },

  activityCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    borderWidth: 0.5,
    shadowColor: T.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  activityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
  activityTitle: { fontFamily: F.sansSemi, fontSize: 15, color: T.ink, marginBottom: 2 },
  activitySub: { fontFamily: F.sans, fontSize: 12, color: T.muted },

  funBtn: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: T.amber,
  },
  funBtnText: { fontFamily: F.sansBold, fontSize: 11, color: T.amber, letterSpacing: 0.5 },
});
