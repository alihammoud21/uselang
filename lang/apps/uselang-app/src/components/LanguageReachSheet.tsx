import React, { useEffect } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { LANGUAGE_REACH } from "@/components/NativeGlobe";

// ── Language reach bottom sheet ─────────────────────────────────────────────
// Opened from the AISphere on long-press. Shows where the user's chosen
// language lives in the world and how many speakers they just unlocked.

interface Props {
  visible: boolean;
  languageCode: string;
  onClose: () => void;
}

export function LanguageReachSheet({ visible, languageCode, onClose }: Props) {
  const translateY = useSharedValue(600);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      backdrop.value = withTiming(1, { duration: 260 });
    } else {
      translateY.value = withTiming(600, { duration: 240, easing: Easing.in(Easing.cubic) });
      backdrop.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
  const reach = LANGUAGE_REACH[languageCode];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable onPress={onClose} style={{ flex: 1 }}>
          <Animated.View
            style={[
              { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
              backdropStyle,
            ]}
          />
        </Pressable>

        <Animated.View
          style={[
            {
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 10,
              paddingBottom: 36,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.18,
              shadowRadius: 24,
              elevation: 24,
            },
            sheetStyle,
          ]}
        >
          {/* Grabber */}
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <View
              style={{
                width: 44,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.textMuted,
                opacity: 0.45,
              }}
            />
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: COLORS.textMuted,
                letterSpacing: 1,
              }}
            >
              LANGUAGE REACH
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "700",
                color: COLORS.text,
                letterSpacing: -0.8,
                marginTop: 6,
              }}
            >
              {lang?.label || "—"}
            </Text>

            {reach ? (
              <>
                <Text
                  style={{
                    fontSize: 15,
                    color: COLORS.textSub,
                    lineHeight: 22,
                    marginTop: 12,
                  }}
                >
                  You can already speak to{" "}
                  <Text style={{ fontWeight: "700", color: COLORS.text }}>
                    {reach.speakers}
                  </Text>{" "}
                  people across{" "}
                  <Text style={{ fontWeight: "700", color: COLORS.text }}>
                    {reach.countries}
                  </Text>{" "}
                  countries.
                </Text>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
                  <StatCard value={String(reach.countries)} label="countries" icon="earth-outline" />
                  <StatCard value={reach.speakers} label="speakers" icon="people-outline" />
                </View>

                <View
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: COLORS.goldLight,
                    borderWidth: 1,
                    borderColor: COLORS.goldDim,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Ionicons name="sparkles-outline" size={15} color={COLORS.gold} />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: COLORS.textMuted,
                        letterSpacing: 0.8,
                      }}
                    >
                      WHY IT MATTERS
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 19 }}>
                    Every new phrase you practice opens doors in these places.
                    This is the world you're unlocking.
                  </Text>
                </View>
              </>
            ) : (
              <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 14 }}>
                Reach data unavailable for this language.
              </Text>
            )}

            <Pressable
              onPress={onClose}
              style={{
                marginTop: 24,
                height: 48,
                borderRadius: 14,
                backgroundColor: COLORS.text,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFF" }}>Close</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: COLORS.surface2,
      }}
    >
      <Ionicons name={icon} size={16} color={COLORS.gold} />
      <Text
        style={{
          fontSize: 26,
          fontWeight: "700",
          color: COLORS.text,
          letterSpacing: -0.5,
          marginTop: 8,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "600",
          color: COLORS.textMuted,
          letterSpacing: 0.5,
          marginTop: 2,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
