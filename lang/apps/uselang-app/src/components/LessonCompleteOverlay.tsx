// ── Lesson complete overlay ─────────────────────────────────────────────────
// Shown once a lesson hits its turn target. Fades in a celebratory card
// with the scenario-based achievement line ("You can order food in Spanish
// now"), stats, and two CTAs: keep going OR end. Fires the confetti burst
// behind it. Dismissible.

import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { ConfettiBurst } from "./ConfettiBurst";
import type { HomeworkItem } from "@/lib/tutor-api";
import { homeworkTypeIcon, homeworkTypeLabel, markTaskDone } from "@/lib/homework-store";

interface Props {
  visible: boolean;
  title: string;        // "You can order food in Spanish"
  subtitle: string;     // "6 rounds completed in 4 min 12s."
  accuracy?: number;    // 0-100
  homework?: HomeworkItem[];
  /** Stored homework id so task taps can persist via markTaskDone. */
  homeworkId?: string;
  onContinue: () => void;
  onEnd: () => void;
}

export function LessonCompleteOverlay({
  visible,
  title,
  subtitle,
  accuracy,
  homework = [],
  homeworkId,
  onContinue,
  onEnd,
}: Props) {
  const scale = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  // Local done-state for homework rows. Persisted to AsyncStorage via
  // markTaskDone when we have a homeworkId; otherwise the toggle is purely
  // in-session (e.g. legacy tutor responses without a saved homework entry).
  const [doneIds, setDoneIds] = React.useState<Set<string>>(() => new Set());
  const toggleTask = (taskId: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      const willBeDone = !next.has(taskId);
      if (willBeDone) next.add(taskId);
      else next.delete(taskId);
      if (homeworkId) {
        markTaskDone(homeworkId, taskId, willBeDone).catch(() => {
          /* persistence failure is silent — the in-memory state already reflected the tap */
        });
      }
      return next;
    });
  };

  // Reset checked state whenever a fresh completion overlay opens — new
  // lesson means new tasks, even if ids collide.
  React.useEffect(() => {
    if (visible) setDoneIds(new Set());
  }, [visible, homeworkId]);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 16, stiffness: 220 });
      opacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    } else {
      scale.value = withTiming(0.94, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        inset: 0 as any,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 220,
      }}
    >
      <ConfettiBurst visible={visible} />
      <Animated.View
        style={[
          {
            width: "88%",
            maxWidth: 420,
            backgroundColor: "#FFFFFF",
            borderRadius: 26,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.14,
            shadowRadius: 40,
            elevation: 14,
            alignItems: "center",
          },
          cardStyle,
        ]}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: COLORS.goldLight,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Ionicons name="trophy" size={26} color={COLORS.gold} />
        </View>

        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: COLORS.gold,
            letterSpacing: 1.4,
            marginBottom: 6,
          }}
        >
          LESSON COMPLETE
        </Text>

        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: COLORS.text,
            letterSpacing: -0.4,
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSub,
            textAlign: "center",
            lineHeight: 20,
            marginBottom: 16,
          }}
        >
          {subtitle}
        </Text>

        {typeof accuracy === "number" && (
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
              backgroundColor: COLORS.surface2,
              marginBottom: 18,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.text }}>
              Accuracy {accuracy}%
            </Text>
          </View>
        )}

        {/* ── Homework section ─────────────────────────────────────
            Surfaces the tutor-assigned follow-up tasks so the user leaves
            the lesson with a clear "do this next" list. Scrolls when the
            tutor returns three tasks to keep the CTA buttons visible. */}
        {homework.length > 0 ? (
          <View style={{ width: "100%", marginBottom: 14 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: COLORS.textMuted,
                letterSpacing: 1.1,
                marginBottom: 8,
                textAlign: "left",
              }}
            >
              YOUR HOMEWORK
            </Text>
            <ScrollView
              style={{ maxHeight: 180 }}
              showsVerticalScrollIndicator={false}
            >
              {homework.map((task, i) => {
                const done = doneIds.has(task.id);
                return (
                  <Pressable
                    key={task.id || i}
                    onPress={() => toggleTask(task.id)}
                    hitSlop={6}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                      paddingVertical: 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: COLORS.borderLight,
                      opacity: pressed ? 0.78 : 1,
                    })}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: done ? COLORS.success : COLORS.goldLight,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                      }}
                    >
                      <Ionicons
                        name={done ? "checkmark" : homeworkTypeIcon(task.type)}
                        size={done ? 18 : 15}
                        color={done ? "#FFFFFF" : COLORS.gold}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "800",
                            color: done ? COLORS.textMuted : COLORS.gold,
                            letterSpacing: 0.9,
                            textDecorationLine: done ? "line-through" : "none",
                          }}
                        >
                          {homeworkTypeLabel(task.type).toUpperCase()}
                        </Text>
                        {task.title ? (
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: done ? COLORS.textMuted : COLORS.text,
                              flexShrink: 1,
                              textDecorationLine: done ? "line-through" : "none",
                            }}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>
                        ) : null}
                      </View>
                      {task.task ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: done ? COLORS.textMuted : COLORS.textSub,
                            lineHeight: 17,
                            marginTop: 2,
                            textAlign: "left",
                            textDecorationLine: done ? "line-through" : "none",
                          }}
                        >
                          {task.task}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Pressable
            onPress={onEnd}
            style={({ pressed }) => ({
              flex: 1,
              height: 48,
              borderRadius: 14,
              backgroundColor: COLORS.surface2,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text }}>
              Save & end
            </Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            style={({ pressed }) => ({
              flex: 1.2,
              height: 48,
              borderRadius: 14,
              backgroundColor: COLORS.text,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
              Keep going
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
