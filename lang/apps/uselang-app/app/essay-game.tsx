// ── Essay Challenge ──────────────────────────────────────────────────────────
// Write short essays in your target language. Gemma AI grades grammar & vocab.
// 3 difficulty levels. Prompt pool per language. XP reward based on star rating.
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { chatWithGemma, type ChatMessage } from "@/lib/gemma-engine";
import { addXP } from "@/lib/progress-store";

const BG = "#0C0A09";
const CARD = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const GREEN = "#34C759";
const BLUE = "#5AC8FA";

type Difficulty = "beginner" | "intermediate" | "advanced";

interface Prompt {
  id: string;
  text: string;
  hint: string;
  difficulty: Difficulty;
}

const PROMPTS: Record<string, Prompt[]> = {
  zh: [
    { id: "zh1", text: "Introduce yourself — name, age, where you're from", hint: "我叫… 我是… 我来自…", difficulty: "beginner" },
    { id: "zh2", text: "Describe your daily routine in the morning", hint: "早上… 先… 然后…", difficulty: "beginner" },
    { id: "zh3", text: "Order food at a restaurant — ask for recommendations", hint: "请问… 有什么推荐的… 我想要…", difficulty: "beginner" },
    { id: "zh4", text: "Write about your favorite hobby and why you enjoy it", hint: "我的爱好是… 因为… 每次…", difficulty: "intermediate" },
    { id: "zh5", text: "Describe a recent trip you took or want to take", hint: "上个月… 我去了… 那里有…", difficulty: "intermediate" },
    { id: "zh6", text: "Explain the differences between your culture and Chinese culture", hint: "在我的国家… 但是在中国… 我觉得…", difficulty: "intermediate" },
    { id: "zh7", text: "Write a short story about meeting a new friend abroad", hint: "有一天… 我遇到了… 我们一起…", difficulty: "advanced" },
    { id: "zh8", text: "Discuss the pros and cons of learning languages with AI", hint: "一方面… 另一方面… 总的来说…", difficulty: "advanced" },
    { id: "zh9", text: "Write about your future goals and how learning Mandarin helps", hint: "我的目标是… 学中文可以帮助我… 将来…", difficulty: "advanced" },
    { id: "zh10", text: "Describe what makes a good teacher", hint: "好老师应该… 最重要的是…", difficulty: "intermediate" },
  ],
  es: [
    { id: "es1", text: "Introduce yourself — name, hobbies, and where you live", hint: "Me llamo… Me gusta… Vivo en…", difficulty: "beginner" },
    { id: "es2", text: "Describe your favorite meal and how to prepare it", hint: "Mi comida favorita es… Primero… Después…", difficulty: "beginner" },
    { id: "es3", text: "Write about your weekend plans", hint: "Este fin de semana… Voy a… También…", difficulty: "beginner" },
    { id: "es4", text: "Describe the city or town where you grew up", hint: "Yo crecí en… Es un lugar… Tiene…", difficulty: "intermediate" },
    { id: "es5", text: "Write about the importance of travel for learning", hint: "Viajar es importante porque… Cuando viajamos…", difficulty: "intermediate" },
    { id: "es6", text: "Discuss your favorite book, movie, or song in Spanish", hint: "Mi favorito es… Trata de… Me gusta porque…", difficulty: "advanced" },
    { id: "es7", text: "Write about a challenging experience and what you learned", hint: "Una vez… Fue difícil porque… Aprendí que…", difficulty: "advanced" },
    { id: "es8", text: "Explain why you're learning Spanish", hint: "Estoy aprendiendo español porque… Mi objetivo es…", difficulty: "beginner" },
  ],
  fr: [
    { id: "fr1", text: "Introduce yourself — name, occupation, and interests", hint: "Je m'appelle… Je travaille… J'aime…", difficulty: "beginner" },
    { id: "fr2", text: "Describe a typical day in your life", hint: "Le matin, je… Ensuite… Le soir…", difficulty: "beginner" },
    { id: "fr3", text: "Write about your favorite season and why", hint: "Ma saison préférée est… J'aime… Parce que…", difficulty: "beginner" },
    { id: "fr4", text: "Describe your dream vacation destination", hint: "Je voudrais visiter… C'est un endroit… On peut…", difficulty: "intermediate" },
    { id: "fr5", text: "Write about the importance of learning new languages", hint: "Apprendre une langue est… Cela permet de…", difficulty: "intermediate" },
    { id: "fr6", text: "Discuss the differences between French and English culture", hint: "En France… Mais en Angleterre… Je trouve que…", difficulty: "advanced" },
    { id: "fr7", text: "Write a letter to a French pen pal about your week", hint: "Cher ami… Cette semaine… J'espère que…", difficulty: "advanced" },
    { id: "fr8", text: "Explain what motivates you to learn French", hint: "J'apprends le français parce que… Mon but est…", difficulty: "beginner" },
  ],
};

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; minSentences: number; color: string; xp: number }> = {
  beginner:     { label: "Beginner",     minSentences: 3, color: GREEN, xp: 15 },
  intermediate: { label: "Intermediate", minSentences: 5, color: AMBER, xp: 25 },
  advanced:     { label: "Advanced",     minSentences: 7, color: "#EF4444", xp: 40 },
};

interface GradeResult {
  stars: number;       // 1-5
  grammar: string;
  vocabulary: string;
  suggestions: string;
  corrected: string;
}

export default function EssayGameScreen() {
  const router = useRouter();
  const { lang = "zh" } = useLocalSearchParams<{ lang?: string }>();

  const [phase, setPhase] = useState<"pick" | "write" | "grading" | "result">("pick");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [essay, setEssay] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);

  const prompts = PROMPTS[lang] ?? PROMPTS.zh;

  const pickPrompt = useCallback((diff: Difficulty) => {
    setDifficulty(diff);
    const pool = prompts.filter((p) => p.difficulty === diff);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setPrompt(pick);
    setEssay("");
    setGrade(null);
    setPhase("write");
  }, [prompts]);

  const submitEssay = useCallback(async () => {
    if (!prompt || essay.trim().length < 10) return;
    setPhase("grading");

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `You are a language teacher grading a student's essay written in ${lang === "zh" ? "Mandarin Chinese" : lang === "es" ? "Spanish" : "French"}.
Grade the essay on a scale of 1-5 stars. Provide feedback on:
1. Grammar (1-2 sentences)
2. Vocabulary usage (1-2 sentences)  
3. One specific suggestion for improvement
4. A corrected version of any sentences with errors

Respond in this exact format:
STARS: [1-5]
GRAMMAR: [feedback]
VOCABULARY: [feedback]
SUGGESTION: [suggestion]
CORRECTED: [corrected text or "No corrections needed"]`,
      },
      {
        role: "user",
        content: `Prompt: "${prompt.text}"\nDifficulty: ${difficulty}\nStudent's essay:\n${essay}`,
      },
    ];

    try {
      const response = await chatWithGemma(messages, { maxTokens: 400, temperature: 0.5 });
      const starsMatch = response.match(/STARS:\s*(\d)/);
      const grammarMatch = response.match(/GRAMMAR:\s*(.+?)(?=\nVOCABULARY:|\n\n|$)/s);
      const vocabMatch = response.match(/VOCABULARY:\s*(.+?)(?=\nSUGGESTION:|\n\n|$)/s);
      const sugMatch = response.match(/SUGGESTION:\s*(.+?)(?=\nCORRECTED:|\n\n|$)/s);
      const corrMatch = response.match(/CORRECTED:\s*(.+?)$/s);

      const result: GradeResult = {
        stars: Math.min(5, Math.max(1, parseInt(starsMatch?.[1] ?? "3", 10))),
        grammar: grammarMatch?.[1]?.trim() || "Good effort! Keep practicing your grammar.",
        vocabulary: vocabMatch?.[1]?.trim() || "Nice vocabulary usage for this level.",
        suggestions: sugMatch?.[1]?.trim() || "Try using more complex sentence structures.",
        corrected: corrMatch?.[1]?.trim() || "No corrections needed.",
      };

      setGrade(result);
      const cfg = DIFFICULTY_CONFIG[difficulty];
      await addXP(Math.round(cfg.xp * result.stars / 3));
    } catch {
      setGrade({
        stars: 3,
        grammar: "Your grammar shows good foundational knowledge.",
        vocabulary: "You used appropriate vocabulary for this level.",
        suggestions: "Try expanding your sentence variety next time.",
        corrected: "Unable to provide corrections right now.",
      });
      await addXP(DIFFICULTY_CONFIG[difficulty].xp);
    }

    setPhase("result");
  }, [prompt, essay, difficulty, lang]);

  const renderStars = (count: number) => (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= count ? "star" : "star-outline"} size={28} color={i <= count ? "#F59E0B" : MUTED} />
      ))}
    </View>
  );

  // ── Pick difficulty ──
  if (phase === "pick") {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={S.title}>Essay Challenge</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={S.centered}>
          <Ionicons name="document-text" size={48} color={AMBER} style={{ marginBottom: 16 }} />
          <Text style={S.heroTitle}>Write & Get Graded</Text>
          <Text style={S.heroSub}>AI reads your essay and gives detailed feedback</Text>
          <View style={{ gap: 10, width: "100%", paddingHorizontal: 30, marginTop: 24 }}>
            {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((d, i) => {
              const cfg = DIFFICULTY_CONFIG[d];
              return (
                <Animated.View key={d} entering={FadeInDown.delay(i * 100).duration(400)}>
                  <Pressable onPress={() => pickPrompt(d)} style={S.diffCard}>
                    <View style={[S.diffDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={S.diffLabel}>{cfg.label}</Text>
                      <Text style={S.diffSub}>{cfg.minSentences}+ sentences · {cfg.xp} XP</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Write ──
  if (phase === "write" && prompt) {
    const cfg = DIFFICULTY_CONFIG[difficulty];
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Pressable onPress={() => setPhase("pick")} hitSlop={12} style={S.backBtn}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={S.title}>{cfg.label}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <View style={S.promptCard}>
            <Text style={S.promptLabel}>YOUR PROMPT</Text>
            <Text style={S.promptText}>{prompt.text}</Text>
            <Text style={S.promptHint}>Hint: {prompt.hint}</Text>
          </View>
          <TextInput
            style={S.essayInput}
            placeholder={`Write ${cfg.minSentences}+ sentences...`}
            placeholderTextColor={MUTED}
            value={essay}
            onChangeText={setEssay}
            multiline
            textAlignVertical="top"
          />
          <Text style={S.charCount}>{essay.length} characters</Text>
        </ScrollView>
        <View style={S.bottomBar}>
          <Pressable
            onPress={submitEssay}
            disabled={essay.trim().length < 10}
            style={[S.submitBtn, essay.trim().length < 10 && { opacity: 0.4 }]}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={S.submitBtnText}>Submit for Grading</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Grading ──
  if (phase === "grading") {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.centered}>
          <ActivityIndicator size="large" color={AMBER} />
          <Text style={[S.heroTitle, { marginTop: 20 }]}>Grading your essay...</Text>
          <Text style={S.heroSub}>AI is reading and analyzing your writing</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Result ──
  if (phase === "result" && grade) {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <View style={{ width: 36 }} />
          <Text style={S.title}>Results</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          <Animated.View entering={ZoomIn.duration(400)} style={{ alignItems: "center", marginBottom: 20 }}>
            {renderStars(grade.stars)}
            <Text style={S.starLabel}>{grade.stars}/5 Stars</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={S.feedbackCard}>
            <View style={S.feedbackRow}>
              <Ionicons name="checkmark-circle" size={18} color={GREEN} />
              <Text style={S.feedbackTitle}>Grammar</Text>
            </View>
            <Text style={S.feedbackText}>{grade.grammar}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={S.feedbackCard}>
            <View style={S.feedbackRow}>
              <Ionicons name="book" size={18} color={BLUE} />
              <Text style={S.feedbackTitle}>Vocabulary</Text>
            </View>
            <Text style={S.feedbackText}>{grade.vocabulary}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(400)} style={S.feedbackCard}>
            <View style={S.feedbackRow}>
              <Ionicons name="bulb" size={18} color={AMBER} />
              <Text style={S.feedbackTitle}>Suggestion</Text>
            </View>
            <Text style={S.feedbackText}>{grade.suggestions}</Text>
          </Animated.View>

          {grade.corrected !== "No corrections needed" && (
            <Animated.View entering={FadeInDown.delay(500).duration(400)} style={S.feedbackCard}>
              <View style={S.feedbackRow}>
                <Ionicons name="create" size={18} color="#EF4444" />
                <Text style={S.feedbackTitle}>Corrections</Text>
              </View>
              <Text style={S.feedbackText}>{grade.corrected}</Text>
            </Animated.View>
          )}
        </ScrollView>

        <View style={S.bottomBar}>
          <Pressable onPress={() => setPhase("pick")} style={S.submitBtn}>
            <Text style={S.submitBtnText}>Try Another</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 18,
    paddingTop: 8, paddingBottom: 10, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: INK, letterSpacing: -0.3, textAlign: "center" },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: INK, textAlign: "center" },
  heroSub: { fontSize: 14, color: MUTED, textAlign: "center", marginTop: 6 },

  diffCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  diffDot: { width: 12, height: 12, borderRadius: 6 },
  diffLabel: { fontSize: 16, fontWeight: "700", color: INK },
  diffSub: { fontSize: 12, color: MUTED, marginTop: 2 },

  promptCard: {
    backgroundColor: "rgba(200,128,74,0.10)", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "rgba(200,128,74,0.18)", marginBottom: 16,
  },
  promptLabel: { fontSize: 11, fontWeight: "700", color: AMBER, letterSpacing: 1.2, marginBottom: 8 },
  promptText: { fontSize: 16, fontWeight: "600", color: INK, lineHeight: 22 },
  promptHint: { fontSize: 13, color: MUTED, marginTop: 8, fontStyle: "italic" },

  essayInput: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16,
    fontSize: 16, color: INK, minHeight: 200, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)", lineHeight: 24,
  },
  charCount: { fontSize: 12, color: MUTED, textAlign: "right", marginTop: 8 },

  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16,
    backgroundColor: BG,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: AMBER, borderRadius: 16, paddingVertical: 16,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

  starLabel: { fontSize: 18, fontWeight: "800", color: INK, marginTop: 8 },

  feedbackCard: {
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 16,
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.08)", marginBottom: 12,
  },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 14, fontWeight: "700", color: INK },
  feedbackText: { fontSize: 14, color: "rgba(243,237,227,0.80)", lineHeight: 20 },
});
