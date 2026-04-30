// ── Daily Jokes Screen ───────────────────────────────────────────────────────
import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getJokesForLanguage, getDailyJoke, type Joke } from "@/data/jokes";
import { speakRoutedText } from "@/lib/tts-router";

const BG = "#F3EDE3";
const CARD = "#FFFFFF";
const AMBER = "#A85D2E";
const INK = "#111010";
const MUTED = "#6B625A";
const HAIR = "rgba(17,16,16,0.08)";

export default function JokesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang = params.lang || "zh";

  const allJokes = getJokesForLanguage(lang);
  const daily = getDailyJoke(lang);
  const [currentIdx, setCurrentIdx] = useState<number>(() => {
    if (!daily) return 0;
    return allJokes.findIndex((j) => j.id === daily.id);
  });

  const [revealed, setRevealed] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsRef = useRef(false);

  const joke: Joke | undefined = allJokes[currentIdx];

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/lessons");
  }, [router]);

  const speakLine = useCallback(async (text: string) => {
    if (ttsRef.current) return;
    ttsRef.current = true;
    setTtsPlaying(true);
    try {
      await speakRoutedText({ text, languageCode: lang });
    } catch { /* non-fatal */ }
    ttsRef.current = false;
    setTtsPlaying(false);
  }, [lang]);

  const nextJoke = useCallback(() => {
    setCurrentIdx((i) => (i + 1) % allJokes.length);
    setRevealed(false);
  }, [allJokes.length]);

  if (!joke) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: INK, fontFamily: "Geist-Regular", fontSize: 16 }}>
          No jokes available for this language yet.
        </Text>
        <Pressable onPress={handleClose} style={{ marginTop: 20 }}>
          <Text style={{ color: AMBER }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={handleClose} hitSlop={12}>
          <Ionicons name="close" size={22} color={INK} />
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 18 }}>😂</Text>
          <Text style={S.headerTitle}>Language Jokes</Text>
        </View>
        <Text style={S.counter}>{currentIdx + 1}/{allJokes.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={joke.id} entering={FadeInDown.duration(300)}>

          {/* Setup card */}
          <View style={S.setupCard}>
            <Text style={S.setupLabel}>SETUP</Text>
            <Text style={S.setupText}>{joke.setup}</Text>
            {joke.setupRomanized && (
              <Text style={S.romanized}>{joke.setupRomanized}</Text>
            )}
            <Text style={S.meaningText}>{joke.setupMeaning}</Text>

            <Pressable
              onPress={() => speakLine(joke.setup)}
              style={({ pressed }) => [S.hearBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons
                name={ttsPlaying ? "volume-high" : "volume-medium-outline"}
                size={16}
                color={AMBER}
              />
              <Text style={S.hearBtnText}>Hear it</Text>
            </Pressable>
          </View>

          {/* Punchline — hidden until tap */}
          {!revealed ? (
            <Pressable onPress={() => setRevealed(true)} style={S.revealBtn}>
              <Ionicons name="eye-outline" size={18} color="#FFF" />
              <Text style={S.revealBtnText}>Reveal Punchline</Text>
            </Pressable>
          ) : (
            <Animated.View entering={FadeInDown.duration(300)} style={S.punchlineCard}>
              <Text style={S.punchlineLabel}>PUNCHLINE</Text>
              <Text style={S.punchlineText}>{joke.punchline}</Text>
              {joke.punchlineRomanized && (
                <Text style={[S.romanized, { color: AMBER }]}>{joke.punchlineRomanized}</Text>
              )}
              <Text style={S.meaningText}>{joke.punchlineMeaning}</Text>

              <Pressable
                onPress={() => speakLine(joke.punchline)}
                style={({ pressed }) => [S.hearBtn, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="volume-medium-outline" size={16} color={AMBER} />
                <Text style={S.hearBtnText}>Hear it</Text>
              </Pressable>

              {joke.explanation && (
                <View style={S.explanationBox}>
                  <Ionicons name="bulb-outline" size={14} color={AMBER} />
                  <Text style={S.explanationText}>{joke.explanation}</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Next joke */}
          {revealed && (
            <Animated.View entering={FadeInDown.duration(200).delay(150)}>
              <Pressable
                onPress={nextJoke}
                style={({ pressed }) => [S.nextBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={S.nextBtnText}>Next Joke</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </Pressable>
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: HAIR,
  },
  headerTitle: { fontFamily: "Fraunces-Regular", fontSize: 18, color: INK },
  counter: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED },

  setupCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 22, marginTop: 20, marginBottom: 12,
    borderWidth: 0.5, borderColor: HAIR,
    shadowColor: INK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  setupLabel: {
    fontFamily: "Geist-SemiBold", fontSize: 10, letterSpacing: 1.5, color: MUTED,
    textTransform: "uppercase", marginBottom: 10,
  },
  setupText: { fontFamily: "Fraunces-Regular", fontSize: 22, color: INK, lineHeight: 30, marginBottom: 6 },
  romanized: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED, marginBottom: 4, letterSpacing: 0.3 },
  meaningText: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED, fontStyle: "italic", marginBottom: 14 },

  hearBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(168,93,46,0.10)",
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: "flex-start",
  },
  hearBtnText: { fontFamily: "Geist-Medium", fontSize: 13, color: AMBER },

  revealBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: AMBER, borderRadius: 16,
    paddingVertical: 16, marginBottom: 12,
  },
  revealBtnText: { fontFamily: "Geist-SemiBold", fontSize: 15, color: "#FFF" },

  punchlineCard: {
    backgroundColor: "rgba(168,93,46,0.06)", borderRadius: 20, padding: 22, marginBottom: 16,
    borderWidth: 0.5, borderColor: "rgba(168,93,46,0.18)",
  },
  punchlineLabel: {
    fontFamily: "Geist-SemiBold", fontSize: 10, letterSpacing: 1.5, color: AMBER,
    textTransform: "uppercase", marginBottom: 10,
  },
  punchlineText: { fontFamily: "Fraunces-Regular", fontSize: 22, color: INK, lineHeight: 30, marginBottom: 6 },

  explanationBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "rgba(168,93,46,0.08)", borderRadius: 12,
    padding: 12, marginTop: 14,
  },
  explanationText: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED, flex: 1, lineHeight: 18 },

  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: INK, borderRadius: 16,
    paddingVertical: 14, marginBottom: 12,
  },
  nextBtnText: { fontFamily: "Geist-SemiBold", fontSize: 15, color: "#FFF" },
});
