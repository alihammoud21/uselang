// ── AI Chatbot ───────────────────────────────────────────────────────────────
// Gemma-powered text chat. Dual mode: Language Tutor or General Assistant.
// Persists last 50 messages in AsyncStorage. Works offline via stub fallback.
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";
import { chatWithGemma, type ChatMessage } from "@/lib/gemma-engine";

const BG = "#0C0A09";
const CARD = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const BLUE = "#5AC8FA";
const USER_BG = "rgba(200,128,74,0.18)";
const AI_BG = "rgba(255,255,255,0.06)";

const STORAGE_KEY = "lang:chatbot:history";
const MAX_HISTORY = 50;

type Mode = "tutor" | "general";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
}

const LANG_NAMES: Record<string, string> = {
  zh: "Mandarin Chinese", es: "Spanish", fr: "French", en: "English", ja: "Japanese", ko: "Korean",
};

function buildTutorPrompt(lang: string, context?: string): string {
  const langName = LANG_NAMES[lang] || lang;
  return `You are a personal language tutor inside a mobile app called UseLang. The user is learning ${langName}.

Your role:
- Teach grammar rules clearly with examples in both ${langName} and English
- Explain vocabulary with usage examples and memory tips
- Help with pronunciation using phonetic guides
- If the user says they don't understand something, break it down step by step
- Correct mistakes kindly and explain why something is wrong
- Use tables or bullet points when listing grammar rules or conjugations
- Be warm, encouraging, and thorough — don't cut answers short
${context ? `\nLesson context: The user is currently on lesson "${context}". Tailor help to this topic if relevant.` : ""}

Always reply in English unless the user asks you to reply in ${langName}.`;
}

const SYSTEM_PROMPTS: Record<Mode, string> = {
  tutor: "", // dynamically built per-request using buildTutorPrompt
  general: `You are a helpful personal AI assistant inside a language learning app called UseLang.
Answer any question the user asks — language help, math, science, coding, life advice, culture, history, etc.
Be thorough and genuinely helpful. Use examples, bullet points, or tables where they add clarity.
Don't cut answers short — give complete, useful responses.`,
};

export default function ChatbotScreen() {
  const router = useRouter();
  const { lang = "zh", context = "" } = useLocalSearchParams<{ lang?: string; context?: string }>();
  const [mode, setMode] = useState<Mode>("tutor");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load history
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setMessages(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  // Persist
  const persist = useCallback((msgs: Message[]) => {
    const trimmed = msgs.slice(-MAX_HISTORY);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)).catch(() => {});
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || generating) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setGenerating(true);

    // Build context
    const systemContent = mode === "tutor" ? buildTutorPrompt(lang, context || "") : SYSTEM_PROMPTS.general;
    const chatHistory: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...next.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.text,
      })),
    ];

    try {
      const response = await chatWithGemma(chatHistory, { maxTokens: 300, temperature: 0.7 });
      const aiMsg: Message = { id: `a-${Date.now()}`, role: "assistant", text: response.trim(), ts: Date.now() };
      const updated = [...next, aiMsg];
      setMessages(updated);
      persist(updated);
    } catch {
      const errMsg: Message = { id: `e-${Date.now()}`, role: "assistant", text: "Sorry, I couldn't generate a response. Please try again.", ts: Date.now() };
      const updated = [...next, errMsg];
      setMessages(updated);
      persist(updated);
    } finally {
      setGenerating(false);
    }

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 200);
  }, [input, generating, messages, mode, lang, persist]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <Animated.View entering={FadeInDown.duration(300)} style={[S.msgRow, item.role === "user" ? S.msgRowUser : S.msgRowAI]}>
      <View style={[S.msgBubble, item.role === "user" ? S.userBubble : S.aiBubble]}>
        {item.role === "assistant" && (
          <View style={S.aiIcon}>
            <Ionicons name="sparkles" size={12} color={BLUE} />
          </View>
        )}
        <Text style={[S.msgText, item.role === "user" && { color: AMBER }]}>{item.text}</Text>
      </View>
    </Animated.View>
  ), []);

  return (
    <SafeAreaView style={S.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </Pressable>
        <Text style={S.title}>AI Assistant</Text>
        <Pressable onPress={clearHistory} hitSlop={12}>
          <Ionicons name="trash-outline" size={18} color={MUTED} />
        </Pressable>
      </View>

      {/* Mode toggle */}
      <View style={S.modeRow}>
        <Pressable
          onPress={() => setMode("tutor")}
          style={[S.modeBtn, mode === "tutor" && S.modeBtnActive]}
        >
          <Ionicons name="school-outline" size={14} color={mode === "tutor" ? AMBER : MUTED} />
          <Text style={[S.modeBtnText, mode === "tutor" && { color: AMBER }]}>Language Tutor</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("general")}
          style={[S.modeBtn, mode === "general" && S.modeBtnActive]}
        >
          <Ionicons name="globe-outline" size={14} color={mode === "general" ? BLUE : MUTED} />
          <Text style={[S.modeBtnText, mode === "general" && { color: BLUE }]}>General</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={S.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={S.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={MUTED} />
            <Text style={S.emptyTitle}>
              {mode === "tutor" ? "Ask me about grammar, vocab, or culture!" : "Ask me anything!"}
            </Text>
            <Text style={S.emptySub}>Powered by on-device AI. 100% offline.</Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {generating && (
        <View style={S.typingRow}>
          <Ionicons name="ellipsis-horizontal" size={20} color={MUTED} />
          <Text style={S.typingText}>Thinking...</Text>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <View style={S.inputRow}>
          <TextInput
            style={S.input}
            placeholder={mode === "tutor" ? "Ask about grammar, vocab..." : "Ask anything..."}
            placeholderTextColor={MUTED}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={sendMessage}
            disabled={generating || !input.trim()}
            style={[S.sendBtn, (!input.trim() || generating) && { opacity: 0.4 }]}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: INK, letterSpacing: -0.3 },

  modeRow: {
    flexDirection: "row", paddingHorizontal: 18, gap: 8, marginBottom: 8,
  },
  modeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modeBtnActive: {
    backgroundColor: "rgba(200,128,74,0.10)",
    borderColor: "rgba(200,128,74,0.25)",
  },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: MUTED },

  listContent: { paddingHorizontal: 14, paddingBottom: 12, flexGrow: 1 },

  msgRow: { marginBottom: 8 },
  msgRowUser: { alignItems: "flex-end" },
  msgRowAI: { alignItems: "flex-start" },
  msgBubble: {
    maxWidth: "82%", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: { backgroundColor: USER_BG, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: AI_BG, borderBottomLeftRadius: 4 },
  aiIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(90,200,250,0.12)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  msgText: { fontSize: 14, lineHeight: 20, color: INK },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: INK, textAlign: "center" },
  emptySub: { fontSize: 12, color: MUTED },

  typingRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 6,
  },
  typingText: { fontSize: 12, color: MUTED },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: CARD,
  },
  input: {
    flex: 1, fontSize: 15, color: INK, maxHeight: 100,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20, borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: AMBER, alignItems: "center", justifyContent: "center",
  },
});
