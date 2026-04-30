// ── Plan tab ─────────────────────────────────────────────────────────────────
// Shows the user their upcoming curriculum based on the goal they picked
// during onboarding (`profile.scenario`). Tapping an unlocked lesson jumps
// into Speak mode with that lesson's scenario as the tutor's theme.

import React, { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { getUserProfile, type UserProfile } from "@/lib/user-store";
import { getProgressSummary } from "@/lib/progress-store";
import {
  buildPlan,
  pickCurriculumForGoal,
  type Curriculum,
  type LessonStatus,
  type PlannedLesson,
} from "@/lib/curriculum";
import { goalLabelFor } from "@/lib/goals";

type AnnotatedLesson = PlannedLesson & { status: LessonStatus };

export default function PlanScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [lessons, setLessons] = useState<AnnotatedLesson[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, summary] = await Promise.all([
      getUserProfile(),
      getProgressSummary(),
    ]);
    setProfile(p);
    const c = pickCurriculumForGoal(p.goalPreset, p.scenario);
    setCurriculum(c);
    setLessons(buildPlan(c, summary.scenariosCompleted.length));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-pull whenever the user returns to this tab so completion state is
  // fresh after they finish a lesson.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const languageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === profile?.learningLanguage)?.label ||
    "your target language";

  const completedCount = lessons.filter((l) => l.status === "done").length;
  const total = lessons.length;

  const startLesson = (lesson: AnnotatedLesson) => {
    if (lesson.status === "locked") return;
    router.push({
      pathname: "/(tabs)/train",
      params: { mode: "tutor", scenario: lesson.scenario, lessonTitle: lesson.title },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: COLORS.textMuted,
            letterSpacing: 1.2,
            marginBottom: 4,
          }}
        >
          YOUR PLAN
        </Text>
        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: COLORS.text,
            letterSpacing: -0.6,
            lineHeight: 32,
          }}
          numberOfLines={2}
        >
          {profile
            ? `${goalLabelFor(profile)} · ${languageLabel}`
            : "Loading…"}
        </Text>
        <Text
          style={{ fontSize: 14, color: COLORS.textSub, marginTop: 6, lineHeight: 20 }}
        >
          {curriculum?.subtitle || ""}
        </Text>

        {/* ── Progress strip ─────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 20,
            marginBottom: 18,
          }}
        >
          <View
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: COLORS.surface2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: total > 0 ? `${(completedCount / total) * 100}%` : 0,
                height: "100%",
                backgroundColor: COLORS.gold,
                borderRadius: 3,
              }}
            />
          </View>
          <Text
            style={{
              marginLeft: 12,
              fontSize: 12,
              fontWeight: "700",
              color: COLORS.textSub,
            }}
          >
            {completedCount}/{total}
          </Text>
        </View>

        {/* ── Lessons ────────────────────────────────────────────── */}
        {lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={i}
            onPress={() => startLesson(lesson)}
          />
        ))}

        {/* ── Change goal CTA ────────────────────────────────────── */}
        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => ({
            marginTop: 22,
            padding: 14,
            borderRadius: 14,
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.borderLight,
            alignItems: "center",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSub }}>
            Not your goal? Edit it in Settings →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  index,
  onPress,
}: {
  lesson: AnnotatedLesson;
  index: number;
  onPress: () => void;
}) {
  const locked = lesson.status === "locked";
  const done = lesson.status === "done";
  const current = lesson.status === "current";
  const next = lesson.status === "next";

  const accent =
    current ? COLORS.gold :
    done    ? "#3B8B5C" :
              COLORS.textMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={locked}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        padding: 14,
        borderRadius: 16,
        backgroundColor: current ? "#FFFBEF" : COLORS.surface,
        borderWidth: current ? 1.5 : 1,
        borderColor: current ? COLORS.gold : COLORS.borderLight,
        marginBottom: 10,
        opacity: locked ? 0.55 : pressed ? 0.9 : 1,
      })}
    >
      {/* Status dot / check */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: done ? "#E6F3EA" : current ? "#FFF5D9" : COLORS.surface2,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          borderWidth: 1,
          borderColor: done ? "#B5DDC0" : current ? COLORS.goldDim : COLORS.borderLight,
        }}
      >
        {done ? (
          <Ionicons name="checkmark" size={18} color="#3B8B5C" />
        ) : locked ? (
          <Ionicons name="lock-closed" size={14} color={COLORS.textMuted} />
        ) : (
          <Text style={{ fontSize: 13, fontWeight: "800", color: accent }}>{index + 1}</Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: locked ? COLORS.textMuted : COLORS.text,
              flexShrink: 1,
            }}
            numberOfLines={1}
          >
            {lesson.title}
          </Text>
          {current ? <StatusChip label="UP NEXT" tone="gold" /> : null}
          {next && !current ? <StatusChip label="COMING SOON" tone="muted" /> : null}
        </View>
        <Text
          style={{
            fontSize: 12,
            color: locked ? COLORS.textMuted : COLORS.textSub,
            lineHeight: 17,
          }}
          numberOfLines={1}
        >
          {lesson.focus} · {lesson.estMinutes} min
        </Text>
      </View>

      {!locked ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={current ? COLORS.gold : COLORS.textMuted}
        />
      ) : null}
    </Pressable>
  );
}

function StatusChip({ label, tone }: { label: string; tone: "gold" | "muted" }) {
  const bg = tone === "gold" ? "#FFF3D1" : COLORS.surface2;
  const fg = tone === "gold" ? "#8A6914" : COLORS.textMuted;
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: bg,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: fg,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
