// ── Offline Voice Panel ───────────────────────────────────────────────────
// Shared voice UI surface used by Quick Mode and Live Lang.
//
// Renders ONE state-driven UI:
//   • checking          — readiness probe spinner
//   • error             — single blocking message + actions when entry is impossible
//   • ready/listening/recognizing/processing/speaking → one status pill
//
// No alerts. No toasts. No retry loops. The OfflineVoiceSession owns logic.

import React, { useEffect, useRef, useState, useCallback } from "react";
// Defs/RadialGradient/Stop dropped with the orb redesign — the new orb uses
// flat circles + ellipses for a cleaner premium look.
import Svg, { Circle, Ellipse as SvgEllipse } from "react-native-svg";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  withSequence,
} from "react-native-reanimated";
import { COLORS } from "@/lib/constants";
import { loadGemmaModel, subscribeGemmaState } from "@/lib/gemma-engine";
import { validateUserText } from "@/lib/input-validate";
import { ensureNativeSpeechPermission } from "@/lib/native-speech";
import {
  createOfflineVoiceSession,
  type OfflineMode,
  type OfflineLine,
  type OfflineReadiness,
  type OfflineVoiceController,
  type OfflineVoiceSnapshot,
} from "@/lib/offline-voice-session";
import { speakOfflineText } from "@/lib/offline-tts";
import { savePhrase } from "@/lib/phrase-store";
import type { TutorResponse } from "@/lib/tutor-api";

interface Props {
  mode: OfflineMode;
  targetLang: string;
  nativeLang: string;
  title: string;
  subtitle: string;
  onClose?: () => void;
  /** Auto-start the loop after a successful readiness check. */
  autoStart?: boolean;
  /** Receives every transcript+reply line — host can render its own list. */
  onLine?: (line: OfflineLine) => void;
  /** Optional extra footer node (e.g. Live Lang's "Teach me what I just heard" CTA). */
  footer?: React.ReactNode;
  /** Live Lang: skip TTS, keep listening across silences. */
  continuous?: boolean;
  skipTts?: boolean;
  /** Legacy prop. The controller is always local Gemma-only. */
  offlineOnly?: boolean;
  backgroundColor?: string;
}

const STATUS_LABEL: Record<OfflineVoiceSnapshot["state"], string> = {
  idle: "Ready",
  checking: "Checking…",
  ready: "Tap to speak",
  listening: "Listening…",
  recognizing: "Recognizing…",
  processing: "Thinking…",
  speaking: "Speaking…",
  error: "Error",
  stopped: "Stopped",
};

export default function OfflineVoicePanel({
  mode,
  targetLang,
  nativeLang,
  title,
  subtitle,
  onClose,
  autoStart = false,
  onLine,
  footer,
  continuous = false,
  skipTts = false,
  offlineOnly: _offlineOnly = false,
  backgroundColor = COLORS.bg,
}: Props) {
  void _offlineOnly; // deprecated — routing is now dynamic per-request
  const [snap, setSnap] = useState<OfflineVoiceSnapshot>(() => ({
    state: "idle",
    partialTranscript: "",
    lastUserText: "",
    lastResponse: null,
    lastTranslation: "",
    errorMessage: "",
    micLevel: 0,
  }));
  const [readiness, setReadiness] = useState<OfflineReadiness | null>(null);
  const [lines, setLines] = useState<OfflineLine[]>([]);
  const [loadingModel, setLoadingModel] = useState(false);
  // Input mode toggle: "voice" = tap orb to speak, "text" = type a phrase.
  // Only meaningful in tutor mode (Quick translate). Live Lang stays voice.
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [draft, setDraft] = useState("");

  const controllerRef = useRef<OfflineVoiceController | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const orbBusyRef = useRef(false);

  // ── Build controller once, recreate on lang change ───────────────────────
  useEffect(() => {
    const ctrl = createOfflineVoiceSession({
      targetLang,
      nativeLang,
      mode,
      continuous,
      skipTts,
      onLine: (line) => {
        setLines((prev) => [...prev, line]);
        onLine?.(line);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      },
    });
    controllerRef.current = ctrl;
    const unsub = ctrl.subscribe(setSnap);

    (async () => {
      const r = await ctrl.checkReadiness();
      setReadiness(r);
      if (r.ready && autoStart) {
        await ctrl.start();
      }
    })();

    return () => {
      unsub();
      ctrl.stop().catch(() => {});
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLang, nativeLang, mode, continuous, skipTts]);

  // ── Re-check readiness when Gemma's load state flips ────────────────────
  useEffect(() => {
    return subscribeGemmaState(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      ctrl.checkReadiness().then(setReadiness).catch(() => {});
    });
  }, []);

  const onPrimaryTap = useCallback(async () => {
    if (orbBusyRef.current) return;
    orbBusyRef.current = true;
    try {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      if (snap.state === "listening" || snap.state === "processing" || snap.state === "recognizing") {
        await ctrl.stop();
      } else {
        await ctrl.start();
      }
    } catch (err: any) {
      console.error("[OfflineVoicePanel] onPrimaryTap FAILED:", err?.message || err);
    } finally {
      orbBusyRef.current = false;
    }
  }, [snap.state]);

  const handleLoadModel = useCallback(async () => {
    setLoadingModel(true);
    try {
      await loadGemmaModel();
      const r = await controllerRef.current?.checkReadiness();
      if (r) setReadiness(r);
    } finally {
      setLoadingModel(false);
    }
  }, []);

  const handleRecheck = useCallback(async () => {
    const r = await controllerRef.current?.checkReadiness();
    if (r) setReadiness(r);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    try {
      await ensureNativeSpeechPermission(false);
      const r = await controllerRef.current?.checkReadiness();
      if (r) setReadiness(r);
    } catch (err: any) {
      console.error("[OfflineVoicePanel] request permission FAILED:", err?.message || err);
    }
  }, []);

  const handleSubmitText = useCallback(async () => {
    const { ok, clean } = validateUserText(draft);
    if (!ok) return;
    Keyboard.dismiss();
    try {
      await controllerRef.current?.submitText(clean);
    } catch (err: any) {
      console.error("[OfflineVoicePanel] handleSubmitText FAILED:", err?.message || err);
    }
    setDraft("");
  }, [draft]);

  // ── Render: blocking screen ─────────────────────────────────────────────
  if (readiness && !readiness.ready) {
    return (
      <BlockingScreen
        title={title}
        message={readiness.blockingMessage || "Setup needed."}
        action={readiness.blockingAction}
        loadingModel={loadingModel}
        onLoadModel={handleLoadModel}
        onRequestPermission={handleRequestPermission}
        onRecheck={handleRecheck}
        onClose={onClose}
        backgroundColor={backgroundColor}
      />
    );
  }

  // ── Render: live loop ───────────────────────────────────────────────────
  const isActive =
    snap.state === "listening" ||
    snap.state === "recognizing" ||
    snap.state === "processing" ||
    snap.state === "speaking";
  const showOrb =
    snap.state === "ready" ||
    snap.state === "listening" ||
    snap.state === "recognizing" ||
    snap.state === "processing" ||
    snap.state === "speaking" ||
    snap.state === "stopped" ||
    snap.state === "idle";

  return (
    <View style={{ flex: 1, backgroundColor }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {onClose ? (
          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: COLORS.surface,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.text }}>{title}</Text>
          <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Transcript / lines list */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 }}
      >
        {lines.length === 0 && !snap.lastUserText ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Ionicons name="ear-outline" size={48} color={COLORS.textMuted} />
            <Text
              style={{
                marginTop: 14,
                fontSize: 16,
                fontWeight: "700",
                color: COLORS.text,
                textAlign: "center",
              }}
            >
              {mode === "tutor" ? "Tap to speak" : "Speak any phrase"}
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: COLORS.textSub,
                textAlign: "center",
                paddingHorizontal: 16,
                lineHeight: 19,
              }}
            >
              {mode === "tutor"
                ? "Say a phrase. I’ll show the translation, read it aloud, and let you save it for offline."
                : "Speak naturally and I’ll keep the translation flowing."}
            </Text>
          </View>
        ) : null}

        {/* Tutor mode (Quick Mode): show the LATEST result as a rich
            Google-Translate-style card with phonetic, meaning, replay TTS,
            and save-to-library. Older turns stack as compact lines below. */}
        {mode === "tutor" && snap.lastResponse ? (
          <TranslateCard
            response={snap.lastResponse}
            userText={snap.lastUserText}
            targetLang={targetLang}
            nativeLang={nativeLang}
          />
        ) : null}

        {/* Translate mode (Live Lang) renders all lines; tutor mode shows
            only history (everything except the most recent, since that's
            the rich card). */}
        {(mode === "translate" ? lines : lines.slice(0, -1)).map((line, i) => (
          <View key={i} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: 4 }}>
              {line.source}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text, lineHeight: 25 }}>
              {line.translation || "—"}
            </Text>
          </View>
        ))}

        {snap.partialTranscript && snap.state === "listening" ? (
          <Text style={{ fontSize: 14, color: COLORS.textSub, fontStyle: "italic", marginTop: 4 }}>
            {snap.partialTranscript}
          </Text>
        ) : null}

        {snap.errorMessage ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(239,68,68,0.08)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.18)",
            }}
          >
            <Text style={{ fontSize: 13, color: COLORS.danger, lineHeight: 19, fontWeight: "600" }}>
              {snap.errorMessage}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer host can inject extras (e.g. Live Lang's teach button) */}
      {footer}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        {/* Input mode toggle — voice (orb) vs. type (text input). Only Quick
            Mode (mode="tutor") shows this; Live Lang is voice-only. */}
        {mode === "tutor" ? (
          <View
            style={{
              flexDirection: "row",
              alignSelf: "center",
              backgroundColor: COLORS.surface2,
              borderRadius: 999,
              padding: 4,
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            {(["voice", "text"] as const).map((m) => {
              const active = m === inputMode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setInputMode(m)}
                  hitSlop={6}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 999,
                    backgroundColor: active ? COLORS.surface : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name={m === "voice" ? "mic-outline" : "create-outline"}
                    size={14}
                    color={active ? COLORS.text : COLORS.textSub}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: active ? COLORS.text : COLORS.textSub,
                    }}
                  >
                    {m === "voice" ? "Speak" : "Type"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Status pill + orb (voice mode) OR text input (text mode) */}
        <View style={{ alignItems: "center", paddingBottom: 24, paddingTop: 4 }}>
          {mode === "tutor" && inputMode === "text" ? (
            <View
              style={{
                width: "100%",
                paddingHorizontal: 22,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.surface,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  minHeight: 52,
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={`Type a phrase…`}
                  placeholderTextColor={COLORS.textMuted}
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: COLORS.text,
                    paddingVertical: 8,
                  }}
                  multiline
                  blurOnSubmit
                  returnKeyType="send"
                  onSubmitEditing={handleSubmitText}
                />
              </View>
              <Pressable
                onPress={handleSubmitText}
                disabled={!draft.trim() || snap.state === "processing" || snap.state === "speaking"}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor:
                    !draft.trim() || snap.state === "processing" ? COLORS.surface2 : COLORS.text,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {snap.state === "processing" ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={22}
                    color={!draft.trim() ? COLORS.textMuted : "#FFF"}
                  />
                )}
              </Pressable>
            </View>
          ) : (
            <>
              <StatusPill state={snap.state} />
              {showOrb ? (
                <Pressable onPress={onPrimaryTap} hitSlop={20} style={{ marginTop: 14 }}>
                  <Orb state={snap.state} micLevel={snap.micLevel} />
                </Pressable>
              ) : null}
              <Text
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  color: COLORS.textSub,
                  textAlign: "center",
                  paddingHorizontal: 22,
                }}
              >
                {snap.state === "speaking"
                  ? "Tap to interrupt"
                  : isActive
                    ? "Tap to stop"
                    : "Tap to start"}
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function StatusPill({ state }: { state: OfflineVoiceSnapshot["state"] }) {
  const palette = (() => {
    switch (state) {
      case "listening": return { bg: "rgba(239,68,68,0.12)", fg: COLORS.danger };
      case "recognizing":
      case "processing": return { bg: "rgba(245,198,122,0.18)", fg: "#A8741D" };
      case "speaking": return { bg: "rgba(46,107,216,0.12)", fg: COLORS.gold };
      case "error": return { bg: "rgba(239,68,68,0.12)", fg: COLORS.danger };
      case "ready":
      case "idle":
      default: return { bg: COLORS.surface2, fg: COLORS.text };
    }
  })();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: palette.bg,
      }}
    >
      {state === "processing" || state === "recognizing" || state === "checking" ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: palette.fg,
          }}
        />
      )}
      <Text style={{ fontSize: 13, fontWeight: "800", color: palette.fg, letterSpacing: 0.2 }}>
        {STATUS_LABEL[state]}
      </Text>
    </View>
  );
}

// ── Orb — white sphere with blue lighting ─────────────────────────────────
// Matches the SphereOrb on the Quick Tutor screen. White body, thin blue
// rim, soft blue halo. State color shifts the rim only — the sphere body
// stays neutral so it reads premium on the cream Live Mode background.
//
// Removed in this rewrite: dark radial gradient, drop-shadow ellipse, and
// the multi-color orange/red/blue palette. The user complained that the old
// orb felt cluttered and weighty; this version is one focused element with
// a clean light halo.
const AnimatedViewOrb = Animated.createAnimatedComponent(View);

function Orb({ state, micLevel }: { state: OfflineVoiceSnapshot["state"]; micLevel: number }) {
  const SIZE = 110;
  const c = SIZE / 2;

  const isListening  = state === "listening";
  const isSpeaking   = state === "speaking";
  const isProcessing = state === "processing" || state === "recognizing";
  const isActive     = isListening || isSpeaking;

  // Rim color — varies subtly per state. Stays in the blue family except
  // for the listening warning red (a single-state cue, not the whole orb).
  const rimColor =
    isListening  ? "#5BA3FF" :
    isSpeaking   ? "#5BA3FF" :
    isProcessing ? "#E5C97A" :
                   "#9FC2EE";
  const haloColor =
    isListening  ? "rgba(91,163,255,0.55)" :
    isSpeaking   ? "rgba(91,163,255,0.55)" :
    isProcessing ? "rgba(229,201,122,0.42)" :
                   "rgba(127,186,240,0.32)";
  const ringColor = `${rimColor}99`; // fixed per state, alpha for ring fade

  const breath   = useSharedValue(1);
  const r1Scale  = useSharedValue(1);
  const r1Alpha  = useSharedValue(0);
  const r2Scale  = useSharedValue(1);
  const r2Alpha  = useSharedValue(0);
  const actBoost = useSharedValue(1);

  useEffect(() => {
    const dur = isListening ? 900 : isSpeaking ? 1000 : 3000;
    breath.value = withRepeat(
      withTiming(1 + (isActive ? 0.04 : 0.01), { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    );
    if (isActive || isProcessing) {
      const r1ms = isActive ? 1500 : 2000;
      const r2ms = isActive ? 2200 : 2900;
      r1Scale.value = 1;
      r1Scale.value = withRepeat(withTiming(1.55, { duration: r1ms, easing: Easing.out(Easing.quad) }), -1, false);
      r1Alpha.value = withRepeat(withSequence(
        withTiming(0.50, { duration: 80 }),
        withTiming(0, { duration: r1ms - 80, easing: Easing.out(Easing.quad) }),
      ), -1, false);
      r2Scale.value = 1;
      r2Scale.value = withRepeat(withTiming(1.92, { duration: r2ms, easing: Easing.out(Easing.quad) }), -1, false);
      r2Alpha.value = withRepeat(withSequence(
        withTiming(0.28, { duration: 80 }),
        withTiming(0, { duration: r2ms - 80, easing: Easing.out(Easing.quad) }),
      ), -1, false);
    } else {
      r1Scale.value = withTiming(1, { duration: 350 }); r1Alpha.value = withTiming(0, { duration: 350 });
      r2Scale.value = withTiming(1, { duration: 350 }); r2Alpha.value = withTiming(0, { duration: 350 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (!isListening) { actBoost.value = withSpring(1, { damping: 14, stiffness: 120 }); return; }
    actBoost.value = withSpring(1 + Math.min(0.08, micLevel * 0.12), { damping: 9, stiffness: 200 });
  }, [micLevel, isListening]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value * actBoost.value }],
  }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: r1Scale.value }], opacity: r1Alpha.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: r2Scale.value }], opacity: r2Alpha.value }));

  const iconName = isListening ? "mic" : isSpeaking ? "volume-high" : isProcessing ? "sparkles" : "mic-outline";

  return (
    <View style={{ width: SIZE + 64, height: SIZE + 64, alignItems: "center", justifyContent: "center" }}>
      {/* Soft blue halo — the only "ring" element other than the active-state
          pulse rings below. Replaces the dark drop shadow that made the orb
          feel like a heavy ball pressed onto the screen. */}
      <View
        style={{
          position: "absolute",
          width: SIZE + 28,
          height: SIZE + 28,
          borderRadius: (SIZE + 28) / 2,
          backgroundColor: haloColor,
        }}
      />

      {/* Pulse rings: animated, opacity-driven. Only visible while active or
          processing — they show progress, not chrome. */}
      <AnimatedViewOrb style={[{ position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1, borderColor: ringColor }, ring2Style]} />
      <AnimatedViewOrb style={[{ position: "absolute", width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 1.5, borderColor: ringColor }, ring1Style]} />

      <AnimatedViewOrb
        style={[{
          width: SIZE, height: SIZE, borderRadius: SIZE / 2,
          // Light halo via shadow API (matches SphereOrb).
          shadowColor: rimColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isActive ? 0.65 : 0.35,
          shadowRadius: isActive ? 26 : 18,
          elevation: 0, alignItems: "center", justifyContent: "center",
        }, sphereStyle]}
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={c} cy={c} r={c - 0.5} fill={rimColor} />
          <Circle cx={c} cy={c} r={c - 3} fill="#FFFFFF" />
          <SvgEllipse
            cx={c * 0.62}
            cy={c * 0.50}
            rx={c * 0.55}
            ry={c * 0.42}
            fill="rgba(255,255,255,0.92)"
          />
          <SvgEllipse
            cx={c * 0.50}
            cy={c * 0.38}
            rx={c * 0.28}
            ry={c * 0.18}
            fill="#FFFFFF"
          />
        </Svg>
        <View style={{ position: "absolute", alignItems: "center", justifyContent: "center", width: SIZE, height: SIZE }}>
          {/* Icon in dark ink so it reads on the white sphere body. */}
          <Ionicons name={iconName} size={32} color={COLORS.text} />
        </View>
      </AnimatedViewOrb>
    </View>
  );
}

function BlockingScreen({
  title,
  message,
  action,
  loadingModel,
  onLoadModel,
  onRequestPermission,
  onRecheck,
  onClose,
  backgroundColor = COLORS.bg,
}: {
  title: string;
  message: string;
  action?: OfflineReadiness["blockingAction"];
  loadingModel: boolean;
  onLoadModel: () => void;
  onRequestPermission: () => void;
  onRecheck: () => void;
  onClose?: () => void;
  backgroundColor?: string;
}) {
  return (
    <View style={{ flex: 1, backgroundColor, padding: 22 }}>
      {onClose ? (
        <Pressable
          onPress={onClose}
          hitSlop={14}
          style={({ pressed }) => ({
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
            marginBottom: 12,
          })}
        >
          <Ionicons name="close" size={20} color={COLORS.text} />
        </Pressable>
      ) : null}

      <View style={{ flex: 1, justifyContent: "center" }}>
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
            fontSize: 22,
            fontWeight: "800",
            color: COLORS.text,
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 21,
            color: COLORS.textSub,
            textAlign: "center",
          }}
        >
          {message}
        </Text>

        <View style={{ marginTop: 28, gap: 10 }}>
          {action === "load-model" ? (
            <PrimaryButton
              label={loadingModel ? "Loading model…" : "Load offline model"}
              icon="download-outline"
              onPress={onLoadModel}
              disabled={loadingModel}
            />
          ) : null}
          {action === "permission" ? (
            <PrimaryButton
              label="Allow microphone"
              icon="mic-outline"
              onPress={onRequestPermission}
            />
          ) : null}
          <SecondaryButton label="Re-check" icon="refresh-outline" onPress={onRecheck} />
        </View>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 16,
        backgroundColor: disabled ? COLORS.surface2 : COLORS.text,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={disabled ? COLORS.textMuted : "#FFF"} />
      <Text
        style={{
          fontSize: 15,
          fontWeight: "800",
          color: disabled ? COLORS.textMuted : "#FFF",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 52,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={COLORS.text} />
      <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>{label}</Text>
    </Pressable>
  );
}

// ── Translate card ─────────────────────────────────────────────────────────
// Google-Translate-style result for Quick Mode. Shows the phrase the user
// said (small caption), the natural target-language phrase (large), the
// phonetic (read aloud-friendly), the meaning, and a tip. Two action
// buttons: replay TTS, save to library. Both work fully offline.

function TranslateCard({
  response,
  userText,
  targetLang,
  nativeLang: _nativeLang,
}: {
  response: TutorResponse;
  userText: string;
  targetLang: string;
  nativeLang: string;
}) {
  const [replaying, setReplaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset save state whenever the underlying response changes (new turn).
  useEffect(() => {
    setSaved(false);
  }, [response.naturalPhrase, response.audioText]);

  const phrase = response.naturalPhrase || response.audioText || "";
  const phonetic = response.phonetic || "";
  const meaning = response.literalMeaning || response.context || "";
  const tip = response.pronunciationTip || response.articulation?.tonguePlacement || "";

  const onReplay = useCallback(async () => {
    if (replaying || !phrase.trim()) return;
    setReplaying(true);
    try {
      // Replay only the target-language phrase, not the full audioText
      // (which may include native-language coaching). This matches what a
      // user would expect from a "play again" button on a translate card.
      await speakOfflineText({ text: phrase, languageCode: targetLang, rate: 1 });
    } catch {
      /* swallow — UI just goes back to idle */
    } finally {
      setReplaying(false);
    }
  }, [phrase, targetLang, replaying]);

  const onSave = useCallback(async () => {
    if (saved || saving || !phrase.trim()) return;
    setSaving(true);
    try {
      await savePhrase({
        languageCode: targetLang,
        phrase,
        phonetic,
        meaning,
        tip,
        tonguePlacement: response.articulation?.tonguePlacement,
        lipShape: response.articulation?.lipShape,
      });
      setSaved(true);
    } catch {
      /* swallow — keep UI responsive */
    } finally {
      setSaving(false);
    }
  }, [
    phrase,
    phonetic,
    meaning,
    tip,
    targetLang,
    response.articulation?.tonguePlacement,
    response.articulation?.lipShape,
    saved,
    saving,
  ]);

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 22,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
      }}
    >
      {/* What the user said */}
      {userText ? (
        <Text
          style={{
            fontSize: 12,
            color: COLORS.textMuted,
            lineHeight: 17,
            marginBottom: 10,
            fontStyle: "italic",
          }}
          numberOfLines={2}
        >
          You said: “{userText}”
        </Text>
      ) : null}

      {/* The natural phrase — the headline */}
      <Text
        style={{
          fontSize: 26,
          fontWeight: "800",
          color: COLORS.text,
          lineHeight: 33,
          letterSpacing: -0.4,
        }}
      >
        {phrase || "—"}
      </Text>

      {/* Phonetic */}
      {phonetic ? (
        <Text
          style={{
            fontSize: 15,
            color: COLORS.gold,
            fontWeight: "700",
            marginTop: 4,
            letterSpacing: 0.2,
          }}
        >
          {phonetic}
        </Text>
      ) : null}

      {/* Meaning */}
      {meaning ? (
        <Text
          style={{
            fontSize: 14,
            color: COLORS.textSub,
            lineHeight: 20,
            marginTop: 10,
          }}
        >
          {meaning}
        </Text>
      ) : null}

      {/* Pronunciation tip */}
      {tip ? (
        <View
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTopWidth: 1,
            borderColor: COLORS.borderLight,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              color: COLORS.textMuted,
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            TIP
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.text, lineHeight: 19 }}>
            {tip}
          </Text>
        </View>
      ) : null}

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 14,
          gap: 10,
        }}
      >
        <Pressable
          onPress={onReplay}
          disabled={replaying || !phrase.trim()}
          style={({ pressed }) => ({
            flex: 1,
            height: 44,
            borderRadius: 12,
            backgroundColor: COLORS.text,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            opacity: pressed || replaying || !phrase.trim() ? 0.6 : 1,
          })}
        >
          {replaying ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="volume-high" size={18} color="#FFF" />
          )}
          <Text style={{ color: "#FFF", fontSize: 14, fontWeight: "700" }}>
            {replaying ? "Speaking" : "Play"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSave}
          disabled={saved || saving || !phrase.trim()}
          style={({ pressed }) => ({
            flex: 1,
            height: 44,
            borderRadius: 12,
            backgroundColor: saved ? COLORS.success : "transparent",
            borderWidth: saved ? 0 : 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Ionicons
              name={saved ? "checkmark-circle" : "bookmark-outline"}
              size={18}
              color={saved ? "#FFF" : COLORS.text}
            />
          )}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: saved ? "#FFF" : COLORS.text,
            }}
          >
            {saved ? "Saved" : saving ? "Saving" : "Save"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
