// ── Unit Exam Screen ─────────────────────────────────────────────────────────
//
// Flow:
//   Phase 1 — 10 Multiple Choice
//   Phase 2 — 5 Listening (TTS plays phrase, pick meaning)
//   Phase 3 — 5 Typing (English → target language)
//   Phase 4 — Oral Exam (hear & repeat, >50% phrases = pass)
//   Phase 5 — Certificate
//
// Passes if: overall score ≥ 60% AND oral section ≥ 50% correct

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Speech from "expo-speech";

import { getUnitExam, getLanguageExam, type UnitExam } from "@/data/exam-questions";
import { recognizeSpeechOnce } from "@/lib/native-speech";
import { comparePronunciation } from "@/lib/pronunciation-feedback";
import { getUserProfile } from "@/lib/user-store";

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0F0D0B",
  card: "#1C1714",
  cardBorder: "rgba(255,255,255,0.07)",
  amber: "#C8804A",
  amberLight: "rgba(200,128,74,0.15)",
  amberBorder: "rgba(200,128,74,0.30)",
  green: "#4CAF7D",
  greenBg: "rgba(76,175,125,0.12)",
  red: "#E05A4E",
  redBg: "rgba(224,90,78,0.10)",
  text: "#FFFFFF",
  textSub: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.30)",
  hair: "rgba(255,255,255,0.08)",
  gold: "#C9A465",
  goldBg: "rgba(201,164,101,0.12)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[āáǎà]/g, "a").replace(/[ēéěè]/g, "e").replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o").replace(/[ūúǔù]/g, "u").replace(/[ǖǘǚǜ]/g, "u")
    .replace(/[¿¡?!.,;:'"]/g, "").replace(/\s+/g, " ").trim();
}

function checkTypeAnswer(input: string, accepted: string[]): boolean {
  const norm = normalize(input);
  return accepted.some((a) => normalize(a) === norm || normalize(a).startsWith(norm));
}

function langToTTSLocale(langCode: string): string {
  if (langCode.startsWith("zh")) return "zh-CN";
  if (langCode.startsWith("es")) return "es-MX";
  if (langCode.startsWith("fr")) return "fr-FR";
  if (langCode.startsWith("de")) return "de-DE";
  if (langCode.startsWith("ja")) return "ja-JP";
  return "en-US";
}

const PHASE_LABELS = ["Multiple Choice", "Listening", "Typing", "Oral Exam", "Certificate"];
const PHASE_ICONS: Array<"help-circle-outline" | "volume-high-outline" | "pencil-outline" | "mic-outline" | "ribbon-outline"> =
  ["help-circle-outline", "volume-high-outline", "pencil-outline", "mic-outline", "ribbon-outline"];

// ── Main Component ───────────────────────────────────────────────────────────
export default function UnitExamScreen() {
  const { unitId, examId, lang } = useLocalSearchParams<{ unitId?: string; examId?: string; lang: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const exam: UnitExam | null = examId
    ? getLanguageExam(examId)
    : getUnitExam(unitId || "");

  // ── State ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0); // 0=MC,1=Listen,2=Type,3=Oral,4=Cert
  const [qIndex, setQIndex] = useState(0);

  // MC
  const [mcAnswers, setMcAnswers] = useState<(number | null)[]>([]);
  const [mcSelected, setMcSelected] = useState<number | null>(null);
  const [mcShowResult, setMcShowResult] = useState(false);

  // Listen
  const [listenPlaying, setListenPlaying] = useState(false);
  const [listenHasPlayed, setListenHasPlayed] = useState(false);
  const [listenAnswers, setListenAnswers] = useState<(number | null)[]>([]);
  const [listenSelected, setListenSelected] = useState<number | null>(null);
  const [listenShowResult, setListenShowResult] = useState(false);

  // Type
  const [typeInput, setTypeInput] = useState("");
  const [typeAnswers, setTypeAnswers] = useState<boolean[]>([]);
  const [typeSubmitted, setTypeSubmitted] = useState(false);
  const [typeCorrect, setTypeCorrect] = useState(false);

  // Oral
  const [oralState, setOralState] = useState<"idle" | "speaking-phrase" | "listening" | "scoring" | "result">("idle");
  const [oralResults, setOralResults] = useState<boolean[]>([]);
  const [oralHeard, setOralHeard] = useState("");
  const [oralScore, setOralScore] = useState(0);
  const [oralPassed, setOralPassed] = useState(false);

  // Certificate
  const [userName, setUserName] = useState("You");
  const [certDate] = useState(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  // ── Animations ────────────────────────────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1, true,
    );
  }, []);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p.userName) setUserName(p.userName);
    });
  }, []);

  if (!exam) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
        <Text style={{ color: C.textSub, marginTop: 12, fontFamily: "Geist-Regular" }}>No exam found for this unit.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: C.amber, borderRadius: 20 }}>
          <Text style={{ color: "#FFF", fontFamily: "Geist-Bold" }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }
  // TypeScript narrowing: exam is non-null from here
  const ex: UnitExam = exam;

  // ── Score helpers ─────────────────────────────────────────────────────────
  const mcScore = mcAnswers.filter((a, i) => a === ex.mc[i]?.correctIndex).length;
  const listenScore = listenAnswers.filter((a, i) => a === ex.listen[i]?.correctIndex).length;
  const typeScore = typeAnswers.filter(Boolean).length;
  const oralScore_ = oralResults.filter(Boolean).length;
  const totalPossible = ex.mc.length + ex.listen.length + ex.type.length;
  const totalScore = mcScore + listenScore + typeScore;
  const overallPct = Math.round((totalScore / totalPossible) * 100);
  const oralPct = ex.oral.length > 0 ? Math.round((oralScore_ / ex.oral.length) * 100) : 100;
  const passed = overallPct >= 60 && oralPct >= 50;

  // ── MC Phase ──────────────────────────────────────────────────────────────
  function handleMCSelect(idx: number) {
    if (mcShowResult) return;
    setMcSelected(idx);
    setMcShowResult(true);
    setTimeout(() => {
      const updated = [...mcAnswers, idx];
      setMcAnswers(updated);
      const next = qIndex + 1;
      if (next >= ex.mc.length) {
        setPhase(1);
        setQIndex(0);
        setMcSelected(null);
        setMcShowResult(false);
      } else {
        setQIndex(next);
        setMcSelected(null);
        setMcShowResult(false);
      }
    }, 1000);
  }

  // ── Listen Phase ──────────────────────────────────────────────────────────
  async function handleListenPlay() {
    if (listenPlaying) return;
    const q = ex.listen[qIndex];
    if (!q) return;
    setListenPlaying(true);
    setListenHasPlayed(false);
    Speech.speak(q.audioText, {
      language: q.audioLang,
      rate: 0.85,
      onDone: () => { setListenPlaying(false); setListenHasPlayed(true); },
      onError: () => { setListenPlaying(false); setListenHasPlayed(true); },
    });
  }

  function handleListenSelect(idx: number) {
    if (listenShowResult || !listenHasPlayed) return;
    setListenSelected(idx);
    setListenShowResult(true);
    setTimeout(() => {
      const updated = [...listenAnswers, idx];
      setListenAnswers(updated);
      const next = qIndex + 1;
      if (next >= ex.listen.length) {
        setPhase(2);
        setQIndex(0);
        setListenSelected(null);
        setListenShowResult(false);
        setListenHasPlayed(false);
      } else {
        setQIndex(next);
        setListenSelected(null);
        setListenShowResult(false);
        setListenHasPlayed(false);
      }
    }, 1000);
  }

  // ── Type Phase ────────────────────────────────────────────────────────────
  function handleTypeSubmit() {
    const q = ex.type[qIndex];
    if (!q || !typeInput.trim()) return;
    const correct = checkTypeAnswer(typeInput.trim(), q.acceptedAnswers);
    setTypeCorrect(correct);
    setTypeSubmitted(true);
    setTimeout(() => {
      const updated = [...typeAnswers, correct];
      setTypeAnswers(updated);
      const next = qIndex + 1;
      if (next >= ex.type.length) {
        setPhase(3);
        setQIndex(0);
        setTypeInput("");
        setTypeSubmitted(false);
        setOralState("idle");
      } else {
        setQIndex(next);
        setTypeInput("");
        setTypeSubmitted(false);
      }
    }, 1100);
  }

  // ── Oral Phase ────────────────────────────────────────────────────────────
  async function handleOralSpeak() {
    const q = ex.oral[qIndex];
    if (!q) return;
    setOralState("speaking-phrase");
    Speech.speak(q.phrase, {
      language: langToTTSLocale(ex.langCode),
      rate: 0.75,
      onDone: () => setOralState("idle"),
      onError: () => setOralState("idle"),
    });
  }

  async function handleOralRecord() {
    const q = ex.oral[qIndex];
    if (!q) return;
    setOralState("listening");
    setOralHeard("");
    try {
      const heard = await recognizeSpeechOnce({
        languageCode: ex.langCode,
        requiresOnDevice: false,
        timeoutMs: 8000,
      });
      setOralHeard(heard);
      setOralState("scoring");
      const feedback = comparePronunciation(heard, q.phrase);
      const thisPass = feedback.score >= 0.45;
      setOralScore(Math.round(feedback.score * 100));
      setOralPassed(thisPass);
      setOralState("result");
    } catch {
      setOralHeard("(couldn't hear)");
      setOralScore(0);
      setOralPassed(false);
      setOralState("result");
    }
  }

  function handleOralNext() {
    const updated = [...oralResults, oralPassed];
    setOralResults(updated);
    const next = qIndex + 1;
    if (next >= ex.oral.length) {
      setPhase(4);
    } else {
      setQIndex(next);
      setOralState("idle");
      setOralHeard("");
      setOralScore(0);
      setOralPassed(false);
    }
  }

  // ── Progress bar helper ───────────────────────────────────────────────────
  function PhaseProgress() {
    const total = PHASE_LABELS.length;
    return (
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, marginBottom: 20 }}>
        {PHASE_LABELS.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{
              height: 3, width: "100%", borderRadius: 99,
              backgroundColor: i < phase ? C.green : i === phase ? C.amber : C.hair,
            }} />
            <Ionicons
              name={PHASE_ICONS[i]}
              size={12}
              color={i < phase ? C.green : i === phase ? C.amber : C.textMuted}
            />
          </View>
        ))}
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      {/* Header */}
      {phase < 4 && (
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="close" size={18} color={C.textSub} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: C.text, letterSpacing: 0.3 }}>
              {PHASE_LABELS[phase]}
            </Text>
            <Text style={{ fontFamily: "Geist-Regular", fontSize: 11, color: C.textMuted, marginTop: 1 }}>
              {exam.unitTitle}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Phase progress bar */}
      {phase < 4 && <PhaseProgress />}

      {/* ── PHASE 0: Multiple Choice ── */}
      {phase === 0 && (() => {
        const q = ex.mc[qIndex];
        if (!q) return null;
        return (
          <Animated.View entering={FadeInDown.duration(220)} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              {/* Question counter */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                  Question {qIndex + 1} of {ex.mc.length}
                </Text>
                <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 11, color: C.amber }}>{mcScore} correct</Text>
                </View>
              </View>

              {/* Question card */}
              <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: C.cardBorder, marginBottom: 20 }}>
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 20, color: C.text, lineHeight: 28 }}>{q.question}</Text>
              </View>

              {/* Options */}
              {q.options.map((opt, i) => {
                const isSelected = mcSelected === i;
                const isCorrect = i === q.correctIndex;
                const showingResult = mcShowResult;
                let bg = C.card;
                let border = C.cardBorder;
                let textColor = C.textSub;
                if (showingResult) {
                  if (isCorrect) { bg = C.greenBg; border = C.green; textColor = C.green; }
                  else if (isSelected && !isCorrect) { bg = C.redBg; border = C.red; textColor = C.red; }
                }
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleMCSelect(i)}
                    style={{ backgroundColor: bg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: border, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: textColor }}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: "Geist-Medium", fontSize: 16, color: textColor, flex: 1 }}>{opt}</Text>
                    {showingResult && isCorrect && <Ionicons name="checkmark-circle" size={20} color={C.green} />}
                    {showingResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color={C.red} />}
                  </Pressable>
                );
              })}

              {/* Explanation */}
              {mcShowResult && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <View style={{ backgroundColor: C.amberLight, borderRadius: 12, padding: 14, marginTop: 4, borderWidth: 0.5, borderColor: C.amberBorder }}>
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: C.amber, lineHeight: 19 }}>
                      {q.explanation}
                    </Text>
                  </View>
                </Animated.View>
              )}
            </ScrollView>
          </Animated.View>
        );
      })()}

      {/* ── PHASE 1: Listening ── */}
      {phase === 1 && (() => {
        const q = ex.listen[qIndex];
        if (!q) return null;
        return (
          <Animated.View entering={FadeInDown.duration(220)} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                  Listen {qIndex + 1} of {ex.listen.length}
                </Text>
                <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 11, color: C.amber }}>{listenScore} correct</Text>
                </View>
              </View>

              {/* Play button */}
              <Pressable
                onPress={handleListenPlay}
                disabled={listenPlaying}
                style={{ backgroundColor: C.card, borderRadius: 24, padding: 32, alignItems: "center", borderWidth: 1, borderColor: listenHasPlayed ? C.amberBorder : C.cardBorder, marginBottom: 24, gap: 12 }}
              >
                {listenPlaying ? (
                  <ActivityIndicator size="large" color={C.amber} />
                ) : (
                  <Animated.View style={listenHasPlayed ? undefined : orbStyle}>
                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: listenHasPlayed ? C.amberLight : "rgba(200,128,74,0.25)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="volume-high" size={32} color={C.amber} />
                    </View>
                  </Animated.View>
                )}
                <Text style={{ fontFamily: "Geist-Medium", fontSize: 14, color: listenHasPlayed ? C.textSub : C.amber }}>
                  {listenPlaying ? "Playing…" : listenHasPlayed ? "Play again" : "Tap to listen"}
                </Text>
              </Pressable>

              {/* Hint when not yet played */}
              {!listenHasPlayed && (
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: C.textMuted, textAlign: "center", marginBottom: 16 }}>
                  Listen to the phrase, then pick its meaning below.
                </Text>
              )}

              {/* Options */}
              {q.options.map((opt, i) => {
                const isSelected = listenSelected === i;
                const isCorrect = i === q.correctIndex;
                const showingResult = listenShowResult;
                let bg = C.card;
                let border = C.cardBorder;
                let textColor = C.textSub;
                let opacity = listenHasPlayed ? 1 : 0.4;
                if (showingResult) {
                  opacity = 1;
                  if (isCorrect) { bg = C.greenBg; border = C.green; textColor = C.green; }
                  else if (isSelected && !isCorrect) { bg = C.redBg; border = C.red; textColor = C.red; }
                }
                return (
                  <Pressable
                    key={i}
                    onPress={() => handleListenSelect(i)}
                    disabled={!listenHasPlayed || listenShowResult}
                    style={{ backgroundColor: bg, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: border, flexDirection: "row", alignItems: "center", gap: 12, opacity }}
                  >
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: textColor }}>
                        {String.fromCharCode(65 + i)}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: "Geist-Medium", fontSize: 16, color: textColor, flex: 1 }}>{opt}</Text>
                    {showingResult && isCorrect && <Ionicons name="checkmark-circle" size={20} color={C.green} />}
                    {showingResult && isSelected && !isCorrect && <Ionicons name="close-circle" size={20} color={C.red} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        );
      })()}

      {/* ── PHASE 2: Typing ── */}
      {phase === 2 && (() => {
        const q = ex.type[qIndex];
        if (!q) return null;
        return (
          <Animated.View entering={FadeInDown.duration(220)} style={{ flex: 1 }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                    Typing {qIndex + 1} of {ex.type.length}
                  </Text>
                  <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 11, color: C.amber }}>{typeScore} correct</Text>
                  </View>
                </View>

                {/* Prompt */}
                <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, borderWidth: 0.5, borderColor: C.cardBorder, marginBottom: 20, alignItems: "center" }}>
                  <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Translate to {ex.langCode === "zh" ? "Mandarin" : ex.langCode === "es" ? "Spanish" : "French"}</Text>
                  <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 26, color: C.text, textAlign: "center", lineHeight: 34 }}>
                    {q.prompt}
                  </Text>
                </View>

                {/* Text input */}
                <View style={{
                  backgroundColor: typeSubmitted ? (typeCorrect ? C.greenBg : C.redBg) : C.card,
                  borderRadius: 16, borderWidth: 1.5,
                  borderColor: typeSubmitted ? (typeCorrect ? C.green : C.red) : C.cardBorder,
                  marginBottom: 14,
                }}>
                  <TextInput
                    value={typeInput}
                    onChangeText={setTypeInput}
                    editable={!typeSubmitted}
                    placeholder={`Type in ${exam.langCode === "zh" ? "Mandarin or Pinyin" : exam.langCode === "es" ? "Spanish" : "French"}…`}
                    placeholderTextColor={C.textMuted}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleTypeSubmit}
                    style={{ padding: 18, fontFamily: "Geist-Regular", fontSize: 18, color: typeSubmitted ? (typeCorrect ? C.green : C.red) : C.text }}
                  />
                </View>

                {/* Result feedback */}
                {typeSubmitted && (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <View style={{ borderRadius: 12, padding: 14, backgroundColor: typeCorrect ? C.greenBg : C.redBg, borderWidth: 0.5, borderColor: typeCorrect ? C.green : C.red, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
                      <Ionicons name={typeCorrect ? "checkmark-circle" : "close-circle"} size={20} color={typeCorrect ? C.green : C.red} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: typeCorrect ? C.green : C.red }}>
                          {typeCorrect ? "Correct!" : "Not quite"}
                        </Text>
                        {!typeCorrect && (
                          <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: C.textSub, marginTop: 4 }}>
                            Accepted: {q.acceptedAnswers[0]}
                          </Text>
                        )}
                        <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                          Hint: {q.hint}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                )}

                {/* Submit button */}
                {!typeSubmitted && (
                  <Pressable
                    onPress={handleTypeSubmit}
                    disabled={!typeInput.trim()}
                    style={({ pressed }) => ({
                      backgroundColor: typeInput.trim() ? C.amber : "rgba(200,128,74,0.25)",
                      borderRadius: 16, paddingVertical: 15, alignItems: "center",
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>Submit</Text>
                  </Pressable>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        );
      })()}

      {/* ── PHASE 3: Oral Exam ── */}
      {phase === 3 && (() => {
        const q = ex.oral[qIndex];
        if (!q) return null;
        const doneCount = oralResults.length;
        return (
          <Animated.View entering={FadeInDown.duration(220)} style={{ flex: 1, paddingHorizontal: 20 }}>
            {/* Counter */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>
                Oral {qIndex + 1} of {ex.oral.length}
              </Text>
              <View style={{ backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 11, color: C.amber }}>{doneCount} done</Text>
              </View>
            </View>

            {/* Phrase card */}
            <View style={{ backgroundColor: C.card, borderRadius: 24, padding: 28, borderWidth: 0.5, borderColor: C.cardBorder, alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Listen & Repeat</Text>
              <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 28, color: C.text, textAlign: "center", lineHeight: 38, marginBottom: 8 }}>{q.phrase}</Text>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 15, color: C.amber, marginBottom: 4 }}>{q.phonetic}</Text>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: C.textMuted }}>{q.meaning}</Text>
            </View>

            {/* Speak button */}
            <Pressable
              onPress={handleOralSpeak}
              disabled={oralState === "speaking-phrase"}
              style={{ backgroundColor: C.card, borderRadius: 16, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 12, borderWidth: 0.5, borderColor: C.amberBorder }}
            >
              <Ionicons name="volume-high-outline" size={20} color={C.amber} />
              <Text style={{ fontFamily: "Geist-Medium", fontSize: 15, color: C.amber }}>
                {oralState === "speaking-phrase" ? "Playing…" : "Hear the phrase"}
              </Text>
            </Pressable>

            {/* Mic button */}
            {oralState !== "result" && (
              <Pressable
                onPress={handleOralRecord}
                disabled={oralState === "listening" || oralState === "speaking-phrase" || oralState === "scoring"}
                style={({ pressed }) => ({
                  borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10,
                  backgroundColor: oralState === "listening" ? "rgba(200,128,74,0.3)" : C.amber,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {oralState === "listening" ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>Listening…</Text>
                  </>
                ) : oralState === "scoring" ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>Scoring…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="mic" size={20} color="#FFF" />
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>Speak now</Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Oral result */}
            {oralState === "result" && (
              <Animated.View entering={FadeInUp.duration(280)}>
                <View style={{ backgroundColor: oralPassed ? C.greenBg : C.redBg, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: oralPassed ? C.green : C.red, marginTop: 12, marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Ionicons name={oralPassed ? "checkmark-circle" : "close-circle"} size={22} color={oralPassed ? C.green : C.red} />
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: oralPassed ? C.green : C.red }}>
                      {oralPassed ? "Well done!" : "Keep practicing"}
                    </Text>
                    <Text style={{ marginLeft: "auto", fontFamily: "Geist-Bold", fontSize: 14, color: oralPassed ? C.green : C.red }}>
                      {oralScore}%
                    </Text>
                  </View>
                  {oralHeard ? (
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: C.textSub }}>
                      I heard: <Text style={{ fontStyle: "italic" }}>"{oralHeard}"</Text>
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  onPress={handleOralNext}
                  style={({ pressed }) => ({ backgroundColor: C.amber, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>
                    {qIndex + 1 < exam.oral.length ? "Next →" : "See Results →"}
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        );
      })()}

      {/* ── PHASE 4: Certificate ── */}
      {phase === 4 && (
        <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
            {/* Result header */}
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: passed ? C.greenBg : C.redBg, borderWidth: 2, borderColor: passed ? C.green : C.red, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name={passed ? "checkmark" : "close"} size={36} color={passed ? C.green : C.red} />
              </View>
              <Text style={{ fontFamily: "Geist-Bold", fontSize: 28, color: passed ? C.green : C.red, marginBottom: 4 }}>
                {passed ? "Exam Passed!" : "Not Passed Yet"}
              </Text>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: C.textSub, textAlign: "center" }}>
                {passed ? `You demonstrated ${ex.cefrLevel} proficiency in ${ex.unitTitle}` : "Keep studying and try again — you're making progress!"}
              </Text>
            </View>

            {/* Score breakdown */}
            <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, borderWidth: 0.5, borderColor: C.cardBorder, marginBottom: 20 }}>
              <Text style={{ fontFamily: "Geist-Bold", fontSize: 12, color: C.textMuted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>Score Breakdown</Text>
              {[
                { label: "Multiple Choice", score: mcScore, total: ex.mc.length, icon: "help-circle-outline" as const },
                { label: "Listening", score: listenScore, total: ex.listen.length, icon: "volume-high-outline" as const },
                { label: "Typing", score: typeScore, total: ex.type.length, icon: "pencil-outline" as const },
                { label: "Oral Exam", score: oralScore_, total: ex.oral.length, icon: "mic-outline" as const },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={row.icon} size={16} color={C.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Geist-Medium", fontSize: 13, color: C.text, marginBottom: 4 }}>{row.label}</Text>
                    <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99 }}>
                      <View style={{ height: 6, width: `${Math.round((row.score / Math.max(row.total, 1)) * 100)}%`, backgroundColor: row.score / row.total >= 0.6 ? C.green : C.amber, borderRadius: 99 }} />
                    </View>
                  </View>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: C.text }}>{row.score}/{row.total}</Text>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: C.hair, marginVertical: 12 }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: C.text }}>Overall</Text>
                <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 24, color: passed ? C.green : C.amber }}>{overallPct}%</Text>
              </View>
            </View>

            {/* Certificate card */}
            {passed && (
              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <View style={{
                  borderRadius: 24, overflow: "hidden", marginBottom: 20,
                  borderWidth: 1.5, borderColor: C.gold,
                  backgroundColor: "#1A1508",
                }}>
                  {/* Gold top bar */}
                  <View style={{ height: 6, backgroundColor: C.gold }} />
                  <View style={{ padding: 28, alignItems: "center" }}>
                    {/* Crest */}
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldBg, borderWidth: 1.5, borderColor: C.gold, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Ionicons name="ribbon" size={30} color={C.gold} />
                    </View>

                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 11, color: C.gold, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 6 }}>
                      Certificate of Achievement
                    </Text>
                    <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 22, color: "#FFF", textAlign: "center", lineHeight: 30, marginBottom: 4 }}>
                      {ex.certificateTitle}
                    </Text>
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 20 }}>
                      {ex.unitTitle}
                    </Text>

                    {/* Divider */}
                    <View style={{ width: "60%", height: 1, backgroundColor: "rgba(201,164,101,0.25)", marginBottom: 20 }} />

                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "rgba(255,255,255,0.40)", marginBottom: 4 }}>
                      Awarded to
                    </Text>
                    <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 20, color: C.gold, marginBottom: 16 }}>{userName}</Text>

                    {/* CEFR badge */}
                    <View style={{ backgroundColor: C.goldBg, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(201,164,101,0.40)", marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="star" size={14} color={C.gold} />
                      <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: C.gold }}>
                        CEFR {ex.cefrLevel} · {ex.cefrLabel}
                      </Text>
                    </View>

                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                      {certDate}
                    </Text>
                  </View>
                  {/* Gold bottom bar */}
                  <View style={{ height: 4, backgroundColor: C.gold, opacity: 0.5 }} />
                </View>
              </Animated.View>
            )}

            {/* Action buttons */}
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({ backgroundColor: C.amber, borderRadius: 16, paddingVertical: 16, alignItems: "center", opacity: pressed ? 0.85 : 1 })}
              >
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#FFF" }}>
                  {passed ? "Back to Lessons" : "Keep Studying"}
                </Text>
              </Pressable>

              {!passed && (
                <Pressable
                  onPress={() => {
                    setPhase(0); setQIndex(0);
                    setMcAnswers([]); setMcSelected(null); setMcShowResult(false);
                    setListenAnswers([]); setListenSelected(null); setListenShowResult(false); setListenHasPlayed(false);
                    setTypeAnswers([]); setTypeInput(""); setTypeSubmitted(false);
                    setOralResults([]); setOralState("idle"); setOralHeard(""); setOralScore(0); setOralPassed(false);
                  }}
                  style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, alignItems: "center", borderWidth: 0.5, borderColor: C.cardBorder, opacity: pressed ? 0.85 : 1 })}
                >
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: C.textSub }}>Retake Exam</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Bottom safe area padding */}
      {phase < 4 && <View style={{ height: insets.bottom + 16 }} />}
    </SafeAreaView>
  );
}
