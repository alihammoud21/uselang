// ── Word Chase Game ──────────────────────────────────────────────────────────
// Pac-Man-inspired: navigate a grid, collect the correct translation, avoid wrong ones.
// Swipe to move. 10 rounds. 3 lives. XP on completion.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { addXP } from "@/lib/progress-store";

const { width: SW } = Dimensions.get("window");
const GRID_SIZE = 6;
const CELL_GAP = 3;
const GRID_PAD = 16;
const CELL_W = (SW - GRID_PAD * 2 - CELL_GAP * (GRID_SIZE - 1)) / GRID_SIZE;

const BG = "#0F0C09";
const CARD_BG = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const RED = "#FF3B30";
const BLUE = "#5AC8FA";
const PLAYER_COLOR = "#F59E0B";

interface WordPair { target: string; meaning: string }

const WORD_POOLS: Record<string, WordPair[]> = {
  zh: [
    { target: "你好", meaning: "Hello" },
    { target: "谢谢", meaning: "Thank you" },
    { target: "再见", meaning: "Goodbye" },
    { target: "水", meaning: "Water" },
    { target: "朋友", meaning: "Friend" },
    { target: "家", meaning: "Home" },
    { target: "书", meaning: "Book" },
    { target: "猫", meaning: "Cat" },
    { target: "吃饭", meaning: "Eat" },
    { target: "钱", meaning: "Money" },
    { target: "医院", meaning: "Hospital" },
    { target: "大学", meaning: "University" },
    { target: "飞机", meaning: "Airplane" },
    { target: "时间", meaning: "Time" },
    { target: "工作", meaning: "Work" },
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Dir = "up" | "down" | "left" | "right";

interface CellItem {
  text: string;
  isCorrect: boolean;
  collected: boolean;
}

function generateRound(
  pool: WordPair[],
  correctWord: WordPair,
): { grid: (CellItem | null)[][]; playerStart: [number, number] } {
  const grid: (CellItem | null)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );

  // Place correct answer (target language word)
  const correctPositions: [number, number][] = [];
  const pos = () => {
    let r: number, c: number;
    do {
      r = Math.floor(Math.random() * GRID_SIZE);
      c = Math.floor(Math.random() * GRID_SIZE);
    } while (grid[r][c] !== null || (r === 0 && c === 0));
    return [r, c] as [number, number];
  };

  const [cr, cc] = pos();
  grid[cr][cc] = { text: correctWord.target, isCorrect: true, collected: false };
  correctPositions.push([cr, cc]);

  // Place wrong answers (other target words as distractors)
  const wrongs = shuffle(pool.filter((w) => w.meaning !== correctWord.meaning)).slice(0, 4);
  for (const wrong of wrongs) {
    const [wr, wc] = pos();
    grid[wr][wc] = { text: wrong.target, isCorrect: false, collected: false };
  }

  return { grid, playerStart: [0, 0] };
}

export default function WordChaseScreen() {
  const router = useRouter();
  const { lang = "zh" } = useLocalSearchParams<{ lang?: string }>();
  const langCode = (lang || "zh").slice(0, 2);
  const pool = useMemo(() => WORD_POOLS[langCode] || WORD_POOLS.zh, [langCode]);

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const totalRounds = 10;

  // Current round word
  const roundWords = useMemo(() => shuffle(pool).slice(0, totalRounds), [pool]);
  const currentWord = roundWords[Math.min(round, roundWords.length - 1)];

  // Grid
  const [grid, setGrid] = useState<(CellItem | null)[][]>([]);
  const [playerPos, setPlayerPos] = useState<[number, number]>([0, 0]);

  const setupRound = useCallback(() => {
    const { grid: g, playerStart } = generateRound(pool, currentWord);
    setGrid(g);
    setPlayerPos(playerStart);
    setFeedback(null);
  }, [pool, currentWord]);

  useEffect(() => {
    if (!gameOver) setupRound();
  }, [round, gameOver]);

  // Movement
  const move = useCallback((dir: Dir) => {
    if (gameOver || feedback) return;
    setPlayerPos(([r, c]) => {
      let nr = r, nc = c;
      if (dir === "up") nr = Math.max(0, r - 1);
      if (dir === "down") nr = Math.min(GRID_SIZE - 1, r + 1);
      if (dir === "left") nc = Math.max(0, c - 1);
      if (dir === "right") nc = Math.min(GRID_SIZE - 1, c + 1);

      const cell = grid[nr]?.[nc];
      if (cell && !cell.collected) {
        cell.collected = true;
        setGrid([...grid]);
        if (cell.isCorrect) {
          setFeedback("correct");
          setScore((s) => s + 1);
          setTimeout(() => {
            if (round + 1 >= totalRounds) {
              setWon(true);
              setGameOver(true);
              addXP(Math.max(10, score * 5 + lives * 10)).catch(() => {});
            } else {
              setRound((r2) => r2 + 1);
            }
          }, 600);
        } else {
          setFeedback("wrong");
          const newLives = lives - 1;
          setLives(newLives);
          if (newLives <= 0) {
            setTimeout(() => {
              setGameOver(true);
              addXP(Math.max(5, score * 3)).catch(() => {});
            }, 600);
          } else {
            setTimeout(() => setFeedback(null), 600);
          }
        }
      }
      return [nr, nc];
    });
  }, [gameOver, feedback, grid, round, score, lives]);

  // Swipe handler
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gs) => {
        const { dx, dy } = gs;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < 15 && absDy < 15) return; // too small
        if (absDx > absDy) {
          move(dx > 0 ? "right" : "left");
        } else {
          move(dy > 0 ? "down" : "up");
        }
      },
    }),
  ).current;

  // ── Game Over Screen ──
  if (gameOver) {
    const xp = won ? Math.max(10, score * 5 + lives * 10) : Math.max(5, score * 3);
    return (
      <SafeAreaView style={S.safe}>
        <Animated.View entering={ZoomIn.duration(500)} style={S.completeContainer}>
          <Text style={S.completeEmoji}>{won ? "🏆" : "💀"}</Text>
          <Text style={S.completeTitle}>{won ? "Word Champion!" : "Game Over"}</Text>
          <Text style={S.completeSub}>
            {score}/{totalRounds} words collected{won ? ` with ${lives} lives remaining` : ""}
          </Text>
          <View style={S.xpPill}>
            <Text style={S.xpText}>+{xp} XP</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 30 }}>
            <Pressable
              onPress={() => {
                setRound(0);
                setScore(0);
                setLives(3);
                setGameOver(false);
                setWon(false);
                setFeedback(null);
              }}
              style={[S.completeBtn, { backgroundColor: "rgba(255,255,255,0.10)" }]}
            >
              <Ionicons name="refresh" size={18} color={INK} />
              <Text style={S.completeBtnText}>Play Again</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={[S.completeBtn, { backgroundColor: AMBER }]}>
              <Text style={S.completeBtnText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={S.safe}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="close" size={20} color={INK} />
        </Pressable>
        <Text style={S.title}>Word Chase</Text>
        <View style={{ flex: 1 }} />
        <View style={S.statPill}>
          <Ionicons name="heart" size={14} color={RED} />
          <Text style={S.statText}>{lives}</Text>
        </View>
        <View style={[S.statPill, { marginLeft: 8 }]}>
          <Ionicons name="star" size={14} color={PLAYER_COLOR} />
          <Text style={S.statText}>{score}/{totalRounds}</Text>
        </View>
      </View>

      {/* Prompt */}
      <Animated.View entering={FadeInDown.duration(400)} style={S.promptCard}>
        <Text style={S.promptLabel}>Find the word for:</Text>
        <Text style={S.promptWord}>{currentWord.meaning}</Text>
      </Animated.View>

      {/* Feedback */}
      {feedback && (
        <Animated.View
          entering={ZoomIn.duration(200)}
          style={[S.feedbackBadge, { backgroundColor: feedback === "correct" ? "rgba(52,199,89,0.20)" : "rgba(255,59,48,0.20)" }]}
        >
          <Ionicons
            name={feedback === "correct" ? "checkmark-circle" : "close-circle"}
            size={18}
            color={feedback === "correct" ? GREEN : RED}
          />
          <Text style={[S.feedbackText, { color: feedback === "correct" ? GREEN : RED }]}>
            {feedback === "correct" ? "Correct!" : "Wrong!"}
          </Text>
        </Animated.View>
      )}

      {/* Grid */}
      <View {...panResponder.panHandlers} style={S.gridContainer}>
        <View style={S.grid}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const isPlayer = playerPos[0] === r && playerPos[1] === c;
              return (
                <View
                  key={`${r}-${c}`}
                  style={[
                    S.cell,
                    isPlayer && S.cellPlayer,
                    cell?.collected && S.cellCollected,
                  ]}
                >
                  {isPlayer && (
                    <View style={S.playerDot} />
                  )}
                  {cell && !cell.collected && !isPlayer && (
                    <Text
                      style={[
                        S.cellText,
                        cell.isCorrect ? { color: GREEN } : { color: INK },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {cell.text}
                    </Text>
                  )}
                  {cell && !cell.collected && isPlayer && (
                    <Text
                      style={[S.cellText, { color: "#000", fontSize: 9 }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {cell.text}
                    </Text>
                  )}
                </View>
              );
            }),
          )}
        </View>
      </View>

      {/* Swipe hint */}
      <Text style={S.hint}>Swipe to move • Collect the right word</Text>

      {/* D-pad for accessibility */}
      <View style={S.dpad}>
        <View style={S.dpadRow}>
          <View style={S.dpadSpacer} />
          <Pressable onPress={() => move("up")} style={S.dpadBtn}>
            <Ionicons name="chevron-up" size={22} color={INK} />
          </Pressable>
          <View style={S.dpadSpacer} />
        </View>
        <View style={S.dpadRow}>
          <Pressable onPress={() => move("left")} style={S.dpadBtn}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </Pressable>
          <View style={S.dpadCenter} />
          <Pressable onPress={() => move("right")} style={S.dpadBtn}>
            <Ionicons name="chevron-forward" size={22} color={INK} />
          </Pressable>
        </View>
        <View style={S.dpadRow}>
          <View style={S.dpadSpacer} />
          <Pressable onPress={() => move("down")} style={S.dpadBtn}>
            <Ionicons name="chevron-down" size={22} color={INK} />
          </Pressable>
          <View style={S.dpadSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  title: { fontSize: 18, fontWeight: "800", color: INK, letterSpacing: -0.3 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  statText: { fontSize: 13, fontWeight: "700", color: INK },

  promptCard: {
    marginHorizontal: 18, marginBottom: 12, padding: 14,
    backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  promptLabel: { fontSize: 12, color: MUTED, marginBottom: 4 },
  promptWord: { fontSize: 22, fontWeight: "800", color: AMBER, letterSpacing: -0.3 },

  feedbackBadge: {
    alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, marginBottom: 8,
  },
  feedbackText: { fontSize: 14, fontWeight: "700" },

  gridContainer: { alignItems: "center", paddingHorizontal: GRID_PAD },
  grid: { flexDirection: "row", flexWrap: "wrap", width: GRID_SIZE * CELL_W + (GRID_SIZE - 1) * CELL_GAP, gap: CELL_GAP },

  cell: {
    width: CELL_W, height: CELL_W,
    borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.06)",
  },
  cellPlayer: {
    backgroundColor: PLAYER_COLOR,
    borderColor: PLAYER_COLOR,
    shadowColor: PLAYER_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  cellCollected: { backgroundColor: "rgba(255,255,255,0.02)", borderColor: "transparent" },
  playerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#000" },
  cellText: { fontSize: 11, fontWeight: "700", textAlign: "center", paddingHorizontal: 2 },

  hint: { textAlign: "center", color: MUTED, fontSize: 12, marginTop: 14 },

  // ── D-pad ──
  dpad: { alignItems: "center", marginTop: 16 },
  dpadRow: { flexDirection: "row", alignItems: "center" },
  dpadBtn: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    margin: 3,
  },
  dpadCenter: { width: 48, height: 48, margin: 3 },
  dpadSpacer: { width: 48, height: 48, margin: 3 },

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
