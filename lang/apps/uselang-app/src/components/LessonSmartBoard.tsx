// ── Lesson Smart Board ───────────────────────────────────────────────────────
// The classroom-style canvas that sits under the AI sphere during Lesson
// mode in the Speak tab. Replaces the bare "current phrase" text with a set
// of teaching cards:
//   • Lesson goal (what they will be able to do)
//   • Target phrase + phonetic
//   • Meaning / real-life example
//   • Mouth + tongue tips (articulation)
//   • Optional grammar breakdown
//   • Up-next teaser when the tutor provides it
//
// The component is defensive: every field is optional, and it only renders
// cards for which we have real content, so an empty tutor response never
// produces an empty, styled box.

import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import type { HomeworkItem, TutorResponse } from "@/lib/tutor-api";
import { homeworkTypeIcon, homeworkTypeLabel } from "@/lib/homework-store";

interface Props {
  response: TutorResponse;
  scenarioLabel?: string;  // fallback lesson-goal seed from Plan/onboarding
  lessonTitle?: string;     // fallback lesson-title seed from Plan/onboarding
}

interface DerivedLesson {
  title: string;
  goal: string;
  phrase: string;
  phonetic: string;
  meaning: string;
  realLifeExample: string;
  tongueTip: string;
  mouthTip: string;
  grammar: Array<{ part: string; meaning: string; explanation: string }>;
  homeworkTasks: HomeworkItem[];
  nextLessonPreview: string;
}

function deriveLesson(
  r: TutorResponse,
  scenarioLabel?: string,
  lessonTitle?: string
): DerivedLesson {
  const lesson = r.lesson;

  // Tongue tip + mouth tip are synthesized from articulation when the tutor
  // doesn't emit explicit lesson.mouthTip / lesson.tongueTip fields.
  const tongueTip = (r.articulation?.tonguePlacement || "").trim();
  const mouthTip = [r.articulation?.lipShape, r.articulation?.airflow]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" · ");

  const meaning = (r.literalMeaning || r.context || "").trim();
  const realLife =
    (lesson?.realLifeExample || "").trim() ||
    (r.context && r.context !== meaning ? r.context.trim() : "");

  return {
    title: lesson?.lessonTitle?.trim() || lessonTitle || "",
    goal:
      lesson?.lessonGoal?.trim() ||
      (scenarioLabel ? `Be able to handle ${scenarioLabel.toLowerCase()}.` : ""),
    phrase: (r.naturalPhrase || "").trim(),
    phonetic: (r.phonetic || "").trim(),
    meaning,
    realLifeExample: realLife,
    tongueTip,
    mouthTip,
    grammar: lesson?.grammarBreakdown || [],
    homeworkTasks: lesson?.homeworkTasks || [],
    nextLessonPreview: (lesson?.nextLessonPreview || "").trim(),
  };
}

export function LessonSmartBoard({
  response,
  scenarioLabel,
  lessonTitle,
}: Props) {
  const lesson = useMemo(
    () => deriveLesson(response, scenarioLabel, lessonTitle),
    [response, scenarioLabel, lessonTitle]
  );

  // Local "checked" set for homework rows. Ephemeral — we don't persist
  // mid-lesson toggles; completion is the save point. Keeps the board
  // interactive ("cross off what you just did") without extra storage
  // round-trips on every tap.
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const toggleDone = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // If we genuinely have nothing to show, render nothing — the orb and
  // status caption will carry the screen.
  if (!lesson.phrase) return null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {/* ── Header chip ─────────────────────────────────────────── */}
      {lesson.title ? (
        <View style={styles.header}>
          <View style={styles.titleDot} />
          <Text style={styles.titleText} numberOfLines={1}>
            {lesson.title}
          </Text>
        </View>
      ) : null}

      {/* ── Lesson goal ──────────────────────────────────────────── */}
      {lesson.goal ? (
        <Card>
          <CardKicker icon="flag-outline" label="LESSON GOAL" />
          <Text style={styles.bodyLarge}>{lesson.goal}</Text>
        </Card>
      ) : null}

      {/* ── Phrase + pronunciation ──────────────────────────────── */}
      <Card accent>
        <CardKicker icon="chatbox-ellipses-outline" label="TODAY'S PHRASE" accent />
        <Text style={styles.phrase}>{lesson.phrase}</Text>
        {lesson.phonetic ? (
          <Text style={styles.phonetic}>/{lesson.phonetic}/</Text>
        ) : null}
      </Card>

      {/* ── Meaning + real-life example ─────────────────────────── */}
      {(lesson.meaning || lesson.realLifeExample) ? (
        <Card>
          <CardKicker icon="bulb-outline" label="WHAT IT MEANS" />
          {lesson.meaning ? <Text style={styles.body}>{lesson.meaning}</Text> : null}
          {lesson.realLifeExample ? (
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.exampleKicker}>IN REAL LIFE</Text>
            </View>
          ) : null}
          {lesson.realLifeExample ? (
            <Text style={styles.body}>{lesson.realLifeExample}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* ── Mouth + tongue tips ─────────────────────────────────── */}
      {(lesson.mouthTip || lesson.tongueTip) ? (
        <Card>
          <CardKicker icon="mic-outline" label="MOUTH & TONGUE" />
          {lesson.tongueTip ? (
            <TipRow icon="chevron-forward" label="Tongue" text={lesson.tongueTip} />
          ) : null}
          {lesson.mouthTip ? (
            <TipRow icon="chevron-forward" label="Mouth" text={lesson.mouthTip} />
          ) : null}
        </Card>
      ) : null}

      {/* ── Grammar breakdown ───────────────────────────────────── */}
      {lesson.grammar.length > 0 ? (
        <Card>
          <CardKicker icon="book-outline" label="WORD BREAKDOWN" />
          {lesson.grammar.map((g, i) => (
            <View key={i} style={[styles.grammarRow, i > 0 && styles.grammarRowDivider]}>
              <Text style={styles.grammarPart}>{g.part}</Text>
              {g.meaning ? (
                <Text style={styles.grammarMeaning}>{g.meaning}</Text>
              ) : null}
              {g.explanation ? (
                <Text style={styles.grammarExplanation}>{g.explanation}</Text>
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}

      {/* ── Homework ───────────────────────────────────────────── */}
      {lesson.homeworkTasks.length > 0 ? (
        <Card>
          <CardKicker icon="clipboard-outline" label="HOMEWORK" />
          <Text style={styles.homeworkHint}>
            Tap a task to check it off
          </Text>
          {lesson.homeworkTasks.map((task, i) => {
            const done = doneIds.has(task.id);
            return (
              <Pressable
                key={task.id || i}
                onPress={() => toggleDone(task.id)}
                style={({ pressed }) => [
                  styles.homeworkRow,
                  i > 0 && styles.homeworkRowDivider,
                  pressed && { opacity: 0.75 },
                ]}
                hitSlop={6}
              >
                <View
                  style={[
                    styles.homeworkIcon,
                    done && styles.homeworkIconDone,
                  ]}
                >
                  <Ionicons
                    name={done ? "checkmark" : homeworkTypeIcon(task.type)}
                    size={done ? 18 : 15}
                    color={done ? "#FFFFFF" : COLORS.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.homeworkTitleRow}>
                    <Text
                      style={[
                        styles.homeworkType,
                        done && styles.homeworkTypeDone,
                      ]}
                    >
                      {homeworkTypeLabel(task.type).toUpperCase()}
                    </Text>
                    {task.title ? (
                      <Text
                        style={[
                          styles.homeworkTitle,
                          done && styles.homeworkTextDone,
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    ) : null}
                  </View>
                  {task.task ? (
                    <Text
                      style={[
                        styles.homeworkTask,
                        done && styles.homeworkTextDone,
                      ]}
                    >
                      {task.task}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {/* ── Next-up teaser ──────────────────────────────────────── */}
      {lesson.nextLessonPreview ? (
        <Card subtle>
          <CardKicker icon="arrow-forward-outline" label="COMING UP" />
          <Text style={styles.body}>{lesson.nextLessonPreview}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

// ── Card primitives ──────────────────────────────────────────────────────────

function Card({
  children,
  accent,
  subtle,
}: {
  children: React.ReactNode;
  accent?: boolean;
  subtle?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        accent && styles.cardAccent,
        subtle && styles.cardSubtle,
      ]}
    >
      {children}
    </View>
  );
}

function CardKicker({
  icon,
  label,
  accent,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.kickerRow}>
      <Ionicons
        name={icon}
        size={13}
        color={accent ? COLORS.gold : COLORS.textMuted}
      />
      <Text
        style={[
          styles.kickerText,
          accent && { color: COLORS.gold },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function TipRow({
  icon,
  label,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
}) {
  return (
    <View style={styles.tipRow}>
      <Ionicons name={icon} size={14} color={COLORS.textMuted} style={{ marginTop: 3 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.tipLabel}>{label}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingBottom: 24,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  titleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  titleText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gold,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardAccent: {
    backgroundColor: "#F0F6FF",
    borderColor: COLORS.gold,
  },
  cardSubtle: {
    backgroundColor: COLORS.surface2,
    borderColor: "transparent",
  },
  kickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  kickerText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  phrase: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  phonetic: {
    fontSize: 14,
    fontStyle: "italic",
    color: COLORS.textSub,
    marginTop: 4,
  },
  bodyLarge: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 21,
  },
  body: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderLight,
  },
  exampleKicker: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  tipLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  grammarRow: {
    paddingVertical: 6,
  },
  grammarRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  grammarPart: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 1,
  },
  grammarMeaning: {
    fontSize: 12,
    color: COLORS.textSub,
    fontStyle: "italic",
    marginBottom: 2,
  },
  grammarExplanation: {
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 17,
  },
  homeworkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  homeworkRowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  homeworkIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.gold + "18",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  homeworkTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  homeworkType: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.gold,
    letterSpacing: 0.9,
  },
  homeworkTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    flexShrink: 1,
  },
  homeworkTask: {
    fontSize: 12,
    color: COLORS.textSub,
    lineHeight: 17,
  },
  homeworkHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: -4,
    marginBottom: 4,
  },
  homeworkIconDone: {
    backgroundColor: COLORS.success,
  },
  homeworkTypeDone: {
    color: COLORS.textMuted,
  },
  homeworkTextDone: {
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  },
});
