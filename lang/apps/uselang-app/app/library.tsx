import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import {
  listSavedPhrases,
  deletePhrase,
  type SavedPhrase,
} from "@/lib/phrase-store";
import { playTutorAudio, stopTutorAudio } from "@/lib/tutor-audio";
import { restorePlaybackMode } from "@/lib/stt-client";
import { AnimatedMouth } from "@/components/AnimatedMouth";

// ── Library ─────────────────────────────────────────────────────────────────
// Saved phrases with:
//   • AI voice playback (backend base64, else device TTS fallback)
//   • User attempt playback (local recording URI)
//   • Tongue placement diagram + tip
//   • Delete

export default function LibraryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedPhrase[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingKind, setPlayingKind] = useState<"ai" | "user" | null>(null);

  const load = useCallback(async () => {
    const all = await listSavedPhrases();
    setItems(all);
  }, []);

  useEffect(() => {
    restorePlaybackMode();
    load();
    return () => {
      stopTutorAudio();
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const playAI = useCallback(
    async (item: SavedPhrase) => {
      if (playingId === item.id && playingKind === "ai") {
        await stopTutorAudio();
        setPlayingId(null);
        setPlayingKind(null);
        return;
      }
      await stopTutorAudio();
      setPlayingId(item.id);
      setPlayingKind("ai");
      await playTutorAudio(
        {
          audioBase64: item.audioBase64,
          audioMimeType: item.audioMimeType,
          fallbackText: item.phrase,
          languageCode: item.languageCode,
        },
        {
          onEnd: () => {
            setPlayingId(null);
            setPlayingKind(null);
          },
          onError: () => {
            setPlayingId(null);
            setPlayingKind(null);
          },
        }
      );
    },
    [playingId, playingKind]
  );

  const playUser = useCallback(
    async (item: SavedPhrase) => {
      if (!item.userAudioUri) return;
      if (playingId === item.id && playingKind === "user") {
        await stopTutorAudio();
        setPlayingId(null);
        setPlayingKind(null);
        return;
      }
      await stopTutorAudio();
      try {
        setPlayingId(item.id);
        setPlayingKind("user");
        const { sound } = await Audio.Sound.createAsync(
          { uri: item.userAudioUri },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
            setPlayingId(null);
            setPlayingKind(null);
          }
        });
      } catch {
        setPlayingId(null);
        setPlayingKind(null);
        Alert.alert("Playback failed", "The recording may have been cleared from cache.");
      }
    },
    [playingId, playingKind]
  );

  const handleDelete = useCallback(
    (item: SavedPhrase) => {
      Alert.alert("Delete phrase?", item.phrase, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePhrase(item.id);
            await load();
          },
        },
      ]);
    },
    [load]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Library",
          headerBackTitle: "Settings",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top", "bottom"]}>
        {/* Custom header — the app-level Stack has headerShown:false, so
            without this the user is stuck on this screen with no visible way
            out. Mirrors the native back-button affordance. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 8,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.borderLight,
            backgroundColor: COLORS.bg,
          }}
        >
          <Pressable
            onPress={() => {
              if (router.canGoBack?.()) router.back();
              else router.replace("/(tabs)");
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 10,
              opacity: pressed ? 0.65 : 1,
            })}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: COLORS.text }}>Back</Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.text,
              marginRight: 70, // visually balances the back button
            }}
          >
            Library
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={{ fontSize: 28, fontWeight: "700", color: COLORS.text, letterSpacing: -0.5 }}>
            Library
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSub, marginTop: 2 }}>
            {items.length === 0
              ? "Save phrases from Train to hear them anytime."
              : `${items.length} saved phrase${items.length === 1 ? "" : "s"}`}
          </Text>

          {items.length === 0 ? (
            <EmptyState onGo={() => router.push("/(tabs)/train")} />
          ) : (
            <View style={{ marginTop: 18, gap: 12 }}>
              {items.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  isPlayingAI={playingId === item.id && playingKind === "ai"}
                  isPlayingUser={playingId === item.id && playingKind === "user"}
                  onPlayAI={() => playAI(item)}
                  onPlayUser={() => playUser(item)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function LibraryCard({
  item,
  isPlayingAI,
  isPlayingUser,
  onPlayAI,
  onPlayUser,
  onDelete,
}: {
  item: SavedPhrase;
  isPlayingAI: boolean;
  isPlayingUser: boolean;
  onPlayAI: () => void;
  onPlayUser: () => void;
  onDelete: () => void;
}) {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === item.languageCode);
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* Meta */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: COLORS.textMuted,
            letterSpacing: 0.8,
          }}
        >
          {(lang?.label || item.languageCode).toUpperCase()} · {date}
        </Text>
        <Pressable onPress={onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={14} color={COLORS.textMuted} />
        </Pressable>
      </View>

      {/* Phrase */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: COLORS.text,
          letterSpacing: -0.3,
          lineHeight: 26,
        }}
      >
        {item.phrase}
      </Text>
      {item.phonetic ? (
        <Text
          style={{
            fontSize: 13,
            color: COLORS.gold,
            fontWeight: "600",
            marginTop: 2,
          }}
        >
          {item.phonetic}
        </Text>
      ) : null}
      {item.meaning ? (
        <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginTop: 8 }}>
          {item.meaning}
        </Text>
      ) : null}

      {/* Playback */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <PlayButton
          icon={isPlayingAI ? "pause" : "volume-medium-outline"}
          label={isPlayingAI ? "Stop" : "AI voice"}
          onPress={onPlayAI}
          primary
        />
        <PlayButton
          icon={isPlayingUser ? "pause" : "mic-outline"}
          label={isPlayingUser ? "Stop" : "Your attempt"}
          onPress={onPlayUser}
          disabled={!item.userAudioUri}
        />
      </View>

      {/* Tongue placement */}
      {item.tonguePlacement || item.tip ? (
        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.borderLight,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <SavedMouthPreview phoneme={item.phoneme || "r"} />
          <View style={{ flex: 1 }}>
            {item.tonguePlacement ? (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: COLORS.textMuted,
                  letterSpacing: 0.6,
                  marginBottom: 4,
                }}
              >
                TONGUE
              </Text>
            ) : null}
            {item.tonguePlacement ? (
              <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 19 }}>
                {item.tonguePlacement}
              </Text>
            ) : null}
            {item.tip && !item.tonguePlacement ? (
              <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 19 }}>
                {item.tip}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SavedMouthPreview({ phoneme }: { phoneme: string }) {
  return (
    <View
      style={{
        width: 104,
        height: 104,
        borderRadius: 18,
        backgroundColor: COLORS.surface2,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: COLORS.borderLight,
      }}
    >
      <AnimatedMouth
        phoneme={phoneme}
        playing={false}
        view="side"
        size={96}
        showControls={false}
        showLabelsToggle={false}
      />
    </View>
  );
}

function PlayButton({
  icon,
  label,
  onPress,
  primary,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: 40,
        borderRadius: 12,
        backgroundColor: primary ? COLORS.text : COLORS.surface2,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Ionicons name={icon} size={15} color={primary ? "#FFF" : COLORS.text} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: primary ? "#FFF" : COLORS.text,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ onGo }: { onGo: () => void }) {
  return (
    <View
      style={{
        marginTop: 40,
        alignItems: "center",
        padding: 28,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: COLORS.goldLight,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name="bookmark-outline" size={26} color={COLORS.gold} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: COLORS.text,
          textAlign: "center",
        }}
      >
        Nothing saved yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: COLORS.textSub,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 19,
          maxWidth: 260,
        }}
      >
        In Train mode, tap the bookmark on any tutor response to save the phrase — the AI voice, your attempt, and the tongue placement all come with it.
      </Text>
      <Pressable
        onPress={onGo}
        style={{
          marginTop: 20,
          paddingHorizontal: 20,
          height: 44,
          borderRadius: 12,
          backgroundColor: COLORS.text,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 14 }}>Go to Train</Text>
      </Pressable>
    </View>
  );
}
