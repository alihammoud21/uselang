// ── Character Draw Game ──────────────────────────────────────────────────────
// Draw Chinese characters with your finger. Stroke comparison scoring.
// Pre-game flashcard showing stroke order. 10 rounds per session.
import React, { useCallback, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { addXP } from "@/lib/progress-store";

const { width: SW } = Dimensions.get("window");
const BG = "#0C0A09";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const RED = "#FF3B30";
const BLUE = "#5AC8FA";

const CANVAS_SIZE = Math.min(SW - 48, 320);

interface CharEntry {
  char: string;
  pinyin: string;
  meaning: string;
  strokes: number;
}

const CHAR_POOL: CharEntry[] = [
  { char: "一", pinyin: "yī", meaning: "One", strokes: 1 },
  { char: "二", pinyin: "èr", meaning: "Two", strokes: 2 },
  { char: "三", pinyin: "sān", meaning: "Three", strokes: 3 },
  { char: "大", pinyin: "dà", meaning: "Big", strokes: 3 },
  { char: "小", pinyin: "xiǎo", meaning: "Small", strokes: 3 },
  { char: "人", pinyin: "rén", meaning: "Person", strokes: 2 },
  { char: "口", pinyin: "kǒu", meaning: "Mouth", strokes: 3 },
  { char: "日", pinyin: "rì", meaning: "Sun/Day", strokes: 4 },
  { char: "月", pinyin: "yuè", meaning: "Moon", strokes: 4 },
  { char: "水", pinyin: "shuǐ", meaning: "Water", strokes: 4 },
  { char: "火", pinyin: "huǒ", meaning: "Fire", strokes: 4 },
  { char: "山", pinyin: "shān", meaning: "Mountain", strokes: 3 },
  { char: "木", pinyin: "mù", meaning: "Tree", strokes: 4 },
  { char: "中", pinyin: "zhōng", meaning: "Middle", strokes: 4 },
  { char: "天", pinyin: "tiān", meaning: "Sky", strokes: 4 },
  { char: "上", pinyin: "shàng", meaning: "Up/Above", strokes: 3 },
  { char: "下", pinyin: "xià", meaning: "Down/Below", strokes: 3 },
  { char: "手", pinyin: "shǒu", meaning: "Hand", strokes: 4 },
  { char: "心", pinyin: "xīn", meaning: "Heart", strokes: 4 },
  { char: "王", pinyin: "wáng", meaning: "King", strokes: 4 },
];

const ROUNDS_PER_SESSION = 10;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Canvas for freehand drawing ──
function DrawCanvas({
  onStrokesChange,
}: {
  onStrokesChange: (count: number, paths: string[]) => void;
}) {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef("");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current = `M${locationX},${locationY}`;
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        currentPath.current += ` L${locationX},${locationY}`;
        setPaths((prev) => {
          const next = [...prev.slice(0, -1), prev.length > 0 && prev[prev.length - 1] === currentPath.current
            ? currentPath.current
            : currentPath.current];
          // Replace in-progress stroke
          if (prev.length > 0 && prev[prev.length - 1].startsWith(currentPath.current.split(" L")[0])) {
            return [...prev.slice(0, -1), currentPath.current];
          }
          return [...prev, currentPath.current];
        });
      },
      onPanResponderRelease: () => {
        setPaths((prev) => {
          const final = prev.filter((p) => p.length > 5);
          // Deduplicate — keep only unique completed strokes
          const unique: string[] = [];
          for (const p of final) {
            if (!unique.includes(p)) unique.push(p);
          }
          onStrokesChange(unique.length, unique);
          return unique;
        });
        currentPath.current = "";
      },
    })
  ).current;

  const clear = useCallback(() => {
    setPaths([]);
    currentPath.current = "";
    onStrokesChange(0, []);
  }, [onStrokesChange]);

  return (
    <View style={S.canvasWrapper}>
      <View style={S.canvas} {...panResponder.panHandlers}>
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE}>
          {/* Grid lines */}
          <Path d={`M${CANVAS_SIZE/2},0 V${CANVAS_SIZE}`} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,4" />
          <Path d={`M0,${CANVAS_SIZE/2} H${CANVAS_SIZE}`} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,4" />
          {/* User strokes */}
          {paths.map((p, i) => (
            <Path key={i} d={p} stroke={AMBER} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>
      <Pressable onPress={clear} style={S.clearBtn}>
        <Ionicons name="refresh" size={16} color={MUTED} />
        <Text style={S.clearBtnText}>Clear</Text>
      </Pressable>
    </View>
  );
}

export default function DrawGameScreen() {
  const router = useRouter();

  const [phase, setPhase] = useState<"intro" | "study" | "draw" | "feedback" | "done">("intro");
  const [chars] = useState(() => shuffle(CHAR_POOL).slice(0, ROUNDS_PER_SESSION));
  const [round, setRound] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [studyIdx, setStudyIdx] = useState(0);

  const current = chars[round];

  const handleStrokesChange = useCallback((count: number, paths: string[]) => {
    setStrokeCount(count);
    setDrawnPaths(paths);
  }, []);

  const submitDrawing = useCallback(() => {
    if (strokeCount === 0) { setRoundScore(0); setPhase("feedback"); return; }

    // ── Multi-factor scoring ──
    // 1. Stroke count accuracy (40% weight)
    const expected = current.strokes;
    const diff = Math.abs(strokeCount - expected);
    const strokeScore = diff === 0 ? 100 : diff === 1 ? 80 : diff === 2 ? 55 : 30;

    // 2. Drawing complexity — total path length (30% weight)
    // Extract coordinates from SVG path data and measure total drawn length
    let totalLen = 0;
    let allPoints: { x: number; y: number }[] = [];
    for (const p of drawnPaths) {
      const coords = p.match(/[\d.]+/g)?.map(Number) || [];
      let prevX = 0, prevY = 0;
      for (let i = 0; i < coords.length - 1; i += 2) {
        const x = coords[i], y = coords[i + 1];
        allPoints.push({ x, y });
        if (i > 0) totalLen += Math.sqrt((x - prevX) ** 2 + (y - prevY) ** 2);
        prevX = x; prevY = y;
      }
    }
    // Expect ~30-60% of canvas diagonal per stroke for a reasonable drawing
    const canvasDiag = Math.sqrt(CANVAS_SIZE ** 2 * 2);
    const expectedLen = expected * canvasDiag * 0.35;
    const lenRatio = Math.min(totalLen / Math.max(expectedLen, 1), 2);
    const complexityScore = lenRatio < 0.15 ? 20 : lenRatio < 0.3 ? 40 : lenRatio < 0.6 ? 70 : lenRatio <= 1.5 ? 100 : 70;

    // 3. Spatial coverage — how much of the canvas is used (30% weight)
    // Divide canvas into 3x3 grid and check how many cells have strokes
    const GRID = 3;
    const cellSize = CANVAS_SIZE / GRID;
    const cells = new Set<string>();
    for (const pt of allPoints) {
      const gx = Math.min(Math.floor(pt.x / cellSize), GRID - 1);
      const gy = Math.min(Math.floor(pt.y / cellSize), GRID - 1);
      cells.add(`${gx},${gy}`);
    }
    // Characters typically fill 3-6 cells of a 3x3 grid
    const coverageScore = cells.size <= 1 ? 20 : cells.size <= 2 ? 40 : cells.size <= 4 ? 70 : cells.size <= 6 ? 100 : 90;

    const score = Math.round(strokeScore * 0.4 + complexityScore * 0.3 + coverageScore * 0.3);
    setRoundScore(Math.min(100, Math.max(0, score)));
    setTotalScore((prev) => prev + Math.min(100, Math.max(0, score)));
    setPhase("feedback");
  }, [current, strokeCount, drawnPaths]);

  const nextRound = useCallback(() => {
    if (round + 1 >= ROUNDS_PER_SESSION) {
      addXP(Math.max(10, Math.round(totalScore / 10))).catch(() => {});
      setPhase("done");
    } else {
      setRound((r) => r + 1);
      setStrokeCount(0);
      setDrawnPaths([]);
      setRoundScore(0);
      setPhase("study");
      setStudyIdx(0);
    }
  }, [round, totalScore]);

  // ── Intro ──
  if (phase === "intro") {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={S.title}>Character Draw</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={S.centered}>
          <Ionicons name="brush" size={48} color={AMBER} style={{ marginBottom: 16 }} />
          <Text style={S.heroTitle}>Draw Chinese Characters</Text>
          <Text style={S.heroSub}>Study the character, then draw it from memory.{"\n"}{ROUNDS_PER_SESSION} rounds. Scored by strokes, shape & coverage.</Text>
          <Pressable onPress={() => { setPhase("study"); setStudyIdx(0); }} style={[S.startBtn, { marginTop: 30 }]}>
            <Text style={S.startBtnText}>Start</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Study flashcard ──
  if (phase === "study") {
    const c = chars[round];
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Text style={S.roundPill}>Round {round + 1}/{ROUNDS_PER_SESSION}</Text>
          <Text style={S.title}>Study</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={S.centered}>
          <Animated.View entering={ZoomIn.duration(300)} style={S.studyCard}>
            <Text style={S.studyChar}>{c.char}</Text>
            <Text style={S.studyPinyin}>{c.pinyin}</Text>
            <Text style={S.studyMeaning}>{c.meaning}</Text>
            <View style={S.strokeInfo}>
              <Ionicons name="create-outline" size={14} color={MUTED} />
              <Text style={S.strokeInfoText}>{c.strokes} stroke{c.strokes > 1 ? "s" : ""}</Text>
            </View>
          </Animated.View>
          <Pressable onPress={() => setPhase("draw")} style={[S.startBtn, { marginTop: 24 }]}>
            <Text style={S.startBtnText}>Draw It</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Draw ──
  if (phase === "draw") {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Text style={S.roundPill}>Round {round + 1}/{ROUNDS_PER_SESSION}</Text>
          <Text style={S.title}>Draw: {current.meaning}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={S.centered}>
          <Text style={S.drawHint}>Draw "{current.meaning}" ({current.pinyin})</Text>
          <DrawCanvas onStrokesChange={handleStrokesChange} />
          <Text style={S.strokeCounter}>Strokes: {strokeCount} (expected: {current.strokes})</Text>
          <Pressable
            onPress={submitDrawing}
            disabled={strokeCount === 0}
            style={[S.startBtn, { marginTop: 16 }, strokeCount === 0 && { opacity: 0.4 }]}
          >
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={S.startBtnText}> Submit</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Feedback ──
  if (phase === "feedback") {
    const isGood = roundScore >= 75;
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.centered}>
          <Animated.View entering={ZoomIn.duration(300)}>
            <View style={[S.feedbackCircle, { backgroundColor: isGood ? "rgba(52,199,89,0.15)" : "rgba(255,59,48,0.15)" }]}>
              <Ionicons name={isGood ? "checkmark-circle" : "close-circle"} size={44} color={isGood ? GREEN : RED} />
            </View>
          </Animated.View>
          <Text style={S.heroTitle}>{roundScore}%</Text>
          <Text style={S.heroSub}>
            {roundScore === 100 ? "Perfect strokes!" :
             roundScore >= 75 ? "Great job!" :
             roundScore >= 50 ? "Close! Try to match the stroke count." :
             "Keep practicing! Study the character again."}
          </Text>
          <View style={S.answerReveal}>
            <Text style={S.answerChar}>{current.char}</Text>
            <Text style={S.answerPinyin}>{current.pinyin} — {current.meaning}</Text>
            <Text style={S.answerStrokes}>{current.strokes} strokes</Text>
          </View>
          <Pressable onPress={nextRound} style={[S.startBtn, { marginTop: 20 }]}>
            <Text style={S.startBtnText}>{round + 1 >= ROUNDS_PER_SESSION ? "See Results" : "Next"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Done ──
  const avgScore = Math.round(totalScore / ROUNDS_PER_SESSION);
  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      <View style={S.centered}>
        <Animated.View entering={ZoomIn.duration(400)}>
          <Ionicons name="trophy" size={56} color="#F59E0B" />
        </Animated.View>
        <Text style={[S.heroTitle, { marginTop: 16 }]}>Session Complete!</Text>
        <Text style={S.heroSub}>Average score: {avgScore}%</Text>
        <View style={S.statsRow}>
          <View style={S.statBox}>
            <Text style={S.statValue}>{ROUNDS_PER_SESSION}</Text>
            <Text style={S.statLabel}>Rounds</Text>
          </View>
          <View style={S.statBox}>
            <Text style={S.statValue}>{totalScore}</Text>
            <Text style={S.statLabel}>Total Score</Text>
          </View>
          <View style={S.statBox}>
            <Text style={S.statValue}>+{Math.max(10, Math.round(totalScore / 10))}</Text>
            <Text style={S.statLabel}>XP Earned</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} style={[S.startBtn, { marginTop: 24 }]}>
          <Text style={S.startBtnText}>Done</Text>
        </Pressable>
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
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: INK, textAlign: "center" },
  roundPill: {
    fontSize: 12, fontWeight: "700", color: AMBER,
    backgroundColor: "rgba(200,128,74,0.12)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, overflow: "hidden",
  },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: INK, textAlign: "center" },
  heroSub: { fontSize: 14, color: MUTED, textAlign: "center", marginTop: 6, lineHeight: 20 },

  startBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: AMBER, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32,
  },
  startBtnText: { fontWeight: "700", fontSize: 16, color: "#FFF" },

  studyCard: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 24, padding: 32,
    alignItems: "center", width: "80%", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  studyChar: { fontSize: 72, fontWeight: "900", color: AMBER },
  studyPinyin: { fontSize: 18, color: BLUE, marginTop: 8 },
  studyMeaning: { fontSize: 16, fontWeight: "600", color: INK, marginTop: 4 },
  strokeInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  strokeInfoText: { fontSize: 13, color: MUTED },

  drawHint: { fontSize: 16, fontWeight: "600", color: INK, marginBottom: 16 },
  canvasWrapper: { alignItems: "center" },
  canvas: {
    width: CANVAS_SIZE, height: CANVAS_SIZE, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)", overflow: "hidden",
  },
  clearBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    marginTop: 10, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10,
  },
  clearBtnText: { fontSize: 13, color: MUTED },

  strokeCounter: { fontSize: 13, color: MUTED, marginTop: 10 },

  feedbackCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  answerReveal: {
    alignItems: "center", marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 20,
  },
  answerChar: { fontSize: 48, fontWeight: "900", color: AMBER },
  answerPinyin: { fontSize: 14, color: BLUE, marginTop: 4 },
  answerStrokes: { fontSize: 12, color: MUTED, marginTop: 4 },

  statsRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  statBox: {
    alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)",
  },
  statValue: { fontSize: 22, fontWeight: "900", color: AMBER },
  statLabel: { fontSize: 11, color: MUTED, marginTop: 2 },
});
