// ── Mastery banner ──────────────────────────────────────────────────────────
// Small floating card that slides down from the top of the Tutor surface
// when the learner just unlocked a category (e.g. "You've learned a new
// greeting"). Auto-dismisses after a few seconds, but tapping it pins it
// so the learner can read the detail.

import React, { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

export interface MasteryBannerData {
  title: string;                   // "You've learned how to say thanks"
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}

interface Props {
  data: MasteryBannerData | null;
  onDismiss: () => void;
  /** ms before auto-dismiss. 0 disables auto-dismiss. */
  autoDismissMs?: number;
}

export function MasteryBanner({ data, onDismiss, autoDismissMs = 3800 }: Props) {
  const visible = !!data;
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 240 });
      opacity.value = withTiming(1, { duration: 220 });
      if (autoDismissMs > 0) {
        translateY.value = withDelay(
          autoDismissMs,
          withTiming(-80, { duration: 260, easing: Easing.in(Easing.cubic) }, () => {
            runOnJS(onDismiss)();
          })
        );
        opacity.value = withDelay(autoDismissMs, withTiming(0, { duration: 260 }));
      }
    } else {
      translateY.value = withTiming(-80, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!data) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: "absolute",
          top: 60,
          left: 16,
          right: 16,
          zIndex: 200,
        },
        style,
      ]}
    >
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderRadius: 16,
          backgroundColor: "#0D0F10",
          opacity: pressed ? 0.95 : 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
          elevation: 6,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: COLORS.goldLight,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={data.icon || "sparkles"} size={17} color={COLORS.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#FFFFFF",
              letterSpacing: -0.1,
            }}
            numberOfLines={2}
          >
            {data.title}
          </Text>
          {data.subtitle ? (
            <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
              {data.subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
