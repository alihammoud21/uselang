// ── Quick Session — interactive language tutor screen ───────────────────────
//
// Spec: Quick Mode is NOT a translator. After a user types or speaks a phrase
// from the Speak tab, they navigate here. This screen is a mini tutor session:
//
//   • Top bar (X close, "Tutor" title, settings stub).
//   • Question card showing the user's input.
//   • Key Concept card (target phrase + phonetic + explanation).
//   • Tongue / mouth placement card with Side / Front toggle.
//   • Floating "liquid glass" tip overlay during speech — appears mid-audio.
//   • Live transcript fixed at the bottom — segments reveal in sync with audio.
//   • Centered orb at the bottom: tap to interrupt; tap again to ask a follow-up.
//
// Local-only: tutor response comes from on-device Gemma. Audio uses installed
// device voices.
// Per-segment language tagging means the AI narrates in the user's native
// language and pronounces target words with the target-language voice.
//
// Hard rules:
//   • Never block on the network.
//   • One playback handle at a time (stopTutorAudio() on unmount + on retap).
//   • Animations must feel like the screenshots in the spec: ~200-300ms,
//     ease-in-out, no jarring jumps.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { postTutorSession, type TutorAudioSegment, type TutorResponse } from "@/lib/tutor-api";
import { playTutorAudio, stopTutorAudio } from "@/lib/tutor-audio";
import { pinyinToSayLike } from "@/lib/gemma-stub";
import { AnimatedMouth } from "@/components/AnimatedMouth";
import { SphereOrb } from "@/components/SphereOrb";
import { getUserProfile } from "@/lib/user-store";
import { savePhrase } from "@/lib/phrase-store";
import { recognizeSpeechOnce, SpeechPermissionError, type NativeSpeechSession } from "@/lib/native-speech";
import { comparePronunciation, type PronunciationFeedback } from "@/lib/pronunciation-feedback";
import { speakRoutedText, stopRoutedTts } from "@/lib/tts-router";
import { prewarmOfflineTts } from "@/lib/offline-tts";
import { TongueDiagram } from "@/components/TongueDiagram";

const AnimatedView = Animated.createAnimatedComponent(View);

// ── Helpers ────────────────────────────────────────────────────────────────
function labelOf(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label || code;
}

// Pull a single short character/sound out of the AI's correction line —
// '"r"' or "'sh'" etc. Used as the phoneme for AnimatedMouth.
function phonemeFromResponse(res: TutorResponse | null): string {
  if (!res) return "r";
  const m =
    res.correctionLine?.match(/['"]([^'"]{1,5})['"]/) ||
    res.pronunciationTip?.match(/['"]([^'"]{1,5})['"]/);
  return m?.[1] || "r";
}

// Color tokens for the feedback card. Kept here (not in qStyles) because
// they are RN view-style snippets, not text styles, and need to merge with
// the base feedbackCard style at the call site via array spread.
function feedbackTone(rating: PronunciationFeedback["rating"]): {
  borderColor: string;
  backgroundColor: string;
} {
  switch (rating) {
    case "spot-on": return { borderColor: "rgba(34,197,94,0.35)",  backgroundColor: "rgba(34,197,94,0.08)" };
    case "close":   return { borderColor: "rgba(168,93,46,0.30)",   backgroundColor: "rgba(255,237,213,0.55)" };
    case "almost":  return { borderColor: "rgba(168,93,46,0.30)",   backgroundColor: "rgba(254,238,234,0.65)" };
    case "off":
    default:        return { borderColor: "rgba(239,68,68,0.30)",   backgroundColor: "rgba(254,238,234,0.65)" };
  }
}

function feedbackIconColor(rating: PronunciationFeedback["rating"]): string {
  switch (rating) {
    case "spot-on": return "#1F8A4C";
    case "close":   return "#A85D2E";
    case "almost":  return "#A85D2E";
    case "off":
    default:        return "#C53030";
  }
}

// Rewrite imperative/action phrases into natural questions.
// "Introduce yourself" → "How do I introduce myself?"
// "Order food at a restaurant" → "How do I order food at a restaurant?"
// Already a question → keep as-is.
function reformulateQuestion(raw: string): string {
  const s = raw.trim();
  if (!s) return "—";

  // Already a question
  if (/^(how|what|where|when|why|who|can|could|do|does|is|are)\s/i.test(s) || s.endsWith("?")) {
    return s.endsWith("?") ? s : `${s}?`;
  }

  const rewrites: [RegExp, string][] = [
    [/^introduce\s+(yourself|myself)/i, "How do I introduce myself"],
    [/^order\s+(.+)/i, "How do I order $1"],
    [/^ask\s+(?:for\s+)?(.+)/i, "How do I ask for $1"],
    [/^say\s+(.+)/i, "How do I say $1"],
    [/^tell\s+(.+)/i, "How do I tell $1"],
    [/^get\s+(.+)/i, "How do I get $1"],
    [/^find\s+(.+)/i, "How do I find $1"],
    [/^buy\s+(.+)/i, "How do I buy $1"],
    [/^pay\s+(.+)/i, "How do I pay $1"],
    [/^thank\s+(.+)/i, "How do I thank $1"],
    [/^greet\s+(.+)/i, "How do I greet $1"],
    [/^request\s+(.+)/i, "How do I request $1"],
  ];

  for (const [pattern, replacement] of rewrites) {
    if (pattern.test(s)) {
      const result = s.replace(pattern, replacement).replace(/[?.!]+$/, "");
      return `${result}?`;
    }
  }

  // Default: wrap as "How do I say X?"
  return `How do I say "${s}"?`;
}

// ── Screen ─────────────────────────────────────────────────────────────────
export default function QuickSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    phrase?: string;
    learnLang?: string;
    nativeLang?: string;
  }>();

  const phrase = (typeof params.phrase === "string" ? params.phrase : "").trim();
  const [learnLang, setLearnLang] = useState<string>(
    typeof params.learnLang === "string" && params.learnLang ? params.learnLang : "zh",
  );
  const [nativeLang, setNativeLang] = useState<string>(
    typeof params.nativeLang === "string" && params.nativeLang ? params.nativeLang : "en",
  );
  const [userName, setUserName] = useState<string>("");

  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [aiState, setAiState] = useState<"idle" | "thinking" | "speaking" | "listening">("thinking");

  // Live transcript — the user sees segments accumulate as audio plays.
  const [transcript, setTranscript] = useState<TutorAudioSegment[]>([]);
  const transcriptScrollRef = useRef<ScrollView>(null);

  // Floating liquid-glass tip that appears once mid-speech.
  const [floatingTip, setFloatingTip] = useState<string | null>(null);
  const tipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mouth placement view toggle.
  const [mouthView, setMouthView] = useState<"side" | "front">("side");
  const [saved, setSaved] = useState(false);

  // Pronunciation coach card visibility. Per spec, the mouth/tongue diagram
  // should NOT appear automatically every time — only after a repeat attempt
  // or when the user explicitly asks to see it.
  const [showCoach, setShowCoach] = useState(false);

  // Attempt loop state. The flow is:
  //   speaking → idle → (orb tap) listening → scoring → idle (with feedback)
  // After the first attempt, subsequent orb taps cycle: replay audio /
  // re-listen, while a dedicated "Try again" button on the feedback card
  // re-opens the mic. Holding the orb during "listening" stops the mic.
  const [lastAttemptText, setLastAttemptText] = useState<string>("");
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const [mastered, setMastered] = useState(false);
  const attemptedRef = useRef(false);
  const speechSessionRef = useRef<NativeSpeechSession | null>(null);
  // Live mic level for the orb's reactive scaling while listening.
  const [, setMicLevel] = useState(0);
  const orbDebounceRef = useRef(false);

  // ── Resolve user profile for language defaults + name if not in params ──
  useEffect(() => {
    getUserProfile()
      .then((p) => {
        const lang = params.learnLang || p.learningLanguage || "zh";
        if (!params.learnLang) setLearnLang(lang);
        if (!params.nativeLang) setNativeLang(p.knownLanguages?.[0] || "en");
        if (p.userName) setUserName(p.userName);
        prewarmOfflineTts(lang);
      })
      .catch(() => {/* keep defaults */});
  }, [params.learnLang, params.nativeLang]);

  // ── Fetch tutor response on mount ──────────────────────────────────────
  const fetchTutor = useCallback(async () => {
    if (!phrase) {
      setError("No phrase provided.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setAiState("thinking");
    setTranscript([]);
    try {
      const res = await postTutorSession({
        mode: "quick-ask",
        text: phrase,
        languageCode: learnLang,
        nativeLanguageCode: nativeLang,
        userName: userName || undefined,
        includeAudio: false,
      });
      setResponse(res);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || "Couldn't reach the tutor.");
      setLoading(false);
      setAiState("idle");
    }
  }, [phrase, learnLang, nativeLang]);

  // Fire ONCE on mount with a stable phrase so the local Gemma turn is not
  // duplicated by unrelated state changes.
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    if (!phrase) return;
    fetchedRef.current = true;
    fetchTutor();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrase]);

  // Track whether we should auto-listen after playback ends.
  const autoListenAfterPlaybackRef = useRef(true);

  // ── Auto-play audio + drive the live transcript ────────────────────────
  const startPlayback = useCallback(async (res: TutorResponse, autoListenAfter = false) => {
    setAiState("speaking");
    setTranscript([]);
    if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    autoListenAfterPlaybackRef.current = autoListenAfter;

    const segments: TutorAudioSegment[] =
      res.audioSegments && res.audioSegments.length
        ? res.audioSegments
        : [{ lang: nativeLang, text: res.audioText || res.localReply || res.naturalPhrase }];

    await playTutorAudio(
      {
        audioBase64: res.audioBase64,
        audioMimeType: res.audioMimeType,
        audioSegments: segments,
        fallbackText: res.audioText || res.localReply || "",
        languageCode: learnLang,
        nativeLanguageCode: nativeLang,
      },
      {
        onSegmentStart: (seg) => {
          setTranscript((prev) => [...prev, seg]);
          // Auto-scroll the transcript to the latest line.
          requestAnimationFrame(() => {
            transcriptScrollRef.current?.scrollToEnd({ animated: true });
          });
        },
        onEnd: () => {
          // If autoListen is on, go directly to listening after a brief pause
          // so the user hears the phrase and then gets to repeat it.
          if (autoListenAfterPlaybackRef.current) {
            autoListenAfterPlaybackRef.current = false;
            setAiState("idle");
            // Small delay so the user knows the tutor stopped
            setTimeout(() => startListeningRef.current?.(), 600);
          } else {
            setAiState("idle");
          }
        },
        onError: () => {
          setAiState("idle");
        },
      },
    );

    // Show the floating pronunciation tip ~1.2s into the explanation, hide
    // it 4s later. This is the "liquid glass" overlay called for in the spec.
    const tip = res.pronunciationTip?.trim();
    if (tip) {
      tipTimerRef.current = setTimeout(() => {
        setFloatingTip(tip);
        tipTimerRef.current = setTimeout(() => setFloatingTip(null), 4200);
      }, 1200);
    }
  }, [learnLang, nativeLang]);

  // Auto-play AND auto-listen: after the tutor finishes explaining, the mic
  // opens automatically so the user can repeat without tapping anything.
  useEffect(() => {
    if (!response) return;
    startPlayback(response, true);
  }, [response, startPlayback]);

  // ── Cleanup on unmount: stop any audio that's still playing ────────────
  useEffect(() => {
    return () => {
      stopTutorAudio().catch(() => {});
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
    };
  }, []);

  // ── Mic capture + pronunciation comparison ────────────────────────────────────────────────────────────────────────
  // Listens once to the user, transcribes via the native speech recognizer
  // (locale = the language being LEARNED so it expects target sounds), then
  // scores against the target phrase and surfaces a feedback card.
  //
  // Honest behavior: if the recognizer couldn't capture audio, we surface
  // that fact instead of pretending to score — we never fake feedback.
  const startListening = useCallback(async () => {
    if (!response) return;
    // Stop any active TTS/audio before starting mic — prevents native audio crash
    await stopTutorAudio();
    // Let the audio hardware settle before opening the mic
    await new Promise(r => setTimeout(r, 200));
    setLastAttemptText("");
    setFeedback(null);
    setAiState("listening");
    attemptedRef.current = true;
    try {
      // Use requiresOnDevice: false so speech recognition works even when
      // on-device packs aren't installed for the target language. The system
      // will use cloud-based recognition as a fallback. Timeout is generous
      // (15s) so the user has time to speak naturally.
      const transcript = await recognizeSpeechOnce({
        languageCode: learnLang,
        fallbackLanguageCode: nativeLang,
        requiresOnDevice: false,
        timeoutMs: 15_000,
        onPartial: setLastAttemptText,
        onVolume: (v) => setMicLevel(v),
        onSession: (s) => { speechSessionRef.current = s; },
      });
      speechSessionRef.current = null;
      const clean = transcript.trim();
      setLastAttemptText(clean);
      setAiState("thinking");
      const fb = comparePronunciation(response.naturalPhrase || "", clean);
      setFeedback(fb);
      setShowCoach(true);

      // AI ALWAYS speaks back after every attempt
      const targetPhrase = response.naturalPhrase || "";
      if (fb.score >= 0.80) {
        // ── PASS ──
        setMastered(true);
        setAiState("speaking");
        try {
          await speakRoutedText({ text: "Perfect! You've got it.", languageCode: nativeLang });
        } catch {}
        setAiState("idle");
      } else {
        // ── FAIL — AI speaks coaching tip then replays the target phrase ──
        setAiState("speaking");
        try {
          const coachLine = fb.suggestion || "Try again — listen carefully.";
          await speakRoutedText({ text: coachLine, languageCode: nativeLang });
          await new Promise((r) => setTimeout(r, 200));
          await speakRoutedText({ text: targetPhrase, languageCode: learnLang });
        } catch {}
        setAiState("idle");
      }
    } catch (err: any) {
      speechSessionRef.current = null;
      setAiState("idle");
      if (err instanceof SpeechPermissionError && err.canOpenSettings) {
        Alert.alert(
          "Microphone Access",
          "UseLang needs microphone access to hear you speak.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else if (err instanceof SpeechPermissionError) {
        Alert.alert("Microphone Access", err.message, [{ text: "OK" }]);
      } else {
        setLastAttemptText("Didn't catch that — hold the orb and try again.");
      }
    }
  }, [response, learnLang, nativeLang]);
  // Stable ref so the auto-listen callback in startPlayback can call the
  // latest version without a circular dependency.
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  // ── Orb handler ───────────────────────────────────────────────────────────────────────────────────
  //   - Speaking → stop the tutor audio.
  //   - Listening → stop the mic (finalize attempt).
  //   - Idle → ALWAYS start listening (whether first attempt or retry).
  //   The user should never need to hunt for a "Try again" button — the orb
  //   is the primary interaction point and always opens the mic.
  const handleOrbTap = useCallback(async () => {
    if (aiState === "speaking") {
      await stopTutorAudio();
      setAiState("idle");
      setFloatingTip(null);
      if (tipTimerRef.current) clearTimeout(tipTimerRef.current);
      return;
    }
    if (aiState === "listening") {
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
      return;
    }
    if (orbDebounceRef.current) return;
    orbDebounceRef.current = true;
    setTimeout(() => { orbDebounceRef.current = false; }, 700);
    if (response) {
      await startListening();
    }
  }, [aiState, response, startListening]);

  // ── Save the phrase to the user's library ──────────────────────────────
  const handleSave = useCallback(async () => {
    if (!response || saved) return;
    try {
      await savePhrase({
        languageCode: learnLang,
        phrase: response.naturalPhrase || phrase,
        phonetic: response.phonetic || "",
        meaning: response.localReply || phrase,
        tip: response.pronunciationTip || response.context || "",
        audioBase64: response.audioBase64 || undefined,
        audioMimeType: response.audioMimeType || undefined,
        tonguePlacement: response.articulation?.tonguePlacement,
        lipShape: response.articulation?.lipShape,
        phoneme: phonemeFromResponse(response),
      });
      setSaved(true);
    } catch {/* surface error in UI later */}
  }, [response, saved, learnLang, phrase]);

  // ── Header back ────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    // Shared: stop all audio THEN navigate. Using .finally() chains the
    // navigation AFTER stop completes so TTS can't keep playing on the
    // previous screen after the user has already closed.
    const doClose = () => {
      stopTutorAudio()
        .catch(() => {})
        .finally(() => {
          if (router.canGoBack()) router.back();
          else router.replace("/(tabs)");
        });
    };

    if (aiState === "listening" || aiState === "speaking" || feedback || lastAttemptText) {
      // Stop mic immediately so it's not listening while the alert is up
      speechSessionRef.current?.stop();
      speechSessionRef.current = null;
      Alert.alert(
        "Leave this session?",
        "You'll lose your current XP progress if you leave.",
        [
          { text: "Keep Going", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: doClose },
        ],
      );
    } else {
      doClose();
    }
  }, [router, aiState, feedback, lastAttemptText]);

  // ── Derived ────────────────────────────────────────────────────────────
  const phoneme = useMemo(() => phonemeFromResponse(response), [response]);
  const learnLabel = useMemo(() => labelOf(learnLang), [learnLang]);

  // Orb status copy follows the user's flow:
  //   1. Tutor teaches (speaking) → "Tap to interrupt"
  //   2. Speech ends, no attempt yet → "Try saying it now"
  //   3. User holds the orb → "Listening…"
  //   4. After the user's attempt completes → "Tap to hear it again"
  // We never default to "Tap orb to replay" — that copy reads as a stale,
  // pre-attempt prompt and was the line the user called out as wrong.
  // Drives both the orb-status copy and the "have they attempted" branch
  // — derived from STATE (not the ref) so React re-renders on transition.
  const hasAttempted = feedback !== null || lastAttemptText !== "";
  const orbStatus =
    loading ? "Preparing your lesson…" :
    mastered               ? "Mastered ✓" :
    aiState === "speaking"  ? "AI is coaching…" :
    aiState === "thinking"  ? "Scoring…" :
    aiState === "listening" ? "Tap to stop" :
    hasAttempted           ? "Tap to try again" :
                              "Try saying it now";

  // ── Bottom layout constants ─────────────────────────────────────────────
  // We stack three layers above the home indicator: orb at the very bottom,
  // transcript card just above it, and the floating pronunciation tip on top
  // of everything (zIndex 999) so it's always visible during speech.
  const ORB_SIZE = 120;
  const ORB_STATUS_LIFT = 22;          // status-text height under the orb
  const ORB_BLOCK_HEIGHT = ORB_SIZE + ORB_STATUS_LIFT;
  const ORB_BOTTOM = 24 + insets.bottom;
  const TRANSCRIPT_BOTTOM = ORB_BOTTOM + ORB_BLOCK_HEIGHT + 14;
  const TRANSCRIPT_MAX_HEIGHT = 110;
  const TIP_BOTTOM = TRANSCRIPT_BOTTOM + TRANSCRIPT_MAX_HEIGHT + 16;
  // Pad the scroll bottom enough that the LAST card never sits behind the
  // transcript card. Add an extra cushion so a long card still breathes.
  const SCROLL_PADDING_BOTTOM = TRANSCRIPT_BOTTOM + TRANSCRIPT_MAX_HEIGHT + 36;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SESSION.bg }} edges={["top", "left", "right"]}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 14,
        }}
      >
        <Pressable onPress={handleClose} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color={SESSION.ink} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: SESSION.amber,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="school" size={15} color="#FFF" />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: SESSION.ink }}>Tutor</Text>
        </View>
        <Pressable onPress={handleSave} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={22}
            color={saved ? SESSION.amber : SESSION.ink}
          />
        </Pressable>
      </View>

      {/* ── Scrollable content ──────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 6,
          paddingBottom: SCROLL_PADDING_BOTTOM,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={false}
      >
        {/* Question card */}
        <AnimatedView entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}>
          <View style={qStyles.questionCard}>
            <Text style={qStyles.questionEyebrow}>YOUR QUESTION</Text>
            <Text style={qStyles.questionTitle}>
              {reformulateQuestion(phrase)}
            </Text>
            <Text style={qStyles.questionMeta}>
              {`${labelOf(nativeLang)} → ${learnLabel}`}
            </Text>
          </View>
        </AnimatedView>

        {/* Loading / error / response */}
        {loading ? (
          <View style={qStyles.skeleton}>
            <ActivityIndicator size="large" color={SESSION.amber} />
            <Text style={qStyles.skeletonText}>Building your lesson…</Text>
          </View>
        ) : error ? (
          <AnimatedView entering={FadeInUp.duration(220)}>
            <View style={[qStyles.keyConcept, { backgroundColor: "#FEEEEA" }]}>
              <Text style={[qStyles.keyConceptEyebrow, { color: "#A8412A" }]}>COULDN'T LOAD</Text>
              <Text style={[qStyles.keyExplain, { fontSize: 14, lineHeight: 20, marginTop: 6 }]} numberOfLines={3}>
                {error}
              </Text>
              <Pressable
                onPress={() => { fetchedRef.current = false; fetchTutor(); }}
                style={({ pressed }) => ({
                  marginTop: 12, alignSelf: "flex-start",
                  paddingHorizontal: 16, paddingVertical: 9,
                  borderRadius: 18, backgroundColor: SESSION.amber,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>Try again</Text>
              </Pressable>
            </View>
          </AnimatedView>
        ) : response ? (
          <>
            {/* Key Concept card */}
            <AnimatedView entering={FadeInUp.delay(120).duration(280).easing(Easing.out(Easing.cubic))}>
              <View style={qStyles.keyConcept}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <Ionicons name="bulb" size={16} color={SESSION.amber} />
                  <Text style={qStyles.keyConceptEyebrow}>KEY CONCEPT</Text>
                </View>
                {/* For Mandarin: say-it-like as PRIMARY, pinyin secondary, characters tertiary.
                    For all other languages: phrase primary, phonetic always shown below. */}
                {learnLang.startsWith("zh") ? (
                  <>
                    <Text style={qStyles.keyPhrase}>
                      {response.phonetic ? pinyinToSayLike(response.phonetic) : response.naturalPhrase}
                    </Text>
                    {response.phonetic ? (
                      <Text style={[qStyles.keyPhonetic, { fontSize: 15, color: "#7A4A22", marginTop: 6 }]}>
                        {response.phonetic}
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 16, color: "rgba(28,23,20,0.28)", marginTop: 4, fontFamily: "Geist-Regular" }}>
                      {response.naturalPhrase}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={qStyles.keyPhrase}>{response.naturalPhrase}</Text>
                    <Text style={qStyles.keyPhonetic}>
                      {response.phonetic ? `Say it like: ${response.phonetic}` : "Tap the orb to hear pronunciation"}
                    </Text>
                  </>
                )}
                {(() => {
                  const raw = response.pronunciationTip || response.context;
                  const isDebug = raw?.startsWith("(Translated by") || raw?.startsWith("Translated from");
                  const explain = isDebug ? null : raw;
                  return explain ? (
                    <Text style={qStyles.keyExplain}>{explain}</Text>
                  ) : null;
                })()}
              </View>
            </AnimatedView>

            {/* ── Word-by-word breakdown ────────────────────────────── */}
            {response.chunks && response.chunks.length > 0 ? (
              <AnimatedView entering={FadeInUp.delay(200).duration(280).easing(Easing.out(Easing.cubic))}>
                <View style={qStyles.breakdownCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }}>
                    <Ionicons name="layers-outline" size={15} color={SESSION.amber} />
                    <Text style={qStyles.keyConceptEyebrow}>WORD BY WORD</Text>
                  </View>
                  {response.chunks.map((chunk, i) => {
                    const isZh = learnLang.startsWith("zh");
                    return (
                      <View
                        key={`${chunk.target}-${i}`}
                        style={[
                          qStyles.breakdownRow,
                          i < (response.chunks?.length ?? 0) - 1 && qStyles.breakdownRowBorder,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={qStyles.breakdownTarget}>
                            {isZh && chunk.phonetic ? chunk.phonetic : chunk.target}
                          </Text>
                          {isZh && (
                            <Text style={{ fontSize: 11, color: "rgba(28,23,20,0.35)", fontFamily: "Geist-Regular", marginTop: 2 }}>
                              {chunk.target}
                            </Text>
                          )}
                        </View>
                        <Text style={qStyles.breakdownArrow}>→</Text>
                        <Text style={qStyles.breakdownEnglish}>{chunk.english}</Text>
                      </View>
                    );
                  })}
                </View>
              </AnimatedView>
            ) : null}

            {/* ── Tongue Placement — always visible when response loaded ─ */}
            {response.articulation?.tonguePlacement ? (
              <AnimatedView entering={FadeInUp.delay(260).duration(280).easing(Easing.out(Easing.cubic))}>
                <View style={qStyles.tongueDiagramCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <Ionicons name="body-outline" size={15} color={SESSION.amberDeep} />
                    <Text style={qStyles.keyConceptEyebrow}>TONGUE PLACEMENT</Text>
                  </View>
                  <View style={{ alignItems: "center", marginBottom: 10 }}>
                    <TongueDiagram phoneme={phoneme} size={130} />
                  </View>
                  {response.articulation?.tonguePlacement ? (
                    <Text style={qStyles.articulationLine}>
                      <Text style={qStyles.articulationKey}>Tongue.</Text>{" "}
                      {response.articulation.tonguePlacement}
                    </Text>
                  ) : null}
                  {response.articulation?.lipShape ? (
                    <Text style={qStyles.articulationLine}>
                      <Text style={qStyles.articulationKey}>Lips.</Text>{" "}
                      {response.articulation.lipShape}
                    </Text>
                  ) : null}
                </View>
              </AnimatedView>
            ) : null}

            {/* ── Mastered success banner ─────────────────────────── */}
            {mastered ? (
              <AnimatedView entering={FadeInUp.duration(320).easing(Easing.out(Easing.cubic))}>
                <View style={qStyles.masteredBanner}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={22} color="#1F8A4C" />
                    <View style={{ flex: 1 }}>
                      <Text style={qStyles.masteredTitle}>You can say this now</Text>
                      <Text style={qStyles.masteredSub}>{response.naturalPhrase}</Text>
                    </View>
                  </View>
                </View>
              </AnimatedView>
            ) : null}

            {/* ── Feedback card ────────────────────────────────────────
                Renders ONLY after the user attempts the phrase. Shows the
                target, what was heard, the score, and a retry button.
                Stacks below Key Concept so the eye flow is:
                  1. What's the phrase  →  2. What you said  →  3. Try again.
                Per spec: never fake a score. If the recognizer captured
                nothing or errored, `lastAttemptText` is empty and we show
                that fact in the meta line instead of pretending. */}
            {feedback ? (
              <AnimatedView entering={FadeInUp.duration(260).easing(Easing.out(Easing.cubic))}>
                <View style={[qStyles.feedbackCard, feedbackTone(feedback.rating)]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Ionicons
                      name={
                        feedback.rating === "spot-on" ? "checkmark-circle"
                        : feedback.rating === "off"   ? "alert-circle"
                                                      : "information-circle"
                      }
                      size={16}
                      color={feedbackIconColor(feedback.rating)}
                    />
                    <Text style={[qStyles.keyConceptEyebrow, { color: feedbackIconColor(feedback.rating) }]}>
                      {feedback.rating === "spot-on" ? "SPOT ON"
                       : feedback.rating === "close" ? "VERY CLOSE"
                       : feedback.rating === "almost" ? "ALMOST"
                                                      : "TRY AGAIN"}
                    </Text>
                    <Text style={{ marginLeft: "auto", fontSize: 12, fontWeight: "700", color: SESSION.muted }}>
                      {Math.round(feedback.score * 100)}%
                    </Text>
                  </View>

                  <Text style={qStyles.feedbackTargetLabel}>You said</Text>
                  <Text style={qStyles.feedbackHeard}>
                    {lastAttemptText || "—"}
                  </Text>

                  <View style={{ height: 1, backgroundColor: SESSION.hair, marginVertical: 10 }} />

                  <Text style={qStyles.feedbackTargetLabel}>Target</Text>
                  {learnLang.startsWith("zh") ? (
                    <>
                      <Text style={[qStyles.feedbackTarget, { fontWeight: "800" }]}>
                        {response.phonetic || response.naturalPhrase}
                      </Text>
                      {response.phonetic ? (
                        <Text style={{ fontSize: 14, color: "rgba(28,23,20,0.35)", marginTop: 4 }}>
                          {response.naturalPhrase}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Text style={qStyles.feedbackTarget}>
                        {response.naturalPhrase}
                      </Text>
                      {response.phonetic ? (
                        <Text style={{ fontSize: 12, color: SESSION.muted, marginTop: 3 }}>
                          {response.phonetic}
                        </Text>
                      ) : null}
                    </>
                  )}

                  {feedback.missingSegments.length > 0 ? (
                    <Text style={qStyles.feedbackMissing}>
                      Focus on:{" "}
                      <Text style={{ fontWeight: "800", color: SESSION.ink }}>
                        {feedback.missingSegments.slice(0, 4).join("  ·  ")}
                      </Text>
                    </Text>
                  ) : null}

                  <Text style={qStyles.feedbackSuggestion}>{feedback.suggestion}</Text>

                  <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={startListening}
                      disabled={aiState === "listening" || aiState === "thinking"}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 14,
                        backgroundColor: SESSION.ink,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 6,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons name="mic" size={15} color="#FFF" />
                      <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700" }}>Try again</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => response && startPlayback(response)}
                      disabled={aiState === "speaking"}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 14,
                        backgroundColor: "rgba(255,255,255,0.6)",
                        borderWidth: 1,
                        borderColor: SESSION.hair,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 6,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons name="volume-high" size={15} color={SESSION.ink} />
                      <Text style={{ color: SESSION.ink, fontSize: 13, fontWeight: "700" }}>Hear it</Text>
                    </Pressable>
                  </View>
                </View>
              </AnimatedView>
            ) : null}

            {/* Tongue / mouth placement card — hidden by default. Per spec,
                the mouth diagram should appear only after the learner asks
                to see it OR after a repeat attempt that flagged a sound
                they need to work on. */}
            {showCoach ? (
            <AnimatedView entering={FadeInUp.delay(60).duration(280).easing(Easing.out(Easing.cubic))}>
              <View style={qStyles.mouthCard}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                    <Ionicons name="body-outline" size={15} color={SESSION.amberDeep} />
                    <Text style={qStyles.mouthEyebrow}>MOUTH PLACEMENT</Text>
                  </View>
                  <View style={qStyles.viewToggle}>
                    {(["side", "front"] as const).map((v) => {
                      const active = mouthView === v;
                      return (
                        <Pressable
                          key={v}
                          onPress={() => setMouthView(v)}
                          style={[
                            qStyles.viewToggleItem,
                            active && qStyles.viewToggleItemActive,
                          ]}
                        >
                          <Text style={[qStyles.viewToggleLabel, active && qStyles.viewToggleLabelActive]}>
                            {v === "side" ? "Side" : "Front"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={qStyles.mouthBody}>
                  <View style={qStyles.mouthDiagram}>
                    <AnimatedMouth
                      phoneme={phoneme}
                      view={mouthView}
                      size={140}
                      playing={aiState === "speaking"}
                      showControls={false}
                      showLabelsToggle={false}
                    />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 14 }}>
                    {response.articulation?.tonguePlacement ? (
                      <Text style={qStyles.articulationLine}>
                        <Text style={qStyles.articulationKey}>Tongue.</Text>{" "}
                        {response.articulation.tonguePlacement}
                      </Text>
                    ) : null}
                    {response.articulation?.lipShape ? (
                      <Text style={qStyles.articulationLine}>
                        <Text style={qStyles.articulationKey}>Lips.</Text>{" "}
                        {response.articulation.lipShape}
                      </Text>
                    ) : null}
                    {response.articulation?.airflow ? (
                      <Text style={qStyles.articulationLine}>
                        <Text style={qStyles.articulationKey}>Airflow.</Text>{" "}
                        {response.articulation.airflow}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </AnimatedView>
            ) : (
              <Pressable
                onPress={() => setShowCoach(true)}
                style={({ pressed }) => ({
                  marginBottom: 24,
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.55)",
                  borderWidth: 1,
                  borderColor: "rgba(17,16,16,0.06)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="body-outline" size={16} color={SESSION.amberDeep} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: SESSION.ink2 }}>
                  Need help with the sounds? Show mouth & tongue coach.
                </Text>
                <Ionicons name="chevron-forward" size={14} color={SESSION.muted} />
              </Pressable>
            )}
          </>
        ) : null}
      </ScrollView>

      {/*
        ── Floating layers (rendered AFTER the ScrollView so they sit on top).
        Stack order, bottom of screen → up:
          (1) Orb section — fixed at bottom + safe-area
          (2) Transcript card — floats above the orb, doesn't overlap cards
          (3) Pronunciation tip — appears mid-speech, above the transcript,
              zIndex 999 so it's never occluded; pointerEvents="none" so it
              never blocks the orb tap or the transcript scroll.
        Each layer is its OWN absolute View — no shared backdrop — so cards
        can scroll under the orb/transcript edges instead of being clipped
        by a giant solid bar.
      */}

      {/* Transcript — floating card above orb */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 16,
          right: 16,
          bottom: TRANSCRIPT_BOTTOM,
          zIndex: 5,
        }}
      >
        <View style={qStyles.transcript}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <View
              style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: aiState === "speaking" ? "#22C55E" : SESSION.muted,
              }}
            />
            <Text style={qStyles.transcriptEyebrow}>
              {aiState === "speaking" ? "TUTOR · LIVE" : "TRANSCRIPT"}
            </Text>
          </View>
          <ScrollView
            ref={transcriptScrollRef}
            style={{ maxHeight: TRANSCRIPT_MAX_HEIGHT - 30 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {transcript.length ? (
              <Text style={qStyles.transcriptText}>
                {transcript.map((s, i) => (
                  <Text
                    key={i}
                    style={{
                      color: s.lang === learnLang ? SESSION.amberDeep : SESSION.ink,
                      fontWeight: s.lang === learnLang ? "700" : "400",
                    }}
                  >
                    {(i > 0 ? " " : "") + s.text}
                  </Text>
                ))}
              </Text>
            ) : (
              <Text style={qStyles.transcriptPlaceholder}>
                {loading ? "Tutor is preparing…" : aiState === "idle" ? "Tap the orb to hear it again." : "…"}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Orb — fixed bottom-center, above the home indicator */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: ORB_BOTTOM,
          alignItems: "center",
          zIndex: 4,
        }}
      >
        <SphereOrb state={aiState} onTap={handleOrbTap} size={ORB_SIZE} tone="blue" />
        <Text style={qStyles.orbStatus}>{orbStatus}</Text>
      </View>

      {/* Floating pronunciation tip — top-most layer, never blocks touches */}
      {floatingTip ? (
        <AnimatedView
          pointerEvents="none"
          entering={FadeInUp.duration(260).easing(Easing.out(Easing.cubic))}
          style={[
            qStyles.floatingTip,
            {
              bottom: TIP_BOTTOM,
              zIndex: 999,
              elevation: 10,
            },
          ]}
        >
          <View style={qStyles.floatingTipInner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Ionicons name="sparkles" size={13} color={SESSION.amberDeep} />
              <Text style={qStyles.floatingTipEyebrow}>PRONUNCIATION TIP</Text>
            </View>
            <Text style={qStyles.floatingTipText} numberOfLines={3}>
              {floatingTip}
            </Text>
          </View>
        </AnimatedView>
      ) : null}
    </SafeAreaView>
  );
}

// ── Design tokens ───────────────────────────────────────────────────────────
const SESSION = {
  bg:        "#F3EDE3",
  card:      "#FBF7F0",
  cardSoft:  "#F6EFE2",
  ink:       "#111010",
  ink2:      "#2B2623",
  muted:     "#6B625A",
  hair:      "rgba(17,16,16,0.08)",
  amber:     COLORS.gold ?? "#A85D2E",
  amberDeep: "#7A3F18",
  amberSoft: "#C8894F",
};

// ── Styles ──────────────────────────────────────────────────────────────────
const qStyles = {
  questionCard: {
    backgroundColor: SESSION.card,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: SESSION.hair,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginTop: 8,
    marginBottom: 22,
  },
  questionEyebrow: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
    color: SESSION.muted,
    marginBottom: 6,
  },
  questionTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "600" as const,
    color: SESSION.ink2,
  },
  questionMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600" as const,
    color: SESSION.muted,
    letterSpacing: 0.4,
  },
  skeleton: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
  },
  skeletonText: {
    marginTop: 12,
    fontSize: 13,
    color: SESSION.muted,
    fontStyle: "italic" as const,
  },
  keyConcept: {
    backgroundColor: SESSION.card,
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: SESSION.hair,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 22,
  },
  keyConceptEyebrow: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.1,
    color: SESSION.amber,
  },
  keyPhrase: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
    color: SESSION.ink,
  },
  keyPhonetic: {
    marginTop: 4,
    fontSize: 15,
    color: SESSION.amberDeep,
    fontStyle: "italic" as const,
    fontWeight: "600" as const,
  },
  keyExplain: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: SESSION.ink2,
  },
  // ── Breakdown card ──────────────────────────────────────────────────
  breakdownCard: {
    backgroundColor: SESSION.card,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: SESSION.hair,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 22,
  },
  breakdownRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 9,
    gap: 10,
  },
  breakdownRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: SESSION.hair,
  },
  breakdownTarget: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: SESSION.ink,
    minWidth: 60,
  },
  breakdownArrow: {
    fontSize: 13,
    color: SESSION.muted,
  },
  breakdownEnglish: {
    fontSize: 14,
    color: SESSION.muted,
    flex: 1,
  },
  // ── Feedback card ──────────────────────────────────────────────────
  feedbackCard: {
    backgroundColor: SESSION.card,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: SESSION.hair,
    marginBottom: 22,
  },
  feedbackTargetLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
    color: SESSION.muted,
    marginBottom: 4,
  },
  feedbackHeard: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700" as const,
    color: SESSION.ink,
  },
  feedbackTarget: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "700" as const,
    color: SESSION.amberDeep,
  },
  feedbackMissing: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: SESSION.ink2,
  },
  feedbackSuggestion: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: SESSION.ink2,
    fontStyle: "italic" as const,
  },
  mouthCard: {
    backgroundColor: SESSION.cardSoft,
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: SESSION.hair,
    marginBottom: 28,
  },
  mouthEyebrow: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.1,
    color: SESSION.amberDeep,
  },
  mouthBody: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 12,
  },
  mouthDiagram: {
    width: 150,
    height: 150,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  viewToggle: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(17,16,16,0.06)",
    borderRadius: 12,
    padding: 3,
  },
  viewToggleItem: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
  },
  viewToggleItemActive: {
    backgroundColor: SESSION.card,
  },
  viewToggleLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: SESSION.muted,
  },
  viewToggleLabelActive: {
    color: SESSION.ink,
  },
  articulationLine: {
    fontSize: 12.5,
    lineHeight: 17,
    color: SESSION.ink2,
    marginBottom: 6,
  },
  articulationKey: {
    fontWeight: "800" as const,
    color: SESSION.ink,
  },
  floatingTip: {
    position: "absolute" as const,
    left: 18,
    right: 18,
    alignItems: "center" as const,
  },
  floatingTipInner: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  floatingTipEyebrow: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
    color: SESSION.amberDeep,
  },
  floatingTipText: {
    fontSize: 13.5,
    lineHeight: 19,
    color: SESSION.ink2,
    fontWeight: "500" as const,
  },
  transcript: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(17,16,16,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 22,
    elevation: 5,
  },
  transcriptEyebrow: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
    color: SESSION.muted,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: SESSION.ink,
  },
  transcriptPlaceholder: {
    fontSize: 13,
    color: SESSION.muted,
    fontStyle: "italic" as const,
  },
  orbStatus: {
    marginTop: -10,    // pulls under the orb's outer pulse-ring padding
    fontSize: 12,
    fontWeight: "700" as const,
    color: SESSION.ink2,
    letterSpacing: 0.3,
  },
  tongueDiagramCard: {
    backgroundColor: SESSION.cardSoft,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: SESSION.hair,
    marginBottom: 22,
  },
  masteredBanner: {
    backgroundColor: "rgba(34,197,94,0.10)",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: "rgba(34,197,94,0.30)",
    marginBottom: 22,
  },
  masteredTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#1F8A4C",
  },
  masteredSub: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: SESSION.ink2,
    marginTop: 2,
  },
};
