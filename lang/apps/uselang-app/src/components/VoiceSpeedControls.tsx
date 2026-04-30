// ── Voice-speed controls ─────────────────────────────────────────────────────
// Compact pill row the user can tap to change the tutor's spoken tempo plus
// four verb-style pills ("Repeat slower", "Syllables", "Native", "Compare")
// for the common commands. Used in the Speak tab's Lesson layout.

import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";

export type VoiceRate = 0.75 | 1.0 | 1.25 | 1.5;

const RATE_STEPS: Array<{ rate: VoiceRate; label: string }> = [
  { rate: 0.75, label: "0.75×" },
  { rate: 1.0,  label: "1×" },
  { rate: 1.25, label: "1.25×" },
  { rate: 1.5,  label: "1.5×" },
];

interface Props {
  rate: VoiceRate;
  onChangeRate: (rate: VoiceRate) => void;
  onRepeatSlower?: () => void;
  onBreakSyllables?: () => void;
  onRepeatNative?: () => void;
  onCompareMyVoice?: () => void;
  hasUserAudio?: boolean;
}

export function VoiceSpeedControls({
  rate,
  onChangeRate,
  onRepeatSlower,
  onBreakSyllables,
  onRepeatNative,
  onCompareMyVoice,
  hasUserAudio,
}: Props) {
  return (
    <View style={styles.wrap}>
      {/* Rate picker */}
      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>Voice speed</Text>
        <View style={styles.rateSegment}>
          {RATE_STEPS.map((step) => {
            const active = Math.abs(step.rate - rate) < 0.01;
            return (
              <Pressable
                key={step.rate}
                onPress={() => onChangeRate(step.rate)}
                style={[
                  styles.rateChip,
                  active && styles.rateChipActive,
                ]}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.rateChipText,
                    active && styles.rateChipTextActive,
                  ]}
                >
                  {step.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Verb pills */}
      <View style={styles.verbRow}>
        <VerbPill
          icon="play-skip-back-outline"
          label="Slower"
          onPress={onRepeatSlower}
        />
        <VerbPill
          icon="pulse-outline"
          label="Syllables"
          onPress={onBreakSyllables}
        />
        <VerbPill
          icon="flash-outline"
          label="Native"
          onPress={onRepeatNative}
        />
        <VerbPill
          icon="git-compare-outline"
          label="Compare"
          onPress={onCompareMyVoice}
          disabled={!hasUserAudio}
        />
      </View>
    </View>
  );
}

function VerbPill({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [
        styles.verbPill,
        (disabled || !onPress) && styles.verbPillDisabled,
        pressed && !disabled && !!onPress && { opacity: 0.7 },
      ]}
      hitSlop={6}
    >
      <Ionicons
        name={icon}
        size={13}
        color={disabled || !onPress ? COLORS.textMuted : COLORS.text}
      />
      <Text
        style={[
          styles.verbPillText,
          (disabled || !onPress) && { color: COLORS.textMuted },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 8,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSub,
  },
  rateSegment: {
    flexDirection: "row",
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 2,
  },
  rateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  rateChipActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rateChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.2,
  },
  rateChipTextActive: {
    color: COLORS.text,
  },
  verbRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  verbPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  verbPillDisabled: {
    opacity: 0.55,
  },
  verbPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
});
