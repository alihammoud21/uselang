// ── Listen & Match Game ──────────────────────────────────────────────────────
// Audio plays in target language. User taps the correct English meaning.
// 10 rounds. Score summary at end.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeOutUp, ZoomIn } from "react-native-reanimated";
import { speakRoutedText } from "@/lib/tts-router";
import { addXP } from "@/lib/progress-store";

const BG = "#0F0C09";
const CARD = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const RED = "#FF3B30";

interface WordPair {
  target: string;
  phonetic?: string;
  meaning: string;
}

const WORD_POOLS: Record<string, WordPair[]> = {
  zh: [
    { target: "你好", phonetic: "nǐ hǎo", meaning: "Hello" },
    { target: "谢谢", phonetic: "xiè xiè", meaning: "Thank you" },
    { target: "再见", phonetic: "zài jiàn", meaning: "Goodbye" },
    { target: "吃饭", phonetic: "chī fàn", meaning: "Eat" },
    { target: "水", phonetic: "shuǐ", meaning: "Water" },
    { target: "朋友", phonetic: "péng yǒu", meaning: "Friend" },
    { target: "大学", phonetic: "dà xué", meaning: "University" },
    { target: "飞机", phonetic: "fēi jī", meaning: "Airplane" },
    { target: "医院", phonetic: "yī yuàn", meaning: "Hospital" },
    { target: "时间", phonetic: "shí jiān", meaning: "Time" },
    { target: "工作", phonetic: "gōng zuò", meaning: "Work" },
    { target: "家", phonetic: "jiā", meaning: "Home" },
    { target: "钱", phonetic: "qián", meaning: "Money" },
    { target: "书", phonetic: "shū", meaning: "Book" },
    { target: "猫", phonetic: "māo", meaning: "Cat" },
  ],
  es: [
    { target: "Hola", meaning: "Hello" },
    { target: "Gracias", meaning: "Thank you" },
    { target: "Adiós", meaning: "Goodbye" },
    { target: "Comer", meaning: "To eat" },
    { target: "Agua", meaning: "Water" },
    { target: "Amigo", meaning: "Friend" },
    { target: "Escuela", meaning: "School" },
    { target: "Avión", meaning: "Airplane" },
    { target: "Hospital", meaning: "Hospital" },
    { target: "Tiempo", meaning: "Time / Weather" },
    { target: "Trabajo", meaning: "Work" },
    { target: "Casa", meaning: "House" },
    { target: "Dinero", meaning: "Money" },
    { target: "Libro", meaning: "Book" },
    { target: "Gato", meaning: "Cat" },
  ],
  fr: [
    { target: "Bonjour", meaning: "Hello" },
    { target: "Merci", meaning: "Thank you" },
    { target: "Au revoir", meaning: "Goodbye" },
    { target: "Manger", meaning: "To eat" },
    { target: "Eau", meaning: "Water" },
    { target: "Ami", meaning: "Friend" },
    { target: "École", meaning: "School" },
    { target: "Avion", meaning: "Airplane" },
    { target: "Hôpital", meaning: "Hospital" },
    { target: "Temps", meaning: "Time / Weather" },
    { target: "Travail", meaning: "Work" },
    { target: "Maison", meaning: "House" },
    { target: "Argent", meaning: "Money" },
    { target: "Livre", meaning: "Book" },
    { target: "Chat", meaning: "Cat" },
  ],
};

const ROUNDS = 10;
const CHOICES_PER_ROUND = 4;
const XP_PER_CORRECT = 5;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildRound(pool: WordPair[], usedIndices: Set<number>) {
  const available = pool.map((_, i) => i).filter((i) => !usedIndices.has(i));
  if (available.length < CHOICES_PER_ROUND) return null;
  const shuffled = shuffle(available).slice(0, CHOICES_PER_ROUND);
  const correctIdx = shuffled[Math.floor(Math.random() * CHOICES_PER_ROUND)];
  return {
    correct: pool[correctIdx],
    choices: shuffled.map((i) => pool[i]),
    correctIdx,
  };
}

export default function ListenMatchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang = params.lang || "zh";

  const pool = WORD_POOLS[lang] ?? WORD_POOLS.zh;
  const usedIndices = useRef(new Set<number>());

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundData, setRoundData] = useState(() => buildRound(pool, usedIndices.current));
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsRef = useRef(false);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/lessons");
  }, [router]);

  const playAudio = useCallback(async (text: string) => {
    if (ttsRef.current) return;
    ttsRef.current = true;
    setTtsPlaying(true);
    try {
      await speakRoutedText({ text, languageCode: lang });
    } catch { /* non-fatal */ }
    ttsRef.current = false;
    setTtsPlaying(false);
  }, [lang]);

  // Auto-play on each new round
  useEffect(() => {
    if (roundData && !done) {
      const timer = setTimeout(() => playAudio(roundData.correct.target), 500);
      return () => clearTimeout(timer);
    }
  }, [roundData, done]);

  const handleChoice = useCallback(async (choice: WordPair) => {
    if (selected !== null) return;
    const correct = choice.meaning === roundData?.correct.meaning;
    setSelected(choice.meaning);
    setIsCorrect(correct);
    if (correct) {
      setScore((s) => s + 1);
      try { await addXP(XP_PER_CORRECT); } catch { /* non-fatal */ }
    }
  }, [selected, roundData]);

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS) {
      setDone(true);
      return;
    }
    if (roundData) usedIndices.current.add(roundData.correctIdx);
    const next = buildRound(pool, usedIndices.current);
    if (!next) { setDone(true); return; }
    setRoundData(next);
    setRound((r) => r + 1);
    setSelected(null);
    setIsCorrect(null);
  }, [round, roundData, pool]);

  if (done) {
    const totalXP = score * XP_PER_CORRECT;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }} edges={["top"]}>
        <Animated.View entering={ZoomIn.duration(400)} style={{ alignItems: "center" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(200,128,74,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <Ionicons name="headset" size={36} color={AMBER} />
          </View>
          <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 28, color: INK, marginBottom: 8, textAlign: "center" }}>
            {score >= 8 ? "Excellent!" : score >= 5 ? "Good work!" : "Keep practicing!"}
          </Text>
          <Text style={{ fontFamily: "Geist-Regular", fontSize: 16, color: MUTED, textAlign: "center", marginBottom: 8 }}>
            {score}/{ROUNDS} correct
          </Text>
          <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 15, color: AMBER, marginBottom: 32 }}>
            +{totalXP} XP earned
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => {
                usedIndices.current = new Set();
                setRound(0);
                setScore(0);
                setSelected(null);
                setIsCorrect(null);
                setDone(false);
                setRoundData(buildRound(pool, new Set()));
              }}
              style={({ pressed }) => [{ backgroundColor: "rgba(200,128,74,0.15)", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 15, color: AMBER }}>Play Again</Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [{ backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 15, color: "#FFF" }}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (!roundData) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={INK} />
        </Pressable>
        <Text style={S.headerTitle}>Listen & Match</Text>
        <Text style={S.roundText}>{round + 1}/{ROUNDS}</Text>
      </View>

      {/* Progress bar */}
      <View style={S.progressBar}>
        <View style={[S.progressFill, { width: `${(round / ROUNDS) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 32, flexGrow: 1 }} showsVerticalScrollIndicator={false}>

        {/* Audio orb */}
        <Animated.View key={round} entering={FadeInDown.duration(300)} style={{ alignItems: "center", marginTop: 32, marginBottom: 24 }}>
          <Pressable
            onPress={() => playAudio(roundData.correct.target)}
            style={({ pressed }) => [S.orbBtn, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <View style={S.orb}>
              <Ionicons
                name={ttsPlaying ? "volume-high" : "volume-medium"}
                size={40}
                color="#FFF"
              />
            </View>
          </Pressable>
          <Text style={S.orbHint}>
            {ttsPlaying ? "Playing…" : "Tap to hear again"}
          </Text>
          {roundData.correct.phonetic && isCorrect !== null && (
            <Animated.Text entering={FadeInDown.duration(200)} style={S.phonetic}>
              {roundData.correct.phonetic}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Question */}
        <Text style={S.question}>What does this mean?</Text>

        {/* Choices */}
        <View style={{ gap: 10, marginTop: 8 }}>
          {roundData.choices.map((choice) => {
            const isSelected = selected === choice.meaning;
            const isRight = isSelected && isCorrect;
            const isWrong = isSelected && !isCorrect;
            const showCorrect = selected !== null && choice.meaning === roundData.correct.meaning;

            let bg = CARD;
            let border = "rgba(243,237,227,0.08)";
            if (isRight || showCorrect) { bg = "rgba(52,199,89,0.12)"; border = GREEN; }
            else if (isWrong) { bg = "rgba(255,59,48,0.12)"; border = RED; }

            return (
              <Pressable
                key={choice.meaning}
                onPress={() => handleChoice(choice)}
                disabled={selected !== null}
                style={({ pressed }) => [
                  S.choiceBtn,
                  { backgroundColor: bg, borderColor: border },
                  pressed && selected === null && { opacity: 0.80 },
                ]}
              >
                <Text style={[S.choiceText, (isRight || showCorrect) && { color: GREEN }, isWrong && { color: RED }]}>
                  {choice.meaning}
                </Text>
                {(isRight || showCorrect) && <Ionicons name="checkmark-circle" size={22} color={GREEN} />}
                {isWrong && <Ionicons name="close-circle" size={22} color={RED} />}
              </Pressable>
            );
          })}
        </View>

        {/* Next button */}
        {selected !== null && (
          <Animated.View entering={FadeInDown.duration(250).delay(100)} style={{ marginTop: 20 }}>
            <Pressable
              onPress={nextRound}
              style={({ pressed }) => [S.nextBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={S.nextBtnText}>{round + 1 >= ROUNDS ? "See Results" : "Next"}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Score */}
      <View style={S.scoreBar}>
        <Ionicons name="star" size={14} color={AMBER} />
        <Text style={S.scoreText}>{score} correct</Text>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Geist-SemiBold", fontSize: 15, color: INK },
  roundText: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED },
  progressBar: { height: 3, backgroundColor: "rgba(243,237,227,0.08)", marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },
  progressFill: { height: 3, backgroundColor: AMBER, borderRadius: 2 },

  orbBtn: { marginBottom: 8 },
  orb: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: AMBER,
    alignItems: "center", justifyContent: "center",
    shadowColor: AMBER, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 20,
  },
  orbHint: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED, marginBottom: 4 },
  phonetic: { fontFamily: "Geist-Regular", fontSize: 14, color: AMBER, letterSpacing: 0.3 },

  question: { fontFamily: "Fraunces-Regular", fontSize: 20, color: INK, textAlign: "center", marginBottom: 4 },

  choiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 16, padding: 18, borderWidth: 1.5,
  },
  choiceText: { fontFamily: "Geist-SemiBold", fontSize: 16, color: INK, flex: 1 },

  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: AMBER, borderRadius: 16, paddingVertical: 16,
  },
  nextBtnText: { fontFamily: "Geist-SemiBold", fontSize: 16, color: "#FFF" },

  scoreBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: "rgba(243,237,227,0.08)",
  },
  scoreText: { fontFamily: "Geist-SemiBold", fontSize: 13, color: AMBER },
});
