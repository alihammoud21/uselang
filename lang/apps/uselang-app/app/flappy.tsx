// ── Flappy Sphere ────────────────────────────────────────────────────────────
// 3 modes: Classic, Pronunciation, Typing. Pre-game flashcard lesson.
// Expanded word pools. Translation toast after each correct pass.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  FadeInDown,
  ZoomIn,
  runOnJS,
} from "react-native-reanimated";
import { addXP } from "@/lib/progress-store";

const { width: SW, height: SH } = Dimensions.get("window");
const SPHERE_X = SW * 0.22;
const SPHERE_R = 32;
const GRAVITY = 1100;
const FLAP_VELOCITY = -340;
const PIPE_WIDTH = 70;
const PIPE_GAP = 230;
const PIPE_SPEED = 150;
const PIPE_INTERVAL = 2800;

const BG = "#0A0F1A";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const RED = "#FF3B30";
const BLUE = "#5AC8FA";

type GameMode = "classic" | "pronunciation" | "typing";

interface WordEntry { target: string; phonetic?: string; meaning: string }

const WORD_POOLS: Record<string, WordEntry[]> = {
  zh: [
    { target: "你好", phonetic: "nǐ hǎo", meaning: "Hello" },
    { target: "谢谢", phonetic: "xiè xiè", meaning: "Thank you" },
    { target: "再见", phonetic: "zài jiàn", meaning: "Goodbye" },
    { target: "水", phonetic: "shuǐ", meaning: "Water" },
    { target: "朋友", phonetic: "péng yǒu", meaning: "Friend" },
    { target: "家", phonetic: "jiā", meaning: "Home" },
    { target: "书", phonetic: "shū", meaning: "Book" },
    { target: "猫", phonetic: "māo", meaning: "Cat" },
    { target: "吃饭", phonetic: "chī fàn", meaning: "Eat" },
    { target: "钱", phonetic: "qián", meaning: "Money" },
    { target: "医院", phonetic: "yī yuàn", meaning: "Hospital" },
    { target: "大学", phonetic: "dà xué", meaning: "University" },
    { target: "飞机", phonetic: "fēi jī", meaning: "Airplane" },
    { target: "时间", phonetic: "shí jiān", meaning: "Time" },
    { target: "工作", phonetic: "gōng zuò", meaning: "Work" },
  ],
  es: [
    { target: "Hola", meaning: "Hello" },
    { target: "Gracias", meaning: "Thank you" },
    { target: "Adiós", meaning: "Goodbye" },
    { target: "Agua", meaning: "Water" },
    { target: "Amigo", meaning: "Friend" },
    { target: "Casa", meaning: "Home" },
    { target: "Libro", meaning: "Book" },
    { target: "Gato", meaning: "Cat" },
    { target: "Comer", meaning: "Eat" },
    { target: "Dinero", meaning: "Money" },
    { target: "Hospital", meaning: "Hospital" },
    { target: "Tiempo", meaning: "Time" },
    { target: "Trabajo", meaning: "Work" },
    { target: "Escuela", meaning: "School" },
    { target: "Perro", meaning: "Dog" },
  ],
  fr: [
    { target: "Bonjour", meaning: "Hello" },
    { target: "Merci", meaning: "Thank you" },
    { target: "Au revoir", meaning: "Goodbye" },
    { target: "Eau", meaning: "Water" },
    { target: "Ami", meaning: "Friend" },
    { target: "Maison", meaning: "Home" },
    { target: "Livre", meaning: "Book" },
    { target: "Chat", meaning: "Cat" },
    { target: "Manger", meaning: "Eat" },
    { target: "Argent", meaning: "Money" },
    { target: "Hôpital", meaning: "Hospital" },
    { target: "Temps", meaning: "Time" },
    { target: "Travail", meaning: "Work" },
    { target: "École", meaning: "School" },
    { target: "Chien", meaning: "Dog" },
  ],
};

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  correctLabel: string;
  wrongLabel: string;
  correctOnTop: boolean;
  passed?: boolean;
  word: WordEntry;
}

function buildPipe(id: number, words: WordEntry[]): Pipe {
  const minTop = 80;
  const maxTop = SH - PIPE_GAP - 80;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  const pool = [...words];
  const correctIdx = Math.floor(Math.random() * pool.length);
  const correct = pool[correctIdx];
  pool.splice(correctIdx, 1);
  const wrong = pool[Math.floor(Math.random() * pool.length)] ?? correct;
  const correctOnTop = Math.random() > 0.5;
  return {
    id, x: SW + PIPE_WIDTH, topHeight,
    correctLabel: correct.target, wrongLabel: wrong.target,
    correctOnTop, word: correct,
  };
}

// ── Pre-game Flashcard Lesson ──
function FlashcardLesson({ words, onReady }: { words: WordEntry[]; onReady: () => void }) {
  const [idx, setIdx] = useState(0);
  const shown = words.slice(0, 8);
  const w = shown[idx];
  return (
    <View style={S.overlay}>
      <Text style={[S.overlayTitle, { fontSize: 24 }]}>Study First</Text>
      <Text style={[S.overlaySub, { marginBottom: 20 }]}>Learn these words before you play</Text>
      <Animated.View entering={FadeInDown.duration(300)} key={idx} style={S.flashcard}>
        <Text style={S.flashTarget}>{w.target}</Text>
        {w.phonetic ? <Text style={S.flashPhonetic}>{w.phonetic}</Text> : null}
        <View style={S.flashDivider} />
        <Text style={S.flashMeaning}>{w.meaning}</Text>
      </Animated.View>
      <Text style={S.flashCount}>{idx + 1} / {shown.length}</Text>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
        {idx > 0 && (
          <Pressable onPress={() => setIdx(idx - 1)} style={[S.startBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={S.startBtnText}>Back</Text>
          </Pressable>
        )}
        {idx < shown.length - 1 ? (
          <Pressable onPress={() => setIdx(idx + 1)} style={S.startBtn}>
            <Text style={S.startBtnText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onReady} style={[S.startBtn, { backgroundColor: GREEN }]}>
            <Ionicons name="play" size={16} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={S.startBtnText}>Ready!</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={onReady} style={{ marginTop: 16 }}>
        <Text style={{ color: MUTED, fontSize: 13 }}>Skip lesson →</Text>
      </Pressable>
    </View>
  );
}

// ── Challenge overlay (pronunciation / typing) ──
function ChallengeOverlay({
  word, mode, onSuccess, onFail,
}: {
  word: WordEntry; mode: "pronunciation" | "typing"; onSuccess: () => void; onFail: () => void;
}) {
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const handleSubmitTyping = useCallback(() => {
    const answer = typedAnswer.trim().toLowerCase();
    const correct = word.target.toLowerCase();
    if (answer === correct) {
      setFeedback("correct");
      setTimeout(onSuccess, 600);
    } else {
      setFeedback("wrong");
      setTimeout(onFail, 800);
    }
  }, [typedAnswer, word, onSuccess, onFail]);

  // For pronunciation mode, use a simplified "say it" prompt
  // Since we can't reliably do real-time speech recognition in a game overlay,
  // we show the word and let the user self-assess with Pass/Fail buttons
  if (mode === "pronunciation") {
    return (
      <View style={S.challengeOverlay}>
        <Animated.View entering={ZoomIn.duration(300)} style={S.challengeCard}>
          <Text style={S.challengeLabel}>Say this word out loud:</Text>
          <Text style={S.challengeTarget}>{word.target}</Text>
          {word.phonetic ? <Text style={S.challengePhonetic}>{word.phonetic}</Text> : null}
          <Text style={S.challengeMeaning}>{word.meaning}</Text>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <Pressable onPress={onFail} style={[S.challengeBtn, { backgroundColor: "rgba(255,59,48,0.2)" }]}>
              <Ionicons name="close-circle" size={18} color={RED} />
              <Text style={[S.challengeBtnText, { color: RED }]}>Couldn't say it</Text>
            </Pressable>
            <Pressable onPress={onSuccess} style={[S.challengeBtn, { backgroundColor: "rgba(52,199,89,0.2)" }]}>
              <Ionicons name="checkmark-circle" size={18} color={GREEN} />
              <Text style={[S.challengeBtnText, { color: GREEN }]}>I said it!</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Typing mode
  return (
    <View style={S.challengeOverlay}>
      <Animated.View entering={ZoomIn.duration(300)} style={S.challengeCard}>
        <Text style={S.challengeLabel}>Type this word:</Text>
        <Text style={S.challengeMeaning}>{word.meaning}</Text>
        {word.phonetic ? <Text style={S.challengePhonetic}>{word.phonetic}</Text> : null}
        <TextInput
          style={S.challengeInput}
          placeholder="Type here..."
          placeholderTextColor={MUTED}
          value={typedAnswer}
          onChangeText={setTypedAnswer}
          autoFocus
          onSubmitEditing={handleSubmitTyping}
          returnKeyType="done"
        />
        {feedback && (
          <Text style={{ color: feedback === "correct" ? GREEN : RED, fontWeight: "700", marginTop: 6 }}>
            {feedback === "correct" ? "Correct!" : `Wrong! It was: ${word.target}`}
          </Text>
        )}
        {!feedback && (
          <Pressable onPress={handleSubmitTyping} style={[S.startBtn, { marginTop: 12 }]}>
            <Text style={S.startBtnText}>Submit</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

// ── Translation toast ──
function TranslationToast({ word }: { word: WordEntry | null }) {
  if (!word) return null;
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={S.toast}>
      <Text style={S.toastTarget}>{word.target}</Text>
      {word.phonetic ? <Text style={S.toastPhonetic}>{word.phonetic}</Text> : null}
      <Text style={S.toastMeaning}>{word.meaning}</Text>
    </Animated.View>
  );
}

// ── Main Screen ──
export default function FlappyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang = params.lang || "zh";
  const words = WORD_POOLS[lang] ?? WORD_POOLS.zh;

  const [phase, setPhase] = useState<"modeSelect" | "lesson" | "playing" | "challenge" | "dead">("modeSelect");
  const [mode, setMode] = useState<GameMode>("classic");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [challengeWord, setChallengeWord] = useState<WordEntry | null>(null);
  const [toastWord, setToastWord] = useState<WordEntry | null>(null);

  const sphereY = useSharedValue(SH / 2 - SPHERE_R);
  const velocityRef = useRef(0);
  const lastTickRef = useRef(0);
  const phaseRef = useRef(phase);
  const pipeIdRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const handleClose = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/lessons");
  }, [router]);

  const die = useCallback(() => {
    phaseRef.current = "dead";
    setPhase("dead");
    cancelAnimationFrame(rafRef.current);
    setBestScore((prev) => Math.max(prev, scoreRef.current));
    if (scoreRef.current > 0) addXP(Math.max(5, scoreRef.current * 3)).catch(() => {});
  }, []);

  const showToast = useCallback((word: WordEntry) => {
    setToastWord(word);
    setTimeout(() => setToastWord(null), 1500);
  }, []);

  const tick = useCallback((ts: number) => {
    if (phaseRef.current !== "playing") return;
    const dt = lastTickRef.current ? Math.min((ts - lastTickRef.current) / 1000, 0.05) : 0.016;
    lastTickRef.current = ts;

    velocityRef.current += GRAVITY * dt;
    const newY = sphereY.value + velocityRef.current * dt;

    if (newY > SH - SPHERE_R * 2 || newY < -SPHERE_R) {
      runOnJS(die)();
      return;
    }
    sphereY.value = newY;

    setPipes((prev) => {
      const updated = prev
        .map((p) => ({ ...p, x: p.x - PIPE_SPEED * dt }))
        .filter((p) => p.x > -PIPE_WIDTH - 20);

      for (const p of updated) {
        const sphereLeft = SPHERE_X - SPHERE_R;
        const sphereRight = SPHERE_X + SPHERE_R;
        const sphereTop = newY;
        const sphereBot = newY + SPHERE_R * 2;
        const pLeft = p.x;
        const pRight = p.x + PIPE_WIDTH;
        if (sphereRight > pLeft && sphereLeft < pRight) {
          const inGap = sphereTop > p.topHeight && sphereBot < p.topHeight + PIPE_GAP;
          if (!inGap) {
            runOnJS(die)();
            return updated;
          }
          if (p.x + PIPE_WIDTH < SPHERE_X && !p.passed) {
            p.passed = true;
            scoreRef.current += 1;
            runOnJS(setScore)(scoreRef.current);
            runOnJS(showToast)(p.word);
          }
        }
      }
      return updated;
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [sphereY, die, showToast]);

  const startPlaying = useCallback(() => {
    sphereY.value = SH / 2 - SPHERE_R;
    velocityRef.current = 0;
    lastTickRef.current = 0;
    scoreRef.current = 0;
    pipeIdRef.current = 0;
    setScore(0);
    setPipes([]);
    setToastWord(null);
    setChallengeWord(null);
    phaseRef.current = "playing";
    setPhase("playing");
    rafRef.current = requestAnimationFrame(tick);
  }, [sphereY, tick]);

  useEffect(() => {
    if (phase !== "playing") return;
    const interval = setInterval(() => {
      if (phaseRef.current !== "playing") return;
      setPipes((prev) => [...prev, buildPipe(pipeIdRef.current++, words)]);
    }, PIPE_INTERVAL);
    return () => clearInterval(interval);
  }, [phase, words]);

  const flap = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    velocityRef.current = FLAP_VELOCITY;
  }, []);

  const handleWordTap = useCallback((pipe: Pipe, tappedCorrect: boolean) => {
    if (!tappedCorrect) {
      die();
      return;
    }
    // In non-classic modes, pause and show challenge
    if (mode !== "classic" && !pipe.passed) {
      cancelAnimationFrame(rafRef.current);
      setChallengeWord(pipe.word);
      phaseRef.current = "challenge";
      setPhase("challenge");
    }
  }, [die, mode]);

  const handleChallengeSuccess = useCallback(() => {
    setChallengeWord(null);
    phaseRef.current = "playing";
    setPhase("playing");
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handleChallengeFail = useCallback(() => {
    setChallengeWord(null);
    die();
  }, [die]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sphereY.value }],
  }));

  // ── Mode Select ──
  if (phase === "modeSelect") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
        <View style={S.overlay}>
          <Text style={S.overlayTitle}>Flappy Sphere</Text>
          <Text style={[S.overlaySub, { marginBottom: 24 }]}>Choose your challenge</Text>
          {([
            { id: "classic" as GameMode, label: "Classic", desc: "Tap the correct word pipe to survive", icon: "game-controller-outline" as const, color: AMBER },
            { id: "pronunciation" as GameMode, label: "Say It", desc: "Say each word aloud after passing", icon: "mic-outline" as const, color: BLUE },
            { id: "typing" as GameMode, label: "Type It", desc: "Type the word correctly to continue", icon: "create-outline" as const, color: GREEN },
          ]).map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 100).duration(400)}>
              <Pressable
                onPress={() => { setMode(m.id); setPhase("lesson"); }}
                style={S.modeCard}
              >
                <View style={[S.modeIcon, { backgroundColor: m.color + "20" }]}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.modeLabel}>{m.label}</Text>
                  <Text style={S.modeDesc}>{m.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </Pressable>
            </Animated.View>
          ))}
          <Pressable onPress={handleClose} style={{ marginTop: 24 }}>
            <Text style={{ color: MUTED, fontSize: 14 }}>← Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Flashcard Lesson ──
  if (phase === "lesson") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
        <FlashcardLesson words={words} onReady={startPlaying} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={INK} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontWeight: "800", fontSize: 13, color: AMBER, letterSpacing: 0.5 }}>
            {mode === "classic" ? "✦ CLASSIC" : mode === "pronunciation" ? "🎤 SAY IT" : "✏️ TYPE IT"}
          </Text>
        </View>
        <View style={S.scorePill}>
          <Text style={S.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Game canvas */}
      <Pressable style={{ flex: 1 }} onPress={flap}>
        <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Stars */}
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={{
                position: "absolute", width: 2, height: 2, borderRadius: 1,
                backgroundColor: "rgba(243,237,227,0.3)",
                left: (i * 71 + 33) % SW, top: (i * 53 + 17) % (SH * 0.7),
              }}
            />
          ))}

          {/* Pipes */}
          {pipes.map((pipe) => (
            <View key={pipe.id} style={{ position: "absolute", left: pipe.x, top: 0, width: PIPE_WIDTH, height: SH }}>
              <View style={{ height: pipe.topHeight, backgroundColor: "#1C3A2A", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderColor: "rgba(52,199,89,0.25)" }}>
                <Pressable
                  onPress={() => handleWordTap(pipe, !pipe.correctOnTop)}
                  style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 }}
                >
                  <Text style={S.pipeWord}>{pipe.correctOnTop ? pipe.correctLabel : pipe.wrongLabel}</Text>
                </Pressable>
              </View>
              <View style={{ height: PIPE_GAP }} />
              <View style={{ flex: 1, backgroundColor: "#1C3A2A", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderColor: "rgba(52,199,89,0.25)" }}>
                <Pressable
                  onPress={() => handleWordTap(pipe, pipe.correctOnTop)}
                  style={{ flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 8 }}
                >
                  <Text style={S.pipeWord}>{pipe.correctOnTop ? pipe.wrongLabel : pipe.correctLabel}</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Sphere */}
          <Animated.View
            style={[{
              position: "absolute", left: SPHERE_X - SPHERE_R,
              width: SPHERE_R * 2, height: SPHERE_R * 2, borderRadius: SPHERE_R,
              backgroundColor: AMBER,
              shadowColor: AMBER, shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6, shadowRadius: 16,
            }, sphereStyle]}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="globe" size={22} color="#FFF" />
            </View>
          </Animated.View>

          {/* Toast */}
          <View style={{ position: "absolute", top: 12, left: 0, right: 0, alignItems: "center" }}>
            <TranslationToast word={toastWord} />
          </View>

          {/* Challenge overlay */}
          {phase === "challenge" && challengeWord && (
            <ChallengeOverlay
              word={challengeWord}
              mode={mode as "pronunciation" | "typing"}
              onSuccess={handleChallengeSuccess}
              onFail={handleChallengeFail}
            />
          )}

          {/* Dead state */}
          {phase === "dead" && (
            <View style={S.overlay}>
              <Text style={[S.overlayTitle, { color: RED }]}>Game Over!</Text>
              <Text style={S.overlaySub}>Score: {score}</Text>
              {score > 0 && score >= bestScore && (
                <Text style={{ fontWeight: "800", fontSize: 13, color: AMBER, marginBottom: 8 }}>🏆 New Best!</Text>
              )}
              <Text style={[S.overlaySub, { marginBottom: 20 }]}>Best: {bestScore}</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable onPress={() => setPhase("modeSelect")} style={[S.startBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                  <Text style={S.startBtnText}>Modes</Text>
                </Pressable>
                <Pressable onPress={startPlaying} style={S.startBtn}>
                  <Text style={S.startBtnText}>Try Again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  scorePill: { backgroundColor: "rgba(200,128,74,0.15)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  scoreText: { fontWeight: "800", fontSize: 16, color: AMBER },
  pipeWord: {
    fontWeight: "700", fontSize: 11, color: INK,
    textAlign: "center", paddingHorizontal: 4, letterSpacing: 0.2,
  },
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(10,15,26,0.92)", paddingHorizontal: 30,
  },
  overlayTitle: { fontSize: 32, fontWeight: "900", color: INK, marginBottom: 10, letterSpacing: -0.5 },
  overlaySub: { fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 6, lineHeight: 20 },
  startBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: AMBER, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28,
  },
  startBtnText: { fontWeight: "700", fontSize: 16, color: "#FFF" },

  // Mode cards
  modeCard: {
    flexDirection: "row", alignItems: "center", gap: 14, width: "100%",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", marginBottom: 10,
  },
  modeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modeLabel: { fontSize: 16, fontWeight: "800", color: INK },
  modeDesc: { fontSize: 12, color: MUTED, marginTop: 2 },

  // Flashcard
  flashcard: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 28,
    alignItems: "center", width: "85%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  flashTarget: { fontSize: 36, fontWeight: "900", color: AMBER, letterSpacing: -0.5 },
  flashPhonetic: { fontSize: 14, color: BLUE, marginTop: 4 },
  flashDivider: { width: 40, height: 2, backgroundColor: "rgba(255,255,255,0.12)", marginVertical: 16, borderRadius: 1 },
  flashMeaning: { fontSize: 18, fontWeight: "600", color: INK },
  flashCount: { fontSize: 13, color: MUTED, marginTop: 14 },

  // Challenge
  challengeOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(10,15,26,0.90)",
  },
  challengeCard: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 28,
    alignItems: "center", width: "85%", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  challengeLabel: { fontSize: 13, color: MUTED, marginBottom: 12 },
  challengeTarget: { fontSize: 32, fontWeight: "900", color: AMBER },
  challengePhonetic: { fontSize: 14, color: BLUE, marginTop: 4 },
  challengeMeaning: { fontSize: 18, fontWeight: "600", color: INK, marginTop: 8 },
  challengeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 99,
  },
  challengeBtnText: { fontSize: 14, fontWeight: "700" },
  challengeInput: {
    width: "100%", fontSize: 18, fontWeight: "700", color: INK, textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },

  // Toast
  toast: {
    backgroundColor: "rgba(200,128,74,0.15)", borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 8, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(200,128,74,0.20)",
  },
  toastTarget: { fontSize: 15, fontWeight: "800", color: AMBER },
  toastPhonetic: { fontSize: 11, color: BLUE },
  toastMeaning: { fontSize: 12, color: INK, marginTop: 2 },
});
