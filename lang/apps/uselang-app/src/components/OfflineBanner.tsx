import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import type { OnlineState } from "@/lib/use-online";
import { subscribeGemmaState, getGemmaState, type GemmaEngineState } from "@/lib/gemma-engine";

interface Props {
  state: OnlineState;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * 3-state connectivity banner (online / api-down / offline) that is aware of
 * on-device Gemma. Backend connectivity is only for optional services like
 * sync or cloud STT/TTS; core coaching stays local.
 */
export function OfflineBanner({ state, onRetry, compact = false }: Props) {
  const [gemma, setGemma] = useState<GemmaEngineState>(() => getGemmaState());
  useEffect(() => subscribeGemmaState(setGemma), []);

  if (state === "online" || state === "checking") return null;

  const gemmaReady = gemma.loaded;
  const isOffline = state === "offline";

  let title: string;
  let body: string;
  let tone: "warn" | "info" = "warn";
  let icon: keyof typeof Ionicons.glyphMap = "cloud-offline-outline";

  if (isOffline && gemmaReady) {
    title = "On-device mode";
    body = "You're offline — Gemma is running on this phone. Tutor and voice coaching still work.";
    tone = "info";
    icon = "hardware-chip-outline";
  } else if (isOffline) {
    title = "You're offline";
    body = "Install local Gemma from Settings -> Offline to keep coaching without internet.";
    tone = "warn";
    icon = "cloud-offline-outline";
  } else if (gemmaReady) {
    title = "Backend unreachable — on-device mode";
    body = "Using Gemma on this phone. Sign-in and cloud sync paused.";
    tone = "info";
    icon = "hardware-chip-outline";
  } else {
    title = "Tutor service unreachable";
    body = "Check your connection. Device voice still works.";
    tone = "warn";
    icon = "alert-circle-outline";
  }

  const accent = tone === "info" ? COLORS.gold : "#E0A65A";
  const bg = tone === "info" ? "rgba(46,107,216,0.10)" : "rgba(224,166,90,0.10)";
  const border = tone === "info" ? "rgba(46,107,216,0.25)" : "rgba(224,166,90,0.28)";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: compact ? 8 : 10,
        marginHorizontal: 16,
        marginTop: 6,
        backgroundColor: bg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Ionicons name={icon} size={16} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.text }}>{title}</Text>
        {!compact && (
          <Text style={{ fontSize: 11, color: COLORS.textSub, marginTop: 1 }}>{body}</Text>
        )}
      </View>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={10}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: accent }}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}
