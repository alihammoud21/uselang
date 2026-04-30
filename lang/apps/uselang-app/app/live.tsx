// ── Live Lang (real-time translation) ───────────────────────────────────────
//
// Two-phase UX:
//
//   1) LISTEN  — tap the mic. Speech streams partial results.
//                Each finalized utterance is translated through the shared
//                hybrid voice controller.
//                Lines accumulate.
//
//   2) TEACH   — tap STOP. The full transcript becomes a short learning recap.
//
// HARD RULES:
//   • One state machine: idle | checking | ready | listening | recognizing |
//     processing | speaking | error | stopped — all owned by OfflineVoiceSession.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { getUserProfile } from "@/lib/user-store";
import OfflineVoicePanel from "@/components/OfflineVoicePanel";
import { chatWithGemma, getGemmaState } from "@/lib/gemma-engine";
import type { OfflineLine } from "@/lib/offline-voice-session";

const { height: SH } = Dimensions.get("window");

interface Line {
  id: string;
  source: string;
  translation: string;
  ts: number;
}

export default function LiveLangScreen() {
  const router = useRouter();

  const [sourceLang, setSourceLang] = useState<string>("zh");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [pickerOpen, setPickerOpen] = useState<"source" | "target" | null>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const linesRef = useRef<Line[]>([]);

  // Teach phase
  const [teaching, setTeaching] = useState(false);
  const [lesson, setLesson] = useState<{
    title: string;
    summary: string;
    items: { phrase: string; phonetic: string; meaning: string; tip: string }[];
  } | null>(null);
  const [teachError, setTeachError] = useState<string>("");

  // ── Defaults from profile ────────────────────────────────────────────────
  useEffect(() => {
    getUserProfile()
      .then((p) => {
        const known = p.knownLanguages?.[0] || "en";
        const learn = p.learningLanguage || "zh";
        setSourceLang(learn);
        setTargetLang(known);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // ── Capture each translated line for the teach phase ─────────────────────
  const handleLine = useCallback((line: OfflineLine) => {
    const next: Line = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: line.source,
      translation: line.translation,
      ts: Date.now(),
    };
    linesRef.current = [...linesRef.current, next];
    setLines((prev) => [...prev, next]);
  }, []);

  // ── Teach phase (offline Gemma summary) ──────────────────────────────────
  const teachMe = useCallback(async () => {
    if (linesRef.current.length === 0) return;
    if (!getGemmaState().loaded) {
      setTeachError("On-device model isn't loaded — open Settings → Offline.");
      return;
    }
    setTeaching(true);
    setTeachError("");
    try {
      const transcript = linesRef.current
        .map((l) => `- ${l.source}${l.translation ? `  (${l.translation})` : ""}`)
        .join("\n");
      const sys =
        `You are a language tutor. The user just heard this conversation in ${labelOf(sourceLang)}. ` +
        `Pick 3-5 vocabulary or expression highlights they should learn from it. ` +
        `Reply with ONLY a JSON object in this shape: ` +
        `{"items":[{"phrase":"...","phonetic":"...","meaning":"...","tip":"..."}]}. ` +
        `phrase = the ${labelOf(sourceLang)} word/phrase. phonetic = readable pronunciation. ` +
        `meaning = ${labelOf(targetLang)} translation. tip = one-line pronunciation tip.`;
      const raw = await chatWithGemma(
        [
          { role: "system", content: sys },
          { role: "user", content: transcript },
        ],
        { maxTokens: 800, temperature: 0.3 },
      );
      const parsed = parseLessonJson(raw);
      setLesson({
        title: "What you just heard",
        summary: `Here are the key bits from your ${labelOf(sourceLang)} conversation.`,
        items: parsed.length
          ? parsed
          : [{ phrase: "—", phonetic: "", meaning: "Couldn't parse the lesson.", tip: "" }],
      });
    } catch (e: any) {
      setTeachError(e?.message || "Couldn't generate the lesson.");
    } finally {
      setTeaching(false);
    }
  }, [sourceLang, targetLang]);

  // ── Header / pickers ─────────────────────────────────────────────────────
  const sourceLabel = useMemo(() => labelOf(sourceLang), [sourceLang]);
  const targetLabel = useMemo(() => labelOf(targetLang), [targetLang]);

  const swapLangs = useCallback(() => {
    setSourceLang((prevSource) => {
      setTargetLang(prevSource);
      return targetLang;
    });
  }, [targetLang]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, [router]);

  // ── Render ───────────────────────────────────────────────────────────────

  const L = {
    bg: "#F4EFE6",
    ink: "#1C1714",
    muted: "rgba(28,23,20,0.50)",
    amber: "#A85D2E",
    border: "rgba(28,23,20,0.08)",
    card: "#FFFFFF",
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: L.bg }} edges={["top", "left", "right", "bottom"]}>
      {/* Top bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingTop: 8,
          paddingBottom: 6,
        }}
      >
        <Pressable onPress={handleClose} hitSlop={14} style={{ padding: 4 }}>
          <Ionicons name="close" size={22} color={L.ink} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      {/* Language pickers — warm style */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          paddingBottom: 10,
          gap: 10,
        }}
      >
        <Pressable
          onPress={() => setPickerOpen("source")}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 9, fontFamily: "Geist-SemiBold", color: L.muted, letterSpacing: 1.2 }}>HEARING</Text>
          <Text style={{ fontSize: 15, fontFamily: "Geist-Bold", color: L.ink }}>{sourceLabel}</Text>
        </Pressable>
        <Pressable
          onPress={swapLangs}
          hitSlop={10}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(28,23,20,0.06)",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="swap-horizontal" size={16} color={L.ink} />
        </Pressable>
        <Pressable
          onPress={() => setPickerOpen("target")}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 9, fontFamily: "Geist-SemiBold", color: L.muted, letterSpacing: 1.2 }}>SHOW IN</Text>
          <Text style={{ fontSize: 15, fontFamily: "Geist-Bold", color: L.ink }}>{targetLabel}</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <OfflineVoicePanel
          key={`${sourceLang}-${targetLang}`}
          mode="translate"
          targetLang={sourceLang}
          nativeLang={targetLang}
          title="Live Lang"
          subtitle={`${sourceLabel} → ${targetLabel}`}
          onClose={handleClose}
          onLine={handleLine}
          continuous={true}
          skipTts={true}
          backgroundColor={L.bg}
          footer={
            lines.length > 0 && !lesson ? (
              <View style={{ alignItems: "center", paddingHorizontal: 18 }}>
                {/* Teach button — premium pill on white surface so it has
                    real contrast against the cream background. Black text +
                    a centered icon (the icon and label share a single
                    flex-row with `justifyContent: center` so both stay
                    visually aligned no matter the label length). The old
                    gold-on-white version blended into the gradient and the
                    icon felt offset because the row was left-aligned. */}
                <Pressable
                  onPress={teachMe}
                  disabled={teaching}
                  style={({ pressed }) => ({
                    minWidth: 240,
                    paddingHorizontal: 24,
                    paddingVertical: 13,
                    borderRadius: 26,
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: "rgba(17,16,16,0.10)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 9,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.10,
                    shadowRadius: 16,
                    elevation: 4,
                    opacity: pressed ? 0.88 : 1,
                  })}
                >
                  {teaching ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <Ionicons name="school" size={18} color={COLORS.text} />
                  )}
                  <Text
                    style={{
                      fontSize: 14.5,
                      fontWeight: "700",
                      color: COLORS.text, // black for contrast
                      letterSpacing: 0.1,
                    }}
                  >
                    {teaching ? "Building lesson…" : "Teach me what I just heard"}
                  </Text>
                </Pressable>
                {teachError ? (
                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: COLORS.danger,
                      textAlign: "center",
                    }}
                  >
                    {teachError}
                  </Text>
                ) : null}
              </View>
            ) : null
          }
        />

        {/* Inline lesson card — appears once teachMe finishes */}
        {lesson ? (
          <View
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              top: 80,
              bottom: 200,
              backgroundColor: "#F3EDE3",
              borderRadius: 24,
              padding: 20,
              shadowColor: "#000",
              shadowOpacity: 0.20,
              shadowOffset: { width: 0, height: 16 },
              shadowRadius: 32,
            }}
          >
            <Pressable
              onPress={() => setLesson(null)}
              hitSlop={12}
              style={{ alignSelf: "flex-end", marginBottom: 4 }}
            >
              <Ionicons name="close" size={20} color="#6B625A" />
            </Pressable>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1.4,
                color: "#A85D2E",
                marginBottom: 6,
              }}
            >
              {lesson.title.toUpperCase()}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#6B625A",
                lineHeight: 19,
                marginBottom: 14,
              }}
            >
              {lesson.summary}
            </Text>
            <ScrollView style={{ flex: 1 }}>
              {lesson.items.map((item, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: "#FBF7F0",
                    borderRadius: 18,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 0.5,
                    borderColor: "rgba(17,16,16,0.06)",
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "700", color: "#111010", fontFamily: "Fraunces-Regular" }}>
                    {item.phrase}
                  </Text>
                  {item.phonetic ? (
                    <Text style={{ fontSize: 12, color: "#7A3F18", fontWeight: "600", marginTop: 3, fontFamily: "GeistMono-Regular" }}>
                      {item.phonetic}
                    </Text>
                  ) : null}
                  {item.meaning ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#6B625A",
                        lineHeight: 18,
                        marginTop: 6,
                      }}
                    >
                      {item.meaning}
                    </Text>
                  ) : null}
                  {item.tip ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#8C827A",
                        lineHeight: 17,
                        fontStyle: "italic",
                        marginTop: 4,
                      }}
                    >
                      {item.tip}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Language picker overlay */}
      {pickerOpen && (
        <Pressable
          onPress={() => setPickerOpen(null)}
          style={
            {
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(244,239,230,0.92)",
            } as any
          }
        >
          <View
            style={{
              position: "absolute",
              left: 18,
              right: 18,
              top: 120,
              backgroundColor: "#F3EDE3",
              borderRadius: 22,
              maxHeight: SH * 0.55,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOpacity: 0.20,
              shadowOffset: { width: 0, height: 16 },
              shadowRadius: 32,
            }}
          >
            <ScrollView>
              {SUPPORTED_LANGUAGES.filter(l => ["fr","es","zh","en"].includes(l.code)).map((lang, idx, arr) => {
                const selected = pickerOpen === "source" ? lang.code === sourceLang : lang.code === targetLang;
                return (
                  <Pressable
                    key={lang.code}
                    onPress={() => {
                      if (pickerOpen === "source") setSourceLang(lang.code);
                      else setTargetLang(lang.code);
                      setPickerOpen(null);
                      linesRef.current = [];
                      setLines([]);
                      setLesson(null);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderBottomWidth: idx < arr.length - 1 ? 0.5 : 0,
                      borderColor: "rgba(17,16,16,0.08)",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      backgroundColor: selected ? "rgba(168,93,46,0.08)" : pressed ? "rgba(17,16,16,0.03)" : "transparent",
                    })}
                  >
                    <Text style={{ fontSize: 20 }}>{lang.flag}</Text>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: selected ? "700" : "500", color: selected ? "#A85D2E" : "#111010" }}>
                      {lang.label}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color="#A85D2E" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function labelOf(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label || code;
}

// Parse Gemma's lesson JSON. Tolerant of fenced code, prose preamble, etc.
function parseLessonJson(raw: string): { phrase: string; phonetic: string; meaning: string; tip: string }[] {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : raw;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return [];
  try {
    const obj = JSON.parse(candidate.slice(first, last + 1));
    const items = Array.isArray(obj?.items) ? obj.items : [];
    return items
      .map((x: any) => ({
        phrase: typeof x?.phrase === "string" ? x.phrase : "",
        phonetic: typeof x?.phonetic === "string" ? x.phonetic : "",
        meaning: typeof x?.meaning === "string" ? x.meaning : "",
        tip: typeof x?.tip === "string" ? x.tip : "",
      }))
      .filter((x: any) => x.phrase || x.meaning)
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ── Local styles (unused after redesign — kept for compat) ──────────────
