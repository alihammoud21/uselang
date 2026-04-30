// ── Confetti burst ───────────────────────────────────────────────────────────
// Zero-dependency celebration overlay. Fires N small rectangles from the
// top of the target region, each with randomized color/rotation/velocity,
// driven by Reanimated so everything runs on the UI thread. No video, no
// Lottie, no extra libraries — just math + transforms.
//
// Usage:
//   <ConfettiBurst visible={won} onDone={() => setWon(false)} />

import React, { useEffect, useMemo } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { COLORS } from "@/lib/constants";

const { width: SW, height: SH } = Dimensions.get("window");

const PALETTE = [
  COLORS.gold,
  "#F0B86F",
  "#EADFC9",
  "#22C55E",
  "#FFFFFF",
  "#FFC8B8",
];

interface Props {
  visible: boolean;
  count?: number;
  durationMs?: number;
  onDone?: () => void;
}

export function ConfettiBurst({
  visible,
  count = 42,
  durationMs = 2200,
  onDone,
}: Props) {
  // Generate particle layouts once (stable per mount so replays feel fresh
  // by remounting the component, not by re-shuffling).
  const particles = useMemo(() => makeParticles(count), [count]);
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill as any}
    >
      {visible
        ? particles.map((p, i) => (
            <Particle
              key={i}
              particle={p}
              durationMs={durationMs}
              onComplete={i === 0 ? () => onDone?.() : undefined}
            />
          ))
        : null}
    </View>
  );
}

interface ParticleSpec {
  xStart: number;
  xDrift: number;       // horizontal drift in px over lifetime
  yEnd: number;
  delay: number;
  rotStart: number;
  rotSpin: number;
  color: string;
  width: number;
  height: number;
}

function makeParticles(count: number): ParticleSpec[] {
  const out: ParticleSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      xStart: Math.random() * SW,
      xDrift: (Math.random() - 0.5) * SW * 0.6,
      yEnd: SH * 0.85 + Math.random() * SH * 0.1,
      delay: Math.random() * 300,
      rotStart: Math.random() * 360,
      rotSpin: 360 + Math.random() * 720,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      width: 6 + Math.random() * 6,
      height: 10 + Math.random() * 8,
    });
  }
  return out;
}

function Particle({
  particle,
  durationMs,
  onComplete,
}: {
  particle: ParticleSpec;
  durationMs: number;
  onComplete?: () => void;
}) {
  const y = useSharedValue(-20);
  const x = useSharedValue(particle.xStart);
  const rot = useSharedValue(particle.rotStart);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    y.value = withDelay(
      particle.delay,
      withTiming(particle.yEnd, { duration: durationMs, easing: ease }, () => {
        if (onComplete) runOnJS(onComplete)();
      })
    );
    x.value = withDelay(
      particle.delay,
      withTiming(particle.xStart + particle.xDrift, {
        duration: durationMs,
        easing: Easing.inOut(Easing.quad),
      })
    );
    rot.value = withDelay(
      particle.delay,
      withTiming(particle.rotStart + particle.rotSpin, {
        duration: durationMs,
        easing: Easing.linear,
      })
    );
    opacity.value = withDelay(
      particle.delay + durationMs * 0.7,
      withTiming(0, { duration: durationMs * 0.3 })
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          width: particle.width,
          height: particle.height,
          borderRadius: 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}
