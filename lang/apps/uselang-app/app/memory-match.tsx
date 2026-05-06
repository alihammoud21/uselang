// ── Memory Match Game ────────────────────────────────────────────────────────
// Flip cards to match target-language words with their English meanings.
// 4×4 grid (8 pairs). Timer + move counter. XP on completion.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
  FadeInDown,
  ZoomIn,
} from "react-native-reanimated";
import { addXP } from "@/lib/progress-store";

const { width: SW } = Dimensions.get("window");
const GRID_COLS = 4;
const GRID_ROWS = 4;
const TOTAL_PAIRS = (GRID_COLS * GRID_ROWS) / 2;
const CARD_GAP = 10;
const GRID_PAD = 18;
const CARD_W = (SW - GRID_PAD * 2 - CARD_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CARD_H = CARD_W * 1.25;

const BG = "#0F0C09";
const CARD_BG = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const BLUE = "#5AC8FA";

// ── Word pools per language ──
interface WordPair { target: string; phonetic?: string; meaning: string }

const WORD_POOLS: Record<string, WordPair[]> = {
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
    { target: "学生", phonetic: "xué shēng", meaning: "Student" },
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
    { target: "Coche", meaning: "Car" },
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
    { target: "Voiture", meaning: "Car" },
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface CardData {
  id: number;
  pairId: number;
  text: string;
  subText?: string;
  isTarget: boolean; // true = target lang side, false = meaning side
}

// ── Flip Card Component ──
function FlipCard({
  card,
  isFlipped,
  isMatched,
  onPress,
}: {
  card: CardData;
  isFlipped: boolean;
  isMatched: boolean;
  onPress: () => void;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isFlipped || isMatched ? 180 : 0, { duration: 300 });
  }, [isFlipped, isMatched]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [0, 180], Extrapolation.CLAMP)}deg` }],
    backfaceVisibility: "hidden" as const,
    opacity: interpolate(rotation.value, [0, 90, 180], [1, 0, 0], Extrapolation.CLAMP),
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rotation.value, [0, 180], [180, 360], Extrapolation.CLAMP)}deg` }],
    backfaceVisibility: "hidden" as const,
    opacity: interpolate(rotation.value, [0, 90, 180], [0, 0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={isFlipped || isMatched}
      style={{ width: CARD_W, height: CARD_H, position: "relative" }}
    >
      {/* Front (face-down) */}
      <Animated.View style={[styles.card, styles.cardFront, frontStyle, isMatched && { opacity: 0.3 }]}>
        <Ionicons name="help-outline" size={28} color={MUTED} />
      </Animated.View>

      {/* Back (face-up) */}
      <Animated.View
        style={[
          styles.card,
          styles.cardBack,
          backStyle,
          isMatched && { backgroundColor: "rgba(52,199,89,0.15)", borderColor: GREEN },
          card.isTarget && { backgroundColor: "rgba(200,128,74,0.10)", borderColor: AMBER },
        ]}
      >
        <Text
          style={[
            styles.cardText,
            card.isTarget && { color: AMBER },
            isMatched && { color: GREEN },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {card.text}
        </Text>
        {card.subText ? (
          <Text style={styles.cardSubText}>{card.subText}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ──
export default function MemoryMatchScreen() {
  const router = useRouter();
  const { lang = "zh" } = useLocalSearchParams<{ lang?: string }>();
  const langCode = (lang || "zh").slice(0, 2);

  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState<number[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const lockRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build cards
  const cards = useMemo(() => {
    const pool = WORD_POOLS[langCode] || WORD_POOLS.zh;
    const selected = shuffle(pool).slice(0, TOTAL_PAIRS);
    const cardArray: CardData[] = [];
    selected.forEach((word, idx) => {
      cardArray.push({ id: idx * 2, pairId: idx, text: word.target, subText: word.phonetic, isTarget: true });
      cardArray.push({ id: idx * 2 + 1, pairId: idx, text: word.meaning, isTarget: false });
    });
    return shuffle(cardArray);
  }, [langCode]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Check game over
  useEffect(() => {
    if (matchedPairs.length === TOTAL_PAIRS && !gameOver) {
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const xp = Math.max(10, 50 - moves + TOTAL_PAIRS);
      addXP(xp).catch(() => {});
    }
  }, [matchedPairs.length, gameOver, moves]);

  const handleCardPress = useCallback((cardId: number) => {
    if (lockRef.current) return;
    if (flipped.includes(cardId)) return;
    if (matchedPairs.includes(cards.find((c) => c.id === cardId)?.pairId ?? -1)) return;

    const newFlipped = [...flipped, cardId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves((m) => m + 1);
      const [first, second] = newFlipped.map((id) => cards.find((c) => c.id === id)!);
      if (first.pairId === second.pairId) {
        // Match!
        setTimeout(() => {
          setMatchedPairs((prev) => [...prev, first.pairId]);
          setFlipped([]);
          lockRef.current = false;
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setFlipped([]);
          lockRef.current = false;
        }, 800);
      }
    }
  }, [flipped, matchedPairs, cards]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Game Over ──
  if (gameOver) {
    const xp = Math.max(10, 50 - moves + TOTAL_PAIRS);
    const stars = moves <= TOTAL_PAIRS + 2 ? 3 : moves <= TOTAL_PAIRS + 6 ? 2 : 1;
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View entering={ZoomIn.duration(500)} style={styles.completeContainer}>
          <Text style={styles.completeEmoji}>
            {stars === 3 ? "⭐⭐⭐" : stars === 2 ? "⭐⭐" : "⭐"}
          </Text>
          <Text style={styles.completeTitle}>Memory Master!</Text>
          <Text style={styles.completeSub}>
            {TOTAL_PAIRS} pairs matched in {formatTime(seconds)} with {moves} moves
          </Text>
          <View style={styles.xpPill}>
            <Text style={styles.xpText}>+{xp} XP</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 30 }}>
            <Pressable
              onPress={() => {
                setMoves(0);
                setMatchedPairs([]);
                setFlipped([]);
                setSeconds(0);
                setGameOver(false);
                lockRef.current = false;
                timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
              }}
              style={[styles.completeBtn, { backgroundColor: "rgba(255,255,255,0.10)" }]}
            >
              <Ionicons name="refresh" size={18} color={INK} />
              <Text style={styles.completeBtnText}>Play Again</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={[styles.completeBtn, { backgroundColor: AMBER }]}>
              <Text style={styles.completeBtnText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="close" size={20} color={INK} />
        </Pressable>
        <Text style={styles.title}>Memory Match</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.statPill}>
          <Ionicons name="time-outline" size={14} color={BLUE} />
          <Text style={styles.statText}>{formatTime(seconds)}</Text>
        </View>
        <View style={[styles.statPill, { marginLeft: 8 }]}>
          <Ionicons name="swap-horizontal" size={14} color={AMBER} />
          <Text style={styles.statText}>{moves}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${(matchedPairs.length / TOTAL_PAIRS) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{matchedPairs.length}/{TOTAL_PAIRS}</Text>
      </View>

      {/* Grid */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.grid}>
        {cards.map((card, idx) => (
          <FlipCard
            key={card.id}
            card={card}
            isFlipped={flipped.includes(card.id)}
            isMatched={matchedPairs.includes(card.pairId)}
            onPress={() => handleCardPress(card.id)}
          />
        ))}
      </Animated.View>

      {/* Hint */}
      <Text style={styles.hint}>Match target words with their English meanings</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  title: { fontSize: 18, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  statText: { fontSize: 13, fontWeight: "700", color: INK },

  progressRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 14, gap: 10 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: GREEN },
  progressText: { fontSize: 12, fontWeight: "700", color: MUTED },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: GRID_PAD,
    gap: CARD_GAP,
  },

  card: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    padding: 6,
  },
  cardFront: {
    backgroundColor: CARD_BG,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardBack: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardText: {
    fontSize: 15,
    fontWeight: "700",
    color: INK,
    textAlign: "center",
  },
  cardSubText: {
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
    textAlign: "center",
  },

  hint: { textAlign: "center", color: MUTED, fontSize: 12, marginTop: 18 },

  // ── Complete ──
  completeContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  completeEmoji: { fontSize: 42, marginBottom: 12 },
  completeTitle: { fontSize: 28, fontWeight: "800", color: INK, letterSpacing: -0.5 },
  completeSub: { fontSize: 14, color: MUTED, textAlign: "center", marginTop: 8, lineHeight: 20 },
  xpPill: { marginTop: 16, backgroundColor: "rgba(200,128,74,0.15)", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 99 },
  xpText: { fontSize: 16, fontWeight: "800", color: AMBER },
  completeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 99 },
  completeBtnText: { fontSize: 15, fontWeight: "700", color: INK },
});
