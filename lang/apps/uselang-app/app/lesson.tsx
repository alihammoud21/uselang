// ── Lesson Screen ────────────────────────────────────────────────────────────
// The active lesson experience. Shows parts sequentially, each with exercises.
// On completion → full-screen achievement moment → map unlock animation.
// AI Tutor (Gemma) available via "Ask Tutor" button.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  Animated as RNAnimated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { COLORS } from "@/lib/constants";
import { normalizeAnswer } from "@/lib/input-validate";
import { playSound, errorCategoryToSound } from "@/lib/sound-manager";
import {
  createLearnSession,
  learnSubmitAttempt,
  type LearnSession,
  type LearnEvaluation,
  type ErrorClassification,
} from "@/lib/tutor-engine";
import { getCurriculum } from "@/data/lessons";
import { getHintTokens, consumeHintToken, isChatbotUnlocked } from "@/lib/shop-store";
import { getLocationsForLanguage } from "@/data/map-locations";
import { recordChallengeProgress } from "@/lib/challenge-store";
import { awardLessonXP } from "@/lib/progress-store";
import {
  completePartInLesson,
  completeLessonFull,
  updateMapLocation,
  getLessonProgress,
} from "@/lib/lesson-store";
import type {
  Lesson,
  LessonPart,
  Exercise,
  MapLocation,
  MapLocationTier,
} from "@/lib/lesson-types";

const { width: SW, height: SH } = Dimensions.get("window");
const AMBER = "#A85D2E";
const BG = "#FAF8F5";
const PAPER = "#F5EFE2";
const CARD = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.06)";
const MUTED = "#9A948D";
const INK = "#1C1714";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";
const F = {
  serif:       "Fraunces-Regular",
  serifBold:   "Fraunces-Bold",
  serifItalic: "Fraunces-Italic",
  sans:        "Geist-Regular",
  sansMed:     "Geist-Medium",
  sansSemi:    "Geist-SemiBold",
  sansBold:    "Geist-Bold",
} as const;

export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId: string; unitId: string; lang: string }>();
  const { lessonId, unitId, lang: langCode } = params;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentPartIdx, setCurrentPartIdx] = useState(0);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionAbility, setCompletionAbility] = useState("");
  const [unlockedLocation, setUnlockedLocation] = useState<MapLocation | null>(null);
  const [unlockedTier, setUnlockedTier] = useState<MapLocationTier>("locked");
  // Exercise state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [reorderWords, setReorderWords] = useState<string[]>([]);
  const [buildWords, setBuildWords] = useState<string[]>([]);
  // Speed round
  const [speedIdx, setSpeedIdx] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedActive, setSpeedActive] = useState(false);
  const [speedTimer, setSpeedTimer] = useState(60);
  // XP tracking for this lesson
  const [sessionXP, setSessionXP] = useState(0);
  const [showXPPop, setShowXPPop] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [hintCount, setHintCount] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [chatAvailable, setChatAvailable] = useState(false);

  // AI evaluation (tutor engine)
  const [aiEval, setAiEval] = useState<LearnEvaluation | null>(null);
  const [aiEvalLoading, setAiEvalLoading] = useState(false);
  const learnSessionRef = useRef<LearnSession | null>(null);

  const completionOpacity = useRef(new RNAnimated.Value(0)).current;
  const completionScale = useRef(new RNAnimated.Value(0.8)).current;
  const scrollRef = useRef<ScrollView>(null);

  // ── Load hint count + chatbot availability ──────────────────────────────────
  useEffect(() => {
    getHintTokens().then(setHintCount).catch(() => {});
    isChatbotUnlocked().then(setChatAvailable).catch(() => {});
  }, []);

  // ── Load lesson ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!langCode || !lessonId) return;
    const curriculum = getCurriculum(langCode);
    if (!curriculum) return;
    for (const unit of curriculum.units) {
      const found = unit.lessons.find((l) => l.id === lessonId);
      if (found) {
        setLesson(found);
        // Resume from last completed part
        getLessonProgress(langCode, lessonId).then((prog) => {
          if (prog.completedParts.length > 0 && !prog.completed) {
            const nextPart = found.parts.findIndex(
              (p) => !prog.completedParts.includes(p.id),
            );
            if (nextPart > 0) setCurrentPartIdx(nextPart);
          }
        });
        break;
      }
    }
  }, [langCode, lessonId]);

  const currentPart = lesson?.parts[currentPartIdx] || null;
  const currentExercise = currentPart?.exercises[currentExIdx] || null;
  const totalParts = lesson?.parts.length || 0;
  const totalExInPart = currentPart?.exercises.length || 0;
  const overallProgress = useMemo(() => {
    if (!lesson) return 0;
    let total = 0;
    let done = 0;
    for (let p = 0; p < lesson.parts.length; p++) {
      for (let e = 0; e < lesson.parts[p].exercises.length; e++) {
        total++;
        if (p < currentPartIdx || (p === currentPartIdx && e < currentExIdx)) done++;
      }
    }
    return total > 0 ? done / total : 0;
  }, [lesson, currentPartIdx, currentExIdx]);

  // ── Reset exercise state ─────────────────────────────────────────────────
  const resetExerciseState = useCallback(() => {
    setHintRevealed(false);
    setSelectedOption(null);
    setAnswered(false);
    setIsCorrect(false);
    setTextAnswer("");
    setMatchedPairs(new Set());
    setReorderWords([]);
    setBuildWords([]);
    setAiEval(null);
    setAiEvalLoading(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const runAiEvaluation = useCallback(async (userText: string, expectedPhrase: string) => {
    if (!langCode) return;
    setAiEvalLoading(true);
    try {
      if (!learnSessionRef.current) {
        learnSessionRef.current = createLearnSession(langCode, "en");
      }
      const sess: LearnSession = {
        ...learnSessionRef.current,
        step: "awaiting-attempt",
        currentPrompt: expectedPhrase,
        currentTarget: expectedPhrase,
      };
      const result = await learnSubmitAttempt(sess, userText);
      learnSessionRef.current = result;
      if (result.evaluation) {
        setAiEval(result.evaluation);
        const errs = result.evaluation.errors;
        if (errs.grammar) playSound(errorCategoryToSound("grammar"));
        else if (errs.pronunciation) playSound(errorCategoryToSound("pronunciation"));
        else if (errs.tone) playSound(errorCategoryToSound("tone"));
        else if (result.evaluation.isCorrect) playSound("success-step");
      }
    } catch (e) {
      console.warn("[lesson] AI eval error:", e);
    }
    setAiEvalLoading(false);
  }, [langCode]);

  // ── Next exercise / part / completion ────────────────────────────────────
  const goNext = useCallback(async () => {
    if (!lesson || !currentPart) return;
    resetExerciseState();

    if (currentExIdx < totalExInPart - 1) {
      setCurrentExIdx(currentExIdx + 1);
      return;
    }

    // Part complete
    const result = await completePartInLesson(langCode, lesson, currentPart.id);

    if (currentPartIdx < totalParts - 1) {
      setCurrentPartIdx(currentPartIdx + 1);
      setCurrentExIdx(0);
      return;
    }

    // Lesson complete
    const ability = await completeLessonFull(langCode, lesson);
    playSound("mastery");
    // Award XP and track weekly challenge
    awardLessonXP().catch(() => {});
    recordChallengeProgress("complete_lessons").catch(() => {});

    // Check map unlocks
    if (lesson.mapLocationId) {
      const locations = getLocationsForLanguage(langCode);
      const loc = locations.find((l) => l.id === lesson.mapLocationId);
      if (loc) {
        const tier = await updateMapLocation(langCode, loc);
        setUnlockedLocation(loc);
        setUnlockedTier(tier);
      }
    }

    setCompletionAbility(ability || lesson.realWorldAbility);
    setShowCompletion(true);
    RNAnimated.parallel([
      RNAnimated.timing(completionOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      RNAnimated.spring(completionScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [lesson, currentPart, currentPartIdx, currentExIdx, totalParts, totalExInPart, langCode, resetExerciseState, completionOpacity, completionScale]);

  // ── Check answer helpers ─────────────────────────────────────────────────
  const awardXP = useCallback((amount: number) => {
    setSessionXP((prev) => prev + amount);
    setShowXPPop(true);
    setTimeout(() => setShowXPPop(false), 1200);
    playSound("xp-gain");
  }, []);

  const checkMultipleChoice = useCallback((idx: number) => {
    if (answered || !currentExercise) return;
    if (currentExercise.type !== "multiple-choice") return;
    setSelectedOption(idx);
    setAnswered(true);
    const correct = idx === currentExercise.correctIndex;
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(10); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [answered, currentExercise, awardXP]);

  const checkScenario = useCallback((idx: number) => {
    if (answered || !currentExercise) return;
    if (currentExercise.type !== "scenario") return;
    setSelectedOption(idx);
    setAnswered(true);
    const correct = currentExercise.options[idx]?.correct ?? false;
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(15); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [answered, currentExercise, awardXP]);

  const checkTranslate = useCallback(() => {
    if (!currentExercise || currentExercise.type !== "translate") return;
    const clean = normalizeAnswer(textAnswer);
    const correct = currentExercise.acceptedAnswers.some(
      (a) => normalizeAnswer(a) === clean,
    );
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(15); playSound("correct"); }
    else {
      setCorrectStreak(0);
      playSound("wrong");
    }
  }, [currentExercise, textAnswer, awardXP]);

  const checkFillBlankDirect = useCallback((selectedValue: string) => {
    if (!currentExercise || currentExercise.type !== "fill-blank") return;
    const clean = normalizeAnswer(selectedValue);
    const correct = clean === normalizeAnswer(currentExercise.answer);
    setTextAnswer(selectedValue);
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(10); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [currentExercise, awardXP]);

  const checkFillBlankText = useCallback(() => {
    if (!currentExercise || currentExercise.type !== "fill-blank") return;
    const clean = normalizeAnswer(textAnswer);
    const correct = clean === normalizeAnswer(currentExercise.answer);
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(10); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [currentExercise, textAnswer, awardXP]);

  const checkReorder = useCallback(() => {
    if (!currentExercise || currentExercise.type !== "reorder") return;
    const correct = JSON.stringify(reorderWords) === JSON.stringify(currentExercise.correctOrder);
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(10); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [currentExercise, reorderWords, awardXP]);

  const checkBuildSentence = useCallback(() => {
    if (!currentExercise || currentExercise.type !== "build-sentence") return;
    const correct = JSON.stringify(buildWords) === JSON.stringify(currentExercise.correctOrder);
    setAnswered(true);
    setIsCorrect(correct);
    if (correct) { setCorrectStreak((s) => s + 1); awardXP(12); playSound("correct"); }
    else { setCorrectStreak(0); playSound("wrong"); }
  }, [currentExercise, buildWords, awardXP]);

  // Ask Tutor removed — was crashing due to Gemma engine loading issues

  // ── Render ───────────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={AMBER} />
      </SafeAreaView>
    );
  }

  // ── Completion screen ────────────────────────────────────────────────────
  if (showCompletion) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PAPER }} edges={["top", "bottom"]}>
        <RNAnimated.View
          style={{
            flex: 1,
            opacity: completionOpacity,
            transform: [{ scale: completionScale }],
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          {/* Warm bloom */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute", top: -80,
              width: 300, height: 300, borderRadius: 150,
              backgroundColor: "rgba(200,128,74,0.13)",
            }}
          />

          {/* Trophy badge */}
          <View style={{
            width: 88, height: 88, borderRadius: 26,
            backgroundColor: AMBER,
            alignItems: "center", justifyContent: "center",
            marginBottom: 28,
            shadowColor: "#7A3F18",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.28, shadowRadius: 24,
          }}>
            <Ionicons name="ribbon" size={44} color="#FFF" />
          </View>

          {/* Eyebrow */}
          <Text style={{ fontFamily: F.sansSemi, fontSize: 10, color: AMBER, letterSpacing: 2.0, marginBottom: 10, textTransform: "uppercase" }}>
            Ability Unlocked
          </Text>

          {/* Ability */}
          <Text style={{ fontFamily: F.serifBold, fontSize: 28, color: INK, textAlign: "center", lineHeight: 36, letterSpacing: -0.4, marginBottom: 26 }}>
            {completionAbility}
          </Text>

          {/* XP card */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: "#FFF8EC",
            borderWidth: 1, borderColor: "rgba(168,93,46,0.18)",
            borderRadius: 18, paddingHorizontal: 24, paddingVertical: 14,
            marginBottom: 14,
          }}>
            <Ionicons name="flash" size={22} color={AMBER} />
            <Text style={{ fontFamily: F.serifBold, fontSize: 26, color: AMBER, letterSpacing: -0.5 }}>+{sessionXP}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 13, color: "#8A7060" }}>XP earned</Text>
          </View>

          {/* Unlocked location */}
          {unlockedLocation && (
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 8,
              backgroundColor: "#FFFAEE",
              borderWidth: 1, borderColor: "rgba(196,166,124,0.28)",
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
              marginBottom: 14,
            }}>
              <Ionicons name="location" size={16} color={AMBER} />
              <Text style={{ fontFamily: F.sansSemi, fontSize: 14, color: INK }}>
                {unlockedLocation.name}
              </Text>
              <View style={{ backgroundColor: "rgba(168,93,46,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontFamily: F.sansSemi, fontSize: 10, color: AMBER, textTransform: "uppercase", letterSpacing: 0.8 }}>{unlockedTier}</Text>
              </View>
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              marginTop: 10,
              backgroundColor: INK,
              paddingHorizontal: 48, paddingVertical: 16,
              borderRadius: 99,
              opacity: pressed ? 0.85 : 1,
              shadowColor: INK,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.20, shadowRadius: 20,
            })}
          >
            <Text style={{ fontFamily: F.sansSemi, fontSize: 16, color: "#FFF", letterSpacing: 0.1 }}>Continue</Text>
          </Pressable>
        </RNAnimated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Top bar with XP ─────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={22} color={MUTED} />
          </Pressable>
          <View style={{ flex: 1, height: 5, backgroundColor: "rgba(0,0,0,0.07)", borderRadius: 3, overflow: "hidden" }}>
            <View style={{ width: `${overallProgress * 100}%` as any, height: 5, backgroundColor: AMBER, borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: showXPPop ? "rgba(168,93,46,0.14)" : "rgba(168,93,46,0.07)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Ionicons name="flash" size={13} color={AMBER} />
            <Text style={{ fontFamily: F.sansBold, fontSize: 13, color: AMBER }}>{sessionXP}</Text>
            <Text style={{ fontFamily: F.sans, fontSize: 10, color: MUTED }}>XP</Text>
          </View>
          {correctStreak >= 3 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "rgba(239,160,40,0.12)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Ionicons name="flame" size={12} color="#E0850A" />
              <Text style={{ fontFamily: F.sansBold, fontSize: 11, color: "#E0850A" }}>{correctStreak}</Text>
            </View>
          )}
        </View>

        {/* ── Part header ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <Text style={{ fontFamily: F.sansSemi, fontSize: 10, color: MUTED, textTransform: "uppercase", letterSpacing: 1.2 }}>
            Part {currentPartIdx + 1} of {totalParts}
          </Text>
          <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: INK, marginTop: 3, letterSpacing: -0.2 }}>
            {currentPart?.title}
          </Text>
          <Text style={{ fontFamily: F.sans, fontSize: 12, color: MUTED, marginTop: 2 }}>
            {currentExIdx + 1} / {totalExInPart}
          </Text>
        </View>

        {/* ── Exercise area ───────────────────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentExercise && (
            <ExerciseRenderer
              exercise={currentExercise}
              answered={answered}
              isCorrect={isCorrect}
              selectedOption={selectedOption}
              textAnswer={textAnswer}
              matchedPairs={matchedPairs}
              reorderWords={reorderWords}
              buildWords={buildWords}
              onSelectOption={checkMultipleChoice}
              onSelectScenario={checkScenario}
              onFillBlankSelect={checkFillBlankDirect}
              onTextChange={setTextAnswer}
              onSubmitText={() => {
                if (currentExercise.type === "translate") checkTranslate();
                else if (currentExercise.type === "fill-blank") checkFillBlankText();
              }}
              onReorderTap={(word) => {
                if (answered) return;
                setReorderWords((prev) =>
                  prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
                );
              }}
              onBuildTap={(word) => {
                if (answered) return;
                setBuildWords((prev) =>
                  prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word],
                );
              }}
              onCheckReorder={checkReorder}
              onCheckBuild={checkBuildSentence}
              onMatchPair={(idx) => {
                setMatchedPairs((prev) => new Set([...prev, idx]));
                if (currentExercise.type === "match-pairs" && matchedPairs.size + 1 >= currentExercise.pairs.length) {
                  setTimeout(() => {
                    setAnswered(true);
                    setIsCorrect(true);
                    awardXP(10);
                    playSound("correct");
                  }, 300);
                }
              }}
            />
          )}
        </ScrollView>

        {/* ── Bottom action ───────────────────────────────────────────── */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: 34,
            paddingTop: 12,
            backgroundColor: BG,
            borderTopWidth: 1,
            borderTopColor: BORDER,
          }}
        >
          {/* Hint token button — only show when not yet answered and tokens available */}
          {!answered && hintCount > 0 && !hintRevealed && currentExercise &&
            (currentExercise.type === "multiple-choice" ||
             currentExercise.type === "fill-blank" ||
             currentExercise.type === "translate") && (
            <Pressable
              onPress={async () => {
                const ok = await consumeHintToken();
                if (!ok) return;
                setHintCount((n) => Math.max(0, n - 1));
                setHintRevealed(true);
                if (currentExercise.type === "fill-blank") {
                  setTextAnswer(currentExercise.answer);
                } else if (currentExercise.type === "translate" && currentExercise.acceptedAnswers?.length) {
                  setTextAnswer(currentExercise.acceptedAnswers[0]);
                } else if (currentExercise.type === "multiple-choice") {
                  setSelectedOption(currentExercise.correctIndex);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 6, backgroundColor: "rgba(212,160,23,0.10)",
                borderRadius: 12, paddingVertical: 10, marginBottom: 10,
                opacity: pressed ? 0.80 : 1,
                borderWidth: 1, borderColor: "rgba(212,160,23,0.25)",
              })}
            >
              <Ionicons name="bulb-outline" size={16} color="#D4A017" />
              <Text style={{ fontSize: 13, fontFamily: F.sansSemi, color: "#D4A017" }}>
                Use Hint Token ({hintCount} left)
              </Text>
            </Pressable>
          )}
          {answered ? (
            <View>
              {/* Feedback */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : "close-circle"}
                  size={22}
                  color={isCorrect ? SUCCESS : DANGER}
                />
                <Text style={{ fontFamily: F.sansSemi, fontSize: 15, color: isCorrect ? SUCCESS : DANGER }}>
                  {isCorrect ? "Correct!" : "Not quite"}
                </Text>
              </View>
              {/* Static explanation */}
              {!isCorrect && currentExercise && "explanation" in currentExercise && (currentExercise as any).explanation && (
                <Text style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
                  {(currentExercise as any).explanation}
                </Text>
              )}

              {/* AI evaluation card */}
              {aiEvalLoading && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "rgba(168,93,46,0.06)", borderRadius: 12 }}>
                  <ActivityIndicator size="small" color={AMBER} />
                  <Text style={{ fontSize: 13, color: AMBER }}>Analyzing your answer…</Text>
                </View>
              )}
              {aiEval && !aiEvalLoading && (
                <View style={{ backgroundColor: "rgba(168,93,46,0.06)", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "rgba(168,93,46,0.12)" }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: AMBER, letterSpacing: 1.2, marginBottom: 8 }}>AI CORRECTION</Text>

                  {/* What you said vs correct */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>You said:</Text>
                    <Text style={{ fontSize: 14, color: DANGER, fontWeight: "600" }}>{aiEval.userSaid}</Text>
                  </View>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>Correct:</Text>
                    <Text style={{ fontSize: 14, color: SUCCESS, fontWeight: "600" }}>{aiEval.correctedVersion}</Text>
                  </View>

                  {/* Error types */}
                  {(Object.entries(aiEval.errors) as [keyof ErrorClassification, string | null][])
                    .filter(([, v]) => !!v)
                    .map(([key, detail]) => (
                      <View key={key} style={{ flexDirection: "row", gap: 6, marginBottom: 4 }}>
                        <Ionicons name="alert-circle" size={14} color={DANGER} style={{ marginTop: 1 }} />
                        <Text style={{ fontSize: 13, color: COLORS.text, flex: 1 }}>
                          <Text style={{ fontWeight: "700", textTransform: "capitalize" }}>{key}: </Text>
                          {detail}
                        </Text>
                      </View>
                    ))
                  }

                  {/* Fix drill */}
                  {aiEval.fixDrill ? (
                    <View style={{ marginTop: 8, backgroundColor: "rgba(168,93,46,0.08)", borderRadius: 10, padding: 10 }}>
                      <Text style={{ fontSize: 11, color: AMBER, fontWeight: "600", marginBottom: 4 }}>REPEAT THIS:</Text>
                      <Text style={{ fontSize: 15, color: COLORS.text, fontWeight: "600" }}>{aiEval.fixDrill}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              <Pressable
                onPress={goNext}
                style={({ pressed }) => ({
                  backgroundColor: AMBER,
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.88 : 1,
                  shadowColor: AMBER,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.30,
                  shadowRadius: 8,
                })}
              >
                <Text style={{ fontFamily: F.sansSemi, fontSize: 16, color: "#FFF", letterSpacing: 0.1 }}>Continue</Text>
              </Pressable>
            </View>
          ) : currentExercise?.type === "vocab-card" ? (
            <Pressable
              onPress={goNext}
              style={({ pressed }) => ({
                backgroundColor: AMBER,
                paddingVertical: 15,
                borderRadius: 14,
                alignItems: "center",
                opacity: pressed ? 0.88 : 1,
              })}
            >
              <Text style={{ fontFamily: F.sansSemi, fontSize: 16, color: "#FFF", letterSpacing: 0.1 }}>Got it</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Tutor modal removed */}

        {/* ── Floating Chatbot Help Button ── */}
        {chatAvailable && !showCompletion && (
          <Pressable
            onPress={() => router.push({
              pathname: "/chatbot",
              params: { lang: langCode, context: lesson?.title || "" },
            })}
            style={{
              position: "absolute",
              bottom: 28,
              left: 18,
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: "#0EA5E9",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0EA5E9",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#FFF" />
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Exercise Renderer ────────────────────────────────────────────────────────

function ExerciseRenderer({
  exercise,
  answered,
  isCorrect,
  selectedOption,
  textAnswer,
  matchedPairs,
  reorderWords,
  buildWords,
  onSelectOption,
  onSelectScenario,
  onFillBlankSelect,
  onTextChange,
  onSubmitText,
  onReorderTap,
  onBuildTap,
  onCheckReorder,
  onCheckBuild,
  onMatchPair,
}: {
  exercise: Exercise;
  answered: boolean;
  isCorrect: boolean;
  selectedOption: number | null;
  textAnswer: string;
  matchedPairs: Set<number>;
  reorderWords: string[];
  buildWords: string[];
  onSelectOption: (idx: number) => void;
  onSelectScenario: (idx: number) => void;
  onFillBlankSelect: (value: string) => void;
  onTextChange: (t: string) => void;
  onSubmitText: () => void;
  onReorderTap: (word: string) => void;
  onBuildTap: (word: string) => void;
  onCheckReorder: () => void;
  onCheckBuild: () => void;
  onMatchPair: (idx: number) => void;
}) {
  switch (exercise.type) {
    case "vocab-card":
      return <VocabCard exercise={exercise} />;
    case "multiple-choice":
      return (
        <MultipleChoice
          exercise={exercise}
          selectedOption={selectedOption}
          answered={answered}
          onSelect={onSelectOption}
        />
      );
    case "translate":
      return (
        <TranslateExercise
          exercise={exercise}
          textAnswer={textAnswer}
          answered={answered}
          isCorrect={isCorrect}
          onTextChange={onTextChange}
          onSubmit={onSubmitText}
        />
      );
    case "fill-blank":
      return (
        <FillBlankExercise
          exercise={exercise}
          textAnswer={textAnswer}
          answered={answered}
          isCorrect={isCorrect}
          onTextChange={onTextChange}
          onSubmit={onSubmitText}
          onOptionSelect={onFillBlankSelect}
        />
      );
    case "match-pairs":
      return (
        <MatchPairsExercise
          exercise={exercise}
          matchedPairs={matchedPairs}
          onMatch={onMatchPair}
        />
      );
    case "reorder":
      return (
        <ReorderExercise
          exercise={exercise}
          selected={reorderWords}
          answered={answered}
          isCorrect={isCorrect}
          onTap={onReorderTap}
          onCheck={onCheckReorder}
        />
      );
    case "build-sentence":
      return (
        <BuildSentenceExercise
          exercise={exercise}
          selected={buildWords}
          answered={answered}
          isCorrect={isCorrect}
          onTap={onBuildTap}
          onCheck={onCheckBuild}
        />
      );
    case "scenario":
      return (
        <ScenarioExercise
          exercise={exercise}
          selectedOption={selectedOption}
          answered={answered}
          onSelect={onSelectScenario}
        />
      );
    default:
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ color: MUTED }}>Exercise type not yet supported.</Text>
        </View>
      );
  }
}

// ── Vocab Card ───────────────────────────────────────────────────────────────

function VocabCard({ exercise }: { exercise: Exercise & { type: "vocab-card" } }) {
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 22, padding: 26, marginTop: 16, borderWidth: 0.5, borderColor: BORDER, alignItems: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}>
      <Text style={{ fontFamily: F.serifBold, fontSize: 42, color: INK, letterSpacing: -0.5 }}>{exercise.word}</Text>
      {exercise.pinyin && (
        <Text style={{ fontFamily: F.sansMed, fontSize: 17, color: AMBER, marginTop: 8, letterSpacing: 0.2 }}>{exercise.pinyin}</Text>
      )}
      {exercise.romanization && (
        <Text style={{ fontFamily: F.sansMed, fontSize: 17, color: AMBER, marginTop: 8, letterSpacing: 0.2 }}>{exercise.romanization}</Text>
      )}
      <Text style={{ fontFamily: F.serifItalic, fontSize: 20, color: MUTED, marginTop: 10 }}>{exercise.translation}</Text>
      {exercise.tip && (
        <View style={{ marginTop: 16, backgroundColor: "rgba(168,93,46,0.07)", borderRadius: 12, padding: 12, width: "100%" }}>
          <Text style={{ fontFamily: F.sans, fontSize: 13, color: AMBER, lineHeight: 20 }}>{exercise.tip}</Text>
        </View>
      )}
      {exercise.example && (
        <View style={{ marginTop: 12, width: "100%" }}>
          <Text style={{ fontFamily: F.serifItalic, fontSize: 15, color: INK, lineHeight: 22 }}>{exercise.example}</Text>
          {exercise.exampleTranslation && (
            <Text style={{ fontFamily: F.sans, fontSize: 13, color: MUTED, marginTop: 4 }}>{exercise.exampleTranslation}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoice({
  exercise,
  selectedOption,
  answered,
  onSelect,
}: {
  exercise: Exercise & { type: "multiple-choice" };
  selectedOption: number | null;
  answered: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text, marginBottom: 16 }}>
        {exercise.question}
      </Text>
      {exercise.options.map((opt, i) => {
        const selected = selectedOption === i;
        const correct = i === exercise.correctIndex;
        let bg = CARD;
        let border = BORDER;
        if (answered) {
          if (correct) { bg = "rgba(34,197,94,0.08)"; border = SUCCESS; }
          else if (selected && !correct) { bg = "rgba(239,68,68,0.08)"; border = DANGER; }
        } else if (selected) {
          bg = "rgba(168,93,46,0.06)"; border = AMBER;
        }
        return (
          <Pressable
            key={i}
            onPress={() => onSelect(i)}
            disabled={answered}
            style={{ backgroundColor: bg, borderWidth: 1.5, borderColor: border, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: answered && correct ? SUCCESS : selected ? AMBER : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" }}>
              {answered && correct && <Ionicons name="checkmark" size={16} color={SUCCESS} />}
              {answered && selected && !correct && <Ionicons name="close" size={16} color={DANGER} />}
            </View>
            <Text style={{ fontSize: 15, color: COLORS.text, flex: 1 }}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Translate ────────────────────────────────────────────────────────────────

function TranslateExercise({
  exercise,
  textAnswer,
  answered,
  isCorrect,
  onTextChange,
  onSubmit,
}: {
  exercise: Exercise & { type: "translate" };
  textAnswer: string;
  answered: boolean;
  isCorrect: boolean;
  onTextChange: (t: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontFamily: F.sansSemi, fontSize: 10, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2 }}>
        Translate {exercise.promptLang === "target" ? "to English" : ""}
      </Text>
      <View style={{ backgroundColor: "rgba(168,93,46,0.07)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontFamily: F.serifBold, fontSize: 22, color: INK, letterSpacing: -0.3 }}>{exercise.prompt}</Text>
      </View>
      <TextInput
        value={textAnswer}
        onChangeText={onTextChange}
        placeholder="Type your answer…"
        placeholderTextColor={MUTED}
        editable={!answered}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: CARD,
          borderWidth: 1.5,
          borderColor: answered ? (isCorrect ? SUCCESS : DANGER) : BORDER,
          borderRadius: 14,
          padding: 16,
          fontSize: 17,
          color: COLORS.text,
          marginBottom: 12,
        }}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
      />
      {!answered && textAnswer.trim().length > 0 && (
        <Pressable onPress={onSubmit} style={{ backgroundColor: AMBER, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Check</Text>
        </Pressable>
      )}
      {answered && !isCorrect && (
        <Text style={{ fontSize: 13, color: SUCCESS, marginTop: 4 }}>
          Accepted: {exercise.acceptedAnswers.join(", ")}
        </Text>
      )}
    </View>
  );
}

// ── Fill Blank ───────────────────────────────────────────────────────────────

function FillBlankExercise({
  exercise,
  textAnswer,
  answered,
  isCorrect,
  onTextChange,
  onSubmit,
  onOptionSelect,
}: {
  exercise: Exercise & { type: "fill-blank" };
  textAnswer: string;
  answered: boolean;
  isCorrect: boolean;
  onTextChange: (t: string) => void;
  onSubmit: () => void;
  onOptionSelect: (value: string) => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontFamily: F.sansSemi, fontSize: 10, color: MUTED, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>
        Fill in the blank
      </Text>
      <Text style={{ fontFamily: F.serifBold, fontSize: 20, color: INK, letterSpacing: -0.2, marginBottom: 16 }}>
        {exercise.sentence}
      </Text>
      {exercise.options ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {exercise.options.map((opt, i) => {
            const selected = textAnswer === opt;
            return (
              <Pressable
                key={i}
                onPress={() => onOptionSelect(opt)}
                disabled={answered}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: selected ? (answered ? (isCorrect ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)") : "rgba(168,93,46,0.1)") : CARD,
                  borderWidth: 1.5,
                  borderColor: selected ? (answered ? (isCorrect ? SUCCESS : DANGER) : AMBER) : BORDER,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: selected && answered ? (isCorrect ? SUCCESS : DANGER) : selected ? AMBER : COLORS.text }}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View>
          <TextInput
            value={textAnswer}
            onChangeText={onTextChange}
            placeholder="Your answer…"
            placeholderTextColor={MUTED}
            editable={!answered}
            autoCapitalize="none"
            style={{ backgroundColor: CARD, borderWidth: 1.5, borderColor: answered ? (isCorrect ? SUCCESS : DANGER) : BORDER, borderRadius: 14, padding: 16, fontSize: 17, color: COLORS.text, marginBottom: 12 }}
            onSubmitEditing={onSubmit}
          />
          {!answered && textAnswer.trim() && (
            <Pressable onPress={onSubmit} style={{ backgroundColor: AMBER, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Check</Text>
            </Pressable>
          )}
        </View>
      )}
      {answered && !isCorrect && (
        <Text style={{ fontSize: 13, color: SUCCESS, marginTop: 4 }}>Answer: {exercise.answer}</Text>
      )}
    </View>
  );
}

// ── Match Pairs ──────────────────────────────────────────────────────────────

function MatchPairsExercise({
  exercise,
  matchedPairs,
  onMatch,
}: {
  exercise: Exercise & { type: "match-pairs" };
  matchedPairs: Set<number>;
  onMatch: (idx: number) => void;
}) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const shuffledRight = useMemo(() => {
    const indices = exercise.pairs.map((_, i) => i);
    // Simple deterministic shuffle based on pair count
    for (let i = indices.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [exercise.pairs]);

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, color: MUTED, marginBottom: 12, textTransform: "uppercase", fontWeight: "600", letterSpacing: 0.5 }}>
        Match the pairs
      </Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* Left column */}
        <View style={{ flex: 1, gap: 8 }}>
          {exercise.pairs.map((pair, i) => (
            <Pressable
              key={i}
              onPress={() => !matchedPairs.has(i) && setSelectedLeft(i)}
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: matchedPairs.has(i) ? "rgba(34,197,94,0.08)" : selectedLeft === i ? "rgba(168,93,46,0.1)" : CARD,
                borderWidth: 1.5,
                borderColor: matchedPairs.has(i) ? SUCCESS : selectedLeft === i ? AMBER : BORDER,
                opacity: matchedPairs.has(i) ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.text, textAlign: "center" }}>{pair.left}</Text>
            </Pressable>
          ))}
        </View>
        {/* Right column (shuffled) */}
        <View style={{ flex: 1, gap: 8 }}>
          {shuffledRight.map((realIdx) => (
            <Pressable
              key={realIdx}
              onPress={() => {
                if (matchedPairs.has(realIdx)) return;
                if (selectedLeft === realIdx) {
                  onMatch(realIdx);
                  setSelectedLeft(null);
                } else {
                  setSelectedLeft(null);
                }
              }}
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: matchedPairs.has(realIdx) ? "rgba(34,197,94,0.08)" : CARD,
                borderWidth: 1.5,
                borderColor: matchedPairs.has(realIdx) ? SUCCESS : BORDER,
                opacity: matchedPairs.has(realIdx) ? 0.6 : 1,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.text, textAlign: "center" }}>
                {exercise.pairs[realIdx].right}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Reorder / Build Sentence ─────────────────────────────────────────────────

function ReorderExercise({
  exercise,
  selected,
  answered,
  isCorrect,
  onTap,
  onCheck,
}: {
  exercise: Exercise & { type: "reorder" };
  selected: string[];
  answered: boolean;
  isCorrect: boolean;
  onTap: (word: string) => void;
  onCheck: () => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, color: MUTED, marginBottom: 4, textTransform: "uppercase", fontWeight: "600", letterSpacing: 0.5 }}>
        Put the words in order
      </Text>
      <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 16 }}>
        {exercise.translation}
      </Text>
      {/* Selected area */}
      <View style={{ minHeight: 56, backgroundColor: "rgba(168,93,46,0.04)", borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 8, borderWidth: 1.5, borderColor: answered ? (isCorrect ? SUCCESS : DANGER) : BORDER }}>
        {selected.map((w, i) => (
          <Pressable key={i} onPress={() => onTap(w)} disabled={answered} style={{ backgroundColor: AMBER, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFF" }}>{w}</Text>
          </Pressable>
        ))}
        {selected.length === 0 && <Text style={{ fontSize: 14, color: MUTED }}>Tap words below…</Text>}
      </View>
      {/* Word bank */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {exercise.words.map((w, i) => (
          <Pressable
            key={i}
            onPress={() => onTap(w)}
            disabled={answered || selected.includes(w)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: selected.includes(w) ? "transparent" : CARD,
              borderWidth: 1.5,
              borderColor: selected.includes(w) ? "transparent" : BORDER,
              opacity: selected.includes(w) ? 0.3 : 1,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.text }}>{w}</Text>
          </Pressable>
        ))}
      </View>
      {!answered && selected.length > 0 && (
        <Pressable onPress={onCheck} style={{ backgroundColor: AMBER, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Check</Text>
        </Pressable>
      )}
      {answered && !isCorrect && (
        <Text style={{ fontSize: 13, color: SUCCESS, marginTop: 4 }}>Correct: {exercise.correctOrder.join(" ")}</Text>
      )}
    </View>
  );
}

function BuildSentenceExercise({
  exercise,
  selected,
  answered,
  isCorrect,
  onTap,
  onCheck,
}: {
  exercise: Exercise & { type: "build-sentence" };
  selected: string[];
  answered: boolean;
  isCorrect: boolean;
  onTap: (word: string) => void;
  onCheck: () => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, color: MUTED, marginBottom: 4, textTransform: "uppercase", fontWeight: "600", letterSpacing: 0.5 }}>
        Build the sentence
      </Text>
      <Text style={{ fontSize: 16, color: COLORS.text, marginBottom: 16 }}>
        {exercise.translation}
      </Text>
      <View style={{ minHeight: 56, backgroundColor: "rgba(168,93,46,0.04)", borderRadius: 14, padding: 12, marginBottom: 12, flexDirection: "row", flexWrap: "wrap", gap: 8, borderWidth: 1.5, borderColor: answered ? (isCorrect ? SUCCESS : DANGER) : BORDER }}>
        {selected.map((w, i) => (
          <Pressable key={i} onPress={() => onTap(w)} disabled={answered} style={{ backgroundColor: AMBER, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFF" }}>{w}</Text>
          </Pressable>
        ))}
        {selected.length === 0 && <Text style={{ fontSize: 14, color: MUTED }}>Tap words below…</Text>}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {exercise.wordBank.map((w, i) => (
          <Pressable
            key={i}
            onPress={() => onTap(w)}
            disabled={answered || selected.includes(w)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: selected.includes(w) ? "transparent" : CARD,
              borderWidth: 1.5,
              borderColor: selected.includes(w) ? "transparent" : BORDER,
              opacity: selected.includes(w) ? 0.3 : 1,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "500", color: COLORS.text }}>{w}</Text>
          </Pressable>
        ))}
      </View>
      {!answered && selected.length > 0 && (
        <Pressable onPress={onCheck} style={{ backgroundColor: AMBER, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFF" }}>Check</Text>
        </Pressable>
      )}
      {answered && !isCorrect && (
        <Text style={{ fontSize: 13, color: SUCCESS, marginTop: 4 }}>Correct: {exercise.correctOrder.join(" ")}</Text>
      )}
    </View>
  );
}

// ── Scenario ─────────────────────────────────────────────────────────────────

function ScenarioExercise({
  exercise,
  selectedOption,
  answered,
  onSelect,
}: {
  exercise: Exercise & { type: "scenario" };
  selectedOption: number | null;
  answered: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ backgroundColor: "rgba(168,93,46,0.06)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <Text style={{ fontSize: 13, color: AMBER, fontWeight: "600", marginBottom: 8 }}>
          {exercise.situation}
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text }}>{exercise.npcLine}</Text>
        {exercise.npcLinePinyin && (
          <Text style={{ fontSize: 14, color: AMBER, marginTop: 4 }}>{exercise.npcLinePinyin}</Text>
        )}
        {exercise.npcLineTranslation && (
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{exercise.npcLineTranslation}</Text>
        )}
      </View>
      {exercise.options.map((opt, i) => {
        const selected = selectedOption === i;
        let bg = CARD;
        let border = BORDER;
        if (answered && selected) {
          bg = opt.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)";
          border = opt.correct ? SUCCESS : DANGER;
        } else if (answered && opt.correct) {
          bg = "rgba(34,197,94,0.06)";
          border = SUCCESS;
        }
        return (
          <Pressable
            key={i}
            onPress={() => {
              if (!answered) {
                onSelect(i);
              }
            }}
            disabled={answered}
            style={{ backgroundColor: bg, borderWidth: 1.5, borderColor: border, borderRadius: 14, padding: 16, marginBottom: 10 }}
          >
            <Text style={{ fontSize: 15, color: COLORS.text }}>{opt.text}</Text>
            {answered && selected && (
              <Text style={{ fontSize: 13, color: opt.correct ? SUCCESS : DANGER, marginTop: 6 }}>
                {opt.feedback}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
