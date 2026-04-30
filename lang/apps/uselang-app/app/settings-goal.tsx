// ── Goal editor (Settings → Goal) ────────────────────────────────────────────
// Dedicated screen so the user can change their learning goal without
// re-running the full onboarding flow. Reuses the same goal catalog +
// custom text entry pattern as onboarding.

import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/lib/constants";
import {
  getUserProfile,
  setUserProfile,
  type GoalPreset,
  type UserProfile,
} from "@/lib/user-store";
import { GOAL_OPTIONS } from "@/lib/goals";

export default function SettingsGoalScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalPreset, setGoalPreset] = useState<GoalPreset>("travel");
  const [customGoal, setCustomGoal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile().then((p) => {
      setProfile(p);
      setGoalPreset(p.goalPreset || "travel");
      if (p.goalPreset === "custom") setCustomGoal(p.scenario);
    });
  }, []);

  const canSave =
    goalPreset !== "custom" || customGoal.trim().length >= 3;

  const resolvedScenario =
    goalPreset === "custom"
      ? customGoal.trim() || profile?.scenario || "everyday conversation"
      : GOAL_OPTIONS.find((g) => g.id === goalPreset)?.scenarioText ||
        "everyday conversation";

  const save = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    await setUserProfile({
      scenario: resolvedScenario,
      goalPreset,
    });
    setSaving(false);
    router.back();
  }, [canSave, goalPreset, resolvedScenario, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top", "bottom"]}>
      {/* Header with back button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 10,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>Back</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: COLORS.text,
            marginRight: 70,
          }}
        >
          Goal
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={24}
      >
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: COLORS.text,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            What's your main goal?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 20, marginBottom: 16 }}>
            Your lesson plan reshapes around this right away.
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
        >
          {GOAL_OPTIONS.map((g) => {
            const selected = goalPreset === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => setGoalPreset(g.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: selected ? COLORS.gold + "18" : COLORS.surface,
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? COLORS.gold : COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    backgroundColor: selected ? COLORS.gold + "30" : COLORS.surface2,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons
                    name={g.icon}
                    size={20}
                    color={selected ? COLORS.gold : COLORS.text}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: COLORS.text,
                      marginBottom: 2,
                    }}
                    numberOfLines={1}
                  >
                    {g.label}
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.textSub, lineHeight: 16 }}
                    numberOfLines={2}
                  >
                    {g.hint}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.gold} />
                ) : null}
              </Pressable>
            );
          })}

          {goalPreset === "custom" ? (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 18,
                padding: 14,
                marginTop: 4,
                borderWidth: 1,
                borderColor: COLORS.gold,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: COLORS.textMuted,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                YOUR GOAL
              </Text>
              <TextInput
                value={customGoal}
                onChangeText={setCustomGoal}
                placeholder="e.g. I want to speak French better for my grandmother"
                placeholderTextColor={COLORS.textMuted}
                multiline
                autoFocus
                maxLength={140}
                style={{
                  fontSize: 15,
                  color: COLORS.text,
                  lineHeight: 22,
                  minHeight: 60,
                  textAlignVertical: "top",
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.textMuted,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {customGoal.length}/140
              </Text>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={{
            position: "absolute",
            bottom: 24,
            left: 22,
            right: 22,
          }}
        >
          <Pressable
            onPress={save}
            disabled={!canSave || saving}
            style={{
              height: 54,
              borderRadius: 18,
              backgroundColor: canSave ? COLORS.gold : COLORS.surface2,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: canSave ? COLORS.gold : "transparent",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: canSave ? "#FFFFFF" : COLORS.textMuted,
              }}
            >
              {saving ? "Saving…" : "Save goal"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
