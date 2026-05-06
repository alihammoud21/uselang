// ── Lyric Study Cards ────────────────────────────────────────────────────────
// Line-by-line song translations with vocab highlights.
// Swipe through cards. Tap a line for TTS reading.
// Purchasable per-language lyric packs in the shop.
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import * as Speech from "expo-speech";

const { width: SW } = Dimensions.get("window");
const BG = "#0C0A09";
const CARD = "#1A1510";
const AMBER = "#C8804A";
const INK = "#F3EDE3";
const MUTED = "rgba(243,237,227,0.50)";
const BLUE = "#5AC8FA";
const GREEN = "#34C759";

interface LyricLine {
  original: string;
  translation: string;
  vocab?: { word: string; meaning: string }[];
}

interface Song {
  id: string;
  title: string;
  artist: string;
  lang: string;
  lines: LyricLine[];
}

const SONG_CATALOG: Song[] = [
  // Mandarin
  {
    id: "zh_jasmine",
    title: "Mòlìhuā (Jasmine Flower)",
    artist: "Traditional",
    lang: "zh",
    lines: [
      { original: "好一朵美丽的茉莉花", translation: "What a beautiful jasmine flower", vocab: [{ word: "美丽", meaning: "beautiful" }, { word: "茉莉花", meaning: "jasmine flower" }] },
      { original: "好一朵美丽的茉莉花", translation: "What a beautiful jasmine flower" },
      { original: "芬芳美丽满枝桠", translation: "Fragrant and beautiful on every branch", vocab: [{ word: "芬芳", meaning: "fragrant" }, { word: "枝桠", meaning: "branches" }] },
      { original: "又香又白人人夸", translation: "Fragrant and white, praised by all", vocab: [{ word: "又...又...", meaning: "both...and..." }, { word: "夸", meaning: "to praise" }] },
      { original: "让我来将你摘下", translation: "Let me pick you", vocab: [{ word: "摘", meaning: "to pick" }] },
      { original: "送给别人家", translation: "And give you to someone's home", vocab: [{ word: "送给", meaning: "to give to" }] },
      { original: "茉莉花呀茉莉花", translation: "Jasmine flower, oh jasmine flower" },
    ],
  },
  {
    id: "zh_moon",
    title: "月亮代表我的心 (The Moon Represents My Heart)",
    artist: "Teresa Teng",
    lang: "zh",
    lines: [
      { original: "你问我爱你有多深", translation: "You ask how deeply I love you", vocab: [{ word: "多深", meaning: "how deep" }] },
      { original: "我爱你有几分", translation: "How much I love you", vocab: [{ word: "几分", meaning: "how much" }] },
      { original: "我的情也真", translation: "My feelings are true", vocab: [{ word: "情", meaning: "feelings" }, { word: "真", meaning: "true" }] },
      { original: "我的爱也真", translation: "My love is true", vocab: [{ word: "爱", meaning: "love" }] },
      { original: "月亮代表我的心", translation: "The moon represents my heart", vocab: [{ word: "月亮", meaning: "moon" }, { word: "代表", meaning: "represents" }, { word: "心", meaning: "heart" }] },
    ],
  },
  // Spanish
  {
    id: "es_despacito",
    title: "Despacito (excerpt)",
    artist: "Luis Fonsi",
    lang: "es",
    lines: [
      { original: "Despacito", translation: "Slowly", vocab: [{ word: "despacito", meaning: "slowly" }] },
      { original: "Quiero respirar tu cuello despacito", translation: "I want to breathe on your neck slowly", vocab: [{ word: "respirar", meaning: "to breathe" }, { word: "cuello", meaning: "neck" }] },
      { original: "Deja que te diga cosas al oído", translation: "Let me whisper things in your ear", vocab: [{ word: "deja", meaning: "let" }, { word: "oído", meaning: "ear" }] },
      { original: "Para que te acuerdes si no estás conmigo", translation: "So that you remember when you're not with me", vocab: [{ word: "acuerdes", meaning: "remember" }, { word: "conmigo", meaning: "with me" }] },
    ],
  },
  {
    id: "es_bailando",
    title: "Bailando (excerpt)",
    artist: "Enrique Iglesias",
    lang: "es",
    lines: [
      { original: "Yo te miro y se me corta la respiración", translation: "I look at you and I lose my breath", vocab: [{ word: "miro", meaning: "I look" }, { word: "respiración", meaning: "breath" }] },
      { original: "Cuando tú me miras se me sube el corazón", translation: "When you look at me my heart rises", vocab: [{ word: "corazón", meaning: "heart" }] },
      { original: "Bailando", translation: "Dancing", vocab: [{ word: "bailando", meaning: "dancing" }] },
      { original: "Tu cuerpo y el mío llenando el vacío", translation: "Your body and mine filling the void", vocab: [{ word: "cuerpo", meaning: "body" }, { word: "vacío", meaning: "void" }] },
    ],
  },
  // French
  {
    id: "fr_vie",
    title: "La Vie en Rose (excerpt)",
    artist: "Edith Piaf",
    lang: "fr",
    lines: [
      { original: "Quand il me prend dans ses bras", translation: "When he takes me in his arms", vocab: [{ word: "prend", meaning: "takes" }, { word: "bras", meaning: "arms" }] },
      { original: "Il me parle tout bas", translation: "He speaks to me softly", vocab: [{ word: "parle", meaning: "speaks" }, { word: "tout bas", meaning: "very softly" }] },
      { original: "Je vois la vie en rose", translation: "I see life in pink/rosy", vocab: [{ word: "vie", meaning: "life" }, { word: "rose", meaning: "pink" }] },
      { original: "Il me dit des mots d'amour", translation: "He says words of love to me", vocab: [{ word: "mots", meaning: "words" }, { word: "amour", meaning: "love" }] },
      { original: "Des mots de tous les jours", translation: "Everyday words", vocab: [{ word: "jours", meaning: "days" }] },
      { original: "Et ça me fait quelque chose", translation: "And it does something to me", vocab: [{ word: "quelque chose", meaning: "something" }] },
    ],
  },
  {
    id: "fr_formidable",
    title: "Formidable (excerpt)",
    artist: "Stromae",
    lang: "fr",
    lines: [
      { original: "Tu étais formidable, j'étais fort minable", translation: "You were amazing, I was pathetic", vocab: [{ word: "formidable", meaning: "amazing" }, { word: "minable", meaning: "pathetic" }] },
      { original: "Nous étions formidables", translation: "We were amazing", vocab: [{ word: "nous étions", meaning: "we were" }] },
      { original: "Formidable", translation: "Amazing" },
      { original: "Tu étais formidable, j'étais fort minable", translation: "You were amazing, I was pathetic" },
    ],
  },
];

const LANG_SPEECH: Record<string, string> = { zh: "zh-CN", es: "es-ES", fr: "fr-FR" };

export default function LyricsScreen() {
  const router = useRouter();
  const { lang = "zh" } = useLocalSearchParams<{ lang?: string }>();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);

  const songs = useMemo(() => SONG_CATALOG.filter((s) => s.lang === lang), [lang]);

  const speakLine = useCallback((text: string) => {
    Speech.speak(text, {
      language: LANG_SPEECH[lang] ?? "zh-CN",
      rate: 0.8,
    });
  }, [lang]);

  // ── Song list ──
  if (!selectedSong) {
    return (
      <SafeAreaView style={S.safe} edges={["top"]}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={S.title}>Lyric Cards</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
          {songs.map((song, i) => (
            <Animated.View key={song.id} entering={FadeInDown.delay(i * 80).duration(400)}>
              <Pressable onPress={() => setSelectedSong(song)} style={S.songCard}>
                <View style={S.songAlbum}>
                  <Ionicons name="musical-notes" size={24} color={AMBER} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.songTitle}>{song.title}</Text>
                  <Text style={S.songArtist}>{song.artist}</Text>
                  <Text style={S.songLines}>{song.lines.length} lines</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={MUTED} />
              </Pressable>
            </Animated.View>
          ))}
          {songs.length === 0 && (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Ionicons name="musical-note-outline" size={48} color={MUTED} />
              <Text style={S.emptyText}>No songs for this language yet</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Song detail (line-by-line) ──
  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      <View style={S.header}>
        <Pressable onPress={() => setSelectedSong(null)} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[S.title, { fontSize: 15 }]}>{selectedSong.title}</Text>
          <Text style={S.songArtistSm}>{selectedSong.artist}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {selectedSong.lines.map((line, i) => {
          const expanded = expandedLine === i;
          return (
            <Animated.View key={i} entering={FadeInDown.delay(i * 60).duration(400)}>
              <Pressable
                onPress={() => {
                  setExpandedLine(expanded ? null : i);
                  speakLine(line.original);
                }}
                style={[S.lineCard, expanded && S.lineCardExpanded]}
              >
                <View style={S.lineRow}>
                  <View style={S.lineNum}>
                    <Text style={S.lineNumText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.lineOriginal}>{line.original}</Text>
                    <Text style={S.lineTranslation}>{line.translation}</Text>
                  </View>
                  <Pressable onPress={() => speakLine(line.original)} hitSlop={12} style={S.speakBtn}>
                    <Ionicons name="volume-medium" size={16} color={BLUE} />
                  </Pressable>
                </View>
                {expanded && line.vocab && line.vocab.length > 0 && (
                  <Animated.View entering={FadeInDown.duration(200)} style={S.vocabSection}>
                    <Text style={S.vocabLabel}>VOCABULARY</Text>
                    {line.vocab.map((v, vi) => (
                      <View key={vi} style={S.vocabRow}>
                        <Text style={S.vocabWord}>{v.word}</Text>
                        <Text style={S.vocabMeaning}>{v.meaning}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
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
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: INK, textAlign: "center", letterSpacing: -0.3 },

  songCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  songAlbum: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(200,128,74,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  songTitle: { fontSize: 15, fontWeight: "700", color: INK },
  songArtist: { fontSize: 13, color: MUTED, marginTop: 2 },
  songArtistSm: { fontSize: 12, color: MUTED, textAlign: "center" },
  songLines: { fontSize: 11, color: AMBER, marginTop: 3 },

  emptyText: { fontSize: 14, color: MUTED, marginTop: 16 },

  lineCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: "rgba(255,255,255,0.06)", marginBottom: 8,
  },
  lineCardExpanded: {
    backgroundColor: "rgba(200,128,74,0.06)",
    borderColor: "rgba(200,128,74,0.15)",
  },
  lineRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  lineNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  lineNumText: { fontSize: 11, fontWeight: "700", color: MUTED },
  lineOriginal: { fontSize: 16, fontWeight: "700", color: AMBER, lineHeight: 22 },
  lineTranslation: { fontSize: 13, color: INK, marginTop: 3, lineHeight: 18 },
  speakBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(90,200,250,0.10)",
    alignItems: "center", justifyContent: "center",
  },

  vocabSection: {
    marginTop: 12, paddingTop: 10,
    borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.08)",
  },
  vocabLabel: { fontSize: 10, fontWeight: "700", color: MUTED, letterSpacing: 1.2, marginBottom: 6 },
  vocabRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  vocabWord: { fontSize: 13, fontWeight: "700", color: GREEN },
  vocabMeaning: { fontSize: 13, color: INK },
});
