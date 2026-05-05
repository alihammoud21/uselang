import "@/styles/global.css";
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator, LogBox } from "react-native";
import * as Font from "expo-font";
import { getUserProfile } from "@/lib/user-store";
import { loadSession } from "@/lib/auth-client";
import { COLORS } from "@/lib/constants";
import { isGemmaSupported, getGemmaState, downloadAndLoadModel } from "@/lib/gemma-engine";
import { prewarmOfflineTts } from "@/lib/offline-tts";
import { initTtsVoiceGender } from "@/lib/tts-router";
import { initNotifications } from "@/lib/daily-notifications";
import { ThemeProvider } from "@/lib/theme-context";

// Silence noisy dev warnings that don't affect production quality.
LogBox.ignoreLogs([
  "Sending `onAnimatedValueUpdate`",
  "new NativeEventEmitter",
  "Require cycle:",
  "[Reanimated]",
  "Non-serializable values were found",
  "AsyncStorage has been extracted",
  "Setting a timer",
  "ViewPropTypes will be removed",
  "EventEmitter.removeListener",
  "ExpoSpeechRecognition",
  "ProgressViewIOS has been",
  "Please report:",
]);
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Load custom fonts
  useEffect(() => {
    Font.loadAsync({
      "Fraunces-Regular": require("../assets/fonts/Fraunces-Regular.otf"),
      "Fraunces-Italic": require("../assets/fonts/Fraunces-Italic.otf"),
      "Fraunces-Bold": require("../assets/fonts/Fraunces-Bold.otf"),
      "Geist-Regular": require("../assets/fonts/Geist-Regular.ttf"),
      "Geist-Medium": require("../assets/fonts/Geist-Medium.ttf"),
      "Geist-SemiBold": require("../assets/fonts/Geist-SemiBold.ttf"),
      "Geist-Bold": require("../assets/fonts/Geist-Bold.ttf"),
      "GeistMono-Regular": require("../assets/fonts/GeistMono-Regular.ttf"),
    })
      .then(() => setFontsLoaded(true))
      .catch(() => setFontsLoaded(true)); // fallback to system fonts on error
  }, []);

  // Initial load — restore auth session + check onboarding state
  useEffect(() => {
    Promise.all([getUserProfile(), loadSession()]).then(([profile]) => {
      setReady(true);
      // Pre-warm Apple TTS for the user's target language so the first
      // foreign-language utterance doesn't have a 1-3s cold-start delay.
      if (profile?.learningLanguage) {
        prewarmOfflineTts(profile.learningLanguage);
        prewarmOfflineTts("en"); // also warm English for coaching segments
      }
      // Apply persisted voice gender preference to TTS router
      initTtsVoiceGender().catch(() => {});
    });
    // Register notification handler as early as possible so daily
    // reminders show even when the app is in the foreground.
    initNotifications();
  }, []);

  // Auto-download Gemma model on first native launch.
  // Runs once, in the background. The stub serves until the real model is ready.
  // On subsequent launches the cached model loads quickly (no re-download).
  useEffect(() => {
    if (!isGemmaSupported()) {
      console.log("[gemma] Native module not supported here — skipping auto-download.");
      return;
    }
    const state = getGemmaState();
    if (state.availability === "ready" && state.loaded) return;
    console.log("[gemma] Auto-triggering model download/load on app start…");
    downloadAndLoadModel().then((ok) => {
      console.log(`[gemma] Auto-load result: ${ok ? "success" : "failed (stub still serving)"}`);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === "onboarding";
    if (inOnboarding) return;
    getUserProfile().then((profile) => {
      if (!profile.onboarded) {
        router.replace("/onboarding");
      }
    });
  }, [ready, segments]);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F3EDE3", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: "#1C1714", letterSpacing: -1, marginBottom: 16 }}>UseLang</Text>
        <ActivityIndicator size="large" color="#A85D2E" />
      </View>
    );
  }

  return (
    <ThemeProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="camera"
            options={{ presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            name="live"
            options={{ presentation: "fullScreenModal" }}
          />
          <Stack.Screen
            name="unit-exam"
            options={{ presentation: "fullScreenModal", gestureEnabled: false }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ThemeProvider>
  );
}
