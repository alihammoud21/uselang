import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Animated,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GemmaModelCard } from "@/components/GemmaModelCard";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import {
  getUserProfile,
  setUserProfile,
  clearUserProfile,
  type UserProfile,
  type CommitmentLevel,
  type TutorStyle,
  type TutorTone,
  type VoiceGender,
} from "@/lib/user-store";
import { subscribeGemmaState } from "@/lib/gemma-engine";
import { goalLabelFor } from "@/lib/goals";
import { getProgressSummary, getLevel, type ProgressSummary } from "@/lib/progress-store";
import { scheduleDailyNotification, cancelDailyNotification, getDailyNotificationHour } from "@/lib/daily-notifications";
import { setTtsVoiceGender } from "@/lib/tts-router";
import { THEME_IDS, THEMES, getSavedTheme, setSavedTheme, type ThemeId } from "@/lib/theme-store";
import { getActiveBadge } from "@/lib/shop-store";
import { useAppTheme } from "@/lib/theme-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  paper:     "#F3EDE3",
  card:      "#FAF6EE",
  ink:       "#111010",
  ink2:      "#2B2623",
  muted:     "#6B625A",
  muted2:    "#8C827A",
  micro:     "#A39890",
  hair:      "rgba(17,16,16,0.08)",
  cocoa:     "#7A4A22",
  cocoaDark: "#5C3615",
  beige:     "#E0D9CC",
  gold:      "#C9A465",
  white:     "#FFFFFF",
  danger:    "#C0392B",
  success:   "#27AE60",
};

const F = {
  serif:     "Fraunces-Regular",
  serifBold: "Fraunces-Bold",
  sans:      "Geist-Regular",
  sansMed:   "Geist-Medium",
  sansSemi:  "Geist-SemiBold",
  sansBold:  "Geist-Bold",
  mono:      "GeistMono-Regular",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const LANG_FLAG: Record<string, string> = {
  en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪",
  it: "🇮🇹", pt: "🇧🇷", ja: "🇯🇵", zh: "🇨🇳",
  ko: "🇰🇷", ar: "🇸🇦", hi: "🇮🇳", ru: "🇷🇺", nl: "🇳🇱",
};

const STRICTNESS_LABELS = ["Gentle", "Balanced", "Strict", "Drill sergeant"] as const;
const STRICTNESS_HELP = [
  "I'll celebrate what you get right and gently note anything off.",
  "I'll correct significant errors and highlight what to improve.",
  "I'll correct everything that matters — accents, grammar, word choice.",
  "No mercy. Every error gets flagged, every sentence gets drilled.",
];
const STYLE_TO_STRICT: Record<TutorStyle, number> = {
  encouraging: 0, direct: 1, socratic: 2, immersive: 3,
};
const STRICT_TO_STYLE: TutorStyle[] = ["encouraging", "direct", "socratic", "immersive"];

const GOAL_LABELS: Record<string, string> = {
  "": "—", travel: "Travel", school: "School", family: "Family",
  relocate: "Moving abroad", business: "Business", friends: "Friends",
  pronunciation: "Pronunciation", test: "Test prep", shows: "Movies & TV", custom: "Custom",
};

const ACCENT_OPTIONS: Record<string, string[]> = {
  zh: ["Mandarin (Standard)", "Cantonese", "Taiwanese", "Shanghainese"],
  es: ["Mexican", "Castilian (Spain)", "Argentine", "Colombian"],
  fr: ["European (France)", "Canadian (Québec)", "African"],
  ja: ["Standard (Tokyo)", "Kansai"],
  ko: ["Standard (Seoul)"],
  de: ["Standard (Germany)", "Austrian", "Swiss"],
};

const ACCENT_DEFAULTS: Record<string, string> = {
  zh: "Mandarin (Standard)", es: "Mexican", fr: "European (France)",
  ja: "Standard (Tokyo)", ko: "Standard (Seoul)", de: "Standard (Germany)",
};

const PACE_TO_COMMITMENT: Record<string, CommitmentLevel> = {
  "Slow": "casual", "Natural": "regular", "Fast": "intensive",
};
const COMMITMENT_TO_PACE: Record<CommitmentLevel, string> = {
  casual: "Slow", regular: "Natural", serious: "Fast", intensive: "Fast",
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);

  // Local UI state — these mirror profile fields so they update instantly on toggle
  const [tutorTone, setTutorTone] = useState<string>("Encouraging");
  const [autoPlay, setAutoPlay] = useState(true);
  const [phoneticHints, setPhoneticHints] = useState(true);
  const [haptic, setHaptic] = useState(true);
  const [voiceGender, setVoiceGender] = useState<string>("Auto");
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState(true);
  const [notifHour, setNotifHour] = useState<number | null>(9);
  const [themeId, setThemeId] = useState<ThemeId>("paper");
  const [activeBadge, setActiveBadge] = useState<"none" | "polyglot" | "scholar">("none");

  const { themeId: contextThemeId, setTheme: setContextTheme } = useAppTheme();

  useEffect(() => {
    getUserProfile().then((p) => {
      setProfile(p);
      // Sync local UI state with persisted profile values
      const toneMap: Record<TutorTone, string> = { friendly: "Friendly", encouraging: "Encouraging", formal: "Formal" };
      const genderMap: Record<VoiceGender, string> = { female: "Female", male: "Male", auto: "Auto" };
      setTutorTone(toneMap[p.tutorTone] ?? "Encouraging");
      setVoiceGender(genderMap[p.voiceGender] ?? "Auto");
      setAdaptiveDifficulty(p.adaptiveDifficulty);
    });
    getProgressSummary().then(setProgressSummary);
    getDailyNotificationHour().then(setNotifHour);
    getSavedTheme().then(setThemeId);
    getActiveBadge().then(setActiveBadge).catch(() => {});
    const unsub = subscribeGemmaState(() => {});
    return unsub;
  }, []);

  // Keep local themeId in sync with context (in case it changes elsewhere)
  useEffect(() => { setThemeId(contextThemeId); }, [contextThemeId]);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    await setUserProfile(patch);
    const next = await getUserProfile();
    setProfile(next);
  }, []);

  const handleResetOnboarding = useCallback(() => {
    Alert.alert(
      "Reset personalization?",
      "You'll go through setup again. Saved phrases and progress stay.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => clearUserProfile() },
      ]
    );
  }, []);

  const handleResetAllData = useCallback(() => {
    Alert.alert(
      "Reset All App Data?",
      "This will permanently wipe your XP, streak, spheres, shop items, lesson progress, and saved phrases. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const langKeys = allKeys.filter((k) => k.startsWith("lang:") || k.startsWith("uselang:"));
              await AsyncStorage.multiRemove(langKeys);
              await clearUserProfile();
              Alert.alert("Done", "All data has been cleared. Please restart the app.", [{ text: "OK" }]);
            } catch (e) {
              Alert.alert("Error", "Could not clear all data. Try again.", [{ text: "OK" }]);
            }
          },
        },
      ],
    );
  }, []);

  const langCode   = profile?.learningLanguage || "es";
  const langLabel  = SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.label || "Spanish";
  const nativeLang = (profile?.knownLanguages ?? ["en"])[0];
  const nativeLangLabel = SUPPORTED_LANGUAGES.find(l => l.code === nativeLang)?.label || "English";
  const strictness = STYLE_TO_STRICT[profile?.tutorStyle ?? "encouraging"] ?? 0;
  const tutorPace  = COMMITMENT_TO_PACE[profile?.commitment ?? "regular"] ?? "Natural";
  const goalLabel  = GOAL_LABELS[profile?.goalPreset ?? ""] ?? "Travel";
  const initial    = (profile?.userName || "S")[0].toUpperCase();
  const accentDefault = ACCENT_DEFAULTS[langCode] ?? "Standard";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.paper }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Masthead ──────────────────────────────────────────────── */}
        <View style={{ marginTop: 24, marginBottom: 20 }}>
          <Text style={S.title}>Settings</Text>
          <Text style={S.subtitle}>Make Lang fit you.</Text>
        </View>

        {/* ── Your Progress ─────────────────────────────────────────── */}
        {progressSummary && (() => {
          const lvl = getLevel(progressSummary.xp);
          const streak = progressSummary.streak ?? 0;
          const confidence = progressSummary.confidence ?? 0;
          return (
            <View style={S.progressCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <Text style={S.progressCardTitle}>Your Progress</Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/progress" as any)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ fontFamily: F.sansSemi, fontSize: 12, color: T.cocoa }}>View details →</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", gap: 0 }}>
                <View style={S.progressStat}>
                  <Ionicons name="flame" size={18} color={streak > 0 ? "#E8853A" : T.muted2} />
                  <Text style={[S.progressStatVal, streak > 0 && { color: "#E8853A" }]}>{streak}</Text>
                  <Text style={S.progressStatLbl}>day streak</Text>
                </View>
                <View style={S.progressStatDivider} />
                <View style={S.progressStat}>
                  <Ionicons name="star" size={18} color={T.gold} />
                  <Text style={S.progressStatVal}>Lv {lvl.level}</Text>
                  <Text style={S.progressStatLbl}>{Math.max(0, progressSummary.xp)} XP</Text>
                </View>
                <View style={S.progressStatDivider} />
                <View style={S.progressStat}>
                  <Ionicons name="trending-up" size={18} color={T.cocoa} />
                  <Text style={S.progressStatVal}>{confidence}%</Text>
                  <Text style={S.progressStatLbl}>fluency</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* ── Profile card ──────────────────────────────────────────── */}
        <Pressable
          onPress={() =>
            Alert.prompt?.(
              "Your name",
              "What should Lang call you?",
              (text) => text && updateProfile({ userName: text })
            )
          }
          style={({ pressed }) => [S.profileCard, pressed && { opacity: 0.88 }]}
        >
          <View style={S.avatar}>
            <View style={S.avatarGradientOverlay} />
            <Text style={S.avatarLetter}>{initial}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={S.profileName}>{profile?.userName || "Set your name"}</Text>
              {activeBadge !== "none" && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 3,
                  backgroundColor: activeBadge === "scholar" ? "rgba(122,74,34,0.12)" : "rgba(92,122,78,0.12)",
                  borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Ionicons
                    name={activeBadge === "scholar" ? "school-outline" : "ribbon-outline"}
                    size={11}
                    color={activeBadge === "scholar" ? "#7A4A22" : "#5C7A4E"}
                  />
                  <Text style={{
                    fontSize: 10, fontFamily: F.sansSemi,
                    color: activeBadge === "scholar" ? "#7A4A22" : "#5C7A4E",
                  }}>
                    {activeBadge === "scholar" ? "Scholar" : "Polyglot"}
                  </Text>
                </View>
              )}
            </View>
            <Text style={S.profileSub}>
              Learning {langLabel}{progressSummary ? ` · ${progressSummary.streak}-day streak` : ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.muted2} />
        </Pressable>

        {/* ── YOU ───────────────────────────────────────────────────── */}
        <Group label="You">
          <Row label="Name" value={profile?.userName || "—"} onPress={() =>
            Alert.prompt?.("Your name", "What should Lang call you?", (t) => t && updateProfile({ userName: t }))
          } />
          <Row label="Pronouns" value={profile?.pronouns || "Not set"} onPress={() => {
            Alert.alert("Pronouns", "How should Lang refer to you?", [
              { text: "he/him",  onPress: () => updateProfile({ pronouns: "he/him" }) },
              { text: "she/her", onPress: () => updateProfile({ pronouns: "she/her" }) },
              {
                text: "Other",
                onPress: () =>
                  Alert.prompt?.(
                    "Custom pronouns",
                    "Type your pronouns (e.g. they/them, ze/zir)",
                    (text) => { if (text?.trim()) updateProfile({ pronouns: text.trim() }); },
                    "plain-text",
                    profile?.pronouns || ""
                  ),
              },
              { text: "Cancel", style: "cancel" as const },
            ]);
          }} />
          <Row label="Native language" value={nativeLangLabel} onPress={() => {
            Alert.alert(
              "Native language",
              "The language Lang will use to explain things to you.",
              [
                ...SUPPORTED_LANGUAGES.map((l) => ({
                  text: l.label,
                  onPress: () => updateProfile({ knownLanguages: [l.code] }),
                })),
                { text: "Cancel", style: "cancel" as const },
              ]
            );
          }} last />
        </Group>

        {/* ── LEARNING ──────────────────────────────────────────────── */}
        <Group label="Learning">
          <Row label="Target language" value={langLabel} onPress={() => {
            Alert.alert(
              "Target language",
              "The language you want to learn.",
              [
                ...SUPPORTED_LANGUAGES.map((l) => ({
                  text: l.label,
                  onPress: () => updateProfile({ learningLanguage: l.code }),
                })),
                { text: "Cancel", style: "cancel" as const },
              ]
            );
          }} />
          <Row label="Accent / dialect" value={profile?.accentDialect || accentDefault} onPress={() => {
            const options = ACCENT_OPTIONS[langCode] ?? ["Standard"];
            Alert.alert("Accent / Dialect", `Choose a ${langLabel} variant:`, [
              ...options.map((a) => ({ text: a, onPress: () => updateProfile({ accentDialect: a }) })),
              { text: "Cancel", style: "cancel" as const },
            ]);
          }} />
          <Row label="Why are you learning?" value={goalLabel} onPress={() => router.push("/settings-goal")} />
          <Row label="Daily goal" value={profile ? goalLabelFor(profile) : "20 min"} onPress={() => router.push("/settings-goal")} last />
        </Group>

        {/* ── TUTOR PERSONALITY ─────────────────────────────────────── */}
        <Group label="Tutor personality">
          <View style={S.innerPad}>
            {/* Strictness header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
              <Text style={S.strictQuestion}>How strict should the tutor be?</Text>
              <View style={S.strictPill}>
                <Text style={S.strictPillText}>{STRICTNESS_LABELS[strictness]}</Text>
              </View>
            </View>
            <StrictnessSlider
              value={strictness}
              onChange={(v) => updateProfile({ tutorStyle: STRICT_TO_STYLE[v] })}
            />
            <View style={S.divider} />
            <Text style={S.controlLabel}>Tutor tone</Text>
            <SegmentedControl
              options={["Friendly", "Encouraging", "Formal"]}
              value={tutorTone}
              onChange={(v) => {
                setTutorTone(v);
                const toneMap: Record<string, TutorTone> = { Friendly: "friendly", Encouraging: "encouraging", Formal: "formal" };
                updateProfile({ tutorTone: toneMap[v] ?? "encouraging" });
              }}
            />
            <Text style={[S.controlLabel, { marginTop: 14 }]}>Tutor pace</Text>
            <SegmentedControl
              options={["Slow", "Natural", "Fast"]}
              value={tutorPace}
              onChange={(v) => updateProfile({ commitment: PACE_TO_COMMITMENT[v] ?? "regular" })}
            />
            <View style={[S.divider, { marginBottom: 0 }]} />
          </View>
          <ToggleRow label="Adaptive difficulty" sub="Adjusts as you improve" value={adaptiveDifficulty} onChange={(v) => { setAdaptiveDifficulty(v); updateProfile({ adaptiveDifficulty: v }); }} last />
        </Group>

        {/* ── VOICE ─────────────────────────────────────────────────── */}
        <Group label="Voice">
          <View style={S.innerPad}>
            <Text style={S.controlLabel}>Tutor voice</Text>
            <SegmentedControl
              options={["Female", "Male", "Auto"]}
              value={voiceGender}
              onChange={(v) => {
                setVoiceGender(v);
                const genderMap: Record<string, VoiceGender> = { Female: "female", Male: "male", Auto: "auto" };
                const gv = genderMap[v] ?? "auto";
                updateProfile({ voiceGender: gv });
                setTtsVoiceGender(gv);
              }}
            />
            <View style={[S.divider, { marginBottom: 0 }]} />
          </View>
          <ToggleRow label="Auto-play replies" sub="Tutor speaks immediately after responding" value={autoPlay} onChange={setAutoPlay} />
          <ToggleRow label="Phonetic hints" sub="Show IPA under new words" value={phoneticHints} onChange={setPhoneticHints} last />
        </Group>

        {/* ── APP ───────────────────────────────────────────────────── */}
        <Group label="App">
          <ToggleRow label="Haptic feedback" sub="Vibrate on milestones and corrections" value={haptic} onChange={setHaptic} />
          <Row label="Notifications" value={notifHour != null ? `Daily ${notifHour}:00` : "Off"} onPress={() => {
            const hours = [7, 8, 9, 10, 12, 14, 18, 20, 21];
            Alert.alert("Daily reminder", "When should we remind you?", [
              ...hours.map((h) => ({
                text: `${h}:00`,
                onPress: async () => {
                  const ok = await scheduleDailyNotification(h);
                  if (ok) setNotifHour(h);
                  else Alert.alert("Permission denied", "Enable notifications in your device settings.");
                },
              })),
              { text: "Turn off", style: "destructive" as const, onPress: async () => { await cancelDailyNotification(); setNotifHour(null); } },
              { text: "Cancel", style: "cancel" as const },
            ]);
          }} />
          <Row label="Theme" value={`${THEMES[themeId].label} · ${THEMES[themeId].isDark ? "Dark" : "Light"}`} onPress={() => {
            Alert.alert("Choose a theme", undefined, [
              ...THEME_IDS.map((tid) => ({
                text: `${THEMES[tid].label} ${THEMES[tid].isDark ? "(Dark)" : "(Light)"}`,
                onPress: async () => { await setContextTheme(tid); setThemeId(tid); },
              })),
              { text: "Cancel", style: "cancel" as const },
            ]);
          }} last />
        </Group>

        {/* ── SUBSCRIPTION ──────────────────────────────────────────── */}
        <View style={{ marginTop: 32 }}>
          <View style={S.subCard}>
            <View style={S.subBloom} />
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <View style={S.subDot} />
              <Text style={S.subEyebrow}>PRO TRIAL ACTIVE</Text>
            </View>
            <Text style={S.subHeadline}>{"You have full access\nto everything."}</Text>
            <Text style={S.subMeta}>7-day free trial · All features unlocked</Text>
            <Pressable style={({ pressed }) => [S.subCta, pressed && { opacity: 0.85 }]}>
              <Text style={S.subCtaText}>Pro Active</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Danger zone ───────────────────────────────────────────── */}
        <View style={{ marginTop: 24, alignItems: "center", gap: 4 }}>
          <Pressable
            onPress={handleResetOnboarding}
            style={({ pressed }) => [S.resetBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={S.resetBtnText}>Reset personalization</Text>
          </Pressable>
          <Pressable
            onPress={handleResetAllData}
            style={({ pressed }) => [S.resetBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={[S.resetBtnText, { fontWeight: "700", color: "#A93226" }]}>Reset all app data</Text>
          </Pressable>
        </View>

        {/* ── AI Model ──────────────────────────────────────────────── */}
        <View style={{ marginTop: 22 }}>
          <Text style={S.groupLabel}>AI MODEL</Text>
          <GemmaModelCard />
        </View>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <Text style={S.footer}>UseLang · v1.4.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={S.groupLabel}>{label.toUpperCase()}</Text>
      <View style={S.groupCard}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const inner = (
    <View style={[S.row, last && { borderBottomWidth: 0 }]}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {value ? (
          <View style={{ backgroundColor: "rgba(17,16,16,0.06)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={S.rowValue}>{value}</Text>
          </View>
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={14} color={T.muted2} /> : null}
      </View>
    </View>
  );
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => pressed ? { opacity: 0.65 } : {}}>{inner}</Pressable>
    : inner;
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
  last,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[S.row, { alignItems: "center" }, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={S.rowLabel}>{label}</Text>
        {sub ? <Text style={S.rowSub}>{sub}</Text> : null}
      </View>
      <Toggle value={value} onChange={onChange} />
    </View>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [anim, value]);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [T.beige, T.cocoa] });
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8}>
      <Animated.View style={[S.togglePill, { backgroundColor: bg }]}>
        <Animated.View style={[S.toggleKnob, { transform: [{ translateX: tx }] }]} />
      </Animated.View>
    </Pressable>
  );
}

function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={S.segTrack}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[S.segItem, active && S.segItemActive]}>
            <Text style={[S.segText, active && S.segTextActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StrictnessSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const fillPct = (value / 3) * 100;
  return (
    <View>
      <View style={{ height: 36, justifyContent: "center" }}>
        {/* Rail */}
        <View style={{ position: "absolute", left: 12, right: 12, height: 5, borderRadius: 3, backgroundColor: T.beige, overflow: "hidden" }}>
          <View style={{ height: 5, width: `${fillPct}%`, backgroundColor: T.cocoa, borderRadius: 3 }} />
        </View>
        {/* Knobs */}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[0, 1, 2, 3].map((stop) => (
            <Pressable key={stop} onPress={() => onChange(stop)} hitSlop={12}>
              <View style={[
                S.sliderKnob,
                stop <= value ? S.sliderKnobFilled : S.sliderKnobEmpty,
                stop === value && S.sliderKnobCurrent,
              ]} />
            </Pressable>
          ))}
        </View>
      </View>
      {/* Labels */}
      <View style={{ flexDirection: "row", marginTop: 5 }}>
        {STRICTNESS_LABELS.map((l, i) => (
          <Text key={l} style={[
            S.sliderLabel,
            i === value && S.sliderLabelActive,
            { textAlign: i === 0 ? "left" : i === 3 ? "right" : "center" },
          ]}>
            {l}
          </Text>
        ))}
      </View>
      {/* Help */}
      <View style={S.helpBox}>
        <Text style={S.helpText}>{STRICTNESS_HELP[value]}</Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  title:    { fontFamily: F.serif,    fontSize: 36, color: T.ink,   letterSpacing: -0.8 },
  subtitle: { fontFamily: F.sans,     fontSize: 13, color: T.muted, marginTop: 3 },

  profileCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.card,
    borderRadius: 20, borderWidth: 0.5, borderColor: T.hair,
    padding: 14,
    shadowColor: T.cocoa, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 3,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: T.cocoaDark, alignItems: "center", justifyContent: "center", overflow: "hidden",
    shadowColor: T.cocoaDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 4,
  },
  avatarGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.cocoa, opacity: 0.65,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  avatarLetter: { fontFamily: F.serifBold, fontSize: 26, color: T.white },
  profileName:  { fontFamily: F.serif,     fontSize: 20, color: T.ink,  letterSpacing: -0.3 },
  profileSub:   { fontFamily: F.sans,      fontSize: 12, color: T.muted, marginTop: 2 },

  groupLabel: { fontFamily: F.sansMed, fontSize: 11, color: T.muted, letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  groupCard:  { backgroundColor: T.card, borderRadius: 22, borderWidth: 0.5, borderColor: T.hair, overflow: "hidden", shadowColor: T.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  innerPad:   { paddingHorizontal: 16, paddingTop: 16 },
  divider:    { height: 0.5, backgroundColor: "rgba(17,16,16,0.07)", marginVertical: 16 },

  row:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: "rgba(17,16,16,0.07)" },
  rowLabel: { fontFamily: F.sans,    fontSize: 15, color: T.ink2, flex: 1 },
  rowValue: { fontFamily: F.sans,    fontSize: 14, color: T.muted },
  rowSub:   { fontFamily: F.sans,    fontSize: 11.5, color: T.muted2, marginTop: 2, lineHeight: 16 },

  togglePill:  { width: 52, height: 32, borderRadius: 16, justifyContent: "center" },
  toggleKnob:  { width: 28, height: 28, borderRadius: 14, backgroundColor: T.white, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 2 },

  segTrack:        { flexDirection: "row", backgroundColor: "rgba(28,23,20,0.06)", borderRadius: 10, padding: 3 },
  segItem:         { flex: 1, paddingVertical: 7, alignItems: "center", borderRadius: 8 },
  segItemActive:   { backgroundColor: T.white, shadowColor: T.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 3, elevation: 1 },
  segText:         { fontFamily: F.sans,    fontSize: 13, color: T.muted },
  segTextActive:   { fontFamily: F.sansSemi, fontSize: 13, color: T.ink },

  strictQuestion:  { fontFamily: F.sansMed, fontSize: 14, color: T.ink2, flex: 1 },
  strictPill:      { backgroundColor: T.cocoa, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  strictPillText:  { fontFamily: F.sansSemi, fontSize: 12, color: T.white },

  sliderKnob:        { width: 24, height: 24, borderRadius: 12 },
  sliderKnobFilled:  { backgroundColor: T.cocoa },
  sliderKnobEmpty:   { backgroundColor: T.beige },
  sliderKnobCurrent: { borderWidth: 2.5, borderColor: T.cocoaDark, shadowColor: T.cocoa, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.55, shadowRadius: 8, elevation: 4 },
  sliderLabel:       { flex: 1, fontFamily: F.sans,    fontSize: 10, color: T.muted2 },
  sliderLabelActive: {         fontFamily: F.sansMed, fontSize: 10, color: T.cocoa },

  helpBox:  { backgroundColor: "rgba(122,74,34,0.07)", borderRadius: 10, padding: 12, marginTop: 12 },
  helpText: { fontFamily: F.sans, fontSize: 12.5, color: T.cocoa, lineHeight: 18 },

  controlLabel: { fontFamily: F.sansMed, fontSize: 12, color: T.muted, letterSpacing: 0.3, marginBottom: 8 },

  subCard:     { backgroundColor: "#141210", borderRadius: 22, padding: 24, overflow: "hidden" },
  subBloom:    { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(201,164,101,0.13)", top: -70, right: -60 },
  subDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#C9A465", marginRight: 6 },
  subEyebrow:  { fontFamily: F.sansSemi, fontSize: 11, color: "#C9A465", letterSpacing: 1.2 },
  subHeadline: { fontFamily: F.serif,    fontSize: 24, color: T.white, letterSpacing: -0.3, lineHeight: 32, marginBottom: 10 },
  subMeta:     { fontFamily: F.sans,     fontSize: 12.5, color: "rgba(243,237,227,0.45)", marginBottom: 24 },
  subCta:      { backgroundColor: "#C9A465", borderRadius: 14, paddingVertical: 16, alignItems: "center", width: "100%" },
  subCtaText:  { fontFamily: F.sansSemi, fontSize: 15, color: T.ink, letterSpacing: 0.1 },

  resetBtn:     { alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20 },
  resetBtnText: { fontFamily: F.sans, fontSize: 13, color: "#C0392B" },

  footer: { fontFamily: F.mono, fontSize: 10, color: "rgba(163,152,144,0.55)", textAlign: "center", marginTop: 36, letterSpacing: 0.3 },

  progressCard: {
    backgroundColor: T.card, borderRadius: 20, padding: 18, marginBottom: 22,
    borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
    shadowColor: "rgba(60,44,25,0.08)", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  progressCardTitle: { fontFamily: F.sansBold, fontSize: 15, color: T.ink2, letterSpacing: -0.2 },
  progressStat: { flex: 1, alignItems: "center", gap: 3 },
  progressStatVal: { fontFamily: F.sansBold, fontSize: 18, color: T.ink, letterSpacing: -0.3 },
  progressStatLbl: { fontFamily: F.sans, fontSize: 11, color: T.muted2 },
  progressStatDivider: { width: 1, height: 36, backgroundColor: "rgba(28,23,20,0.07)" },
});
