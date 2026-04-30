import React, { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Ellipse,
  Filter,
  FeGaussianBlur,
} from "react-native-svg";
import { SPHERE_COLORS, type AIState } from "@/lib/constants";

const AnimatedView = Animated.createAnimatedComponent(View);

interface AISphereProps {
  state: AIState;
  onTap?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  size?: number;
  activityLevel?: number;
}

export function AISphere({
  state = "idle",
  onTap,
  onLongPress,
  disabled = false,
  size = 220,
}: AISphereProps) {
  const palette = SPHERE_COLORS[state] ?? SPHERE_COLORS.idle;
  const isActive = state === "listening" || state === "speaking";
  const isThinking = state === "thinking";

  // ── Shared values ─────────────────────────────────────────────────────────
  const breathScale = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    const breathDuration =
      state === "listening" ? 700 :
      state === "speaking" ? 900 :
      state === "thinking" ? 1500 :
      3200;

    const breathAmp = state === "listening" ? 0.05 : state === "speaking" ? 0.03 : 0.015;

    breathScale.value = withRepeat(
      withTiming(1 + breathAmp, { duration: breathDuration, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withTiming(isActive ? 1 : isThinking ? 0.7 : 0.5, { duration: breathDuration * 1.2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    if (isActive) {
      ring1Scale.value = withRepeat(
        withTiming(1.45, { duration: 1600, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      ring1Opacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 100 }),
          withTiming(0, { duration: 1500, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
      ring2Scale.value = withRepeat(
        withTiming(1.75, { duration: 2200, easing: Easing.out(Easing.quad) }),
        -1,
        false
      );
      ring2Opacity.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 100 }),
          withTiming(0, { duration: 2100, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      );
    } else {
      ring1Scale.value = withTiming(1, { duration: 300 });
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Scale.value = withTiming(1, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
    }
  }, [state]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value * pressScale.value }],
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const c = size / 2;
  const r = size / 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Outer pulse ring 2 */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: palette.ringColor,
          },
          ring2Style,
        ]}
      />

      {/* Outer pulse ring 1 */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: palette.ringColor,
          },
          ring1Style,
        ]}
      />

      {/* Soft glow halo */}
      <AnimatedView
        style={[
          {
            position: "absolute",
            width: size * 1.18,
            height: size * 1.18,
            borderRadius: (size * 1.18) / 2,
            backgroundColor: palette.glowColor,
            top: -(size * 0.09),
            left: -(size * 0.09),
          },
          glowStyle,
        ]}
      />

      {/* Main orb */}
      <Pressable
        onPress={!disabled ? onTap : undefined}
        onLongPress={!disabled ? onLongPress : undefined}
        delayLongPress={450}
        onPressIn={() => {
          pressScale.value = withTiming(0.94, { duration: 140, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
        }}
        disabled={disabled}
        hitSlop={20}
      >
        <AnimatedView
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              shadowColor: palette.edgeStop,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.22,
              shadowRadius: 32,
              elevation: 12,
            },
            sphereStyle,
          ]}
        >
          <Svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            <Defs>
              {/* Main gradient — sphere shading */}
              <RadialGradient
                id="orbMain"
                cx="42%"
                cy="38%"
                r="62%"
                gradientUnits="userSpaceOnUse"
                fx={c * 0.42}
                fy={c * 0.38}
              >
                <Stop offset="0%" stopColor={palette.centerStop1} stopOpacity="1" />
                <Stop offset="42%" stopColor={palette.centerStop2} stopOpacity="1" />
                <Stop offset="100%" stopColor={palette.edgeStop} stopOpacity="1" />
              </RadialGradient>

              {/* Specular highlight — upper-left */}
              <RadialGradient
                id="orbHighlight"
                cx="32%"
                cy="28%"
                r="38%"
                gradientUnits="userSpaceOnUse"
                fx={c * 0.32}
                fy={c * 0.28}
              >
                <Stop offset="0%" stopColor="rgba(255,255,255,0.72)" stopOpacity="1" />
                <Stop offset="60%" stopColor="rgba(255,255,255,0.18)" stopOpacity="1" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)" stopOpacity="1" />
              </RadialGradient>

              {/* Soft inner shadow — bottom-right */}
              <RadialGradient
                id="orbShadow"
                cx="72%"
                cy="76%"
                r="45%"
                gradientUnits="userSpaceOnUse"
                fx={c * 1.44}
                fy={c * 1.52}
              >
                <Stop offset="0%" stopColor="rgba(0,0,0,0.10)" stopOpacity="1" />
                <Stop offset="100%" stopColor="rgba(0,0,0,0)" stopOpacity="1" />
              </RadialGradient>
            </Defs>

            {/* Base sphere */}
            <Circle cx={c} cy={c} r={r} fill={`url(#orbMain)`} />

            {/* Inner shadow layer */}
            <Circle cx={c} cy={c} r={r} fill={`url(#orbShadow)`} />

            {/* Specular highlight */}
            <Circle cx={c} cy={c} r={r} fill={`url(#orbHighlight)`} />

            {/* Rim light — thin bright arc top-left */}
            <Ellipse
              cx={c * 0.55}
              cy={c * 0.42}
              rx={r * 0.28}
              ry={r * 0.16}
              fill="rgba(255,255,255,0.30)"
            />
          </Svg>
        </AnimatedView>
      </Pressable>
    </View>
  );
}
