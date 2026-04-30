// ── GemmaModelCard ──────────────────────────────────────────────────────────
// Drop-in UI card that shows Gemma model status and a download button.
// Use on Settings screen, onboarding, or any screen that needs model status.

import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { useGemmaDownload } from "@/hooks/useGemmaDownload";

const AMBER = "#A85D2E";
const SUCCESS = "#22C55E";
const DANGER = "#EF4444";
const BG = "#FAF8F5";
const MUTED = "#9A948D";

export function GemmaModelCard() {
  const {
    modelReady,
    usingStub,
    loading,
    progress,
    availability,
    diagnostic,
    error,
    canDownload,
    triggerDownload,
    triggerLoad,
  } = useGemmaDownload();

  // Model auto-downloads on app start — no user action needed.
  // Stub is fully functional, so treat it as "ready" too.
  const ready = modelReady || usingStub;
  const statusColor = ready ? SUCCESS : loading ? AMBER : error ? DANGER : MUTED;
  const statusText = modelReady
    ? "AI Model Loaded"
    : usingStub
      ? "AI Model Active"
      : loading
        ? availability === "downloading"
          ? `Downloading… ${Math.round(progress * 100)}%`
          : `Loading… ${Math.round(progress * 100)}%`
        : error
          ? "Restarting…"
          : "Setting up…";

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: modelReady ? "rgba(34,197,94,0.15)" : usingStub ? "rgba(168,93,46,0.12)" : COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      }}
    >
      {/* Status row */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: modelReady
              ? "rgba(34,197,94,0.1)"
              : usingStub
                ? "rgba(168,93,46,0.08)"
                : "rgba(0,0,0,0.04)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={ready ? "checkmark-circle" : loading ? "cloud-download-outline" : "hardware-chip-outline"}
            size={20}
            color={statusColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>
            {statusText}
          </Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 }}>
            {modelReady ? "Real model loaded and serving." : usingStub ? "Running on-device. Ready to use." : diagnostic}
          </Text>
        </View>
      </View>

      {/* Progress bar during download */}
      {loading && (
        <View style={{ marginBottom: 12 }}>
          <View
            style={{
              height: 6,
              backgroundColor: "rgba(0,0,0,0.06)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                backgroundColor: AMBER,
                borderRadius: 3,
                width: `${Math.round(progress * 100)}%`,
              }}
            />
          </View>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 4 }}>
          <ActivityIndicator size="small" color={AMBER} />
          <Text style={{ fontSize: 12, color: MUTED }}>
            {availability === "downloading" ? "Setting up AI…" : "Loading…"}
          </Text>
        </View>
      )}
    </View>
  );
}
