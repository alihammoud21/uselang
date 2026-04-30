// ── Interactive Story Screen ─────────────────────────────────────────────────
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { getStory, type Story, type StoryChoice, type VocabWord } from "@/data/stories";
import { addXP } from "@/lib/progress-store";
import { speakRoutedText } from "@/lib/tts-router";

const BG = "#0F0C09";
const CARD = "#1A1510";
const AMBER = "#C8804A";
const AMBER_DIM = "rgba(200,128,74,0.15)";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.55)";
const SAFE = "rgba(52,199,89,0.15)";
const SAFE_B = "rgba(52,199,89,0.55)";
const RISKY = "rgba(255,159,10,0.15)";
const RISKY_B = "rgba(255,159,10,0.55)";

type Phase = "vocab" | "story" | "done";

export default function StoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lang?: string }>();
  const lang = params.lang || "zh";

  const story: Story | undefined = getStory(lang);

  const [phase, setPhase] = useState<Phase>("vocab");
  const [vocabIdx, setVocabIdx] = useState(0);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [choiceResult, setChoiceResult] = useState<{
    choice: StoryChoice;
    xpGained: number;
  } | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const ttsRef = useRef(false);

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

  const handleChoice = useCallback(async (choice: StoryChoice) => {
    const scene = story!.scenes[sceneIdx];
    let xpGained = choice.xpReward;
    if (choice.isRisky) {
      const roll = Math.random();
      if (roll < 0.35) {
        xpGained = Math.max(0, choice.xpReward - choice.xpPenalty);
      }
    }
    setTotalXP((prev) => prev + xpGained);
    setChoiceResult({ choice, xpGained });
    try { await addXP(xpGained); } catch { /* non-fatal */ }
  }, [story, sceneIdx]);

  const advanceScene = useCallback(() => {
    setChoiceResult(null);
    setRevealed(false);
    if (sceneIdx + 1 < (story?.scenes.length ?? 0)) {
      setSceneIdx((i) => i + 1);
    } else {
      setPhase("done");
    }
  }, [sceneIdx, story]);

  if (!story) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: INK, fontSize: 16, fontFamily: "Geist-Regular" }}>
          No story available for this language yet.
        </Text>
        <Pressable onPress={handleClose} style={{ marginTop: 20 }}>
          <Text style={{ color: AMBER, fontSize: 15 }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scene = story.scenes[sceneIdx];

  // ── DONE screen ──
  if (phase === "done") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: AMBER_DIM, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24 }}>
              <Ionicons name="trophy" size={36} color={AMBER} />
            </View>
            <Text style={{ fontFamily: "Fraunces-Bold", fontSize: 28, color: INK, textAlign: "center", marginBottom: 8 }}>
              Story Complete!
            </Text>
            <Text style={{ fontFamily: "Geist-Regular", fontSize: 15, color: MUTED, textAlign: "center", lineHeight: 22, marginBottom: 32 }}>
              You earned {totalXP} XP exploring {story.title}.
            </Text>
            <Pressable
              onPress={handleClose}
              style={{ backgroundColor: AMBER, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 48, alignSelf: "center" }}
            >
              <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 16, color: "#FFF" }}>Done</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── VOCAB phase ──
  if (phase === "vocab") {
    const word: VocabWord = story.vocab[vocabIdx];
    const isLast = vocabIdx >= story.vocab.length - 1;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={[S.header]}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={INK} />
          </Pressable>
          <Text style={S.headerTitle}>{story.title}</Text>
          <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: MUTED }}>{vocabIdx + 1}/{story.vocab.length}</Text>
        </View>

        {/* Progress */}
        <View style={S.progressBar}>
          <View style={[S.progressFill, { width: `${((vocabIdx + 1) / story.vocab.length) * 100}%` }]} />
        </View>

        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }}>
          <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 11, color: AMBER, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20 }}>
            Learn these words first
          </Text>

          <Animated.View key={vocabIdx} entering={FadeInDown.duration(300)} style={S.vocabCard}>
            <Text style={S.vocabTarget}>{word.target}</Text>
            {word.phonetic && (
              <Text style={S.vocabPhonetic}>{word.phonetic}</Text>
            )}
            <Text style={S.vocabMeaning}>{word.meaning}</Text>
            <Pressable
              onPress={() => speakLine(word.target)}
              style={({ pressed }) => [S.speakBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={ttsPlaying ? "volume-high" : "volume-medium-outline"} size={18} color={AMBER} />
              <Text style={S.speakBtnText}>Hear it</Text>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={() => {
              if (isLast) {
                setPhase("story");
              } else {
                setVocabIdx((i) => i + 1);
              }
            }}
            style={({ pressed }) => [S.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={S.nextBtnText}>{isLast ? "Start Story" : "Next Word"}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── STORY phase ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={["top"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => {
          Alert.alert("Leave story?", "Your XP earned so far will be kept.", [
            { text: "Keep Going", style: "cancel" },
            { text: "Leave", style: "destructive", onPress: handleClose },
          ]);
        }} hitSlop={12}>
          <Ionicons name="close" size={22} color={INK} />
        </Pressable>
        <Text style={S.headerTitle}>Scene {sceneIdx + 1}/{story.scenes.length}</Text>
        <View style={S.xpPill}>
          <Text style={S.xpPillText}>+{totalXP} XP</Text>
        </View>
      </View>

      <View style={S.progressBar}>
        <View style={[S.progressFill, { width: `${(sceneIdx / story.scenes.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Narration */}
        <Animated.View key={`narration-${sceneIdx}`} entering={FadeInDown.duration(350)} style={S.narrationCard}>
          <Text style={S.narrationText}>{scene.narration}</Text>
        </Animated.View>

        {/* Target line */}
        <Animated.View key={`target-${sceneIdx}`} entering={FadeInDown.duration(350).delay(100)} style={S.targetCard}>
          <Text style={S.targetLine}>{scene.targetLine}</Text>
          {scene.targetPhonetic && (
            <Text style={S.targetPhonetic}>{scene.targetPhonetic}</Text>
          )}
          <Pressable
            onPress={() => speakLine(scene.targetLine)}
            style={({ pressed }) => [S.speakBtn, { marginTop: 12, alignSelf: "flex-start" }, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="volume-medium-outline" size={16} color={AMBER} />
            <Text style={S.speakBtnText}>Listen</Text>
          </Pressable>
          {!revealed && (
            <Pressable onPress={() => setRevealed(true)} style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: "Geist-Regular", fontSize: 13, color: MUTED }}>
                Tap to reveal meaning
              </Text>
            </Pressable>
          )}
          {revealed && (
            <Animated.Text entering={FadeInUp.duration(200)} style={S.revealedMeaning}>
              {/* Try to match to vocab */}
              {scene.narration}
            </Animated.Text>
          )}
        </Animated.View>

        {/* Choice result */}
        {choiceResult && (
          <Animated.View entering={FadeInDown.duration(350)} style={S.resultCard}>
            <Text style={S.resultOutcome}>{choiceResult.choice.outcome}</Text>
            <Text style={S.resultTargetLine}>{choiceResult.choice.outcomeTarget}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <Ionicons name="star" size={14} color={AMBER} />
              <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 14, color: AMBER }}>
                +{choiceResult.xpGained} XP earned
              </Text>
            </View>
            <Pressable
              onPress={advanceScene}
              style={({ pressed }) => [S.nextBtn, { marginTop: 16 }, pressed && { opacity: 0.85 }]}
            >
              <Text style={S.nextBtnText}>{sceneIdx + 1 < story.scenes.length ? "Next Scene" : "Finish Story"}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </Animated.View>
        )}

        {/* Choices */}
        {!choiceResult && (
          <Animated.View key={`choices-${sceneIdx}`} entering={FadeInDown.duration(350).delay(200)}>
            <Text style={[S.narrationText, { marginBottom: 10, marginTop: 4 }]}>What do you say?</Text>
            {scene.choices.map((choice) => (
              <Pressable
                key={choice.id}
                onPress={() => handleChoice(choice)}
                style={({ pressed }) => [
                  S.choiceBtn,
                  choice.isRisky ? { borderColor: RISKY_B, backgroundColor: RISKY } : { borderColor: SAFE_B, backgroundColor: SAFE },
                  pressed && { opacity: 0.80 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={S.choiceTarget}>{choice.label}</Text>
                  <Text style={S.choiceHint}>{choice.labelHint}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={[S.choiceXP, { color: choice.isRisky ? "#FF9F0A" : "#34C759" }]}>
                    +{choice.xpReward} XP
                  </Text>
                  {choice.isRisky && (
                    <Text style={{ fontFamily: "Geist-Regular", fontSize: 10, color: "#FF9F0A" }}>risky</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  headerTitle: { fontFamily: "Geist-SemiBold", fontSize: 15, color: INK },
  progressBar: { height: 2, backgroundColor: "rgba(243,237,227,0.10)", marginHorizontal: 20, borderRadius: 1, marginBottom: 16 },
  progressFill: { height: 2, backgroundColor: AMBER, borderRadius: 1 },

  vocabCard: {
    backgroundColor: CARD, borderRadius: 24, padding: 32,
    alignItems: "center", width: "100%", marginBottom: 24,
    borderWidth: 0.5, borderColor: "rgba(200,128,74,0.15)",
  },
  vocabTarget: { fontFamily: "Fraunces-Bold", fontSize: 48, color: INK, textAlign: "center", marginBottom: 8 },
  vocabPhonetic: { fontFamily: "Geist-Regular", fontSize: 18, color: AMBER, marginBottom: 8, letterSpacing: 0.5 },
  vocabMeaning: { fontFamily: "Geist-Regular", fontSize: 16, color: MUTED, marginBottom: 16 },

  speakBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: AMBER_DIM, borderRadius: 20 },
  speakBtnText: { fontFamily: "Geist-Medium", fontSize: 13, color: AMBER },

  nextBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: AMBER, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 28, alignSelf: "center",
  },
  nextBtnText: { fontFamily: "Geist-SemiBold", fontSize: 15, color: "#FFF" },

  narrationCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 18, marginBottom: 12,
    borderWidth: 0.5, borderColor: "rgba(243,237,227,0.06)",
  },
  narrationText: { fontFamily: "Geist-Regular", fontSize: 14, color: MUTED, lineHeight: 20 },

  targetCard: {
    backgroundColor: "rgba(200,128,74,0.08)", borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 0.5, borderColor: "rgba(200,128,74,0.20)",
  },
  targetLine: { fontFamily: "Fraunces-Regular", fontSize: 26, color: INK, lineHeight: 34 },
  targetPhonetic: { fontFamily: "Geist-Regular", fontSize: 14, color: AMBER, marginTop: 4, letterSpacing: 0.3 },
  revealedMeaning: { fontFamily: "Geist-Regular", fontSize: 13, color: MUTED, marginTop: 8, fontStyle: "italic" },

  choiceBtn: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, padding: 16, marginBottom: 10,
    borderWidth: 1,
  },
  choiceTarget: { fontFamily: "Geist-SemiBold", fontSize: 15, color: INK, marginBottom: 3 },
  choiceHint: { fontFamily: "Geist-Regular", fontSize: 12, color: MUTED },
  choiceXP: { fontFamily: "Geist-Bold", fontSize: 13 },

  resultCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 20, marginBottom: 16,
    borderWidth: 0.5, borderColor: "rgba(200,128,74,0.25)",
  },
  resultOutcome: { fontFamily: "Geist-Regular", fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 8 },
  resultTargetLine: { fontFamily: "Fraunces-Regular", fontSize: 20, color: INK },

  xpPill: { backgroundColor: AMBER_DIM, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  xpPillText: { fontFamily: "Geist-Bold", fontSize: 12, color: AMBER },
});
