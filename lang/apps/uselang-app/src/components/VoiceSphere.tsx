import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { type AIState } from "@/lib/constants";

const AnimatedView = Animated.createAnimatedComponent(View);

interface VoiceSphereProps {
  state: AIState;
  onTap?: () => void;
  onLongPress?: () => void;
  size?: number;
  /** 0–1 normalized mic activity; subtly pulses the ring while listening. */
  activityLevel?: number;
}

/**
 * Clean white sphere with a thin colored ring and soft outer halo.
 * The ring/halo/pulse colors morph by state:
 *   idle       → soft blue   (resting)
 *   listening  → bright blue (attentive)
 *   thinking   → warm gold   (working)
 *   speaking   → deep blue   (voice)
 *   blocked    → neutral gray
 *
 * During listening/speaking an expanding pulse ring animates outward so the
 * sphere feels alive without busy internals.
 */
export function VoiceSphere({
  state = "idle",
  onTap,
  onLongPress,
  size = 300,
  activityLevel = 0,
}: VoiceSphereProps) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isBlocked = state === "blocked";
  const isActive = isListening || isSpeaking;

  // ── Per-state palette ─────────────────────────────────────────────────────
  // Border of the white disc, outer halo wash, and pulse-ring accent.
  const palette = isBlocked
    ? {
        border: "rgba(180,180,180,0.45)",
        halo: "rgba(180,180,180,0.18)",
        pulse: "rgba(180,180,180,0.35)",
      }
    : isThinking
    ? {
        border: "rgba(216,168,80,0.55)",
        halo: "rgba(246,206,122,0.28)",
        pulse: "rgba(240,190,95,0.55)",
      }
    : isSpeaking
    ? {
        border: "rgba(50,110,220,0.60)",
        halo: "rgba(80,140,240,0.28)",
        pulse: "rgba(50,110,220,0.60)",
      }
    : isListening
    ? {
        border: "rgba(70,130,230,0.55)",
        halo: "rgba(120,170,245,0.30)",
        pulse: "rgba(70,130,230,0.55)",
      }
    : {
        // idle
        border: "rgba(150,180,230,0.45)",
        halo: "rgba(170,200,240,0.22)",
        pulse: "rgba(150,180,230,0.40)",
      };

  // ── Shared values ─────────────────────────────────────────────────────────
  const breath = useSharedValue(1);
  const press = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const halo = useSharedValue(0.35);
  const activityBoost = useSharedValue(1);

  useEffect(() => {
    // Breath speed/amplitude per state
    const breathMs =
      state === "listening" ? 950 :
      state === "speaking" ? 1000 :
      state === "thinking" ? 1500 :
      3400;
    const breathAmp = isActive ? 0.035 : isThinking ? 0.03 : 0.012;
    breath.value = withRepeat(
      withTiming(1 + breathAmp, { duration: breathMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    halo.value = withRepeat(
      withTiming(isActive ? 0.8 : isThinking ? 0.7 : 0.35, {
        duration: breathMs * 1.3,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );

    if (isActive || isThinking) {
      // Outer pulse rings — outward ripple effect.
      const r1Ms = isSpeaking ? 1500 : isListening ? 1700 : 2100;
      const r2Ms = isSpeaking ? 2100 : isListening ? 2400 : 2900;
      ring1Scale.value = 1;
      ring1Scale.value = withRepeat(
        withTiming(1.45, { duration: r1Ms, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 80 }),
          withTiming(0, { duration: r1Ms - 80, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      );
      ring2Scale.value = 1;
      ring2Scale.value = withRepeat(
        withTiming(1.78, { duration: r2Ms, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 80 }),
          withTiming(0, { duration: r2Ms - 80, easing: Easing.out(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      ring1Scale.value = withTiming(1, { duration: 300 });
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Scale.value = withTiming(1, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
    }
  }, [state]);

  // Mic-activity reactive bump — nudges sphere scale when user speaks.
  useEffect(() => {
    if (!isListening) {
      activityBoost.value = withSpring(1, { damping: 14, stiffness: 120 });
      return;
    }
    const kick = 1 + Math.min(0.04, activityLevel * 0.06);
    activityBoost.value = withSpring(kick, { damping: 12, stiffness: 180 });
  }, [activityLevel, isListening]);

  // ── Derived styles ────────────────────────────────────────────────────────
  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * press.value * activityBoost.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulse rings — animate outward during active states */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: palette.pulse,
          },
          ring2Style,
        ]}
      />
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: palette.pulse,
          },
          ring1Style,
        ]}
      />

      {/* Soft outer halo wash */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size * 1.22,
            height: size * 1.22,
            borderRadius: (size * 1.22) / 2,
            backgroundColor: palette.halo,
            top: -(size * 0.11),
            left: -(size * 0.11),
          },
          haloStyle,
        ]}
      />

      <Pressable
        onPress={onTap}
        onLongPress={onLongPress}
        delayLongPress={450}
        onPressIn={() => {
          press.value = withTiming(0.95, { duration: 140, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          press.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
        }}
        hitSlop={20}
      >
        <AnimatedView
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: "#FFFFFF",
              borderWidth: 2,
              borderColor: palette.border,
              overflow: "hidden",
              shadowColor: isThinking ? "#C4A67C" : "#2E6BD8",
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: isActive || isThinking ? 0.22 : 0.14,
              shadowRadius: 28,
              elevation: 8,
            },
            sphereStyle,
          ]}
        />
      </Pressable>
    </View>
  );
}
