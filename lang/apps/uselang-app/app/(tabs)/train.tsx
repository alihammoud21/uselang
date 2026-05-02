import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
  Linking,
  Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop, Ellipse, LinearGradient as SvgLinearGradient, Rect } from "react-native-svg";
import { SphereOrb } from "@/components/SphereOrb";
import {
  COLORS,
  SUPPORTED_LANGUAGES,
  type AIState,
  type TrainMode,
} from "@/lib/constants";
import { AISphere } from "@/components/AISphere";
import { VoiceSphere } from "@/components/VoiceSphere";
import { TongueDiagram } from "@/components/TongueDiagram";
import { AnimatedMouth } from "@/components/AnimatedMouth";
import { TutorResponseCard } from "@/components/TutorResponseCard";
import { OfflineBanner } from "@/components/OfflineBanner";
import { LanguageReachSheet } from "@/components/LanguageReachSheet";
import { PronunciationSheet } from "@/components/PronunciationSheet";
import { LessonProgressBar, type LessonProgress } from "@/components/LessonProgressBar";
import { MasteryBanner, type MasteryBannerData } from "@/components/MasteryBanner";
import { LessonCompleteOverlay } from "@/components/LessonCompleteOverlay";
import { LessonSmartBoard } from "@/components/LessonSmartBoard";
import { OfflineVoiceReadinessPanel } from "@/components/OfflineVoiceReadinessPanel";
import OfflineVoicePanel from "@/components/OfflineVoicePanel";
import {
  postTutorSession,
  type HomeworkItem,
  type PhraseChunk,
  type TutorRequest,
  type TutorResponse,
  type TutorSessionMemory,
} from "@/lib/tutor-api";
import {
  createPhraseSession,
  phraseAdvanceFromIntro,
  phraseScoreChunk,
  phraseScoreFinal,
  phraseAdvanceToScenario,
  phraseScoreScenario,
  phraseAdvanceFromRemediate,
  getPhraseProgress,
  PHRASE_MASTERY_THRESHOLD,
  type PhraseSession,
  type PhrasePhase,
} from "@/lib/tutor-engine";
import { comparePronunciation, type PronunciationFeedback } from "@/lib/pronunciation-feedback";
import { saveHomework } from "@/lib/homework-store";
import { playTutorAudio, playUserAudio, stopTutorAudio, setTutorPlaybackRate } from "@/lib/tutor-audio";
import { speakRoutedText, stopRoutedTts, prefetchDeepgramTts } from "@/lib/tts-router";
import { prewarmOfflineTts } from "@/lib/offline-tts";
import { pinyinToSayLike } from "@/lib/gemma-stub";
import { chatWithGemma } from "@/lib/gemma-engine";
import { playSound } from "@/lib/sound-manager";
import { VoiceSpeedControls, type VoiceRate } from "@/components/VoiceSpeedControls";
import { startRecording, transcribeAudio, type RecorderHandle } from "@/lib/stt-client";
import { recognizeSpeechOnce, SpeechPermissionError, type NativeSpeechSession } from "@/lib/native-speech";
import { useOnlineStatus } from "@/lib/use-online";
import { getUserProfile, type UserProfile } from "@/lib/user-store";
import { recordAttempt, addWeakSound, addXP } from "@/lib/progress-store";
import { savePhrase } from "@/lib/phrase-store";
import { addCoins } from "@/lib/challenge-store";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { getTodayTwister, recordDrillAttempt } from "@/lib/daily-challenge";
import { addTutorSeconds } from "@/lib/usage-store";
import { recordMasteryAttempt } from "@/lib/mastery-store";
import { validateUserText } from "@/lib/input-validate";

// ── Config ───────────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get("window");
const ORB_SIZE = Math.min(SW * 0.58, 240);
const DOT_COUNT = 16;

const STATUS_LABEL: Record<AIState, string> = {
  idle: "Tap the orb to start your lesson",
  listening: "Listening…",
  thinking: "Thinking",
  speaking: "Lang speaking…",
  blocked: "Session complete",
};

// VAD tuning
// Tuned for real iPhones held at conversational distance (8–18 inches). On the
// iPhone 15 Pro the noise floor is around -55 dBFS and conversational speech
// is around -25 to -15 dBFS. -50 is conservative; if a user mumbles or holds
// the phone at arm's length they should still register as "speaking".
const VAD_SILENCE_DB = -50;      // below this counts as silence
const VAD_SILENCE_MS = 2000;     // stop after 2s of continuous silence
const VAD_MIN_SPEECH_MS = 500;   // must have heard speech for 0.5s before silence-stop applies
// Hard ceiling on a single listening turn. 15s gives the user time to
// speak a full sentence naturally. Prevents the orb from hanging forever.
const LISTENING_TIMEOUT_MS = 15_000;
// Max words we'll send to the tutor from a single turn.
const MAX_TRANSCRIPT_WORDS = 40;

// Map UI mode → backend mode. Both "tutor" and "drill" use the train
// playbook; drill just tightens the loop so the tutor demands a repeat.
function toApiMode(mode: TrainMode): TutorRequest["mode"] {
  if (mode === "quick") return "quick-ask";
  return "train";
}

// Normalize legacy modes at the component boundary.
// Speak tab only surfaces Quick + Phrase.
function normalizeMode(m: TrainMode): "quick" | "phrase" {
  if (m === "phrase") return "phrase";
  return "quick";  // everything else → "quick"
}

// ── Waveform ─────────────────────────────────────────────────────────────────

function WaveDot({ index, active, color }: { index: number; active: boolean; color: string }) {
  const anim = useSharedValue(0);
  useEffect(() => {
    if (active) {
      anim.value = withRepeat(
        withDelay(index * 55, withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) })),
        -1,
        true
      );
    } else {
      anim.value = withTiming(0, { duration: 300 });
    }
  }, [active]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.22 + interpolate(anim.value, [0, 1], [0, 0.78]),
    transform: [{ scaleY: 1 + interpolate(anim.value, [0, 1], [0, active ? 1.6 : 0]) }],
  }));
  return (
    <Animated.View style={[{ width: 3, height: 14, borderRadius: 2, backgroundColor: color }, style]} />
  );
}

function WaveformDots({ active, color }: { active: boolean; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 14 }}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <WaveDot key={i} index={i} active={active} color={color} />
      ))}
    </View>
  );
}

// ── Heuristic score ──────────────────────────────────────────────────────────
// We don't have real STT yet, so score attempts from the coach response:
//   correctionLine present = needs work; shouldRepeat = retry; else = good.
function scoreFromResponse(r: TutorResponse): number {
  if (!r.correctionLine && !r.shouldRepeat) return 92;
  if (r.correctionLine && r.shouldRepeat) return 55;
  if (r.correctionLine) return 65;
  return 78;
}

// ── Scenario → lesson copy ───────────────────────────────────────────────────
// Short humane titles for the progress bar + punchy achievement lines for the
// completion overlay. The scenario string comes from the onboarding picker
// (free text) so we normalize loosely via keyword matching.

function lessonTitleForScenario(raw: string): string {
  const s = (raw || "").toLowerCase();
  if (/(restaurant|food|order|menu|eat)/.test(s)) return "Ordering at a restaurant";
  if (/(greet|introduction|meet|hello|hi)/.test(s)) return "Meeting someone new";
  if (/(direction|navigate|where)/.test(s)) return "Asking for directions";
  if (/(travel|airport|flight|hotel|taxi)/.test(s)) return "Getting around as a traveler";
  if (/(shop|store|buy|market)/.test(s)) return "Shopping and haggling";
  if (/(emergenc|help|doctor|hospital)/.test(s)) return "Handling an emergency";
  if (/(smalltalk|small\s*talk|casual|friend)/.test(s)) return "Making small talk";
  return raw?.trim() ? capitalize(raw) : "Everyday conversation";
}

function completionLineForScenario(raw: string, languageLabel: string): string {
  const s = (raw || "").toLowerCase();
  if (/(restaurant|food|order|menu|eat)/.test(s)) {
    return `You can order food in ${languageLabel}.`;
  }
  if (/(greet|introduction|meet|hello|hi)/.test(s)) {
    return `You can introduce yourself in ${languageLabel}.`;
  }
  if (/(direction|navigate|where)/.test(s)) {
    return `You can ask for directions in ${languageLabel}.`;
  }
  if (/(travel|airport|flight|hotel|taxi)/.test(s)) {
    return `You can travel confidently in ${languageLabel}.`;
  }
  if (/(shop|store|buy|market)/.test(s)) {
    return `You can shop in ${languageLabel}.`;
  }
  if (/(emergenc|help|doctor|hospital)/.test(s)) {
    return `You can ask for help in ${languageLabel}.`;
  }
  return `You finished your first ${languageLabel} lesson.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── QuickOrb ─────────────────────────────────────────────────────────────────
// A warm cream/amber sphere for the Quick phrase-coach screen.
// Changes ring color and pulse rate to reflect mic/speaking state.

const AnimatedView = Animated.createAnimatedComponent(View);

// Languages supported in Speak mode — French, Spanish, Mandarin only.
const SPEAK_LANGUAGE_CODES = ["fr", "es", "zh"];

function QuickOrb({
  state,
  micLevel = 0,
  onTap,
  size = 180,
}: {
  state: AIState;
  micLevel?: number;
  onTap?: () => void;
  size?: number;
}) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isThinking = state === "thinking";
  const isActive = isListening || isSpeaking;

  const ringColor =
    isSpeaking  ? "rgba(46,107,216,0.52)" :
    isListening ? "rgba(168,93,46,0.60)" :
    isThinking  ? "rgba(200,168,60,0.50)" :
                  "rgba(168,93,46,0.22)";

  const c = size / 2;

  const breath   = useSharedValue(1);
  const press    = useSharedValue(1);
  const r1Scale  = useSharedValue(1);
  const r1Alpha  = useSharedValue(0);
  const r2Scale  = useSharedValue(1);
  const r2Alpha  = useSharedValue(0);
  const actBoost = useSharedValue(1);

  useEffect(() => {
    const dur = isListening ? 850 : isSpeaking ? 1000 : isThinking ? 1500 : 3400;
    const amp = isActive ? 0.042 : isThinking ? 0.025 : 0.012;
    breath.value = withRepeat(
      withTiming(1 + amp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    if (isActive || isThinking) {
      const r1 = isActive ? 1600 : 2200;
      const r2 = isActive ? 2300 : 3100;
      r1Scale.value = 1;
      r1Scale.value = withRepeat(
        withTiming(1.52, { duration: r1, easing: Easing.out(Easing.quad) }), -1, false,
      );
      r1Alpha.value = withRepeat(
        withSequence(
          withTiming(0.55, { duration: 80 }),
          withTiming(0, { duration: r1 - 80, easing: Easing.out(Easing.quad) }),
        ), -1, false,
      );
      r2Scale.value = 1;
      r2Scale.value = withRepeat(
        withTiming(1.88, { duration: r2, easing: Easing.out(Easing.quad) }), -1, false,
      );
      r2Alpha.value = withRepeat(
        withSequence(
          withTiming(0.30, { duration: 80 }),
          withTiming(0, { duration: r2 - 80, easing: Easing.out(Easing.quad) }),
        ), -1, false,
      );
    } else {
      r1Scale.value = withTiming(1, { duration: 400 });
      r1Alpha.value = withTiming(0, { duration: 400 });
      r2Scale.value = withTiming(1, { duration: 400 });
      r2Alpha.value = withTiming(0, { duration: 400 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!isListening) {
      actBoost.value = withSpring(1, { damping: 14, stiffness: 120 });
      return;
    }
    actBoost.value = withSpring(1 + Math.min(0.065, micLevel * 0.09), { damping: 10, stiffness: 200 });
  }, [micLevel, isListening]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * press.value * actBoost.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Alpha.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Alpha.value }));

  // Sphere gradient colors per state
  const gradMid  = isSpeaking ? "#C3DEFF" : isThinking ? "#F0DD98" : "#EAD8B8";
  const gradEdge = isSpeaking ? "#85BAFF" : isThinking ? "#D4BC5A" : "#C99D62";

  return (
    <View style={{ width: size + 64, height: size + 64, alignItems: "center", justifyContent: "center" }}>
      {/* Pulse ring outer */}
      <AnimatedView style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: ringColor }, ring2Style]} />
      {/* Pulse ring inner */}
      <AnimatedView style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: ringColor }, ring1Style]} />

      <Pressable
        onPress={onTap}
        onPressIn={() => { press.value = withTiming(0.93, { duration: 130, easing: Easing.out(Easing.quad) }); }}
        onPressOut={() => { press.value = withTiming(1,    { duration: 220, easing: Easing.out(Easing.quad) }); }}
        hitSlop={20}
      >
        <AnimatedView
          style={[{
            width: size, height: size, borderRadius: size / 2,
            shadowColor: isListening ? "#A85D2E" : isSpeaking ? "#2E6BD8" : "#8B7355",
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: isActive ? 0.28 : 0.14,
            shadowRadius: 38,
            elevation: 12,
          }, sphereStyle]}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <RadialGradient id="qMain" cx="40%" cy="35%" r="65%"
                gradientUnits="userSpaceOnUse" fx={c * 0.80} fy={c * 0.70}>
                <Stop offset="0%"   stopColor="#FDFAF4" />
                <Stop offset="48%"  stopColor={gradMid} />
                <Stop offset="100%" stopColor={gradEdge} />
              </RadialGradient>
              <RadialGradient id="qHL" cx="30%" cy="26%" r="40%"
                gradientUnits="userSpaceOnUse" fx={c * 0.60} fy={c * 0.52}>
                <Stop offset="0%"   stopColor="rgba(255,255,255,0.90)" />
                <Stop offset="55%"  stopColor="rgba(255,255,255,0.28)" />
                <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </RadialGradient>
              <RadialGradient id="qShadow" cx="72%" cy="76%" r="44%"
                gradientUnits="userSpaceOnUse" fx={c * 1.44} fy={c * 1.52}>
                <Stop offset="0%"   stopColor="rgba(0,0,0,0.11)" />
                <Stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </RadialGradient>
            </Defs>
            <Circle cx={c} cy={c} r={c} fill="url(#qMain)" />
            <Circle cx={c} cy={c} r={c} fill="url(#qShadow)" />
            <Circle cx={c} cy={c} r={c} fill="url(#qHL)" />
            {/* Small specular glint */}
            <Ellipse cx={size * 0.33} cy={size * 0.27}
              rx={size * 0.10} ry={size * 0.065}
              fill="rgba(255,255,255,0.55)" />
          </Svg>
        </AnimatedView>
      </Pressable>
    </View>
  );
}

// ── Confetti particle colors ──────────────────────────────────────────────
const CONFETTI_COLORS = ["#C8903A", "#A85D2E", "#D4971A", "#7A4A22", "#E8C878", "#F0D090", "#B07820"];

function CompletionOverlay({
  phraseSession,
  language,
  onDismiss,
  xpEarned,
}: {
  phraseSession: PhraseSession;
  language: { code: string; label: string };
  onDismiss: () => void;
  xpEarned: number;
}) {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 300 - 150,
      y: -(Math.random() * 400 + 100),
      rotation: Math.random() * 360,
      size: Math.random() * 8 + 4,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 400,
    }));
  }, []);

  useEffect(() => {
    playSound("mastery");
  }, []);

  return (
    <View style={{
      position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
      backgroundColor: "rgba(28,23,20,0.85)", zIndex: 200,
      alignItems: "center", justifyContent: "center", paddingHorizontal: 32,
    }}>
      {/* Confetti particles */}
      {particles.map((p) => (
        <View
          key={p.id}
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            width: p.size,
            height: p.size * (Math.random() > 0.5 ? 1 : 2),
            borderRadius: p.size / 3,
            backgroundColor: p.color,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { rotate: `${p.rotation}deg` },
            ],
            opacity: 0.75,
          }}
        />
      ))}

      <View style={{
        backgroundColor: "#FFFFFF", borderRadius: 28, padding: 32,
        width: "100%", maxWidth: 340, alignItems: "center",
        shadowColor: "#000", shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 16 }, shadowRadius: 32,
      }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{"\u{1F389}"}</Text>
        <Text style={{ fontFamily: "Geist-Bold", fontSize: 22, color: "#1C1714", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 }}>
          You mastered it!
        </Text>
        <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: "rgba(28,23,20,0.55)", textAlign: "center", lineHeight: 20, marginBottom: 8 }}>
          You can now confidently say:
        </Text>
        <View style={{ backgroundColor: "rgba(122,74,34,0.06)", borderRadius: 14, padding: 14, marginBottom: 20, width: "100%" }}>
          {language.code.startsWith("zh") && phraseSession.fullPhonetic ? (
            <>
              <Text style={{ fontFamily: "Geist-Bold", fontSize: 20, color: "#1C1714", textAlign: "center", lineHeight: 28 }}>
                {pinyinToSayLike(phraseSession.fullPhonetic)}
              </Text>
              <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 12, color: "#7A4A22", textAlign: "center", marginTop: 6 }}>
                {phraseSession.fullPhonetic}
              </Text>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.28)", textAlign: "center", marginTop: 4 }}>
                {phraseSession.fullTarget}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontFamily: "Fraunces-Regular", fontSize: 18, color: "#1C1714", textAlign: "center", lineHeight: 24 }}>
                {phraseSession.fullTarget}
              </Text>
              <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 11, color: "rgba(122,74,34,0.55)", textAlign: "center", marginTop: 6 }}>
                {phraseSession.fullPhonetic}
              </Text>
            </>
          )}
        </View>
        {phraseSession.finalScore != null && (
          <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.45)", marginBottom: 16 }}>
            Full sentence score: {Math.round(phraseSession.finalScore * 100)}%
          </Text>
        )}
        {xpEarned > 0 && (
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: "#FFF8EC", borderWidth: 1, borderColor: "rgba(168,93,46,0.18)",
            borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10,
            marginBottom: 16,
          }}>
            <Ionicons name="flash" size={18} color="#A85D2E" />
            <Text style={{ fontFamily: "Geist-Bold", fontSize: 20, color: "#A85D2E", letterSpacing: -0.3 }}>+{xpEarned}</Text>
            <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "#8A7060" }}>XP earned</Text>
          </View>
        )}
        <Pressable
          onPress={onDismiss}
          style={({ pressed }) => ({
            backgroundColor: "#1C1714", borderRadius: 99,
            paddingVertical: 14, paddingHorizontal: 32, width: "100%",
            alignItems: "center", opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: "#F0E8D4" }}>Try another phrase</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ModeSwitcher({
  active,
  onChange,
}: {
  active: "quick" | "phrase";
  onChange: (next: "quick" | "phrase") => void;
}) {
  const items: { key: "quick" | "phrase"; label: string }[] = [
    { key: "quick",  label: "Quick"  },
    { key: "phrase", label: "Phrase" },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "rgba(28,23,20,0.06)",
        borderWidth: 1,
        borderColor: "rgba(28,23,20,0.16)",
        borderRadius: 12,
        padding: 4,
        gap: 3,
      }}
    >
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            hitSlop={8}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 9,
              paddingHorizontal: 20,
              borderRadius: 8,
              backgroundColor: isActive ? "#FFFFFF" : "transparent",
              shadowColor: "rgba(28,23,20,0.20)",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 1 : 0,
              shadowRadius: isActive ? 4 : 0,
              elevation: isActive ? 2 : 0,
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: isActive ? "Geist-Bold" : "Geist-Regular",
                color: isActive ? "#1C1714" : "rgba(28,23,20,0.45)",
                letterSpacing: -0.1,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickCoachBoard({
  response,
  phoneme,
}: {
  response: TutorResponse;
  phoneme: string;
}) {
  const [mouthView, setMouthView] = useState<"side" | "front">("side");

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "800", color: COLORS.gold, letterSpacing: 1.2 }}>
        QUICK COACH
      </Text>
      <Text style={{ marginTop: 8, fontSize: 20, lineHeight: 26, fontWeight: "800", color: COLORS.text }}>
        {response.naturalPhrase}
      </Text>
      {response.phonetic ? (
        <Text style={{ marginTop: 3, fontSize: 14, color: COLORS.textSub, fontStyle: "italic" }}>
          Say it like: {response.phonetic}
        </Text>
      ) : null}

      <View style={{ marginTop: 14 }}>
        <View
          style={{
            flexDirection: "row",
            alignSelf: "flex-start",
            backgroundColor: COLORS.surface2,
            borderRadius: 12,
            padding: 3,
            marginBottom: 10,
          }}
        >
          {(["side", "front"] as const).map((view) => {
            const active = mouthView === view;
            return (
              <Pressable
                key={view}
                onPress={() => setMouthView(view)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 9,
                  backgroundColor: active ? COLORS.surface : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: active ? COLORS.text : COLORS.textMuted,
                  }}
                >
                  {view === "side" ? "Side" : "Front"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View
          style={{
            width: 140,
            minHeight: 154,
            borderRadius: 18,
            backgroundColor: "rgba(245, 243, 239, 0.85)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AnimatedMouth
            phoneme={phoneme}
            view={mouthView}
            size={130}
            playing={false}
            showControls={false}
            labelsDefault
          />
        </View>
        <View style={{ flex: 1, gap: 9 }}>
          <CoachStep
            n="1"
            title="How you say it"
            text={response.context || response.literalMeaning || "Use this when you want the natural phrase, not a textbook translation."}
          />
          <CoachStep
            n="2"
            title="Say this"
            text={response.pronunciationTip || response.repeatPrompt || "Repeat it slowly once, then say it at normal speed."}
          />
          <CoachStep
            n="3"
            title="Mouth position"
            text={response.articulation?.tonguePlacement || "Match the mouth shape first, then add the voice."}
          />
        </View>
      </View>
    </View>
  );
}

function CoachStep({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: COLORS.goldLight,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 1,
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "800", color: COLORS.gold }}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: COLORS.text, letterSpacing: 0.3 }}>
          {title}
        </Text>
        <Text style={{ marginTop: 1, fontSize: 12, color: COLORS.textSub, lineHeight: 17 }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TrainScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mode?: string;
    scenario?: string;
    lessonTitle?: string;
  }>();

  // Initial mode from route params — Home/Plan deep-link into "quick", "tutor"
  // or "drill" so the user lands exactly where they tapped.
  const initialMode: TrainMode =
    params.mode === "phrase" ? "phrase" : "quick";

  // Plan tab supplies a per-lesson scenario + human title so the tutor theme
  // and progress bar match what the user tapped.
  const routeScenario = typeof params.scenario === "string" ? params.scenario : "";
  const routeLessonTitle = typeof params.lessonTitle === "string" ? params.lessonTitle : "";
  const [mode, setMode] = useState<TrainMode>(initialMode);
  const [languageCode, setLanguageCode] = useState("fr");
  const [aiState, setAiState] = useState<AIState>("idle");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [lastUserText, setLastUserText] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [reachOpen, setReachOpen] = useState(false);
  const [pronOpen, setPronOpen] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [conversationActive, setConversationActive] = useState(false);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [mastery, setMastery] = useState<MasteryBannerData | null>(null);
  const [lessonComplete, setLessonComplete] = useState<{
    title: string;
    subtitle: string;
    accuracy?: number;
    homework?: HomeworkItem[];
    homeworkId?: string;
  } | null>(null);
  const [playingUserAudio, setPlayingUserAudio] = useState(false);
  // Incremented by useFocusEffect to re-trigger the auto-intro effect when
  // the user navigates back to Lesson mode from another screen (e.g. after
  // a local model error that reset autoIntroFired.current to false).
  const [introFocusTick, setIntroFocusTick] = useState(0);
  const [voiceRate, setVoiceRate] = useState<VoiceRate>(1.0);
  const [quickReady, setQuickReady] = useState(true); // always ready — speech stays on-device
  const [isTypingFocused, setIsTypingFocused] = useState(false);
  // Mirror the UI-level rate into the audio module every time it changes so
  // subsequent calls to playTutorAudio / speakOffline inherit it.
  useEffect(() => { setTutorPlaybackRate(voiceRate); }, [voiceRate]);
  const lessonStartTs = useRef<number>(0);
  const turnScores = useRef<number[]>([]);
  const [micMuted, setMicMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const micMutedRef = useRef(false);
  useEffect(() => { micMutedRef.current = micMuted; }, [micMuted]);
  const lastUserAudioUri = useRef<string | null>(null);
  const aiStateRef = useRef<AIState>("idle");
  const conversationActiveRef = useRef(false);
  const orbBusyRef = useRef(false);
  useEffect(() => { aiStateRef.current = aiState; }, [aiState]);
  useEffect(() => { conversationActiveRef.current = conversationActive; }, [conversationActive]);

  // ── Phrase mode state (hoisted so hook count is stable across modes) ──
  const [phraseInput, setPhraseInput] = useState("");
  const [phraseSession, setPhraseSession] = useState<PhraseSession | null>(null);
  const [phraseLoading, setPhraseLoading] = useState(false);
  const [phraseAiState, setPhraseAiState] = useState<"idle" | "listening" | "scoring">("idle");
  const [phraseAttemptText, setPhraseAttemptText] = useState("");
  const [phraseFeedback, setPhraseFeedback] = useState<PronunciationFeedback | null>(null);
  const [phraseComplete, setPhraseComplete] = useState(false);
  const phraseSpeechRef = useRef<NativeSpeechSession | null>(null);
  const phraseOrbDebounceRef = useRef(false);
  const phraseScrollRef = useRef<ScrollView>(null);
  const [phraseMicLevel, setPhraseMicLevel] = useState(0);
  // Scenario test & coaching state
  const [scenarioAttemptText, setScenarioAttemptText] = useState("");
  const [scenarioFeedback, setScenarioFeedback] = useState<PronunciationFeedback | null>(null);
  const [phraseCoachingSpeaking, setPhraseCoachingSpeaking] = useState(false);
  const [skillUnlockVisible, setSkillUnlockVisible] = useState(false);
  const [phraseXpEarned, setPhraseXpEarned] = useState(0);

  useEffect(() => {
    getUserProfile().then((p) => {
      setProfile(p);
      if (p.learningLanguage) {
        setLanguageCode(p.learningLanguage);
        // Pre-warm Apple's TTS engine for the target language so the first
        // spoken phrase doesn't have a 1-3s cold-start delay on simulator.
        prewarmOfflineTts(p.learningLanguage);
      }
    });
    // Pre-warm the Gemma GPU model so the first AI call is fast.
    // Fire-and-forget — failure is fine (stub will serve).
    chatWithGemma(
      [{ role: "user", content: "hi" }],
      { maxTokens: 1, temperature: 0 },
    ).catch(() => {});
  }, []);

  const sessionMemory = useRef<TutorSessionMemory>({ weakSounds: [], mistakes: [] });
  const attemptCount = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // Prevents the tutor auto-intro from firing more than once per Lesson mount.
  const autoIntroFired = useRef(false);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const nativeSpeechRef = useRef<NativeSpeechSession | null>(null);

  const language = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === languageCode) ?? SUPPORTED_LANGUAGES[0],
    [languageCode]
  );
  const nativeCode = profile?.knownLanguages?.[0] ?? "en";
  const tabBarClearance = 78 + Math.max(8, insets.bottom > 0 ? 6 : 10) + insets.bottom;
  const quickInputBottom = tabBarClearance + 10;
  const quickContentBottom = quickInputBottom + 76;

  // Tongue panel
  const tongueSlide = useSharedValue(120);
  const tongueOpacity = useSharedValue(0);
  const normalizedMode = normalizeMode(mode);
  // Quick Mode is hard-offline — never ping the API for it. Tutor / Drill
  // only use this for non-LLM network status UI.
  const online = useOnlineStatus({ enabled: normalizedMode !== "quick" });
  const switchTrainMode = useCallback((nextMode: TrainMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
  }, [mode]);
  const showPronunciation = !!response?.articulation?.tonguePlacement;
  useEffect(() => {
    if (showPronunciation) {
      tongueSlide.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) });
      tongueOpacity.value = withTiming(1, { duration: 280 });
    } else {
      tongueSlide.value = withTiming(120, { duration: 260, easing: Easing.in(Easing.quad) });
      tongueOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showPronunciation]);
  const tongueStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tongueSlide.value }],
    opacity: tongueOpacity.value,
  }));

  // Reset session when mode or language changes
  useEffect(() => {
    sessionMemory.current = { weakSounds: [], mistakes: [] };
    attemptCount.current = 0;
    autoIntroFired.current = false;    // allow auto-intro on fresh mount
    setResponse(null);
    setLastUserText("");
    setExpanded(false);
    setSaved(false);
    setConversationActive(false);
    setLessonComplete(null);
    turnScores.current = [];
    lessonStartTs.current = 0;
    recorderRef.current?.cancel().catch(() => {});
    recorderRef.current = null;

    setLessonProgress(null);

    // (Drill mode removed — merged into Lesson/tutor flow)
  }, [mode, language.code, profile?.scenario]);

  // ── Tutor round trip ──────────────────────────────────────────────────────

  const runTutor = useCallback(
    async (userText: string) => {
      // ── Input validation ──────────────────────────────────────────────
      const { ok, clean, reason } = validateUserText(userText);
      console.log(`[input] RECEIVED len=${userText?.length ?? 0} firstChars=${(userText || "").slice(0, 30)}`);
      if (!ok) {
        console.log(`[input] REJECTED reason=${reason}`);
        setLastUserText(reason || "Type something first.");
        return;
      }

      // Quick Mode no longer renders the result inline — it hands off to the
      // dedicated Quick Session screen, which behaves like a mini tutor
      // session (question + key-concept card + tongue placement + live
      // transcript + orb). The Speak tab just captures input and navigates.
      if (normalizedMode === "quick") {
        if (!clean) return;
        // Clear the listening flags so the auto-restart loop doesn't fire
        // while the user is reading their session. Reset local Quick UI.
        conversationActiveRef.current = false;
        setConversationActive(false);
        setAiState("idle");
        setLastUserText("");
        setTypedInput("");
        router.push({
          pathname: "/quick-session",
          params: {
            phrase: clean,
            learnLang: language.code,
            nativeLang: nativeCode,
          },
        });
        return;
      }

      setAiState("thinking");
      setSaved(false);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const req: TutorRequest = {
        mode: toApiMode(mode),
        text: clean,
        languageCode: language.code,
        nativeLanguageCode: nativeCode,
        scenario: routeScenario || profile?.scenario || "everyday conversation",
        tutorStyle: profile?.tutorStyle,
        commitment: profile?.commitment,
        attemptTranscript: clean || undefined,
        expectedPhrase: sessionMemory.current.currentPhrase,
        sessionMemory: sessionMemory.current,
        includeAudio: false,
      };

      try {
        const res = await postTutorSession(req, { signal: abortRef.current.signal });
        setResponse(res);

        // Update session memory
        if (res.naturalPhrase) sessionMemory.current.currentPhrase = res.naturalPhrase;
        if (res.articulation?.tonguePlacement) {
          const m = res.correctionLine?.match(/['"]([^'"]{1,6})['"]/);
          if (m) {
            sessionMemory.current.weakSounds = Array.from(
              new Set([...(sessionMemory.current.weakSounds || []), m[1]])
            ).slice(0, 6);
            await addWeakSound(m[1]);
          }
        }

        // Record attempt for progress
        attemptCount.current += 1;
        const score = scoreFromResponse(res);
        turnScores.current = [...turnScores.current, score].slice(-12);
        await recordAttempt({
          languageCode: language.code,
          phrase: res.naturalPhrase || userText,
          score,
          mode: toApiMode(mode) === "train" ? "train" : "quick-ask",
        });

        // Auto-save every response so the audio + phrase are available
        // offline right away — no manual step, no dropped attempts.
        try {
          const correctionMatch =
            res.correctionLine?.match(/['"]([^'"]{1,5})['"]/) ||
            res.pronunciationTip?.match(/['"]([^'"]{1,5})['"]/);
          await savePhrase({
            languageCode: language.code,
            phrase: res.naturalPhrase,
            phonetic: res.phonetic,
            meaning: res.context || res.literalMeaning,
            tip: res.pronunciationTip,
            audioBase64: res.audioBase64,
            audioMimeType: res.audioMimeType,
            userAudioUri: lastUserAudioUri.current ?? undefined,
            tonguePlacement: res.articulation?.tonguePlacement,
            lipShape: res.articulation?.lipShape,
            phoneme: correctionMatch?.[1],
          });
          setSaved(true);
        } catch {
          /* library save is best-effort — we already have the response on screen */
        }

        // Mastery tracking (category-level). Fires a motivational banner
        // the first time the learner crosses the mastery threshold.
        try {
          const outcome = await recordMasteryAttempt(
            language.code,
            res.naturalPhrase || userText,
            score
          );
          if (outcome.celebrated) {
            setMastery({
              title: `You've learned ${outcome.categoryLabel}.`,
              subtitle: `Avg ${outcome.average}% across ${outcome.sampleCount} tries — keep going.`,
              icon: outcome.categoryIcon as any,
            });
          }
        } catch {
          /* mastery is a nice-to-have — failures here shouldn't break the tutor */
        }

        // (Lesson progress bar removed — tutor mode deleted)

        // (Drill record removed — drill merged into tutor)

        // Speak
        await playTutorAudio(
          {
            audioBase64: res.audioBase64,
            audioMimeType: res.audioMimeType,
            audioSegments: res.audioSegments,
            fallbackText: res.audioText || res.naturalPhrase,
            languageCode: language.code,
            nativeLanguageCode: nativeCode,
          },
          {
            onStart: () => setAiState("speaking"),
            onEnd: () => setAiState("idle"),
            onError: () => setAiState("idle"),
          }
        );
      } catch (err: any) {
        setAiState("idle");
        const msg = err?.message || "Couldn't generate a response. Try again.";
        console.error("[runTutor] ERROR:", msg);
        // Inline error — no popup spam. Show once via lastUserText.
        if (err?.status === 401) {
          setLastUserText("AI is warming up. Try again in a moment.");
        } else if (err?.missingKeys?.length) {
          setLastUserText("AI model is loading. Please wait.");
        } else {
          setLastUserText(msg);
        }
        // In tutor/conversation mode, keep conversation alive so the auto-restart
        // picks up. In quick mode (one-shot), end it.
        if (mode === "quick") {
          conversationActiveRef.current = false;
          setConversationActive(false);
        }
        // Otherwise leave conversationActive=true so the user can keep talking
      }
    },
    [mode, language.code, nativeCode, profile, routeScenario, normalizedMode]
  );

  // ── Mic logic ─────────────────────────────────────────────────────────────
  // One tap on the orb starts listening. Silence for ~1.2s auto-stops, runs
  // STT → tutor. Playback ends → if conversation is active, auto-restart.
  // Tap again during listening/speaking to interrupt.

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeningTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechStartedAt = useRef<number>(0);
  const meteringUnsub = useRef<(() => void) | null>(null);

  // Clear ONLY the silence timer. The listening hard-cap stays armed until
  // the recording actually finishes — otherwise a single false-positive
  // metering blip wipes the safety net and the orb hangs forever.
  const clearVadTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  // Cleared when the recording is actually finalized (success or error).
  const clearListeningTimeout = useCallback(() => {
    if (listeningTimeout.current) {
      clearTimeout(listeningTimeout.current);
      listeningTimeout.current = null;
    }
  }, []);

  const finishListeningAndTranscribe = useCallback(async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    clearVadTimer();
    clearListeningTimeout();
    meteringUnsub.current?.();
    meteringUnsub.current = null;
    if (!rec) {
      setAiState("idle");
      return;
    }
    setAiState("thinking");
    try {
      const audio = await rec.stop();
      // Too short or silent — not an error, just prompt the user so they
      // don't sit there wondering why nothing happened.
      if (!audio || !audio.audioBase64 || audio.durationMs < 300) {
        conversationActiveRef.current = false;
        setConversationActive(false);
        setLastUserText("(I didn't catch anything — try again)");
        setAiState("idle");
        return;
      }
      lastUserAudioUri.current = audio.uri;
      // In Tutor mode the user might naturally start in their NATIVE language
      // ("how do I say hello?"). Send the target language as the primary, the
      // native language as a fallback so the server retries when the first
      // pass returns nothing — this fixes "I can't hear you" on bilingual
      // turns.
      const primary = mode === "quick" ? nativeCode : language.code;
      const fallback = mode === "quick" ? language.code : nativeCode;
      const { text } = await transcribeAudio({
        audioBase64: audio.audioBase64,
        mimeType: audio.mimeType,
        languageCode: primary,
        fallbackLanguageCode: fallback,
        preferredProvider: undefined,
      });
      if (!text.trim()) {
        conversationActiveRef.current = false;
        setConversationActive(false);
        setLastUserText("(I heard something but couldn't make it out — say it a bit louder)");
        setAiState("idle");
        return;
      }
      setLastUserText(text);
      await runTutor(text);
    } catch (err: any) {
      conversationActiveRef.current = false;
      setConversationActive(false);
      setAiState("idle");
      if (err instanceof SpeechPermissionError && err.canOpenSettings) {
        Alert.alert("Microphone Access", "UseLang needs microphone access to practice speaking.", [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]);
      } else if (err?.status === 401) {
        Alert.alert("Sign In Required", "Please sign in to use transcription.", [{ text: "OK" }]);
      } else {
        setLastUserText(err?.message || "Couldn't transcribe — try again.");
      }
    }
  }, [mode, language.code, nativeCode, runTutor, clearVadTimer, clearListeningTimeout]);

  const beginListening = useCallback(async () => {
    // Guard: never start listening when the user has ended the conversation.
    // Without this check a delayed auto-restart can fire after End is tapped.
    if (!conversationActiveRef.current) return;
    try {
      const handle = await startRecording();
      recorderRef.current = handle;
      speechStartedAt.current = 0;
      setAiState("listening");
      listeningTimeout.current = setTimeout(() => {
        listeningTimeout.current = null;
        if (recorderRef.current) finishListeningAndTranscribe();
      }, LISTENING_TIMEOUT_MS);
      // VAD: watch metering and auto-stop after VAD_SILENCE_MS of silence,
      // but only after we've heard real speech for at least VAD_MIN_SPEECH_MS.
      meteringUnsub.current = handle.onMetering((db) => {
        const now = Date.now();
        // Translate the raw dB value (~-60 silence to 0 loud) into a 0..1
        // normalized level the orb can react to visually.
        const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
        setMicLevel(normalized);
        const speaking = db > VAD_SILENCE_DB;
        if (speaking) {
          if (!speechStartedAt.current) speechStartedAt.current = now;
          clearVadTimer();
          return;
        }
        const hasHeardSpeech =
          speechStartedAt.current > 0 && now - speechStartedAt.current > VAD_MIN_SPEECH_MS;
        if (!hasHeardSpeech) return;
        if (silenceTimer.current) return;
        silenceTimer.current = setTimeout(() => {
          silenceTimer.current = null;
          if (recorderRef.current) finishListeningAndTranscribe();
        }, VAD_SILENCE_MS);
      });
    } catch (err: any) {
      setConversationActive(false);
      if (err instanceof SpeechPermissionError && err.canOpenSettings) {
        Alert.alert(
          "Microphone Access",
          "UseLang needs microphone access to practice speaking. Please allow it in Settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ],
        );
      } else if (err instanceof SpeechPermissionError) {
        Alert.alert("Microphone Access", err.message, [{ text: "OK" }]);
      } else {
        Alert.alert("Speech Error", err?.message || "Microphone unavailable. Please try again.", [
          { text: "Try Again", onPress: () => beginNativeListening() },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    }
  }, [clearVadTimer, finishListeningAndTranscribe]);

  // ── Deepgram transcription path ─────────────────────────────────────────
  // Called when VAD detects silence or hard timeout fires during the online
  // recording path. Records audio → sends to Deepgram backend → processes.
  const finishDeepgramTranscribe = useCallback(async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    clearVadTimer();
    if (listeningTimeout.current) {
      clearTimeout(listeningTimeout.current);
      listeningTimeout.current = null;
    }
    meteringUnsub.current?.();
    meteringUnsub.current = null;
    if (!rec) {
      setAiState("idle");
      return;
    }
    setAiState("thinking");
    try {
      const audio = await rec.stop();
      if (!audio || !audio.audioBase64 || audio.durationMs < 300) {
        setLastUserText("Didn't catch that — try again.");
        setAiState("idle");
        return;
      }
      lastUserAudioUri.current = audio.uri;
      const primary = mode === "quick" ? nativeCode : language.code;
      const fallback = mode === "quick" ? language.code : nativeCode;

      console.log("[stt-route] Sending audio to Deepgram…");
      let result: { text: string; provider?: string };
      try {
        result = await transcribeAudio({
          audioBase64: audio.audioBase64,
          mimeType: audio.mimeType,
          languageCode: primary,
          fallbackLanguageCode: fallback,
          preferredProvider: "deepgram",
        });
        console.log(`[stt-route] DEEPGRAM RESULT: "${result.text.slice(0, 80)}" provider=${result.provider}`);
      } catch (deepgramErr: any) {
        // Deepgram failed → retry once
        console.warn("[stt-route] Deepgram attempt 1 failed:", deepgramErr?.message);
        try {
          result = await transcribeAudio({
            audioBase64: audio.audioBase64,
            mimeType: audio.mimeType,
            languageCode: primary,
            fallbackLanguageCode: fallback,
            preferredProvider: "deepgram",
          });
          console.log(`[stt-route] DEEPGRAM RETRY OK: "${result.text.slice(0, 80)}"`);
        } catch (retryErr: any) {
          console.error("[stt-route] Deepgram retry failed:", retryErr?.message);
          setLastUserText("Transcription failed — try again or check your connection.");
          setAiState("idle");
          return;
        }
      }

      const clean = result.text.trim();
      if (!clean) {
        setLastUserText("Didn't catch that — try again.");
        setAiState("idle");
        return;
      }
      // Truncate
      const words = clean.split(/\s+/);
      const truncated = words.length > MAX_TRANSCRIPT_WORDS
        ? words.slice(0, MAX_TRANSCRIPT_WORDS).join(" ")
        : clean;
      console.log(`[stt-route] FINAL TRANSCRIPT len=${words.length} text="${truncated.slice(0, 80)}"`);
      setLastUserText(truncated);
      await runTutor(truncated);
    } catch (err: any) {
      console.error("[stt-route] finishDeepgramTranscribe FAILED:", err?.message);
      setAiState("idle");
      if (err instanceof SpeechPermissionError && err.canOpenSettings) {
        Alert.alert("Microphone Access", "UseLang needs microphone access to practice speaking.", [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ]);
      } else {
        setLastUserText(err?.message || "Couldn't transcribe — try again.");
      }
    }
  }, [mode, language.code, nativeCode, runTutor, clearVadTimer]);

  const beginNativeListening = useCallback(async () => {
    if (!conversationActiveRef.current) return;
    const primary = mode === "quick" ? nativeCode : language.code;
    const fallback = mode === "quick" ? language.code : nativeCode;
    setAiState("listening");
    setLastUserText("");

    // ── STT routing: online → Deepgram (via cloud API), offline → on-device ──
    const isCurrentlyOnline = online.state === "online";
    console.log(`[stt-route] ${isCurrentlyOnline ? "USING DEEPGRAM STT (online)" : "USING OFFLINE STT (on-device)"}`);

    try {
      let transcriptText = "";

      if (isCurrentlyOnline && normalizedMode !== "quick") {
        // ── Online path: record audio → send to Deepgram via backend ──
        console.log("[stt-route] Starting audio recording for Deepgram…");
        const handle = await startRecording();
        recorderRef.current = handle;
        setAiState("listening");

        // Set up VAD metering for visual feedback + silence detection
        speechStartedAt.current = 0;
        const vadUnsub = handle.onMetering((db) => {
          const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
          setMicLevel(normalized);
          const speaking = db > VAD_SILENCE_DB;
          if (speaking) {
            if (!speechStartedAt.current) speechStartedAt.current = Date.now();
            clearVadTimer();
            return;
          }
          const hasHeardSpeech =
            speechStartedAt.current > 0 && Date.now() - speechStartedAt.current > VAD_MIN_SPEECH_MS;
          if (!hasHeardSpeech) return;
          if (silenceTimer.current) return;
          silenceTimer.current = setTimeout(() => {
            silenceTimer.current = null;
            if (recorderRef.current) finishDeepgramTranscribe();
          }, VAD_SILENCE_MS);
        });
        meteringUnsub.current = vadUnsub;

        // Hard timeout
        listeningTimeout.current = setTimeout(() => {
          listeningTimeout.current = null;
          if (recorderRef.current) finishDeepgramTranscribe();
        }, LISTENING_TIMEOUT_MS);

        // Wait for finishDeepgramTranscribe to be called by VAD or timeout
        // (we return here — the flow continues in finishDeepgramTranscribe)
        return;
      }

      // ── Offline path: native on-device speech recognition ──
      console.log("[stt-route] Using on-device recognition…");
      transcriptText = await recognizeSpeechOnce({
        languageCode: primary,
        fallbackLanguageCode: fallback,
        requiresOnDevice: true,
        timeoutMs: LISTENING_TIMEOUT_MS,
        onPartial: setLastUserText,
        onVolume: setMicLevel,
        onSession: (session) => {
          nativeSpeechRef.current = session;
        },
      });
      nativeSpeechRef.current = null;

      // ── Process transcript ──
      const clean = transcriptText.trim();
      if (!clean) {
        setLastUserText("Didn't catch that — try again.");
        setAiState("idle");
        return;
      }
      // Truncate very long transcripts to prevent crashes
      const words = clean.split(/\s+/);
      const truncated = words.length > MAX_TRANSCRIPT_WORDS
        ? words.slice(0, MAX_TRANSCRIPT_WORDS).join(" ")
        : clean;
      console.log(`[stt-route] TRANSCRIPT len=${words.length} text="${truncated.slice(0, 80)}"`);
      setLastUserText(truncated);
      await runTutor(truncated);
    } catch (err: any) {
      nativeSpeechRef.current = null;
      setAiState("idle");
      const msg = err?.message || "Couldn't start speech recognition. Try again.";
      console.error("[stt-route] FAILED:", msg);
      setLastUserText(msg);
    }
  }, [language.code, mode, nativeCode, normalizedMode, online.state, runTutor, clearVadTimer, finishDeepgramTranscribe]);

  const handleMicTap = useCallback(async () => {
    // ── Debounce: reject rapid duplicate taps ────────────────────────
    if (orbBusyRef.current) {
      console.log("[orb] BLOCKED reason=debounce");
      return;
    }
    orbBusyRef.current = true;
    console.log(`[orb] PRESSED state=${aiState}`);
    try {
      if (aiState === "speaking") {
        // Tap-while-speaking = stop the tutor AND end the session. Without
        // this, setting state to idle re-triggered the auto-restart effect
        // and the mic came right back on, which felt like "stop doesn't stop".
        conversationActiveRef.current = false;
        setConversationActive(false);
        await stopTutorAudio();
        setAiState("idle");
        return;
      }
      if (aiState === "thinking") {
        console.log("[orb] BLOCKED reason=thinking");
        return;
      }
      if (aiState === "listening") {
        if (nativeSpeechRef.current) {
          nativeSpeechRef.current.abort();
          nativeSpeechRef.current = null;
          conversationActiveRef.current = false;
          setConversationActive(false);
          setAiState("idle");
          return;
        }
        // User tapped to interrupt — stop recording early.
        await finishListeningAndTranscribe();
        return;
      }
      // Stop any active TTS before starting mic — prevents native audio conflict
      try { await stopTutorAudio(); } catch { /* swallow */ }
      try { await stopRoutedTts(); } catch { /* swallow */ }
      // Let the audio hardware fully settle before opening the mic.
      // 200ms was too short on some simulators; 500ms gives iOS enough time
      // to transition the audio session from playback → record mode.
      await new Promise(r => setTimeout(r, 500));

      conversationActiveRef.current = true;
      setConversationActive(true);
      await beginNativeListening();
      if (normalizedMode === "quick") {
        conversationActiveRef.current = false;
        setConversationActive(false);
      }
    } catch (err: any) {
      console.error("[orb] handleMicTap FAILED:", err?.message || err);
      conversationActiveRef.current = false;
      setConversationActive(false);
      setAiState("idle");
      setLastUserText("Something went wrong, try again.");
    } finally {
      orbBusyRef.current = false;
    }
  }, [aiState, beginNativeListening, finishListeningAndTranscribe, normalizedMode]);

  // Auto-restart the mic after the tutor finishes speaking, so the user can
  // just reply without touching the screen. Skipped for Quick Mode (one-shot).
  useEffect(() => {
    if (normalizedMode === "quick") return;  // Quick is one-shot, never auto-loops
    if (aiState !== "idle") return;
    if (!conversationActiveRef.current) return;
    if (micMutedRef.current) return;
    if (recorderRef.current) return;
    const id = setTimeout(() => {
      if (
        aiStateRef.current === "idle" &&
        conversationActiveRef.current &&
        !micMutedRef.current
      ) {
        beginNativeListening();
      }
    }, 350);
    return () => clearTimeout(id);
  }, [aiState, beginNativeListening, micMuted, normalizedMode]);

  // Cleanup on unmount — stop ALL audio/speech so session doesn't keep talking
  useEffect(() => {
    return () => {
      conversationActiveRef.current = false;
      clearVadTimer();
      meteringUnsub.current?.();
      nativeSpeechRef.current?.abort();
      recorderRef.current?.cancel().catch(() => {});
      stopTutorAudio().catch(() => {});
      stopRoutedTts().catch(() => {});
    };
  }, [clearVadTimer]);

  // ── Auto-intro for Lesson (tutor) mode ─────────────────────────────────────
  // When the user opens Lesson mode, the tutor speaks first without requiring
  // any tap — just like a real teacher who says hello and explains what's today.
  // Fires once per session; reset happens in the mode/language effect OR via
  // useFocusEffect when the screen regains focus while still empty/idle.

  // Re-arm the intro whenever the Lesson screen comes into focus and there's
  // no content yet (e.g. navigated back after a local model error). If there's already
  // an active conversation or a response on screen, leave it alone.
  useFocusEffect(
    useCallback(() => {
      if (false && !response && !conversationActiveRef.current) {
        autoIntroFired.current = false;
        setIntroFocusTick((t) => t + 1);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [normalizedMode, response])
  );

  useEffect(() => {
    return; // tutor auto-intro disabled
    // Lesson mode is currently a "coming soon" placeholder — don't burn an
    // local model turn on the auto-intro until the structured-lesson UI is back.
    return;
    // eslint-disable-next-line no-unreachable
    if (autoIntroFired.current) return;   // only fire once per arm cycle
    autoIntroFired.current = true;

    // Mark conversation active so the auto-restart loop starts after the
    // tutor finishes speaking its intro.
    conversationActiveRef.current = true;
    setConversationActive(true);

    // Small delay so the screen finishes rendering before we start the
    // "thinking" state (feels less jarring than instant).
    const id = setTimeout(() => {
      runTutor("").catch(() => {
        conversationActiveRef.current = false;
        setConversationActive(false);
        autoIntroFired.current = false;
      });
    }, 600);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedMode, profile, introFocusTick]);

  // ── Usage meter ─────────────────────────────────────────────
  // While the tutor is actively engaged (listening / thinking / speaking) we
  // count seconds toward today's quota. Drives the meter on the Progress tab
  // and the Free / Trial / Pro plan gating.
  useEffect(() => {
    if (aiState === "idle" || aiState === "blocked") return;
    const id = setInterval(() => {
      addTutorSeconds(1).catch(() => {
        /* best-effort — storage hiccups don't affect the session */
      });
    }, 1000);
    return () => clearInterval(id);
  }, [aiState]);

  // ── Lesson auto-kick — DISABLED ──────────────────────────────────────────
  // Lesson mode now shows a "coming soon" placeholder, and Quick mode is a
  // pure manual experience: the user types or taps the orb. Auto-firing
  // runTutor with an intro template would (a) navigate Quick mode straight
  // to /quick-session with the system-prompt as the question, and (b)
  // pre-empt Lesson mode's own auto-intro effect. Neither is desired.
  // Keeping the ref so any reactivation in the future has a stable identity.
  const kickedRef = useRef<string>("");
  void kickedRef; // keep ref alive; auto-kick disabled

  // ── Playback re-trigger ───────────────────────────────────────────────────

  const replay = useCallback(async () => {
    if (!response) return;
    if (aiState === "speaking") {
      await stopTutorAudio();
      setAiState("idle");
      return;
    }
    await playTutorAudio(
      {
        audioBase64: response.audioBase64,
        audioMimeType: response.audioMimeType,
        audioSegments: response.audioSegments,
        fallbackText: response.audioText || response.naturalPhrase,
        languageCode: language.code,
        
      },
      {
        onStart: () => setAiState("speaking"),
        onEnd: () => setAiState("idle"),
        onError: () => setAiState("idle"),
      }
    );
  }, [response, aiState, language.code]);

  // ── Voice-speed verb pills ─────────────────────────────────────────────────
  // "Slower": one-off 0.75× replay without changing the persisted rate.
  const repeatSlower = useCallback(async () => {
    if (!response) return;
    await stopTutorAudio();
    await playTutorAudio(
      {
        audioBase64: response.audioBase64,
        audioMimeType: response.audioMimeType,
        audioSegments: response.audioSegments,
        fallbackText: response.audioText || response.naturalPhrase,
        languageCode: language.code,
        
      },
      {
        rate: 1.0,
        onStart: () => setAiState("speaking"),
        onEnd: () => setAiState("idle"),
        onError: () => setAiState("idle"),
      }
    );
  }, [response, language.code]);

  // "Syllables": rebuild the phrase with hyphen separators from the phonetic
  // guide (the tutor already returns it) then speak it slowly so each syllable
  // lands clearly. Falls back to the natural phrase if no phonetic hint.
  const breakSyllables = useCallback(async () => {
    if (!response) return;
    const source = response.phonetic || response.naturalPhrase;
    const syllabified = source
      .replace(/[-_·]/g, " ")
      .split(/(\s+)/)
      .map((chunk) => (chunk.trim() ? chunk.split("").join("·") : chunk))
      .join("");
    await stopTutorAudio();
    await playTutorAudio(
      {
        audioBase64: null, // force offline TTS so we speak the syllabified form
        fallbackText: syllabified,
        languageCode: language.code,
        
      },
      {
        rate: 0.65,
        onStart: () => setAiState("speaking"),
        onEnd: () => setAiState("idle"),
        onError: () => setAiState("idle"),
      }
    );
  }, [response, language.code]);

  // "Native": 1.5× replay of the original tutor audio.
  const repeatNative = useCallback(async () => {
    if (!response) return;
    // "Native speed" = natural 1.0 pace so it sounds like a real speaker.
    // The old 1.5x rate was actually FASTER and caused crashes on some iOS
      // versions. We use device TTS for all core tutor audio.
    try {
      await stopTutorAudio();
      const text = response.naturalPhrase || response.audioText;
      if (!text) return;
      await playTutorAudio(
        {
          audioBase64: response.audioBase64,
          audioMimeType: response.audioMimeType,
          audioSegments: response.audioSegments,
          fallbackText: text,
          languageCode: language.code,
          
        },
        {
          rate: 1.0,
          onStart: () => setAiState("speaking"),
          onEnd: () => setAiState("idle"),
          onError: () => setAiState("idle"),
        }
      );
    } catch {
      setAiState("idle");
    }
  }, [response, language.code]);

  // "Compare": play the user's last attempt at natural speed.
  const compareMyVoice = useCallback(async () => {
    const uri = lastUserAudioUri.current;
    if (!uri) return;
    await stopTutorAudio();
    await playUserAudio(uri, {
      onStart: () => setPlayingUserAudio(true),
      onEnd: () => setPlayingUserAudio(false),
      onError: () => setPlayingUserAudio(false),
    });
  }, []);

  // Manual re-download — auto-save runs on every turn, but the button is
  // still useful as a "make sure the latest attempt's user-voice is
  // attached" action (in case the user said it again while the card was
  // already on screen).
  const downloadPhrase = useCallback(async () => {
    if (!response) return;
    const m = response.correctionLine?.match(/['"]([^'"]{1,5})['"]/) ||
              response.pronunciationTip?.match(/['"]([^'"]{1,5})['"]/);
    await savePhrase({
      languageCode: language.code,
      phrase: response.naturalPhrase,
      phonetic: response.phonetic,
      meaning: response.context || response.literalMeaning,
      tip: response.pronunciationTip,
      audioBase64: response.audioBase64,
      audioMimeType: response.audioMimeType,
      userAudioUri: lastUserAudioUri.current ?? undefined,
      tonguePlacement: response.articulation?.tonguePlacement,
      lipShape: response.articulation?.lipShape,
      phoneme: m?.[1],
    });
    setSaved(true);
  }, [response, language.code]);

  // Play back the user's own recorded attempt.
  const playUserTake = useCallback(async () => {
    const uri = lastUserAudioUri.current;
    if (!uri) return;
    if (playingUserAudio) {
      await stopTutorAudio();
      setPlayingUserAudio(false);
      return;
    }
    await playUserAudio(uri, {
      onStart: () => setPlayingUserAudio(true),
      onEnd: () => setPlayingUserAudio(false),
      onError: () => setPlayingUserAudio(false),
    });
  }, [playingUserAudio]);

  // Typed question submit (Quick mode)
  const submitTyped = useCallback(async () => {
    const { ok, clean, reason } = validateUserText(typedInput);
    if (!ok) {
      setLastUserText(reason || "Type something first.");
      return;
    }
    setTypedInput("");
    setLastUserText(clean);
    lastUserAudioUri.current = null;
    try {
      await runTutor(clean);
    } catch (err: any) {
      console.error("[submitTyped] FAILED:", err?.message || err);
      setAiState("idle");
      setLastUserText("Something went wrong, try again.");
    }
  }, [typedInput, runTutor]);

  // Share the coached phrase + phonetic + tip. Uses native Share so the
  // user can send it to Notes / iMessage / WhatsApp / email — easier than a
  // bespoke export format and works on iOS + Android out of the box.
  const shareCurrentPhrase = useCallback(async () => {
    if (!response || !response.naturalPhrase) return;
    const parts = [
      response.naturalPhrase,
      response.phonetic ? `[${response.phonetic}]` : "",
      response.context || response.literalMeaning,
      response.pronunciationTip ? `Tip: ${response.pronunciationTip}` : "",
      "— via Lang",
    ].filter(Boolean);
    try {
      await Share.share({ message: parts.join("\n") });
    } catch {
      /* user cancelled — nothing to do */
    }
  }, [response]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isWaveActive = aiState === "listening" || aiState === "speaking";
  const phoneme = useMemo(() => {
    const m = response?.correctionLine?.match(/['"]([^'"]{1,5})['"]/);
    return m?.[1] ?? "r";
  }, [response?.correctionLine]);

  // ── Quick Mode — entry screen ─────────────────────────────────────────────
  // This is the "start here" screen. The Speak tab opens straight to it.
  // It has three input modalities — prompt cards, the type pill, the orb —
  // all of which navigate to /quick-session, where the actual coaching
  // happens. This screen NEVER renders coaching content itself.
  //
  // Visual: warm peach top → soft sky blue bottom gradient, centered language
  // pill, big italic-accent headline, three prompt cards, blue glass orb,
  // floating type pill at the bottom. Lesson is parked behind a separate
  // route (we do NOT show a Lesson toggle here while the structured-lesson
  // flow is unfinished).
  if (normalizedMode === "quick") {
    const ENTRY_ORB = Math.min(SW * 0.40, 158);

    const QUICK_PROMPTS = [
      { emoji: "\u{1F35D}", text: "Order food at a restaurant" },
      { emoji: "\u{1F9ED}", text: "Ask for directions" },
      { emoji: "\u{1F44B}", text: "Introduce yourself" },
    ] as const;

    const goToQuickSession = (phrase: string) => {
      const trimmed = phrase.trim();
      if (!trimmed) return;
      // Stop any TTS that's still playing to prevent dual-voice crash
      stopRoutedTts().catch(() => {});
      conversationActiveRef.current = false;
      setConversationActive(false);
      setAiState("idle");
      setLastUserText("");
      setTypedInput("");
      router.push({
        pathname: "/quick-session",
        params: { phrase: trimmed, learnLang: language.code, nativeLang: nativeCode },
      });
    };

    const FLAG: Record<string, string> = { fr: "\u{1F1EB}\u{1F1F7}", es: "\u{1F1EA}\u{1F1F8}", zh: "\u{1F1E8}\u{1F1F3}" };
    const DIALECT: Record<string, string> = { fr: "European", es: "Mexican", zh: "Mandarin" };

    // Floating tab bar: bottom = insets.bottom + 10, height = 68.
    // Add 14px breathing room above it.
    const TAB_CLEARANCE = insets.bottom + 10 + 68 + 14;
    const ENTRY_ORB_SIZE = Math.min(SW * 0.33, 120);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8E4CB" }} edges={["top"]}>

        {/* ── Full-screen peach → sky gradient ── */}
        <Svg width={SW} height={SH} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            <SvgLinearGradient id="spkBg" x1="0" y1="0" x2="0" y2={SH} gradientUnits="userSpaceOnUse">
              <Stop offset="0"    stopColor="#F8E4CB" stopOpacity="1" />
              <Stop offset="0.38" stopColor="#F2DCC5" stopOpacity="1" />
              <Stop offset="0.68" stopColor="#D8E6F2" stopOpacity="1" />
              <Stop offset="1"    stopColor="#C9DEEF" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SW} height={SH} fill="url(#spkBg)" />
        </Svg>

        {/* ── Header: language pill + mode switcher ── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
          <Pressable
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            hitSlop={12}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingVertical: 8, paddingHorizontal: 14,
              borderRadius: 99, backgroundColor: "rgba(255,255,255,0.80)",
              borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 18 }}>{FLAG[language.code] ?? "\u{1F310}"}</Text>
            <Text style={{ fontSize: 14, fontFamily: "Geist-Bold", color: "#1C1714", letterSpacing: -0.2 }}>
              {language.label}
            </Text>
            <Ionicons name="chevron-down" size={11} color="rgba(28,23,20,0.45)" />
          </Pressable>
          <ModeSwitcher
            active="quick"
            onChange={(next) => {
              if (next === "quick") return;
              setMode(next);
              router.setParams({ mode: next });
            }}
          />
        </View>

        {/* ── FIXED layout — main content never moves when keyboard opens ── */}
        <View style={{ flex: 1, paddingHorizontal: 22 }}>

          {/* Headline block */}
          <View style={{ paddingTop: 8 }}>
            <Text style={{
              fontSize: 26, lineHeight: 32,
              fontFamily: "Geist-Bold", fontWeight: "800",
              color: "#1C1714", letterSpacing: -0.9,
            }}>
              {"What do you want to\nlearn to say "}
              <Text style={{ fontFamily: "Fraunces-Italic", fontWeight: "700", fontSize: 26 }}>today</Text>
              {"?"}
            </Text>
            <Text style={{
              marginTop: 4, fontSize: 13, lineHeight: 18,
              fontFamily: "Geist-Regular", color: "rgba(28,23,20,0.55)",
            }}>
              Tap a prompt, type below, or hold the orb to speak.
            </Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 0.2 }} />

          {/* Suggestion cards */}
          <View style={{ gap: 8 }}>
            {QUICK_PROMPTS.map((p) => (
              <Pressable
                key={p.text}
                onPress={() => goToQuickSession(p.text)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.80 : 1,
                  transform: [{ scale: pressed ? 0.984 : 1 }],
                })}
              >
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "#FFFFFF", borderRadius: 99,
                  paddingHorizontal: 18, paddingVertical: 11,
                  shadowColor: "rgba(60,40,20,1)",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
                  borderWidth: 0.5, borderColor: "rgba(28,23,20,0.05)",
                  gap: 12,
                }}>
                  <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                  <Text style={{
                    fontFamily: "Geist-Bold", fontSize: 15,
                    color: "#1C1714", flex: 1, letterSpacing: -0.2,
                  }}>
                    {p.text}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Orb — fills remaining space, centered. No "Tap to speak" label. */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 80 }}>
            <SphereOrb
              state={aiState === "blocked" ? "idle" : aiState}
              tone="blue"
              micLevel={micLevel}
              size={ENTRY_ORB_SIZE}
              onTap={handleMicTap}
              onLongPress={handleMicTap}
            />
          </View>

        </View>

        {/* ── Input pill — absolutely pinned at bottom, rises with keyboard ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={TAB_CLEARANCE}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 60 }}
        >
          <View style={{ paddingHorizontal: 22, paddingBottom: TAB_CLEARANCE }}>
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.97)",
              borderRadius: 99,
              paddingLeft: 16, paddingRight: 7, paddingVertical: 5,
              shadowColor: "rgba(60,40,20,1)",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.10, shadowRadius: 20, elevation: 5,
              borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
              gap: 10,
            }}>
              <Ionicons name="volume-medium-outline" size={16} color="rgba(28,23,20,0.45)" />
              <TextInput
                style={{
                  flex: 1, fontSize: 14,
                  fontFamily: "Geist-Medium", fontWeight: "500",
                  color: "#1C1714", paddingVertical: 6,
                }}
                placeholder="What do you want to learn?…"
                placeholderTextColor="rgba(28,23,20,0.40)"
                value={typedInput}
                onChangeText={setTypedInput}
                onFocus={() => setIsTypingFocused(true)}
                onBlur={() => setIsTypingFocused(false)}
                onSubmitEditing={() => { setIsTypingFocused(false); goToQuickSession(typedInput); }}
                returnKeyType="send"
                blurOnSubmit={false}
                editable={aiState === "idle"}
                maxLength={600}
              />
              <Pressable
                onPress={() => goToQuickSession(typedInput)}
                disabled={!typedInput.trim() || aiState !== "idle"}
                style={({ pressed }) => ({
                  width: 30, height: 30, borderRadius: 30,
                  backgroundColor: typedInput.trim() && aiState === "idle" ? "#7A4A22" : "rgba(122,74,34,0.20)",
                  alignItems: "center", justifyContent: "center",
                  opacity: pressed ? 0.82 : 1,
                })}
              >
                <Ionicons
                  name="arrow-forward" size={15}
                  color={typedInput.trim() && aiState === "idle" ? "#FFF" : "rgba(122,74,34,0.55)"}
                />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ── Dim overlay when typing — centered text preview, no duplicate orb ── */}
        {isTypingFocused && (
          <Pressable
            onPress={() => { setIsTypingFocused(false); Keyboard.dismiss(); }}
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(18,14,10,0.78)", zIndex: 50,
              alignItems: "center", justifyContent: "center",
              paddingBottom: 120,
            }}
            pointerEvents="box-only"
          >
            {typedInput.length > 0 ? (
              <Text style={{
                fontSize: 30, fontFamily: "Fraunces-Regular",
                color: "#FFFFFF", textAlign: "center", paddingHorizontal: 28,
                lineHeight: 38, letterSpacing: -0.4,
              }}>
                {typedInput}
              </Text>
            ) : (
              <Text style={{
                fontSize: 15, fontFamily: "Geist-Regular",
                color: "rgba(255,255,255,0.40)", textAlign: "center",
              }}>
                Type in {language.label}…
              </Text>
            )}
          </Pressable>
        )}

        {/* ── Language picker overlay ── */}
        {showLanguagePicker && (
          <Pressable
            onPress={() => setShowLanguagePicker(false)}
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.60)", zIndex: 100 } as any}
          >
            <View style={{
              position: "absolute", left: 0, right: 0, top: 0,
              backgroundColor: "#1E1A17",
              borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
              overflow: "hidden",
              shadowColor: "#000", shadowOpacity: 0.50,
              shadowOffset: { width: 0, height: 8 }, shadowRadius: 32,
              elevation: 20,
              borderWidth: 0.5, borderColor: "rgba(200,128,74,0.18)",
            }}>
              <Text style={{ fontFamily: "Geist-Bold", fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textAlign: "center", paddingTop: insets.top + 24, marginBottom: 8, textTransform: "uppercase" }}>Choose Language</Text>
              {SUPPORTED_LANGUAGES.filter(l => SPEAK_LANGUAGE_CODES.includes(l.code)).map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={(e) => {
                    e.stopPropagation();
                    setLanguageCode(lang.code);
                    setShowLanguagePicker(false);
                    setResponse(null);
                    setLastUserText("");
                  }}
                  style={({ pressed }) => ({
                    paddingVertical: 16, paddingHorizontal: 24,
                    flexDirection: "row", alignItems: "center", gap: 14,
                    backgroundColor:
                      lang.code === languageCode ? "rgba(200,128,74,0.10)"
                      : pressed ? "rgba(255,255,255,0.04)"
                      : "transparent",
                  })}
                >
                  {lang.code === languageCode ? (
                    <Ionicons name="checkmark-circle" size={22} color="#C8804A" />
                  ) : (
                    <View style={{ width: 22 }} />
                  )}
                  <Text style={{ fontSize: 26 }}>{FLAG[lang.code] ?? "🌐"}</Text>
                  <View>
                    <Text style={{ fontFamily: "Geist-Bold", fontSize: 18, color: lang.code === languageCode ? "#C8804A" : "#FFFFFF", letterSpacing: -0.3 }}>
                      {lang.label}
                    </Text>
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
                      {DIALECT[lang.code] ?? "Standard"}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <View style={{ height: 36 }} />
            </View>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  // ── Phrase mode — chunk-by-chunk pronunciation trainer ────────────────────
  if (normalizedMode === "phrase") {
    const FLAG_P: Record<string, string> = { fr: "\u{1F1EB}\u{1F1F7}", es: "\u{1F1EA}\u{1F1F8}", zh: "\u{1F1E8}\u{1F1F3}" };

    const startPhraseSession = async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPhraseLoading(true);
      setPhraseInput("");
      setPhraseFeedback(null);
      setPhraseAttemptText("");
      setPhraseComplete(false);
      setScenarioAttemptText("");
      setScenarioFeedback(null);
      setSkillUnlockVisible(false);
      try {
        const res = await postTutorSession({
          mode: "phrase-split",
          text: trimmed,
          languageCode: language.code,
          nativeLanguageCode: nativeCode,
          includeAudio: false,
        });
        const sess = createPhraseSession(trimmed, res, language.code, nativeCode);
        setPhraseSession(sess);
        // AI intro: speak the phrase aloud so the user hears it
        setPhraseCoachingSpeaking(true);
        try {
          const foreignText = res.naturalPhrase || trimmed;
          // Pre-warm Deepgram cache NOW so the foreign phrase plays instantly
          // after the English intro finishes — eliminates the 5-second gap.
          prefetchDeepgramTts(foreignText, language.code);
          const introLine = `Let's learn to say: "${trimmed}". In ${language.label}, you say:`;
          await speakRoutedText({ text: introLine, languageCode: nativeCode });
          await new Promise((r) => setTimeout(r, 150));
          await speakRoutedText({ text: foreignText, languageCode: language.code });
        } catch {}
        setPhraseCoachingSpeaking(false);
        // Advance from intro → practicing
        setPhraseSession((prev) => prev ? phraseAdvanceFromIntro(prev) : null);
      } catch (e: any) {
        console.warn("[phrase] start error:", e);
        setPhraseCoachingSpeaking(false);
      }
      setPhraseLoading(false);
    };

    const listenForChunk = async (targetText: string) => {
      if (phraseAiState !== "idle" || phraseCoachingSpeaking) return;
      setPhraseAttemptText("");
      setPhraseFeedback(null);
      setPhraseAiState("listening");
      try {
        const transcript = await recognizeSpeechOnce({
          languageCode: language.code,
          fallbackLanguageCode: nativeCode,
          requiresOnDevice: false,
          timeoutMs: 15_000,
          onPartial: setPhraseAttemptText,
          onVolume: (v) => setPhraseMicLevel(v),
          onSession: (s) => { phraseSpeechRef.current = s; },
        });
        phraseSpeechRef.current = null;
        const clean = transcript.trim();
        setPhraseAttemptText(clean);
        setPhraseAiState("scoring");

        const fb = comparePronunciation(targetText, clean);
        setPhraseFeedback(fb);
        // Auto-scroll so the feedback card is visible
        requestAnimationFrame(() => phraseScrollRef.current?.scrollToEnd({ animated: true }));

        let updated: ReturnType<typeof phraseScoreChunk> | null = null;
        if (phraseSession) {
          updated = phraseScoreChunk(
            phraseSession,
            phraseSession.currentChunkIndex,
            fb.score,
          );
          setPhraseSession(updated);

          if (updated.phase === "completed") {
            setPhraseComplete(true);
          }
        }
        setPhraseAiState("idle");

        // AI ALWAYS speaks back after every chunk attempt
        setPhraseCoachingSpeaking(true);
        try {
          if (fb.score >= PHRASE_MASTERY_THRESHOLD && updated) {
            if (updated.phase === "final") {
              // All chunks mastered → move to full sentence
              await speakRoutedText({ text: "Great! Now say the full sentence.", languageCode: nativeCode });
              prefetchDeepgramTts(updated.fullTarget, language.code);
              await new Promise((r) => setTimeout(r, 150));
              await speakRoutedText({ text: updated.fullTarget, languageCode: language.code });
              setPhraseCoachingSpeaking(false);
              // Auto-open mic for full sentence
              await new Promise((r) => setTimeout(r, 400));
              listenForFinalSentence();
              return;
            }
            // Next chunk exists → auto-advance
            const nextChunk = updated.chunks[updated.currentChunkIndex];
            if (nextChunk) {
              await speakRoutedText({ text: "Nice! Moving on.", languageCode: nativeCode });
              prefetchDeepgramTts(nextChunk.target, language.code);
              await new Promise((r) => setTimeout(r, 150));
              await speakRoutedText({ text: nextChunk.target, languageCode: language.code });
              setPhraseCoachingSpeaking(false);
              setPhraseFeedback(null);
              setPhraseAttemptText("");
              // Auto-open mic for the next chunk
              await new Promise((r) => setTimeout(r, 400));
              listenForChunk(nextChunk.target);
              return;
            }
            await speakRoutedText({ text: "Nice! Moving on.", languageCode: nativeCode });
          } else {
            const coachLine = fb.suggestion || "Try again — listen carefully.";
            prefetchDeepgramTts(targetText, language.code);
            await speakRoutedText({ text: coachLine, languageCode: nativeCode });
            await new Promise((r) => setTimeout(r, 150));
            await speakRoutedText({ text: targetText, languageCode: language.code });
          }
        } catch {}
        setPhraseCoachingSpeaking(false);
      } catch (err: any) {
        phraseSpeechRef.current = null;
        setPhraseAiState("idle");
        setPhraseAttemptText("");
        if (err instanceof SpeechPermissionError && err.canOpenSettings) {
          Alert.alert("Microphone Access", "UseLang needs microphone access to practice speaking.", [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ]);
        } else {
          setPhraseFeedback({
            score: 0, rating: "off", missingSegments: [],
            suggestion: err?.message || "Couldn't reach the microphone. Please try again.",
          });
        }
      }
    };

    const listenForFinalSentence = async () => {
      if (!phraseSession || phraseAiState !== "idle" || phraseCoachingSpeaking) return;
      setPhraseAttemptText("");
      setPhraseFeedback(null);
      setPhraseAiState("listening");
      try {
        const transcript = await recognizeSpeechOnce({
          languageCode: language.code,
          fallbackLanguageCode: nativeCode,
          requiresOnDevice: false,
          timeoutMs: 20_000,
          onPartial: setPhraseAttemptText,
          onVolume: (v) => setPhraseMicLevel(v),
          onSession: (s) => { phraseSpeechRef.current = s; },
        });
        phraseSpeechRef.current = null;
        const clean = transcript.trim();
        setPhraseAttemptText(clean);
        setPhraseAiState("scoring");

        const fb = comparePronunciation(phraseSession.fullTarget, clean);
        setPhraseFeedback(fb);
        requestAnimationFrame(() => phraseScrollRef.current?.scrollToEnd({ animated: true }));

        const updated = phraseScoreFinal(phraseSession, fb.score);
        setPhraseSession(updated);
        setPhraseAiState("idle");

        // AI coaching after full sentence
        setPhraseCoachingSpeaking(true);
        try {
          if (fb.score >= PHRASE_MASTERY_THRESHOLD) {
            await speakRoutedText({ text: "Great job! Now let's test you in a real scenario.", languageCode: nativeCode });
          } else {
            prefetchDeepgramTts(phraseSession.fullTarget, language.code);
            await speakRoutedText({ text: fb.suggestion || "Try saying the full sentence again.", languageCode: nativeCode });
            await new Promise((r) => setTimeout(r, 150));
            await speakRoutedText({ text: phraseSession.fullTarget, languageCode: language.code });
          }
        } catch {}
        setPhraseCoachingSpeaking(false);

        // Generate a scenario prompt for the scenario phase
        if (updated.phase === "scenario") {
          const scenarioLine = `Imagine you're in a real conversation. Someone asks you something and you need to respond with: "${phraseSession.fullTarget}"`;
          setPhraseSession((prev) => prev ? phraseAdvanceToScenario(prev, scenarioLine) : null);
        }
      } catch (err: any) {
        phraseSpeechRef.current = null;
        setPhraseAiState("idle");
        if (err instanceof SpeechPermissionError && err.canOpenSettings) {
          Alert.alert("Microphone Access", "UseLang needs microphone access to practice speaking.", [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ]);
        } else {
          setPhraseFeedback({
            score: 0, rating: "off", missingSegments: [],
            suggestion: err?.message || "Couldn't reach the microphone. Please try again.",
          });
        }
      }
    };

    const listenForScenario = async () => {
      if (!phraseSession || phraseAiState !== "idle" || phraseCoachingSpeaking) return;
      setScenarioAttemptText("");
      setScenarioFeedback(null);
      setPhraseAiState("listening");
      try {
        const transcript = await recognizeSpeechOnce({
          languageCode: language.code,
          fallbackLanguageCode: nativeCode,
          requiresOnDevice: false,
          timeoutMs: 20_000,
          onPartial: setScenarioAttemptText,
          onVolume: (v) => setPhraseMicLevel(v),
          onSession: (s) => { phraseSpeechRef.current = s; },
        });
        phraseSpeechRef.current = null;
        const clean = transcript.trim();
        setScenarioAttemptText(clean);
        setPhraseAiState("scoring");

        const fb = comparePronunciation(phraseSession.fullTarget, clean);
        setScenarioFeedback(fb);
        requestAnimationFrame(() => phraseScrollRef.current?.scrollToEnd({ animated: true }));
        const updated = phraseScoreScenario(phraseSession, fb.score);
        setPhraseSession(updated);
        setPhraseAiState("idle");

        // AI speak-back for scenario
        setPhraseCoachingSpeaking(true);
        try {
          if (fb.score >= PHRASE_MASTERY_THRESHOLD) {
            await speakRoutedText({ text: "You nailed it! Skill unlocked.", languageCode: nativeCode });
            // Award XP, coins, save phrase, and record attempt
            const xpAmount = 25;
            try {
              const xpResult = await addXP(xpAmount);
              setPhraseXpEarned(xpAmount);
              await addCoins(10);
              if (xpResult.levelUp) playSound("level-up");
              else playSound("xp-gain");
              await savePhrase({
                languageCode: language.code,
                phrase: phraseSession.fullTarget,
                phonetic: phraseSession.fullPhonetic || "",
                meaning: phraseSession.originalPhrase || "",
                tip: "",
              });
              await recordAttempt({
                languageCode: language.code,
                phrase: phraseSession.fullTarget,
                score: Math.round(fb.score * 100),
                mode: "train",
              });
            } catch (e) {
              console.warn("[phrase] XP/save error:", e);
            }
            setSkillUnlockVisible(true);
          } else {
            const coachLine = fb.suggestion || "Not quite — let's practice the tricky parts again.";
            prefetchDeepgramTts(phraseSession.fullTarget, language.code);
            await speakRoutedText({ text: coachLine, languageCode: nativeCode });
            await new Promise((r) => setTimeout(r, 150));
            await speakRoutedText({ text: phraseSession.fullTarget, languageCode: language.code });
          }
        } catch {}
        setPhraseCoachingSpeaking(false);
      } catch (err: any) {
        phraseSpeechRef.current = null;
        setPhraseAiState("idle");
        if (err instanceof SpeechPermissionError && err.canOpenSettings) {
          Alert.alert("Microphone Access", "UseLang needs microphone access to practice speaking.", [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ]);
        } else {
          setScenarioFeedback({
            score: 0, rating: "off", missingSegments: [],
            suggestion: err?.message || "Couldn't reach the microphone. Please try again.",
          });
        }
      }
    };

    const handleRemediateTap = () => {
      if (!phraseSession) return;
      setScenarioAttemptText("");
      setScenarioFeedback(null);
      setPhraseSession((prev) => prev ? phraseAdvanceFromRemediate(prev) : null);
    };

    const handlePhraseOrbTap = () => {
      if (phraseCoachingSpeaking) {
        // Let user interrupt AI coaching by tapping the orb
        stopRoutedTts().catch(() => {});
        setPhraseCoachingSpeaking(false);
        return;
      }
      if (phraseAiState === "listening") {
        phraseSpeechRef.current?.stop();
        phraseSpeechRef.current = null;
        return;
      }
      // Debounce: prevent crash from double/rapid taps
      if (phraseOrbDebounceRef.current) return;
      phraseOrbDebounceRef.current = true;
      setTimeout(() => { phraseOrbDebounceRef.current = false; }, 600);

      if (!phraseSession) return;
      if (phraseSession.phase === "scenario") {
        listenForScenario();
      } else if (phraseSession.phase === "final") {
        listenForFinalSentence();
      } else if (phraseSession.phase === "practicing") {
        const chunk = phraseSession.chunks[phraseSession.currentChunkIndex];
        if (chunk) listenForChunk(chunk.target);
      }
    };

    const phraseProgress = phraseSession ? getPhraseProgress(phraseSession) : null;

    // ── Entry screen (no active session) ──
    if (!phraseSession) {
      const TAB_CLEARANCE_P = insets.bottom + 10 + 68 + 14;

      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#EDE7DD" }} edges={["top"]}>
          <Svg width={SW} height={SH} style={{ position: "absolute", top: 0, left: 0 }}>
            <Defs>
              <SvgLinearGradient id="phraseBg" x1="0" y1="0" x2="0" y2={SH} gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#F3EDE3" />
                <Stop offset="0.5" stopColor="#EDE7DD" />
                <Stop offset="1" stopColor="#E6E0D8" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={SW} height={SH} fill="url(#phraseBg)" />
          </Svg>

          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
            <Pressable
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
              hitSlop={12}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 6,
                paddingVertical: 8, paddingHorizontal: 14,
                borderRadius: 99, backgroundColor: "rgba(255,255,255,0.80)",
                borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 18 }}>{FLAG_P[language.code] ?? "\u{1F310}"}</Text>
              <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: "#1C1714", letterSpacing: -0.2 }}>{language.label}</Text>
              <Ionicons name="chevron-down" size={11} color="rgba(28,23,20,0.45)" />
            </Pressable>
            <ModeSwitcher
              active="phrase"
              onChange={(next) => {
                if (next === "phrase") return;
                setMode(next);
                router.setParams({ mode: next });
              }}
            />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
            <View style={{ flex: 1, paddingHorizontal: 22 }}>
              <View style={{ paddingTop: 16 }}>
                <Text style={{
                  fontSize: 26, lineHeight: 32,
                  fontFamily: "Geist-Bold", fontWeight: "800",
                  color: "#1C1714", letterSpacing: -0.9,
                }}>
                  {"Learn a phrase\n"}
                  <Text style={{ fontFamily: "Fraunces-Italic", fontWeight: "700", fontSize: 26 }}>chunk by chunk</Text>
                  {"."}
                </Text>
                <Text style={{
                  marginTop: 6, fontSize: 13, lineHeight: 18,
                  fontFamily: "Geist-Regular", color: "rgba(28,23,20,0.55)",
                }}>
                  Type any sentence and we'll break it down into bite-sized pieces for you to master one by one.
                </Text>
              </View>

              <View style={{ flex: 0.3 }} />

              {/* Prompt suggestions */}
              <View style={{ gap: 8 }}>
                {[
                  { emoji: "\u{2615}", text: "I'd like to order a coffee please" },
                  { emoji: "\u{1F5FA}", text: "Can you tell me how to get to the train station" },
                  { emoji: "\u{1F4AC}", text: "I want to order a cab" },
                ].map((p) => (
                  <Pressable
                    key={p.text}
                    onPress={() => startPhraseSession(p.text)}
                    disabled={phraseLoading}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.80 : phraseLoading ? 0.60 : 1,
                      transform: [{ scale: pressed ? 0.984 : 1 }],
                    })}
                  >
                    <View style={{
                      flexDirection: "row", alignItems: "center",
                      backgroundColor: "#FFFFFF", borderRadius: 99,
                      paddingHorizontal: 18, paddingVertical: 11,
                      shadowColor: "rgba(60,40,20,1)",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
                      borderWidth: 0.5, borderColor: "rgba(28,23,20,0.05)",
                      gap: 12,
                    }}>
                      <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
                      <Text style={{
                        fontFamily: "Geist-Bold", fontSize: 14,
                        color: "#1C1714", flex: 1, letterSpacing: -0.2,
                      }}>
                        {p.text}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>

              <View style={{ flex: 1 }} />

              {/* Input pill */}
              <View style={{ paddingBottom: TAB_CLEARANCE_P }}>
                <View style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderRadius: 99,
                  paddingLeft: 16, paddingRight: 7, paddingVertical: 5,
                  shadowColor: "rgba(60,40,20,1)",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.10, shadowRadius: 20, elevation: 5,
                  borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
                  gap: 10,
                }}>
                  <Ionicons name="text-outline" size={16} color="rgba(28,23,20,0.45)" />
                  <TextInput
                    style={{
                      flex: 1, fontSize: 14,
                      fontFamily: "Geist-Medium", fontWeight: "500",
                      color: "#1C1714", paddingVertical: 6,
                    }}
                    placeholder="Type a phrase to break down…"
                    placeholderTextColor="rgba(28,23,20,0.40)"
                    value={phraseInput}
                    onChangeText={setPhraseInput}
                    onSubmitEditing={() => startPhraseSession(phraseInput)}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    editable={!phraseLoading}
                    maxLength={600}
                  />
                  <Pressable
                    onPress={() => startPhraseSession(phraseInput)}
                    disabled={!phraseInput.trim() || phraseLoading}
                    style={({ pressed }) => ({
                      width: 30, height: 30, borderRadius: 30,
                      backgroundColor: phraseInput.trim() && !phraseLoading ? "#7A4A22" : "rgba(122,74,34,0.20)",
                      alignItems: "center", justifyContent: "center",
                      opacity: pressed ? 0.82 : 1,
                    })}
                  >
                    <Ionicons
                      name="arrow-forward" size={15}
                      color={phraseInput.trim() && !phraseLoading ? "#FFF" : "rgba(122,74,34,0.55)"}
                    />
                  </Pressable>
                </View>
                {phraseLoading && (
                  <View style={{ alignItems: "center", marginTop: 14 }}>
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.50)" }}>Breaking it down…</Text>
                  </View>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>

          {/* Language picker overlay */}
          {showLanguagePicker && (
            <Pressable
              onPress={() => setShowLanguagePicker(false)}
              style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.60)", zIndex: 100 } as any}
            >
              <View style={{
                position: "absolute", left: 0, right: 0, top: 0,
                backgroundColor: "#1E1A17",
                borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
                overflow: "hidden",
                shadowColor: "#000", shadowOpacity: 0.50,
                shadowOffset: { width: 0, height: 8 }, shadowRadius: 32,
                elevation: 20,
                borderWidth: 0.5, borderColor: "rgba(200,128,74,0.18)",
              }}>
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.35)", textAlign: "center", paddingTop: insets.top + 24, marginBottom: 8, textTransform: "uppercase" }}>Choose Language</Text>
                {SUPPORTED_LANGUAGES.filter(l => SPEAK_LANGUAGE_CODES.includes(l.code)).map((lang) => (
                  <Pressable
                    key={lang.code}
                    onPress={(e) => {
                      e.stopPropagation();
                      setLanguageCode(lang.code);
                      setShowLanguagePicker(false);
                      setPhraseSession(null);
                    }}
                    style={({ pressed }) => ({
                      paddingVertical: 16, paddingHorizontal: 24,
                      flexDirection: "row", alignItems: "center", gap: 14,
                      backgroundColor:
                        lang.code === languageCode ? "rgba(200,128,74,0.10)"
                        : pressed ? "rgba(255,255,255,0.04)"
                        : "transparent",
                    })}
                  >
                    {lang.code === languageCode ? (
                      <Ionicons name="checkmark-circle" size={22} color="#C8804A" />
                    ) : (
                      <View style={{ width: 22 }} />
                    )}
                    <View>
                      <Text style={{ fontFamily: "Geist-Bold", fontSize: 18, color: lang.code === languageCode ? "#C8804A" : "#FFFFFF", letterSpacing: -0.3 }}>
                        {lang.label}
                      </Text>
                      <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
                        {lang.code === "fr" ? "European" : lang.code === "es" ? "Mexican" : "Mandarin"}
                      </Text>
                    </View>
                  </Pressable>
                ))}
                <View style={{ height: 36 }} />
              </View>
            </Pressable>
          )}
        </SafeAreaView>
      );
    }

    // ── Active phrase session ──
    const currentChunk = phraseSession.phase === "practicing"
      ? phraseSession.chunks[phraseSession.currentChunkIndex]
      : null;
    const isFinalAttempt = phraseSession.phase === "final";
    const isScenario = phraseSession.phase === "scenario";
    const isRemediate = phraseSession.phase === "remediate";
    const isDone = phraseSession.phase === "done" || skillUnlockVisible;
    const isCompleted = phraseSession.phase === "completed" || phraseComplete || isDone;

    const orbStatusPhrase =
      phraseCoachingSpeaking     ? "AI is speaking…" :
      phraseAiState === "listening" ? "Listening… tap to stop" :
      phraseAiState === "scoring"   ? "Scoring…" :
      isScenario                    ? "Tap orb to respond" :
      isRemediate                   ? "Tap to try again" :
      phraseFeedback && phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "Tap orb for next chunk" :
      phraseFeedback                ? "Tap to try again" :
      "Tap the orb to speak";

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3EDE3" }} edges={["top", "bottom"]}>
        <Svg width={SW} height={SH} style={{ position: "absolute", top: 0, left: 0 }}>
          <Defs>
            <SvgLinearGradient id="phraseActiveBg" x1="0" y1="0" x2="0" y2={SH} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#F3EDE3" />
              <Stop offset="0.5" stopColor="#EDE7DD" />
              <Stop offset="1" stopColor="#E6E0D8" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width={SW} height={SH} fill="url(#phraseActiveBg)" />
        </Svg>

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }}>
          <Pressable
            onPress={() => { stopRoutedTts().catch(() => {}); setPhraseSession(null); setPhraseInput(""); setPhraseFeedback(null); setPhraseAttemptText(""); setPhraseComplete(false); setPhraseCoachingSpeaking(false); }}
            hitSlop={12}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingVertical: 6, paddingHorizontal: 12,
              borderRadius: 99, backgroundColor: "rgba(255,255,255,0.80)",
              borderWidth: 0.5, borderColor: "rgba(28,23,20,0.06)",
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={15} color="#1C1714" />
            <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: "#1C1714" }}>Back</Text>
          </Pressable>

          {/* Progress dots */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {phraseSession.chunks.map((_, i) => {
              const mastered = phraseSession.chunkMastered[i];
              const isCurrent = i === phraseSession.currentChunkIndex && phraseSession.phase === "practicing";
              return (
                <View key={i} style={{
                  width: isCurrent ? 20 : 8, height: 8, borderRadius: 4,
                  backgroundColor: mastered ? "#7A4A22" : isCurrent ? "rgba(122,74,34,0.40)" : "rgba(122,74,34,0.12)",
                }} />
              );
            })}
            {/* Final dot */}
            <View style={{
              width: isFinalAttempt ? 20 : 8, height: 8, borderRadius: 4,
              backgroundColor: (isScenario || isRemediate || isDone) ? "#7A4A22" : isFinalAttempt ? "rgba(122,74,34,0.40)" : "rgba(122,74,34,0.12)",
            }} />
            {/* Scenario dot */}
            <View style={{
              width: isScenario ? 20 : 8, height: 8, borderRadius: 4,
              backgroundColor: isDone ? "#22C55E" : isScenario ? "#2563EB" : isRemediate ? "rgba(37,99,235,0.40)" : "rgba(122,74,34,0.12)",
            }} />
          </View>

          <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: isScenario ? "#2563EB" : "#7A4A22", letterSpacing: 1.2 }}>
            {isDone ? "SKILL UNLOCKED" : isRemediate ? "REMEDIATION" : isScenario ? "SCENARIO" : isFinalAttempt ? "FULL SENTENCE" : isCompleted ? "DONE" : `${(phraseProgress?.mastered ?? 0) + 1} of ${phraseSession.chunks.length}`}
          </Text>
        </View>

        <ScrollView ref={phraseScrollRef} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
          {/* Context */}
          {phraseSession.context ? (
            <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.55)", lineHeight: 18, marginBottom: 16 }}>
              {phraseSession.context}
            </Text>
          ) : null}

          {/* Full sentence reference */}
          <View style={{
            backgroundColor: "rgba(122,74,34,0.05)", borderRadius: 16, padding: 16, marginBottom: 20,
            borderWidth: 1, borderColor: "rgba(122,74,34,0.08)",
          }}>
            <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1.2, marginBottom: 8 }}>FULL SENTENCE</Text>
            {language.code.startsWith("zh") && phraseSession.fullPhonetic ? (
              <>
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 20, color: "#1C1714", lineHeight: 28 }}>{pinyinToSayLike(phraseSession.fullPhonetic)}</Text>
                <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 13, color: "#7A4A22", marginTop: 4, letterSpacing: 0.2 }}>{phraseSession.fullPhonetic}</Text>
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.28)", marginTop: 4 }}>{phraseSession.fullTarget}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: "Fraunces-Regular", fontSize: 18, color: "#1C1714", lineHeight: 26 }}>{phraseSession.fullTarget}</Text>
                {phraseSession.fullPhonetic ? (
                  <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 14, color: "#7A4A22", marginTop: 6, letterSpacing: 0.2 }}>{phraseSession.fullPhonetic}</Text>
                ) : null}
              </>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(122,74,34,0.08)" }}>
              <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1 }}>MEANS</Text>
              <Text style={{ fontFamily: "Geist-Medium", fontSize: 14, color: "rgba(28,23,20,0.75)", flex: 1 }}>{phraseSession.originalPhrase}</Text>
            </View>
          </View>

          {/* Current chunk card OR final sentence card */}
          {isFinalAttempt && (
            <View style={{
              backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, marginBottom: 16,
              shadowColor: "rgba(60,40,20,1)", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
              borderWidth: 1, borderColor: "rgba(122,74,34,0.10)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#7A4A22" }} />
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1.3 }}>NOW SAY THE FULL SENTENCE</Text>
              </View>
              {/* For non-Latin scripts, show phonetic as primary */}
              {language.code.startsWith("zh") && phraseSession.fullPhonetic ? (
                <>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 24, color: "#1C1714", lineHeight: 32 }}>
                    {phraseSession.fullPhonetic}
                  </Text>
                  <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: "rgba(28,23,20,0.35)", marginTop: 8 }}>
                    {phraseSession.fullTarget}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontFamily: "Fraunces-Regular", fontSize: 24, color: "#1C1714", lineHeight: 32, letterSpacing: -0.3 }}>
                    {phraseSession.fullTarget}
                  </Text>
                  <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 13, color: "rgba(122,74,34,0.55)", marginTop: 10, letterSpacing: 0.2 }}>
                    {phraseSession.fullPhonetic}
                  </Text>
                </>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(122,74,34,0.08)" }}>
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1 }}>MEANS</Text>
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 15, color: "#1C1714" }}>{phraseSession.originalPhrase}</Text>
              </View>
            </View>
          )}

          {currentChunk && !isFinalAttempt && (
            <View style={{
              backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, marginBottom: 16,
              shadowColor: "rgba(60,40,20,1)", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
              borderWidth: 1, borderColor: "rgba(122,74,34,0.10)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#C4A67C" }} />
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1.3 }}>
                  CHUNK {phraseSession.currentChunkIndex + 1} OF {phraseSession.chunks.length}
                </Text>
              </View>
              {/* For Mandarin: phonetic BIG, pinyin secondary, characters small */}
              {language.code.startsWith("zh") ? (
                <>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 28, color: "#1C1714", lineHeight: 36 }}>
                    {currentChunk.phonetic
                      ? pinyinToSayLike(currentChunk.phonetic)
                      : currentChunk.target}
                  </Text>
                  <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 14, color: "#7A4A22", marginTop: 6, letterSpacing: 0.2 }}>
                    {currentChunk.phonetic || "—"}
                  </Text>
                  <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: "rgba(28,23,20,0.28)", marginTop: 4 }}>
                    {currentChunk.target}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontFamily: "Fraunces-Regular", fontSize: 28, color: "#1C1714", lineHeight: 36, letterSpacing: -0.3 }}>
                    {currentChunk.target}
                  </Text>
                  {currentChunk.phonetic ? (
                    <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 16, color: "#7A4A22", marginTop: 8, letterSpacing: 0.3 }}>
                      {currentChunk.phonetic}
                    </Text>
                  ) : null}
                </>
              )}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1 }}>MEANS</Text>
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 16, color: "#1C1714" }}>{currentChunk.english}</Text>
              </View>
              {currentChunk.tip ? (
                <View style={{ marginTop: 14, backgroundColor: "rgba(122,74,34,0.05)", borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "#7A4A22", lineHeight: 17 }}>
                    {currentChunk.tip}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Feedback card */}
          {phraseFeedback && !isCompleted && (
            <View style={{
              backgroundColor: phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "#F0FFF4" : "#FFF9F0",
              borderRadius: 18, padding: 18, marginBottom: 16,
              borderWidth: 1,
              borderColor: phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "rgba(34,197,94,0.20)" : "rgba(196,166,124,0.25)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Ionicons
                  name={phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "checkmark-circle" : "refresh-circle"}
                  size={22}
                  color={phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "#22C55E" : "#C4A67C"}
                />
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#1C1714" }}>
                  {Math.round(phraseFeedback.score * 100)}%
                </Text>
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.55)" }}>
                  {phraseFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "Nice! Moving on." : `Need ${Math.round(PHRASE_MASTERY_THRESHOLD * 100)}% to advance.`}
                </Text>
              </View>
              {phraseAttemptText ? (
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.45)", marginBottom: 6 }}>
                  You said: "{phraseAttemptText}"
                </Text>
              ) : null}
              {currentChunk && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1, marginBottom: 4 }}>TARGET</Text>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 16, color: "#1C1714" }}>
                    {language.code.startsWith("zh") && currentChunk.phonetic ? currentChunk.phonetic : currentChunk.target}
                  </Text>
                </View>
              )}
              {phraseFeedback.suggestion ? (
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "#7A4A22", marginTop: 4 }}>
                  {phraseFeedback.suggestion}
                </Text>
              ) : null}
            </View>
          )}

          {/* TongueDiagram coaching — visible after feedback on a chunk */}
          {phraseFeedback && currentChunk && !isCompleted && (
            <View style={{
              backgroundColor: "rgba(122,74,34,0.04)", borderRadius: 18, padding: 16, marginBottom: 16,
              borderWidth: 1, borderColor: "rgba(122,74,34,0.08)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
                <Ionicons name="body-outline" size={15} color="#7A4A22" />
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1.2 }}>TONGUE PLACEMENT</Text>
              </View>
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <TongueDiagram phoneme={currentChunk.target?.charAt(0) || "a"} size={120} />
              </View>
              {currentChunk.tip ? (
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "#7A4A22", lineHeight: 17 }}>
                  {currentChunk.tip}
                </Text>
              ) : null}
            </View>
          )}

          {/* Scenario test card */}
          {isScenario && phraseSession.scenarioPrompt && (
            <View style={{
              backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, marginBottom: 16,
              shadowColor: "rgba(60,40,20,1)", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
              borderWidth: 1, borderColor: "rgba(122,74,34,0.10)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" }} />
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#2563EB", letterSpacing: 1.3 }}>SCENARIO TEST</Text>
              </View>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: "#1C1714", lineHeight: 20, marginBottom: 12 }}>
                {phraseSession.scenarioPrompt}
              </Text>
              {scenarioAttemptText ? (
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "rgba(28,23,20,0.45)", marginBottom: 6 }}>
                  You said: "{scenarioAttemptText}"
                </Text>
              ) : null}
              {scenarioFeedback ? (
                <View style={{
                  backgroundColor: scenarioFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
                  borderRadius: 12, padding: 12, marginTop: 4,
                }}>
                  <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: "#1C1714" }}>
                    {Math.round(scenarioFeedback.score * 100)}% — {scenarioFeedback.score >= PHRASE_MASTERY_THRESHOLD ? "Passed!" : "Try again"}
                  </Text>
                  {scenarioFeedback.suggestion ? (
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 12, color: "rgba(28,23,20,0.55)", marginTop: 4 }}>
                      {scenarioFeedback.suggestion}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}

          {/* Remediate card — after scenario failure */}
          {isRemediate && (
            <View style={{
              backgroundColor: "#FFF9F0", borderRadius: 20, padding: 22, marginBottom: 16,
              borderWidth: 1, borderColor: "rgba(196,166,124,0.25)",
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Ionicons name="refresh-circle" size={20} color="#C4A67C" />
                <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 10, color: "#7A4A22", letterSpacing: 1.3 }}>REMEDIATION</Text>
              </View>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 14, color: "#1C1714", lineHeight: 20, marginBottom: 14 }}>
                Let's practice the tricky parts. Listen carefully, then say the full phrase again.
              </Text>
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                <TongueDiagram phoneme={phraseSession.fullTarget?.charAt(0) || "a"} size={110} />
              </View>
              <Pressable
                onPress={handleRemediateTap}
                style={({ pressed }) => ({
                  backgroundColor: "#7A4A22", borderRadius: 99,
                  paddingVertical: 12, alignItems: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: "Geist-Bold", fontSize: 14, color: "#FFF" }}>Try scenario again</Text>
              </Pressable>
            </View>
          )}

          {/* Previously mastered chunks */}
          {phraseSession.chunks.map((chunk, i) => {
            if (!phraseSession.chunkMastered[i]) return null;
            if (phraseSession.phase === "practicing" && i === phraseSession.currentChunkIndex) return null;
            const score = phraseSession.chunkScores[i];
            return (
              <View key={i} style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                backgroundColor: "rgba(34,197,94,0.06)", borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
              }}>
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: "#1C1714", flex: 1 }}>
                  {language.code.startsWith("zh") && chunk.phonetic ? chunk.phonetic : chunk.target}
                </Text>
                <Text style={{ fontFamily: "GeistMono-Regular", fontSize: 11, color: "rgba(28,23,20,0.40)" }}>{score != null ? `${Math.round(score * 100)}%` : ""}</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Orb + status — fixed at bottom */}
        {!isCompleted && !isRemediate && (
          <View style={{ position: "absolute", bottom: insets.bottom + 78 + 16, left: 0, right: 0, alignItems: "center" }}>
            <SphereOrb
              state={phraseCoachingSpeaking ? "speaking" : phraseAiState === "listening" ? "listening" : "idle"}
              tone="warm"
              micLevel={phraseMicLevel}
              size={100}
              onTap={handlePhraseOrbTap}
              onLongPress={handlePhraseOrbTap}
            />
            <Text style={{
              marginTop: 8, fontSize: 12,
              fontFamily: "Geist-Bold", color: "#1C1714", letterSpacing: -0.2,
              textAlign: "center",
            }}>
              {orbStatusPhrase}
            </Text>
          </View>
        )}

        {/* Skill unlock overlay */}
        {skillUnlockVisible && (
          <CompletionOverlay
            phraseSession={phraseSession}
            language={language}
            xpEarned={phraseXpEarned}
            onDismiss={() => { setPhraseSession(null); setPhraseInput(""); setPhraseFeedback(null); setPhraseAttemptText(""); setPhraseComplete(false); setSkillUnlockVisible(false); setScenarioAttemptText(""); setScenarioFeedback(null); setPhraseXpEarned(0); }}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Fallthrough — should not reach here, but return null safety ──────────
  return null;
}

