// ── Lesson progress bar ──────────────────────────────────────────────────────
// Thin bar at the top of the Tutor screen showing "X of N turns" with a
// fill that animates as the learner progresses. Shows a dismissible goal
// line (e.g. "Ordering at a restaurant") so the target is always visible.
//
// The lesson has no hard turn cap — the tutor decides — but 5 to 7 solid
// exchanges is a good default a learner can actually finish in a sitting.

import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

export interface LessonProgress {
  /** Friendly lesson title, e.g. "Ordering at a restaurant". */
  title: string;
  /** Number of successful turns completed so far (0 = not started). */
  turnsDone: number;
  /** Target count of turns before the tutor triggers completion. */
  turnsTarget: number;
  /** True once completion banner has been shown — hides the bar. */
  completed?: boolean;
}

interface Props {
  progress: LessonProgress;
  /** Called when the user taps the X to dismiss an in-progress lesson. */
  onDismiss?: () => void;
}

export function LessonProgressBar({ progress, onDismiss }: Props) {
  const pct = Math.max(
    0,
    Math.min(1, progress.turnsDone / Math.max(1, progress.turnsTarget))
  );
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withTiming(pct, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  if (progress.completed) return null;

  return (
    <View
      style={{
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderColor: COLORS.borderLight,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
          <Ionicons name="flag-outline" size={13} color={COLORS.gold} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: COLORS.text,
              letterSpacing: 0.1,
            }}
            numberOfLines={1}
          >
            {progress.title}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: COLORS.textMuted,
            letterSpacing: 0.5,
          }}
        >
          {progress.turnsDone} / {progress.turnsTarget}
        </Text>
        {onDismiss ? (
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            style={{ marginLeft: 10 }}
            accessibilityLabel="End lesson"
          >
            <Ionicons name="close" size={14} color={COLORS.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: COLORS.surface2,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            {
              height: 4,
              backgroundColor: COLORS.gold,
              borderRadius: 2,
            },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}
