import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import {
  checkOfflineVoiceReadiness,
  type OfflineCheck,
  type OfflineVoiceReadiness,
} from "@/lib/offline-readiness";
import { loadGemmaModel, subscribeGemmaState } from "@/lib/gemma-engine";
import { requestNativeSpeechMicrophonePermission } from "@/lib/native-speech";

type Props = {
  modeTitle: string;
  languageCode: string;
  nativeLanguageCode?: string;
  bottomInset?: number;
  onReady: () => void;
  onClose?: () => void;
};

export function OfflineVoiceReadinessPanel({
  modeTitle,
  languageCode,
  nativeLanguageCode = "en",
  bottomInset = 0,
  onReady,
  onClose,
}: Props) {
  const [readiness, setReadiness] = useState<OfflineVoiceReadiness | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState<"mic" | "gemma" | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const next = await checkOfflineVoiceReadiness({ languageCode, nativeLanguageCode });
      setReadiness(next);
    } finally {
      setChecking(false);
    }
  }, [languageCode, nativeLanguageCode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => subscribeGemmaState(() => refresh()), [refresh]);

  const requestMic = useCallback(async () => {
    setBusy("mic");
    try {
      await requestNativeSpeechMicrophonePermission();
    } finally {
      setBusy(null);
      await refresh();
    }
  }, [refresh]);

  const loadGemma = useCallback(async () => {
    setBusy("gemma");
    try {
      await loadGemmaModel();
    } finally {
      setBusy(null);
      await refresh();
    }
  }, [refresh]);

  const checks = readiness ? Object.values(readiness.checks) : [];
  const micMissing = readiness?.checks.microphone.state === "missing";
  const hasAutoRequestedMic = useRef(false);

  // Auto-request mic permission on first check result if missing (no manual tap needed)
  useEffect(() => {
    if (!checking && micMissing && !hasAutoRequestedMic.current && busy === null) {
      hasAutoRequestedMic.current = true;
      requestMic();
    }
  }, [checking, micMissing, busy, requestMic]);

  const gemmaMissing =
    readiness?.checks.gemma.state === "missing" || readiness?.checks.gemma.state === "failed";

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 22,
          paddingTop: 42,
          paddingBottom: 22 + bottomInset,
          justifyContent: "center",
        }}
      >
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: COLORS.surface,
            }}
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
          </Pressable>
        ) : null}

        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: COLORS.goldLight,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 18,
          }}
        >
          <Ionicons name="hardware-chip-outline" size={30} color={COLORS.gold} />
        </View>

        <Text
          style={{
            fontSize: 25,
            fontWeight: "800",
            color: COLORS.text,
            textAlign: "center",
            letterSpacing: 0,
          }}
        >
          Offline readiness
        </Text>
        <Text
          style={{
            marginTop: 8,
            fontSize: 14,
            color: COLORS.textSub,
            lineHeight: 20,
            textAlign: "center",
          }}
        >
          {modeTitle} uses only this phone: microphone, Apple on-device speech, Gemma, and Apple voice output.
        </Text>

        <View style={{ marginTop: 24, gap: 10 }}>
          {checking && !readiness ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color={COLORS.gold} />
              <Text style={{ marginTop: 10, fontSize: 13, color: COLORS.textSub }}>
                Checking offline voice...
              </Text>
            </View>
          ) : (
            checks.map((check) => <ReadinessRow key={check.label} check={check} />)
          )}
        </View>

        {readiness?.blockingMessage ? (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(239,68,68,0.08)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.18)",
            }}
          >
            <Text style={{ fontSize: 13, lineHeight: 19, color: COLORS.danger, fontWeight: "700" }}>
              {readiness.blockingMessage}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 22, gap: 10 }}>
          {micMissing ? (
            <ActionButton
              label={busy === "mic" ? "Requesting..." : "Allow microphone"}
              icon="mic-outline"
              onPress={requestMic}
              disabled={busy !== null}
            />
          ) : null}
          {gemmaMissing ? (
            <ActionButton
              label={busy === "gemma" ? "Loading Gemma..." : "Load Gemma model"}
              icon="download-outline"
              onPress={loadGemma}
              disabled={busy !== null}
            />
          ) : null}
          <ActionButton
            label={checking ? "Checking..." : "Retry check"}
            icon="refresh-outline"
            onPress={refresh}
            disabled={busy !== null || checking}
            secondary
          />
          <ActionButton
            label={`Enter ${modeTitle}`}
            icon="arrow-forward"
            onPress={onReady}
            disabled={!readiness?.ready || busy !== null || checking}
            primary
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ReadinessRow({ check }: { check: OfflineCheck }) {
  const ready = check.state === "ready";
  const loading = check.state === "loading";
  const color = ready ? COLORS.success : loading ? COLORS.gold : COLORS.danger;
  const icon = ready ? "checkmark-circle" : loading ? "time-outline" : "alert-circle";
  const stateLabel =
    check.state === "ready"
      ? "ready"
      : check.state === "missing"
        ? "missing"
        : check.state === "loading"
          ? "loading"
          : check.state === "failed"
            ? "loading failed"
            : "unsupported";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
    >
      <Ionicons name={icon as any} size={21} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: COLORS.text }}>
            {check.label}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: "800", color, textTransform: "uppercase" }}>
            {stateLabel}
          </Text>
        </View>
        <Text style={{ marginTop: 4, fontSize: 12, color: COLORS.textSub, lineHeight: 17 }}>
          {check.detail}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  primary,
  secondary,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  secondary?: boolean;
}) {
  const bg = primary ? COLORS.text : COLORS.surface;
  const color = primary ? COLORS.white : COLORS.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 50,
        borderRadius: 16,
        backgroundColor: disabled ? COLORS.surface2 : bg,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
        borderWidth: primary ? 0 : 1,
        borderColor: COLORS.border,
      })}
    >
      <Ionicons name={icon} size={17} color={disabled ? COLORS.textMuted : color} />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "800",
          color: disabled ? COLORS.textMuted : color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
