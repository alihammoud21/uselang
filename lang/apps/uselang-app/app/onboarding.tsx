import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, Dimensions,
  TextInput, KeyboardAvoidingView, Platform,
  Animated as RNAnimated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { setUserProfile, type CommitmentLevel, type TutorStyle, type GoalPreset } from "@/lib/user-store";
import { signUp, syncProfile } from "@/lib/auth-client";
import { NativeGlobe, LANGUAGE_REACH } from "@/components/NativeGlobe";
import { GOAL_OPTIONS } from "@/lib/goals";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Step fade-slide animation wrapper ────────────────────────────────────────

function FadeSlide({ children, style }: { children: React.ReactNode; style?: any }) {
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const translateY = useRef(new RNAnimated.Value(24)).current;
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      RNAnimated.timing(translateY, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <RNAnimated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>
      {children}
    </RNAnimated.View>
  );
}

// ── Progress dots ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 9;
function ProgressDots({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: 8 }}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={{
          height: 4,
          borderRadius: 2,
          width: i === current ? 20 : 6,
          backgroundColor: i <= current ? COLORS.gold : COLORS.surface2,
        }} />
      ))}
    </View>
  );
}

// ── Option card ───────────────────────────────────────────────────────────────

function OptionCard({
  label, sub, selected, onPress,
}: { label: string; sub?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: selected ? COLORS.gold + "18" : COLORS.surface,
      borderRadius: 18, padding: 18, marginBottom: 10,
      borderWidth: selected ? 1.5 : 1,
      borderColor: selected ? COLORS.gold : COLORS.border,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 13, color: COLORS.textSub, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.gold} />}
    </Pressable>
  );
}

// ── CTA Button ───────────────────────────────────────────────────────────────

function CTAButton({
  label, onPress, disabled = false, dark = false,
}: { label: string; onPress: () => void; disabled?: boolean; dark?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{
      height: 56, borderRadius: 18,
      backgroundColor: disabled ? COLORS.surface2 : dark ? COLORS.text : COLORS.gold,
      alignItems: "center", justifyContent: "center",
      shadowColor: disabled ? "transparent" : (dark ? "#000" : COLORS.gold),
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12,
    }}>
      <Text style={{
        fontSize: 17, fontWeight: "700",
        color: disabled ? COLORS.textMuted : "#FFFFFF",
      }}>{label}</Text>
    </Pressable>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────
// Dense, Ionicons-driven card used for the new goal picker. Replaces the
// previous emoji chip row so 10+ options read cleanly in a scroll.

function GoalCard({
  icon, label, hint, selected, onPress, delay,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
  delay: number;
}) {
  const translateY = useRef(new RNAnimated.Value(16)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(translateY, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
      RNAnimated.timing(opacity, { toValue: 1, duration: 260, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePress = () => {
    RNAnimated.sequence([
      RNAnimated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      RNAnimated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <RNAnimated.View style={{ transform: [{ translateY }, { scale }], opacity }}>
      <Pressable
        onPress={handlePress}
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
            name={icon}
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
            {label}
          </Text>
          <Text
            style={{ fontSize: 12, color: COLORS.textSub, lineHeight: 16 }}
            numberOfLines={2}
          >
            {hint}
          </Text>
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={22} color={COLORS.gold} />
        ) : null}
      </Pressable>
    </RNAnimated.View>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type StepId = "welcome" | "known" | "globe" | "learn" | "commitment" | "style" | "goal" | "account" | "trial";
const STEP_ORDER: StepId[] = ["welcome", "known", "globe", "learn", "commitment", "style", "goal", "account", "trial"];

export default function OnboardingScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [knownLanguages, setKnownLanguages] = useState<string[]>(["en"]);
  const [learningLanguage, setLearningLanguage] = useState<string>("");

  const [commitment, setCommitment] = useState<CommitmentLevel>("regular");
  const [tutorStyle, setTutorStyle] = useState<TutorStyle>("encouraging");
  const [goalPreset, setGoalPreset] = useState<GoalPreset>("travel");
  const [customGoal, setCustomGoal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  const step = STEP_ORDER[stepIndex];
  const isGlobeStep = step === "globe";
  const bgColor = isGlobeStep ? "#060d18" : COLORS.bg;

  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STEP_ORDER.length - 1));
  }, []);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Resolve the free-text scenario written to the profile from the currently
  // selected preset (or the user's typed text when "Custom" is chosen).
  const resolvedScenario =
    goalPreset === "custom"
      ? customGoal.trim() || "everyday conversation"
      : GOAL_OPTIONS.find((g) => g.id === goalPreset)?.scenarioText ||
        "everyday conversation";

  const canFinish =
    goalPreset !== "custom" || customGoal.trim().length >= 3;
  const canCreateAccount =
    /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6 && !accountLoading;

  const profilePayload = {
    knownLanguages,
    learningLanguage,
    commitment,
    tutorStyle,
    scenario: resolvedScenario,
    goalPreset,
  };

  const createAccount = useCallback(async () => {
    if (!canCreateAccount) return;
    setAccountLoading(true);
    setAccountError("");
    try {
      await signUp({
        email: email.trim(),
        password,
        profile: profilePayload,
      });
      await syncProfile(profilePayload);
      advance();
    } catch (err: any) {
      const msg = err?.message || "";
      const isNetwork = /network|fetch|timeout|abort|ECONNREFUSED/i.test(msg);
      setAccountError(
        isNetwork
          ? "Can't reach the server right now. You can skip and create an account later in Settings."
          : msg || "Could not create your account. Try again or skip for now."
      );
    } finally {
      setAccountLoading(false);
    }
  }, [advance, canCreateAccount, email, password, profilePayload]);

  const skipAccount = useCallback(() => {
    setAccountError("");
    advance();
  }, [advance]);

  const finish = useCallback(async () => {
    const finalProfile = {
      onboarded: true,
      ...profilePayload,
      trialStarted: true,
      trialStartDate: new Date().toISOString(),
    };
    await setUserProfile(finalProfile);
    try { await syncProfile(finalProfile); } catch { /* offline is fine */ }
    router.replace("/(tabs)");
  }, [profilePayload]);

  // ── Reach stats for globe step ──
  const globeReach = LANGUAGE_REACH[knownLanguages[0]] ?? { countries: 0, speakers: "" };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={["top", "bottom"]}>
      {/* Progress + back row — hidden on welcome & globe */}
      {step !== "welcome" && (
        <View style={{
          flexDirection: "row", alignItems: "center",
          paddingHorizontal: 22, paddingTop: 8, paddingBottom: 4,
        }}>
          {stepIndex > 0 && (
            <Pressable onPress={back} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="arrow-back" size={22}
                color={isGlobeStep ? "rgba(255,255,255,0.7)" : COLORS.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <ProgressDots current={stepIndex} />
          </View>
        </View>
      )}

      {/* ── WELCOME ─────────────────────────────────────────────────────────── */}
      {step === "welcome" && (
        <FadeSlide>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 24,
              backgroundColor: COLORS.gold + "22", borderWidth: 1,
              borderColor: COLORS.gold + "40",
              alignItems: "center", justifyContent: "center", marginBottom: 28,
            }}>
              <Ionicons name="language" size={36} color={COLORS.gold} />
            </View>
            <Text style={{ fontSize: 38, fontWeight: "900", color: COLORS.text,
              letterSpacing: -1.5, textAlign: "center", marginBottom: 12 }}>
              Lang
            </Text>
            <Text style={{ fontSize: 17, color: COLORS.textSub, textAlign: "center",
              lineHeight: 26, marginBottom: 48 }}>
              Speak any language.{"\n"}Sound like you belong there.
            </Text>
            <View style={{ width: "100%" }}>
              <CTAButton label="Get started" onPress={advance} />
            </View>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 14 }}>
              Account optional · saves on this phone
            </Text>
          </View>
        </FadeSlide>
      )}

      {/* ── KNOWN LANGUAGES ──────────────────────────────────────────────────── */}
      {step === "known" && (
        <FadeSlide key="known" style={{ paddingHorizontal: 22 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text,
            letterSpacing: -0.8, marginBottom: 6, marginTop: 12 }}>
            What do you already speak?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginBottom: 20 }}>
            Select every language you already know.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const sel = knownLanguages.includes(lang.code);
              return (
                <OptionCard key={lang.code} label={lang.label}
                  sub={lang.code.toUpperCase()} selected={sel}
                  onPress={() => setKnownLanguages((prev) =>
                    sel ? prev.filter((c) => c !== lang.code) : [...prev, lang.code]
                  )} />
              );
            })}
          </ScrollView>
          <View style={{ position: "absolute", bottom: 24, left: 22, right: 22 }}>
            <CTAButton label="Continue" onPress={advance}
              disabled={knownLanguages.length === 0} />
          </View>
        </FadeSlide>
      )}

      {/* ── GLOBE REVEAL ─────────────────────────────────────────────────────── */}
      {step === "globe" && (
        <FadeSlide key="globe">
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.4)",
              letterSpacing: 1.2, marginBottom: 20, textTransform: "uppercase" }}>
              Your reach
            </Text>
            <NativeGlobe size={Math.min(SW * 0.8, 280)}
              highlightLanguages={knownLanguages} autoRotate showStats={false} />
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <Text style={{ fontSize: 52, fontWeight: "900", color: "#FFFFFF",
                letterSpacing: -2 }}>
                {globeReach.countries}
              </Text>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.55)",
                fontWeight: "600", marginBottom: 6 }}>
                countries where you can already speak
              </Text>
              <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                {globeReach.speakers} speakers worldwide
              </Text>
            </View>
            <View style={{ position: "absolute", bottom: 32, left: 28, right: 28 }}>
              <CTAButton label="Now let's add one more" onPress={advance} />
            </View>
          </View>
        </FadeSlide>
      )}

      {/* ── LEARNING LANGUAGE ────────────────────────────────────────────────── */}
      {step === "learn" && (
        <FadeSlide key="learn" style={{ paddingHorizontal: 22 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text,
            letterSpacing: -0.8, marginBottom: 6, marginTop: 12 }}>
            What do you want to learn?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginBottom: 20 }}>
            Pick the language you'll start with. More can be added later.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}>
            {SUPPORTED_LANGUAGES.filter((l) => !knownLanguages.includes(l.code)).map((lang) => (
              <OptionCard key={lang.code} label={lang.label}
                sub={`${LANGUAGE_REACH[lang.code]?.speakers ?? ""} speakers`}
                selected={learningLanguage === lang.code}
                onPress={() => setLearningLanguage(lang.code)} />
            ))}
          </ScrollView>
          <View style={{ position: "absolute", bottom: 24, left: 22, right: 22 }}>
            <CTAButton label="Continue" onPress={advance}
              disabled={!learningLanguage} />
          </View>
        </FadeSlide>
      )}

      {/* ── COMMITMENT ───────────────────────────────────────────────────────── */}
      {step === "commitment" && (
        <FadeSlide key="commitment" style={{ paddingHorizontal: 22 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text,
            letterSpacing: -0.8, marginBottom: 6, marginTop: 12 }}>
            How often will you practice?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginBottom: 20 }}>
            Be honest — consistency beats intensity.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {([
              { id: "casual", label: "Casual", sub: "A few minutes when I feel like it" },
              { id: "regular", label: "Regular", sub: "10–15 min a day, most days" },
              { id: "serious", label: "Serious", sub: "20–30 min daily, no excuses" },
              { id: "intensive", label: "Intensive", sub: "1+ hour daily, I'm committed" },
            ] as { id: CommitmentLevel; label: string; sub: string }[]).map((o) => (
              <OptionCard key={o.id} label={o.label} sub={o.sub}
                selected={commitment === o.id}
                onPress={() => setCommitment(o.id)} />
            ))}
          </ScrollView>
          <View style={{ position: "absolute", bottom: 24, left: 22, right: 22 }}>
            <CTAButton label="Continue" onPress={advance} />
          </View>
        </FadeSlide>
      )}

      {/* ── TUTOR STYLE ──────────────────────────────────────────────────────── */}
      {step === "style" && (
        <FadeSlide key="style" style={{ paddingHorizontal: 22 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text,
            letterSpacing: -0.8, marginBottom: 6, marginTop: 12 }}>
            How should your tutor teach?
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginBottom: 20 }}>
            Pick the personality that fits how you learn best.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            {([
              { id: "encouraging", label: "Encouraging", sub: "Warm, patient, lots of praise" },
              { id: "direct", label: "Direct", sub: "Fast, efficient, no fluff" },
              { id: "socratic", label: "Socratic", sub: "Guides me to the answer" },
              { id: "immersive", label: "Immersive", sub: "Only speaks the target language" },
            ] as { id: TutorStyle; label: string; sub: string }[]).map((o) => (
              <OptionCard key={o.id} label={o.label} sub={o.sub}
                selected={tutorStyle === o.id}
                onPress={() => setTutorStyle(o.id)} />
            ))}
          </ScrollView>
          <View style={{ position: "absolute", bottom: 24, left: 22, right: 22 }}>
            <CTAButton label="Continue" onPress={advance} />
          </View>
        </FadeSlide>
      )}

      {/* ── GOAL ─────────────────────────────────────────────────────────────── */}
      {step === "goal" && (
        <FadeSlide key="goal">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={24}
          >
            <View style={{ paddingHorizontal: 22 }}>
              <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text,
                letterSpacing: -0.8, marginBottom: 6, marginTop: 12 }}>
                What's your main goal?
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginBottom: 16 }}>
                Your whole lesson plan shapes around this. You can change it any time.
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 140 }}
              keyboardShouldPersistTaps="handled"
            >
              {GOAL_OPTIONS.map((g, i) => (
                <GoalCard
                  key={g.id}
                  icon={g.icon}
                  label={g.label}
                  hint={g.hint}
                  selected={goalPreset === g.id}
                  onPress={() => setGoalPreset(g.id)}
                  delay={i * 30}
                />
              ))}

              {/* Custom goal text entry — only appears when Custom is picked */}
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
                    placeholder={"e.g. I want to speak French better for my grandmother"}
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

            <View style={{ position: "absolute", bottom: 24, left: 22, right: 22 }}>
              <CTAButton
                label="Continue"
                onPress={advance}
                disabled={!canFinish}
              />
            </View>
          </KeyboardAvoidingView>
        </FadeSlide>
      )}

      {/* ── ACCOUNT ─────────────────────────────────────────────────────────── */}
      {step === "account" && (
        <FadeSlide key="account" style={{ paddingHorizontal: 22 }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1, justifyContent: "center" }}
            keyboardVerticalOffset={24}
          >
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 24,
                padding: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  backgroundColor: COLORS.goldLight,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                }}
              >
                <Ionicons name="person-circle-outline" size={28} color={COLORS.gold} />
              </View>
              <Text style={{ fontSize: 28, fontWeight: "900", color: COLORS.text, letterSpacing: -0.8 }}>
                Create an account
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSub, lineHeight: 21, marginTop: 8, marginBottom: 18 }}>
                Optional. Sign in to sync across devices, or skip and keep everything saved locally on this phone.
              </Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="Email"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: COLORS.surface2,
                  paddingHorizontal: 14,
                  fontSize: 15,
                  color: COLORS.text,
                  marginBottom: 10,
                }}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                placeholder="Password, 6+ characters"
                placeholderTextColor={COLORS.textMuted}
                style={{
                  height: 52,
                  borderRadius: 16,
                  backgroundColor: COLORS.surface2,
                  paddingHorizontal: 14,
                  fontSize: 15,
                  color: COLORS.text,
                }}
                onSubmitEditing={createAccount}
              />

              {accountError ? (
                <Text style={{ marginTop: 10, fontSize: 12, color: COLORS.danger, lineHeight: 17 }}>
                  {accountError}
                </Text>
              ) : null}

              <View style={{ marginTop: 18 }}>
                <CTAButton
                  label={accountLoading ? "Creating account..." : "Create account"}
                  onPress={createAccount}
                  disabled={!canCreateAccount}
                  dark
                />
              </View>
              <Pressable
                onPress={skipAccount}
                hitSlop={10}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 10,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.textSub }}>
                  Continue without account
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </FadeSlide>
      )}

      {/* ── TRIAL ────────────────────────────────────────────────────────────── */}
      {step === "trial" && (
        <FadeSlide key="trial" style={{ paddingHorizontal: 22 }}>
          <View style={{ flex: 1, justifyContent: "center" }}>
            {/* Summary card */}
            <View style={{
              backgroundColor: COLORS.surface, borderRadius: 22, padding: 22,
              marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.textMuted,
                letterSpacing: 0.8, marginBottom: 16 }}>YOUR SETUP</Text>
              {[
                { label: "Learning", value: SUPPORTED_LANGUAGES.find((l) => l.code === learningLanguage)?.label ?? "—" },
                { label: "Known", value: knownLanguages.map((c) => c.toUpperCase()).join(", ") },
                { label: "Commitment", value: commitment.charAt(0).toUpperCase() + commitment.slice(1) },
                { label: "Tutor style", value: tutorStyle.charAt(0).toUpperCase() + tutorStyle.slice(1) },
                {
                  label: "Goal",
                  value:
                    goalPreset === "custom"
                      ? customGoal.trim() || "Custom goal"
                      : GOAL_OPTIONS.find((g) => g.id === goalPreset)?.label ?? "—",
                },
              ].map((row) => (
                <View key={row.label} style={{
                  flexDirection: "row", justifyContent: "space-between",
                  paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.borderLight,
                }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSub }}>{row.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text }}>{row.value}</Text>
                </View>
              ))}
            </View>

            {/* Trial headline */}
            <Text style={{ fontSize: 30, fontWeight: "900", color: COLORS.text,
              letterSpacing: -1, textAlign: "center", marginBottom: 8 }}>
              7 days free
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textSub, textAlign: "center",
              lineHeight: 23, marginBottom: 32 }}>
              Start learning right now.{"\n"}No payment required to begin.
            </Text>

            <CTAButton label="Start for free →" onPress={finish} dark />
            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: "center", marginTop: 12 }}>
              Cancel any time · No credit card needed
            </Text>
          </View>
        </FadeSlide>
      )}
    </SafeAreaView>
  );
}
