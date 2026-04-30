import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useEffect } from "react";
import { BlurView } from "expo-blur";
import { COLORS } from "@/lib/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface LiquidGlassPopupProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: React.ReactNode;
}

export function LiquidGlassPopup({
  visible,
  onDismiss,
  title,
  children,
}: LiquidGlassPopupProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 25,
        stiffness: 300,
      });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.25)",
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onDismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: SCREEN_HEIGHT * 0.6,
          },
          sheetStyle,
        ]}
      >
        <BlurView
          intensity={80}
          tint="light"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.72)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 12,
              paddingBottom: 40,
              paddingHorizontal: 24,
              borderTopWidth: 0.5,
              borderColor: "rgba(255,255,255,0.6)",
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(0,0,0,0.12)",
                alignSelf: "center",
                marginBottom: 16,
              }}
            />

            {/* Title */}
            {title && (
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLORS.ink,
                  marginBottom: 16,
                }}
              >
                {title}
              </Text>
            )}

            {/* Content */}
            {children}

            {/* Dismiss button */}
            <Pressable
              onPress={onDismiss}
              style={{
                marginTop: 20,
                height: 48,
                borderRadius: 14,
                backgroundColor: COLORS.gold,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: COLORS.white,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}
