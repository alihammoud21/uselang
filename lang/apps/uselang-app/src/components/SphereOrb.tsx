// ── SphereOrb — Sky Orb design ───────────────────────────────────────────────
//
// 9-layer glass-marble gradient stack (5 radials + 1 linear base + 2 inset-rim
// simulations + soft specular sheen + tight specular hotspot).
// State-aware palettes: warm amber (idle/warm), sky blue (idle/blue),
// gold (thinking), amber-red (listening), bright blue (speaking).
// All animation logic (breath 3.4 s, ring pulses, mic-level reactive scale) preserved.

import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Stop,
} from "react-native-svg";

const AnimatedView = Animated.createAnimatedComponent(View);

export type SphereOrbState = "idle" | "listening" | "thinking" | "speaking";
export type SphereOrbTone = "warm" | "blue" | "gold" | "midnight";

export interface SphereOrbProps {
  state: SphereOrbState;
  micLevel?: number;
  onTap?: () => void;
  /** Hold-to-record gesture. Pairs with onPressOut for "release to submit". */
  onLongPress?: () => void;
  onPressOut?: () => void;
  size?: number;
  /**
   * Idle color palette. "warm" = cream/amber (Lesson result style).
   * "blue" = soft sky-blue glass (Speak entry style).
   */
  tone?: SphereOrbTone;
}

// ── Per-state / per-tone color palette ───────────────────────────────────────
interface OrbPalette {
  baseLight: string; // linear start (upper)
  baseMid:   string; // linear midpoint
  baseDark:  string; // linear end (lower)
  g2:        string; // top-right secondary reflection (pale)
  g3:        string; // bottom-left curvature zone (mid)
  g4:        string; // bottom-right shadow side (deep)
  rimInset:  string; // inset bottom-rim darkening color
  shadowHex: string; // iOS drop-shadow color
  shadowOp:  number; // iOS drop-shadow opacity
  ringBg:    string; // pulse-ring fill color
  haloColor: string; // atmospheric outer halo tint
}

function getPalette(state: SphereOrbState, tone: SphereOrbTone): OrbPalette {
  if (state === "listening") {
    return {
      baseLight: "#FFF0E0", baseMid: "#F2C48A", baseDark: "#D09050",
      g2: "#FFF4EC", g3: "#EAB070", g4: "#C47830",
      rimInset: "rgba(180,110,40,0.22)",
      shadowHex: "#C8A070", shadowOp: 0.38,
      ringBg: "rgba(215,165,100,0.38)",
      haloColor: "rgba(215,165,100,0.28)",
    };
  }
  if (state === "speaking") {
    return {
      baseLight: "#E0F0FF", baseMid: "#93C4FF", baseDark: "#4A9EE8",
      g2: "#C8E4FF", g3: "#60B0FF", g4: "#2060D8",
      rimInset: "rgba(30,80,180,0.24)",
      shadowHex: "#4A8EE0", shadowOp: 0.40,
      ringBg: "rgba(91,163,255,0.38)",
      haloColor: "rgba(91,163,255,0.30)",
    };
  }
  if (state === "thinking") {
    return {
      baseLight: "#FFFBE8", baseMid: "#F5D36A", baseDark: "#D4AA30",
      g2: "#FFF8DC", g3: "#EEC060", g4: "#C08820",
      rimInset: "rgba(180,130,20,0.22)",
      shadowHex: "#D4BF6A", shadowOp: 0.32,
      ringBg: "rgba(220,195,90,0.36)",
      haloColor: "rgba(220,195,90,0.24)",
    };
  }
  // ── idle ──
  if (tone === "warm") {
    return {
      baseLight: "#FEFBF6", baseMid: "#EDE0CC", baseDark: "#D4C4AD",
      g2: "#FFF8F2", g3: "#E0C8A8", g4: "#C0A880",
      rimInset: "rgba(160,120,80,0.16)",
      shadowHex: "#B8A88E", shadowOp: 0.20,
      ringBg: "rgba(180,170,155,0.10)",
      haloColor: "rgba(180,170,155,0.08)",
    };
  }
  if (tone === "gold") {
    return {
      baseLight: "#FFFBE8", baseMid: "#F5D36A", baseDark: "#D4AA30",
      g2: "#FFF8DC", g3: "#EEC060", g4: "#C08820",
      rimInset: "rgba(180,130,20,0.20)",
      shadowHex: "#C9A040", shadowOp: 0.26,
      ringBg: "rgba(220,195,90,0.28)",
      haloColor: "rgba(220,195,90,0.18)",
    };
  }
  if (tone === "midnight") {
    return {
      baseLight: "#E8E8FF", baseMid: "#B0B0EE", baseDark: "#7C7ACC",
      g2: "#E0E0FF", g3: "#9090D8", g4: "#5050B0",
      rimInset: "rgba(60,60,160,0.22)",
      shadowHex: "#6360B8", shadowOp: 0.28,
      ringBg: "rgba(120,120,220,0.28)",
      haloColor: "rgba(120,120,220,0.18)",
    };
  }
  // default: sky blue
  return {
    baseLight: "#BCDEFF", baseMid: "#7CC0FF", baseDark: "#3E9BE8",
    g2: "#DCEFFF", g3: "#6BB6FF", g4: "#2E8FE8",
    rimInset: "rgba(46,100,180,0.22)",
    shadowHex: "#2E8FE8", shadowOp: 0.28,
    ringBg: "rgba(91,163,255,0.32)",
    haloColor: "rgba(124,192,255,0.28)",
  };
}

export function SphereOrb({
  state,
  micLevel = 0,
  onTap,
  onLongPress,
  onPressOut: onPressOutExternal,
  size = 180,
  tone = "warm",
}: SphereOrbProps) {
  const isListening = state === "listening";
  const isSpeaking  = state === "speaking";
  const isThinking  = state === "thinking";
  const isActive    = isListening || isSpeaking;

  const c = size / 2;
  const p = getPalette(state, tone);

  const breath   = useSharedValue(1);
  const press    = useSharedValue(1);
  const r1Scale  = useSharedValue(1);
  const r1Alpha  = useSharedValue(0);
  const r2Scale  = useSharedValue(1);
  const r2Alpha  = useSharedValue(0);
  const actBoost = useSharedValue(1);

  useEffect(() => {
    // Idle breathing: 3.4 s at 2.8% — matches the Sky Orb design spec exactly.
    const dur = isListening ? 850 : isSpeaking ? 1000 : isThinking ? 1500 : 3400;
    const amp = isActive ? 0.042 : isThinking ? 0.025 : 0.028;
    breath.value = withRepeat(
      withTiming(1 + amp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    if (isActive || isThinking) {
      const r1 = isActive ? 1600 : 2200;
      const r2 = isActive ? 2300 : 3100;
      r1Scale.value = 1;
      r1Scale.value = withRepeat(
        withTiming(1.45, { duration: r1, easing: Easing.out(Easing.quad) }), -1, false,
      );
      r1Alpha.value = withRepeat(
        withSequence(
          withTiming(0.45, { duration: 80 }),
          withTiming(0,    { duration: r1 - 80, easing: Easing.out(Easing.quad) }),
        ), -1, false,
      );
      r2Scale.value = 1;
      r2Scale.value = withRepeat(
        withTiming(1.7, { duration: r2, easing: Easing.out(Easing.quad) }), -1, false,
      );
      r2Alpha.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 80 }),
          withTiming(0,   { duration: r2 - 80, easing: Easing.out(Easing.quad) }),
        ), -1, false,
      );
    } else {
      r1Scale.value = withTiming(1, { duration: 400 });
      r1Alpha.value = withTiming(0, { duration: 400 });
      r2Scale.value = withTiming(1, { duration: 400 });
      r2Alpha.value = withTiming(0, { duration: 400 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!isListening) {
      actBoost.value = withSpring(1, { damping: 14, stiffness: 120 });
      return;
    }
    actBoost.value = withSpring(1 + Math.min(0.065, micLevel * 0.09), { damping: 10, stiffness: 200 });
  }, [micLevel, isListening]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * press.value * actBoost.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: r1Scale.value }], opacity: r1Alpha.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: r2Scale.value }], opacity: r2Alpha.value,
  }));

  const gid = `orb_${size}`;

  // ── All gradient anchor points in userSpaceOnUse pixel coords ────────────
  // Positions follow the Sky Orb design spec exactly (percentages of sphere size).
  const lx1 = size * 0.33; const ly1 = size * 0.03;   // linear base start (upper-right)
  const lx2 = size * 0.67; const ly2 = size * 0.97;   // linear base end   (lower-left)

  const g1cx = size * 0.30; const g1cy = size * 0.22; const g1r = size * 0.35; // TL white wash
  const g2cx = size * 0.75; const g2cy = size * 0.28; const g2r = size * 0.50; // TR pale reflection
  const g3cx = size * 0.32; const g3cy = size * 0.78; const g3r = size * 0.55; // BL curvature
  const g4cx = size * 0.80; const g4cy = size * 0.78; const g4r = size * 0.60; // BR shadow side

  const ibcx = c;            const ibcy = size * 0.88; const ibr = size * 0.52; // inset bottom rim
  const itcx = c;            const itcy = size * 0.08; const itr = size * 0.52; // inset top rim

  const shcx = size * 0.52;  const shcy = size * 0.26;                          // soft sheen center
  const shrx = size * 0.34;  const shry = size * 0.14;                          // soft sheen radii

  const hcx  = size * 0.36;  const hcy  = size * 0.24;                          // hotspot center
  const hrx  = size * 0.09;  const hry  = size * 0.05;                          // hotspot radii

  return (
    <View style={{ width: size + 48, height: size + 48, alignItems: "center", justifyContent: "center" }}>

      {/* Ring pulses */}
      <AnimatedView style={[{
        position: "absolute", width: size, height: size,
        borderRadius: size / 2, backgroundColor: p.ringBg,
      }, ring2Style]} />
      <AnimatedView style={[{
        position: "absolute", width: size, height: size,
        borderRadius: size / 2, backgroundColor: p.ringBg,
      }, ring1Style]} />

      <Pressable
        onPress={onTap}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={() => {
          press.value = withTiming(0.95, { duration: 130, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          press.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
          onPressOutExternal?.();
        }}
        hitSlop={20}
      >
        <AnimatedView style={[{
          width: size, height: size, borderRadius: size / 2,
          shadowColor:   p.shadowHex,
          shadowOffset:  { width: 0, height: Math.round(size * 0.11) },
          shadowOpacity: p.shadowOp,
          shadowRadius:  Math.round(size * 0.28),
          elevation: 0,
        }, sphereStyle]}>

          {/* Atmospheric outer halo — sits behind the SVG sphere */}
          <View style={{
            position: "absolute",
            top:  -size * 0.08, left: -size * 0.08,
            width: size * 1.16, height: size * 1.16,
            borderRadius: size * 0.58,
            backgroundColor: p.haloColor,
          }} />

          {/* ── Sky Orb SVG: 9 gradient layers ── */}
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              {/* Clip to sphere boundary */}
              <ClipPath id={`${gid}_clip`}>
                <Circle cx={c} cy={c} r={c} />
              </ClipPath>

              {/* 1. Base linear gradient — 160° tilt (top-right → bottom-left) */}
              <LinearGradient
                id={`${gid}_base`}
                x1={lx1} y1={ly1} x2={lx2} y2={ly2}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor={p.baseLight} />
                <Stop offset="45%"  stopColor={p.baseMid}   />
                <Stop offset="100%" stopColor={p.baseDark}  />
              </LinearGradient>

              {/* 2. Top-left white wash — primary reflection */}
              <RadialGradient
                id={`${gid}_g1`}
                cx={g1cx} cy={g1cy} r={g1r}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>

              {/* 3. Top-right pale — secondary "sky" reflection */}
              <RadialGradient
                id={`${gid}_g2`}
                cx={g2cx} cy={g2cy} r={g2r}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor={p.g2} stopOpacity="1" />
                <Stop offset="100%" stopColor={p.g2} stopOpacity="0" />
              </RadialGradient>

              {/* 4. Bottom-left — curvature / light falloff */}
              <RadialGradient
                id={`${gid}_g3`}
                cx={g3cx} cy={g3cy} r={g3r}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor={p.g3} stopOpacity="1" />
                <Stop offset="100%" stopColor={p.g3} stopOpacity="0" />
              </RadialGradient>

              {/* 5. Bottom-right — deep shadow side */}
              <RadialGradient
                id={`${gid}_g4`}
                cx={g4cx} cy={g4cy} r={g4r}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor={p.g4} stopOpacity="1" />
                <Stop offset="100%" stopColor={p.g4} stopOpacity="0" />
              </RadialGradient>

              {/* 6. Inset bottom-rim darkening (simulates CSS inset shadow) */}
              <RadialGradient
                id={`${gid}_ib`}
                cx={ibcx} cy={ibcy} r={ibr}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor={p.rimInset} stopOpacity="1" />
                <Stop offset="100%" stopColor={p.rimInset} stopOpacity="0" />
              </RadialGradient>

              {/* 7. Inset top brightening (simulates CSS inset top highlight) */}
              <RadialGradient
                id={`${gid}_it`}
                cx={itcx} cy={itcy} r={itr}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="rgba(255,255,255,0.50)" stopOpacity="1" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)"    stopOpacity="0" />
              </RadialGradient>

              {/* 8. Soft specular sheen — wide blurred ellipse near top */}
              <RadialGradient
                id={`${gid}_sheen`}
                cx={shcx} cy={shcy} r={shrx}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.78" />
                <Stop offset="45%"  stopColor="#FFFFFF" stopOpacity="0.35" />
                <Stop offset="70%"  stopColor="#FFFFFF" stopOpacity="0"    />
              </RadialGradient>

              {/* 9. Tight specular hotspot — sharp bright dot */}
              <RadialGradient
                id={`${gid}_hot`}
                cx={hcx} cy={hcy} r={hrx}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.95" />
                <Stop offset="60%"  stopColor="#FFFFFF" stopOpacity="0.30" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"    />
              </RadialGradient>
            </Defs>

            {/* Layer order: base → depth zones → inset rims → specular */}
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_base)`}  clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_g2)`}    clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_g3)`}    clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_g4)`}    clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_ib)`}    clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_it)`}    clipPath={`url(#${gid}_clip)`} />
            <Circle  cx={c}    cy={c}    r={c}    fill={`url(#${gid}_g1)`}    clipPath={`url(#${gid}_clip)`} />
            <Ellipse cx={shcx} cy={shcy} rx={shrx} ry={shry} fill={`url(#${gid}_sheen)`} clipPath={`url(#${gid}_clip)`} />
            <Ellipse cx={hcx}  cy={hcy}  rx={hrx}  ry={hry}  fill={`url(#${gid}_hot)`}   clipPath={`url(#${gid}_clip)`} />
          </Svg>
        </AnimatedView>
      </Pressable>
    </View>
  );
}
