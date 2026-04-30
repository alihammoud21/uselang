// ── SphereOrb — shared 3D sphere ─────────────────────────────────────────────
//
// One sphere component used by both Speak/Quick and the Quick Session screen.
// Cream/amber when idle/listening, blue when speaking, gold when thinking.
// Soft glow expands outward during active states. Mic-level reactive scale.

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
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

const AnimatedView = Animated.createAnimatedComponent(View);

export type SphereOrbState = "idle" | "listening" | "thinking" | "speaking";
export type SphereOrbTone = "warm" | "blue";

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
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isActive = isListening || isSpeaking;

  const c = size / 2;

  const breath   = useSharedValue(1);
  const press    = useSharedValue(1);
  const r1Scale  = useSharedValue(1);
  const r1Alpha  = useSharedValue(0);
  const r2Scale  = useSharedValue(1);
  const r2Alpha  = useSharedValue(0);
  const actBoost = useSharedValue(1);

  useEffect(() => {
    const dur = isListening ? 850 : isSpeaking ? 1000 : isThinking ? 1500 : 3400;
    const amp = isActive ? 0.042 : isThinking ? 0.025 : 0.012;
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
          withTiming(0, { duration: r1 - 80, easing: Easing.out(Easing.quad) }),
        ), -1, false,
      );
      r2Scale.value = 1;
      r2Scale.value = withRepeat(
        withTiming(1.7, { duration: r2, easing: Easing.out(Easing.quad) }), -1, false,
      );
      r2Alpha.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 80 }),
          withTiming(0, { duration: r2 - 80, easing: Easing.out(Easing.quad) }),
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
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Alpha.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Alpha.value }));

  // Glow color per state — soft, tinted halo instead of hard ring borders.
  const glowColor =
    isSpeaking  ? "rgba(91,163,255,0.35)" :
    isListening ? "rgba(215,165,100,0.35)" :
    isThinking  ? "rgba(220,195,90,0.30)" :
                  "rgba(180,170,155,0.08)";

  // Per-state palette for the sphere gradient.
  const rimColor =
    isSpeaking  ? "#93C4FF" :
    isListening ? "#D4B896" :
    isThinking  ? "#E5D49A" :
    tone === "warm" ? "#D4C4AD" : "#B0CFEF";

  const bodyLight =
    isSpeaking  ? "#F5FAFF" :
    isThinking  ? "#FFFDF0" :
    tone === "warm" ? "#FEFBF6" : "#F2F8FF";

  const bodyMid =
    isSpeaking  ? "#D6E9FF" :
    isThinking  ? "#F5EDBE" :
    tone === "warm" ? "#EDE0CC" : "#D4E6FA";

  // Shadow per state — softer and more diffuse than before.
  const shadowOpacity = isActive ? 0.40 : isThinking ? 0.30 : 0.18;
  const shadowRadius  = isActive ? 28 : isThinking ? 22 : 16;
  const shadowColor =
    isSpeaking  ? "#6BAAEE" :
    isListening ? "#C8A070" :
    isThinking  ? "#D4BF6A" :
    tone === "warm" ? "#B8A88E" : "#8AB0D8";

  const gid = `orb_${size}`;

  return (
    <View style={{ width: size + 48, height: size + 48, alignItems: "center", justifyContent: "center" }}>
      {/* Soft glow rings — filled circles with tinted bg, no borders */}
      <AnimatedView
        style={[{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
        }, ring2Style]}
      />
      <AnimatedView
        style={[{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: glowColor,
        }, ring1Style]}
      />

      <Pressable
        onPress={onTap}
        onLongPress={onLongPress}
        delayLongPress={350}
        onPressIn={() => { press.value = withTiming(0.95, { duration: 130, easing: Easing.out(Easing.quad) }); }}
        onPressOut={() => {
          press.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
          onPressOutExternal?.();
        }}
        hitSlop={20}
      >
        <AnimatedView
          style={[{
            width: size, height: size, borderRadius: size / 2,
            shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity,
            shadowRadius,
            elevation: 0,
          }, sphereStyle]}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <RadialGradient
                id={`${gid}_body`}
                cx={c * 0.68}
                cy={c * 0.58}
                r={c * 1.10}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="#FFFFFF"   stopOpacity="1" />
                <Stop offset="18%"  stopColor={bodyLight} stopOpacity="1" />
                <Stop offset="50%"  stopColor={bodyMid}   stopOpacity="1" />
                <Stop offset="82%"  stopColor={rimColor}  stopOpacity="1" />
                <Stop offset="100%" stopColor={rimColor}  stopOpacity="0.9" />
              </RadialGradient>

              {/* Specular highlight — tight radial fade for a soft dot */}
              <RadialGradient
                id={`${gid}_spec`}
                cx={c * 0.42}
                cy={c * 0.35}
                r={c * 0.14}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.85" />
                <Stop offset="60%"  stopColor="#FFFFFF" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            <Circle cx={c} cy={c} r={c} fill={`url(#${gid}_body)`} />
            <Circle cx={c} cy={c} r={c} fill={`url(#${gid}_spec)`} />
          </Svg>
        </AnimatedView>
      </Pressable>
    </View>
  );
}
