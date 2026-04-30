// ── Premium pronunciation bottom sheet ───────────────────────────────────────
// Replaces the old LiquidGlassPopup "emoji" treatment. Shows the phrase, the
// phonetic, a real tongue/mouth diagram, and per-axis articulation coaching
// (tongue / lips / airflow / stress) — everything Lang actually generates.
// Transparent-ish background so the transcript stays visible behind.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { AnimatedMouth } from "./AnimatedMouth";
import type { TutorResponse } from "@/lib/tutor-api";

const { height: SH } = Dimensions.get("window");

interface Props {
  visible: boolean;
  response: TutorResponse | null;
  phoneme?: string;
  isPlaying?: boolean;
  hasUserAudio?: boolean;
  isPlayingUser?: boolean;
  onClose: () => void;
  onPlayNative?: () => void;
  onPlayUser?: () => void;
  onTryAgain?: () => void;
}

export function PronunciationSheet({
  visible,
  response,
  phoneme,
  isPlaying = false,
  hasUserAudio = false,
  isPlayingUser = false,
  onClose,
  onPlayNative,
  onPlayUser,
  onTryAgain,
}: Props) {
  const [view, setView] = useState<"side" | "front">("side");
  const [articulating, setArticulating] = useState(false);
  const translateY = useSharedValue(SH);
  const backdropOpacity = useSharedValue(0);

  // Auto-play the articulation loop while the tutor is speaking the phrase
  // — the mouth moves in sync with the audio, which is the whole point of
  // "hyper-realistic tongue placement with video".
  useEffect(() => {
    if (visible) setArticulating(isPlaying);
    else setArticulating(false);
  }, [visible, isPlaying]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 22, stiffness: 220, mass: 0.85 });
      backdropOpacity.value = withTiming(1, { duration: 240 });
    } else {
      translateY.value = withSpring(SH, { damping: 26, stiffness: 280 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible || !response) return null;

  const art = response.articulation;

  return (
    <View style={{ position: "absolute", inset: 0 as any, zIndex: 120 }}>
      {/* Translucent backdrop — transcript stays visible behind */}
      <Animated.View
        style={[
          {
            position: "absolute",
            inset: 0 as any,
            backgroundColor: "rgba(10,10,14,0.28)",
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: SH * 0.86,
          },
          sheetStyle,
        ]}
      >
        <BlurView
          intensity={70}
          tint="light"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.82)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 10,
              paddingBottom: 28,
              paddingHorizontal: 22,
              borderTopWidth: 0.5,
              borderColor: "rgba(255,255,255,0.6)",
            }}
          >
            {/* Grab handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(0,0,0,0.12)",
                alignSelf: "center",
                marginBottom: 14,
              }}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {/* Header row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: COLORS.textMuted,
                    letterSpacing: 0.9,
                  }}
                >
                  PRONUNCIATION
                </Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Ionicons name="close" size={20} color={COLORS.textMuted} />
                </Pressable>
              </View>

              {/* Phrase */}
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: "800",
                  color: COLORS.text,
                  letterSpacing: -0.5,
                  marginTop: 6,
                }}
              >
                {response.naturalPhrase}
              </Text>
              {response.phonetic ? (
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: COLORS.gold,
                    marginTop: 4,
                    letterSpacing: 0.2,
                  }}
                >
                  {response.phonetic}
                </Text>
              ) : null}

              {/* Diagram + view toggle */}
              <View
                style={{
                  marginTop: 16,
                  padding: 14,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.04)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: "rgba(0,0,0,0.04)",
                    borderRadius: 10,
                    padding: 2,
                    alignSelf: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  {(["side", "front"] as const).map((v) => {
                    const active = view === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setView(v)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: active ? "#FFF" : "transparent",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: active ? COLORS.text : COLORS.textMuted,
                            letterSpacing: 0.3,
                          }}
                        >
                          {v === "side" ? "Side view" : "Front view"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={{ alignItems: "center" }}>
                  <AnimatedMouth
                    phoneme={phoneme || "r"}
                    playing={articulating}
                    view={view}
                    size={220}
                    onTogglePlay={() => setArticulating((a) => !a)}
                  />
                </View>
                <Text
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: COLORS.textSub,
                    lineHeight: 19,
                    textAlign: "center",
                  }}
                >
                  {view === "side"
                    ? art.tonguePlacement || "Relax your tongue behind the upper teeth."
                    : art.lipShape || "Let your lips rest naturally."}
                </Text>
              </View>

              {/* Articulation breakdown */}
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: COLORS.textMuted,
                    letterSpacing: 0.9,
                    marginBottom: 8,
                  }}
                >
                  COACHING
                </Text>
                {art.tonguePlacement ? (
                  <AxisRow icon="ellipse-outline" label="Tongue" body={art.tonguePlacement} />
                ) : null}
                {art.lipShape ? (
                  <AxisRow icon="happy-outline" label="Lips" body={art.lipShape} />
                ) : null}
                {art.airflow ? (
                  <AxisRow icon="cloud-outline" label="Airflow" body={art.airflow} />
                ) : null}
                {art.stress ? (
                  <AxisRow icon="pulse-outline" label="Stress" body={art.stress} />
                ) : null}
                {response.pronunciationTip ? (
                  <AxisRow icon="sparkles-outline" label="Tip" body={response.pronunciationTip} />
                ) : null}
              </View>

              {/* Playback + compare */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
                <PlayPill
                  icon={isPlaying ? "pause" : "volume-medium-outline"}
                  label={isPlaying ? "Playing native" : "Hear native"}
                  accent
                  onPress={onPlayNative}
                />
                {hasUserAudio ? (
                  <PlayPill
                    icon={isPlayingUser ? "pause" : "mic-outline"}
                    label={isPlayingUser ? "Playing your take" : "Hear yours"}
                    onPress={onPlayUser}
                  />
                ) : null}
              </View>

              {/* Try-again CTA */}
              <Pressable
                onPress={() => {
                  onTryAgain?.();
                  onClose();
                }}
                style={({ pressed }) => ({
                  marginTop: 16,
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: COLORS.text,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>
                  Try it again
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function AxisRow({
  icon,
  label,
  body,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  body: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.05)",
      }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          backgroundColor: "rgba(46,107,216,0.12)",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Ionicons name={icon} size={13} color={COLORS.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: COLORS.textMuted,
            letterSpacing: 0.6,
            marginBottom: 2,
          }}
        >
          {label.toUpperCase()}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 18 }}>{body}</Text>
      </View>
    </View>
  );
}

function PlayPill({
  icon,
  label,
  accent,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        height: 46,
        borderRadius: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: accent ? COLORS.text : "rgba(0,0,0,0.04)",
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <Ionicons name={icon} size={15} color={accent ? "#FFF" : COLORS.text} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: accent ? "#FFF" : COLORS.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
