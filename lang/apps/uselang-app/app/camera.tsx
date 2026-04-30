import React, { useState, useRef, useCallback } from "react";
import { View, Text, Pressable, Image, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { COLORS } from "@/lib/constants";
import { postTutorSession, type TutorResponse } from "@/lib/tutor-api";
import { TutorResponseCard } from "@/components/TutorResponseCard";
import { playTutorAudio, stopTutorAudio } from "@/lib/tutor-audio";
import { getUserProfile } from "@/lib/user-store";
import { savePhrase } from "@/lib/phrase-store";

type CaptureState = "idle" | "analyzing" | "done" | "error";

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [response, setResponse] = useState<TutorResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liveCoachMode, setLiveCoachMode] = useState(true);
  const cameraRef = useRef<any>(null);

  // ⚠️ Hooks-order rule: all hooks (useCallback included) MUST run on every
  // render. Do NOT add an early return above this block — the permission gate
  // lives below so React sees the same hook count regardless of permission.
  // Previously a permission early-return sat between useState and useCallback,
  // tripping the "change in the order of Hooks" warning.

  // ── Capture + OCR ───────────────────────────────────────────────────────

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      setPhoto(pic.uri);
      setState("error");
      setError("Photo translation is coming soon. Use Live Coach mode to practice pronunciation, or type the text in the Speak tab.");
    } catch (err: any) {
      setState("error");
      setError(err?.message || "Could not analyze the photo.");
    }
  }, []);

  const takeLiveCoachSnapshot = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.45, base64: true });
      setPhoto(pic.uri);
      setState("analyzing");
      const profile = await getUserProfile();
      const learn = profile.learningLanguage || "fr";
      const res = await postTutorSession({
        mode: "live-camera",
        languageCode: learn,
        nativeLanguageCode: profile.knownLanguages?.[0] || "en",
        text: "Give one general pronunciation coaching cue for the target language. Do not claim to inspect an image or video frame.",
        tutorStyle: profile.tutorStyle,
        commitment: profile.commitment,
        includeAudio: false,
      });
      setResponse(res);
      setState("done");
    } catch (err: any) {
      setState("error");
      setError(err?.message || "Could not run live camera coaching.");
    }
  }, []);

  const reset = useCallback(async () => {
    await stopTutorAudio();
    setPhoto(null);
    setResponse(null);
    setError("");
    setSaved(false);
    setIsPlaying(false);
    setState("idle");
  }, []);

  const playAudio = useCallback(async () => {
    if (!response) return;
    if (isPlaying) {
      await stopTutorAudio();
      setIsPlaying(false);
      return;
    }
    const profile = await getUserProfile();
    await playTutorAudio(
      {
        audioBase64: response.audioBase64,
        audioMimeType: response.audioMimeType,
        audioSegments: response.audioSegments,
        fallbackText: response.audioText || response.naturalPhrase,
        languageCode: profile.learningLanguage || "fr",
        nativeLanguageCode: profile.knownLanguages?.[0] || "en",
      },
      {
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      }
    );
  }, [response, isPlaying]);

  const saveToLibrary = useCallback(async () => {
    if (!response || saved) return;
    const profile = await getUserProfile();
    await savePhrase({
      languageCode: profile.learningLanguage || "fr",
      phrase: response.naturalPhrase,
      phonetic: response.phonetic,
      meaning: response.context || response.literalMeaning,
      tip: response.pronunciationTip,
      audioBase64: response.audioBase64,
      audioMimeType: response.audioMimeType,
    });
    setSaved(true);
  }, [response, saved]);

  // ── Permission gate (must come AFTER every hook above) ──────────────────

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Ionicons name="camera-outline" size={48} color={COLORS.textMuted} />
        <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.text, marginTop: 16, marginBottom: 8, textAlign: "center" }}>
          Camera Access Needed
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSub, textAlign: "center", marginBottom: 24 }}>
          Take a photo of any text to translate it and learn how to say it.
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.text }}
        >
          <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 16 }}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <SafeAreaView
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 8,
        }}
      >
        <Pressable
          onPress={async () => {
            // Stop any in-flight tutor audio + recording before dismissing so
            // we don't leak into the tab the user lands back on.
            try { await stopTutorAudio(); } catch {}
            if (router.canGoBack()) router.back();
            else router.replace("/(tabs)");
          }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </SafeAreaView>

      {!photo ? (
        <>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={liveCoachMode ? "front" : "back"} />
          <View
            style={{
              position: "absolute",
              bottom: 50,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <Pressable
              onPress={() => setLiveCoachMode((v) => !v)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: liveCoachMode ? COLORS.gold : "rgba(0,0,0,0.45)",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: liveCoachMode ? COLORS.text : "#fff", fontSize: 13, fontWeight: "700" }}>
                {liveCoachMode ? "Live coach on" : "Live coach"}
              </Text>
            </Pressable>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: "500", marginBottom: 16, marginTop: 10 }}>
              {liveCoachMode ? "Show your mouth, then tap for coaching" : "Point at text to translate"}
            </Text>
            <Pressable
              onPress={liveCoachMode ? takeLiveCoachSnapshot : takePicture}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                borderWidth: 4,
                borderColor: "#fff",
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff" }} />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Image source={{ uri: photo }} style={{ flex: 1, resizeMode: "cover" }} />

          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(255,255,255,0.97)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 14,
              paddingBottom: 38,
              paddingHorizontal: 16,
              maxHeight: "72%",
            }}
          >
            {state === "analyzing" && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <ActivityIndicator color={COLORS.gold} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.text, marginTop: 12 }}>
                  Reading the text…
                </Text>
              </View>
            )}

            {state === "error" && (
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 6 }}>
                  Couldn't read that
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginBottom: 14 }}>
                  {error}
                </Text>
                <ActionButton label="Try again" onPress={reset} primary />
              </View>
            )}

            {state === "done" && response && (
              <ScrollView>
                {response.extractedText ? (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: COLORS.textMuted,
                      letterSpacing: 0.8,
                      marginBottom: 6,
                    }}
                  >
                    DETECTED · “{response.extractedText.slice(0, 60)}{response.extractedText.length > 60 ? "…" : ""}”
                  </Text>
                ) : null}
                <TutorResponseCard
                  response={response}
                  isPlaying={isPlaying}
                  isDownloaded={saved}
                  onPlay={playAudio}
                  onDownload={saveToLibrary}
                />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <ActionButton label="Retake" onPress={reset} />
                  <ActionButton
                    label="Practice this"
                    onPress={() => router.replace("/(tabs)/train")}
                    primary
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </>
      )}
    </View>
  );
}

function ActionButton({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: primary ? 0 : 1,
        borderColor: COLORS.border,
        backgroundColor: primary ? COLORS.text : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: primary ? "#FFF" : COLORS.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
