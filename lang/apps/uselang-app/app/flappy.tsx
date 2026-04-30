// ── Flappy Sphere Easter Egg ─────────────────────────────────────────────────
// Infinite Flappy Bird style. Sphere is the bird.
// Pipes are labeled with words — tap the correct word to pass safely.
// Wrong word or miss = game over.
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  withSpring,
  runOnJS,
} from "react-native-reanimated";

const { width: SW, height: SH } = Dimensions.get("window");
const SPHERE_X = SW * 0.22;
const SPHERE_R = 32;
const GRAVITY = 2000;
const FLAP_VELOCITY = -500;
const PIPE_WIDTH = 70;
const PIPE_GAP = 180;
const PIPE_SPEED = 200; // px per second
const PIPE_INTERVAL = 2400; // ms between pipes

const BG = "#0A0F1A";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";

interface Pipe {
  id: number;
  x: number;
  topHeight: number;
  correctLabel: string;
  wrongLabel: string;
  correctOnTop: boolean;
}

const WORD_POOLS: Record<string, Array<{ target: string; meaning: string }>> = {
  zh: [
    { target: "你好", meaning: "Hello" },
    { target: "谢谢", meaning: "Thank you" },
    { target: "水", meaning: "Water" },
    { target: "吃", meaning: "Eat" },
    { target: "朋友", meaning: "Friend" },
  ],
  es: [
    { target: "Hola", meaning: "Hello" },
    { target: "Gracias", meaning: "Thank you" },
    { target: "Agua", meaning: "Water" },
    { target: "Comer", meaning: "Eat" },
    { target: "Amigo", meaning: "Friend" },
  ],
  fr: [
    { target: "Bonjour", meaning: "Hello" },
    { target: "Merci", meaning: "Thank you" },
    { target: "Eau", meaning: "Water" },
    { target: "Manger", meaning: "Eat" },
    { target: "Ami", meaning: "Friend" },
  ],
};

function buildPipe(id: number, words: Array<{ target: string; meaning: string }>): Pipe {
  const minTop = 80;
  const maxTop = SH - PIPE_GAP - 80;
  const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
  const pool = [...words];
  const correctIdx = Math.floor(Math.random() * pool.length);
  const correct = pool[correctIdx];
  pool.splice(correctIdx, 1);
  const wrong = pool[Math.floor(Math.random() * pool.length)];
  const correctOnTop = Math.random() > 0.5;
  return {
    id,
    x: SW + PIPE_WIDTH,
    topHeight,
    correctLabel: correct.target,
    wrongLabel: wrong.target,
    correctOnTop,
  };
}

export default function FlappyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang = params.lang || "zh";
  const words = WORD_POOLS[lang] ?? WORD_POOLS.zh;

  const [gameState, setGameState] = useState<"idle" | "playing" | "dead">("idle");
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);

  const sphereY = useSharedValue(SH / 2 - SPHERE_R);
  const velocityRef = useRef(0);
  const lastTickRef = useRef(0);
  const gameStateRef = useRef<"idle" | "playing" | "dead">("idle");
  const pipeIdRef = useRef(0);
  const scoreRef = useRef(0);
  const rafRef = useRef<number>(0);

  const handleClose = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/lessons");
  }, [router]);

  const die = useCallback(() => {
    gameStateRef.current = "dead";
    setGameState("dead");
    cancelAnimationFrame(rafRef.current);
    setBestScore((prev) => Math.max(prev, scoreRef.current));
  }, []);

  const tick = useCallback((ts: number) => {
    if (gameStateRef.current !== "playing") return;
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

      // Collision
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
          // Passed through
          if (p.x + PIPE_WIDTH < SPHERE_X && !("passed" in p)) {
            (p as any).passed = true;
            scoreRef.current += 1;
            runOnJS(setScore)(scoreRef.current);
          }
        }
      }
      return updated;
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [sphereY, die]);

  const startGame = useCallback(() => {
    sphereY.value = SH / 2 - SPHERE_R;
    velocityRef.current = 0;
    lastTickRef.current = 0;
    scoreRef.current = 0;
    pipeIdRef.current = 0;
    setScore(0);
    setPipes([]);
    gameStateRef.current = "playing";
    setGameState("playing");
    rafRef.current = requestAnimationFrame(tick);
  }, [sphereY, tick]);

  // Spawn pipes while playing
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      if (gameStateRef.current !== "playing") return;
      setPipes((prev) => [...prev, buildPipe(pipeIdRef.current++, words)]);
    }, PIPE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameState, words]);

  const flap = useCallback(() => {
    if (gameStateRef.current !== "playing") return;
    velocityRef.current = FLAP_VELOCITY;
  }, []);

  const handleWordTap = useCallback((pipe: Pipe, tappedCorrect: boolean) => {
    if (!tappedCorrect) {
      die();
    }
    // If correct, just continue — the sphere flies through
  }, [die]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sphereY.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={INK} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: AMBER, letterSpacing: 0.5 }}>✦ FUN MODE</Text>
        </View>
        <View style={S.scorePill}>
          <Text style={S.scoreText}>{score}</Text>
        </View>
      </View>

      {/* Game canvas */}
      <Pressable style={{ flex: 1 }} onPress={flap}>
        <View style={{ flex: 1, position: "relative", overflow: "hidden" }}>

          {/* Stars bg */}
          {[...Array(20)].map((_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                width: 2, height: 2, borderRadius: 1,
                backgroundColor: "rgba(243,237,227,0.3)",
                left: (i * 71 + 33) % SW,
                top: (i * 53 + 17) % (SH * 0.7),
              }}
            />
          ))}

          {/* Pipes */}
          {pipes.map((pipe) => (
            <View key={pipe.id} style={{ position: "absolute", left: pipe.x, top: 0, width: PIPE_WIDTH, height: SH }}>
              {/* Top pipe */}
              <View style={{ height: pipe.topHeight, backgroundColor: "#1C3A2A", borderBottomLeftRadius: 8, borderBottomRightRadius: 8, borderWidth: 1, borderColor: "rgba(52,199,89,0.25)" }}>
                <Pressable
                  onPress={() => handleWordTap(pipe, !pipe.correctOnTop)}
                  style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 }}
                >
                  <Text style={S.pipeWord}>{pipe.correctOnTop ? pipe.correctLabel : pipe.wrongLabel}</Text>
                </Pressable>
              </View>
              {/* Gap */}
              <View style={{ height: PIPE_GAP }} />
              {/* Bottom pipe */}
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
              position: "absolute",
              left: SPHERE_X - SPHERE_R,
              width: SPHERE_R * 2,
              height: SPHERE_R * 2,
              borderRadius: SPHERE_R,
              backgroundColor: AMBER,
              shadowColor: AMBER,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 16,
            }, sphereStyle]}
          >
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="globe" size={22} color="#FFF" />
            </View>
          </Animated.View>

          {/* Idle state */}
          {gameState === "idle" && (
            <View style={S.overlay}>
              <Text style={S.overlayTitle}>Flappy Sphere</Text>
              <Text style={S.overlaySub}>Tap to flap · Hit the correct word pipe · Wrong pipe = game over</Text>
              <Pressable onPress={startGame} style={S.startBtn}>
                <Text style={S.startBtnText}>Start</Text>
              </Pressable>
            </View>
          )}

          {/* Dead state */}
          {gameState === "dead" && (
            <View style={S.overlay}>
              <Text style={[S.overlayTitle, { color: "#FF3B30" }]}>Game Over!</Text>
              <Text style={S.overlaySub}>Score: {score}</Text>
              {score > 0 && score >= bestScore && (
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: AMBER, marginBottom: 8 }}>🏆 New Best!</Text>
              )}
              <Text style={[S.overlaySub, { marginBottom: 20 }]}>Best: {bestScore}</Text>
              <Pressable onPress={startGame} style={S.startBtn}>
                <Text style={S.startBtnText}>Try Again</Text>
              </Pressable>
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
  scoreText: { fontFamily: "Geist-Bold", fontSize: 16, color: AMBER },
  pipeWord: {
    fontFamily: "Geist-Bold", fontSize: 11, color: INK,
    textAlign: "center", paddingHorizontal: 4, letterSpacing: 0.2,
  },
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(10,15,26,0.85)", paddingHorizontal: 40,
  },
  overlayTitle: { fontFamily: "Fraunces-Bold", fontSize: 36, color: INK, marginBottom: 10 },
  overlaySub: { fontFamily: "Geist-Regular", fontSize: 14, color: MUTED, textAlign: "center", marginBottom: 6, lineHeight: 20 },
  startBtn: { backgroundColor: AMBER, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 40, marginTop: 16 },
  startBtnText: { fontFamily: "Geist-SemiBold", fontSize: 16, color: "#FFF" },
});
