// ── Pack Opening Screen ───────────────────────────────────────────────────────
// Pokémon-style pack rip → card-by-card reveal → keep or sell.
// Gesture: vertical swipe tears the pack wrapper open.
// Cards fly in one-by-one with rarity glow + haptic feedback.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
  runOnJS,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import {
  PACK_CATALOG,
  drawCardsFromPack,
  RARITY_CONFIG,
  addCardsToCollection,
  incrementPacksOpened,
  type PostcardCard,
  type PackDefinition,
} from "@/lib/postcard-store";
import { getCoinBalance, spendCoins, addCoins } from "@/lib/challenge-store";

const { width: W, height: H } = Dimensions.get("window");
const CARD_W = W * 0.72;
const CARD_H = CARD_W * 1.4;

// ── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0C0A09",
  card: "#1C1917",
  ink: "#FAFAF9",
  muted: "rgba(250,250,249,0.45)",
  border: "rgba(250,250,249,0.08)",
};

type Phase = "sealed" | "ripping" | "revealing" | "summary";

export default function PackOpeningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ packId: string }>();
  const pack = useMemo(
    () => PACK_CATALOG.find((p) => p.id === params.packId) || PACK_CATALOG[0],
    [params.packId],
  );

  const [phase, setPhase] = useState<Phase>("sealed");
  const [drawnCards, setDrawnCards] = useState<PostcardCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(-1);
  const [allRevealed, setAllRevealed] = useState(false);
  const [keptCards, setKeptCards] = useState<Set<number>>(new Set());
  const [soldCoins, setSoldCoins] = useState(0);

  // ── Rip gesture ──────────────────────────────────────────────────────────
  const ripProgress = useSharedValue(0);
  const ripStartY = useSharedValue(0);
  const hasRipped = useRef(false);

  const onRipComplete = useCallback(() => {
    if (hasRipped.current) return;
    hasRipped.current = true;
    const cards = drawCardsFromPack(pack);
    setDrawnCards(cards);
    setPhase("revealing");
    // Start revealing first card after a short delay
    setTimeout(() => setRevealIndex(0), 400);
  }, [pack]);

  const ripGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(phase === "sealed" || phase === "ripping")
        .onBegin((e) => {
          ripStartY.value = e.y;
        })
        .onUpdate((e) => {
          const delta = e.y - ripStartY.value;
          // Only allow downward swipe (ripping down)
          const progress = Math.max(0, Math.min(1, delta / (H * 0.25)));
          ripProgress.value = progress;
          if (progress > 0.05 && phase === "sealed") {
            runOnJS(setPhase)("ripping");
          }
        })
        .onEnd(() => {
          if (ripProgress.value > 0.6) {
            ripProgress.value = withTiming(1, { duration: 300 });
            runOnJS(onRipComplete)();
          } else {
            ripProgress.value = withTiming(0, { duration: 200 });
            runOnJS(setPhase)("sealed");
          }
        }),
    [phase, onRipComplete],
  );

  // Pack wrapper animation
  const packTopStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ripProgress.value, [0, 1], [0, -H * 0.4], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(ripProgress.value, [0, 1], [0, -8], Extrapolation.CLAMP)}deg` },
    ],
    opacity: interpolate(ripProgress.value, [0.7, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const packBottomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(ripProgress.value, [0, 1], [0, H * 0.3], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(ripProgress.value, [0, 1], [0, 5], Extrapolation.CLAMP)}deg` },
    ],
    opacity: interpolate(ripProgress.value, [0.7, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const tearLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ripProgress.value, [0, 0.05, 0.6], [0, 1, 1], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(ripProgress.value, [0, 0.3], [0.3, 1], Extrapolation.CLAMP) },
    ],
  }));

  // ── Card reveal ──────────────────────────────────────────────────────────
  const handleNextCard = useCallback(() => {
    if (revealIndex < drawnCards.length - 1) {
      setRevealIndex((i) => i + 1);
    } else {
      setAllRevealed(true);
    }
  }, [revealIndex, drawnCards.length]);

  // ── Keep / Sell ──────────────────────────────────────────────────────────
  const handleKeepAll = useCallback(async () => {
    await addCardsToCollection(drawnCards, pack.id);
    await incrementPacksOpened();
    setPhase("summary");
  }, [drawnCards, pack.id]);

  const handleSellCard = useCallback(
    async (idx: number) => {
      const card = drawnCards[idx];
      if (!card) return;
      await addCoins(card.sellValue);
      setSoldCoins((prev) => prev + card.sellValue);
      setKeptCards((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    },
    [drawnCards],
  );

  const handleKeepCard = useCallback((idx: number) => {
    setKeptCards((prev) => new Set(prev).add(idx));
  }, []);

  const handleFinish = useCallback(async () => {
    // Save kept cards
    const kept = drawnCards.filter((_, i) => keptCards.has(i));
    if (kept.length > 0) {
      await addCardsToCollection(kept, pack.id);
    }
    await incrementPacksOpened();
    router.back();
  }, [drawnCards, keptCards, pack.id, router]);

  // ── Render ─────────────────────────────────────────────────────────────

  // Sealed pack
  if (phase === "sealed" || phase === "ripping") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={ripGesture}>
          <View style={[styles.container, { backgroundColor: C.bg }]}>
            <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
              {/* Close button */}
              <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
                <Ionicons name="close" size={22} color={C.ink} />
              </Pressable>

              <View style={styles.packCenter}>
                {/* Pack top half */}
                <Animated.View style={[styles.packHalf, styles.packTop, { backgroundColor: pack.color }, packTopStyle]}>
                  {/* Foil stripes */}
                  <View style={styles.packFoil}>
                    <View style={[styles.foilStripe, { top: "15%", opacity: 0.07 }]} />
                    <View style={[styles.foilStripe, { top: "40%", opacity: 0.05, width: "80%" }]} />
                    <View style={[styles.foilStripe, { top: "65%", opacity: 0.08 }]} />
                  </View>
                  {/* Pack icon watermark */}
                  <View style={styles.packWatermark}>
                    <Ionicons name={pack.icon as any} size={80} color="rgba(255,255,255,0.08)" />
                  </View>
                  {/* Label area */}
                  <View style={styles.packLabelArea}>
                    <View style={[styles.packBrandStrip, { backgroundColor: pack.colorAlt }]}>
                      <Text style={styles.packTitle}>{pack.name}</Text>
                    </View>
                    <Text style={styles.packSub}>{pack.cardCount} phrase postcards</Text>
                  </View>
                  {/* Seal sticker */}
                  <View style={styles.packSeal}>
                    <Ionicons name="sparkles" size={10} color="rgba(255,255,255,0.9)" />
                  </View>
                </Animated.View>

                {/* Tear line — perforated edge */}
                <Animated.View style={[styles.tearLine, tearLineStyle]}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <View key={i} style={styles.tearDot} />
                  ))}
                </Animated.View>

                {/* Pack bottom half */}
                <Animated.View style={[styles.packHalf, styles.packBottom, { backgroundColor: pack.colorAlt }, packBottomStyle]}>
                  <View style={styles.packFoil}>
                    <View style={[styles.foilStripe, { top: "30%", opacity: 0.06 }]} />
                    <View style={[styles.foilStripe, { top: "60%", opacity: 0.04, width: "70%" }]} />
                  </View>
                  <View style={styles.packBottomLabel}>
                    <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.35)" />
                    <Text style={styles.packBottomText}>AUTHENTIC COLLECTION</Text>
                  </View>
                </Animated.View>
              </View>

              {/* Hint */}
              <Animated.Text
                entering={FadeIn.delay(600).duration(800)}
                style={styles.hint}
              >
                {phase === "ripping" ? "Keep pulling down…" : "Swipe down to rip open"}
              </Animated.Text>
            </SafeAreaView>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    );
  }

  // Card reveal one-by-one
  if (phase === "revealing" && !allRevealed) {
    const card = drawnCards[revealIndex];
    if (!card) return null;
    const rarityConf = RARITY_CONFIG[card.rarity];

    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {/* Progress dots */}
          <View style={styles.dotRow}>
            {drawnCards.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i <= revealIndex && { backgroundColor: drawnCards[i] ? RARITY_CONFIG[drawnCards[i].rarity].color : C.muted },
                ]}
              />
            ))}
          </View>

          {/* Card */}
          <Pressable onPress={handleNextCard} style={styles.cardCenter}>
            <Animated.View
              key={revealIndex}
              entering={SlideInDown.duration(500).springify().damping(14)}
              style={[
                styles.revealCard,
                {
                  borderColor: rarityConf.color,
                  shadowColor: rarityConf.color,
                  shadowOpacity: 0.5,
                  shadowRadius: 30,
                },
              ]}
            >
              {/* Rarity glow */}
              <View style={[styles.cardGlow, { backgroundColor: rarityConf.glow }]} />

              {/* Rarity badge */}
              <View style={[styles.rarityBadge, { backgroundColor: rarityConf.color + "20", borderColor: rarityConf.color + "40" }]}>
                <Text style={[styles.rarityText, { color: rarityConf.color }]}>{rarityConf.label.toUpperCase()}</Text>
              </View>

              {/* Card icon */}
              <View style={[styles.cardIconWrap, { backgroundColor: card.color + "18" }]}>
                <Ionicons name={card.icon as any} size={56} color={card.color} />
              </View>

              {/* Phrase */}
              <Text style={styles.cardPhrase}>{card.phrase}</Text>
              <Text style={styles.cardMeaning}>{card.meaning}</Text>

              {/* Name */}
              <View style={styles.cardNameRow}>
                <Text style={styles.cardName}>{card.name}</Text>
                <View style={[styles.langChip, { backgroundColor: card.color + "20" }]}>
                  <Text style={[styles.langChipText, { color: card.color }]}>{card.lang.toUpperCase()}</Text>
                </View>
              </View>

              {/* Sell value */}
              <Text style={styles.cardValue}>Sell: {card.sellValue} spheres</Text>
            </Animated.View>
          </Pressable>

          {/* Tap hint */}
          <Animated.Text entering={FadeIn.delay(800)} style={styles.hint}>
            {revealIndex < drawnCards.length - 1
              ? `Tap for next card (${revealIndex + 1}/${drawnCards.length})`
              : "Tap to see your haul"}
          </Animated.Text>
        </SafeAreaView>
      </View>
    );
  }

  // All revealed — keep/sell phase
  if (phase === "revealing" && allRevealed) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Animated.Text entering={FadeInDown.duration(400)} style={styles.summaryTitle}>
            Your Cards
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(100).duration(400)} style={styles.summarySubtitle}>
            Keep for your collection or sell for spheres
          </Animated.Text>

          {/* Card list */}
          <Animated.ScrollView
            entering={FadeInUp.delay(200).duration(500)}
            style={{ flex: 1 }}
            contentContainerStyle={styles.cardList}
            showsVerticalScrollIndicator={false}
          >
            {drawnCards.map((card, idx) => {
              const rarityConf = RARITY_CONFIG[card.rarity];
              const isKept = keptCards.has(idx);
              return (
                <Animated.View
                  key={`${card.id}-${idx}`}
                  entering={FadeInDown.delay(idx * 80).duration(400)}
                  style={[styles.listCard, { borderColor: rarityConf.color + "30" }]}
                >
                  <View style={[styles.listIcon, { backgroundColor: card.color + "18" }]}>
                    <Ionicons name={card.icon as any} size={28} color={card.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.listName}>{card.name}</Text>
                      <View style={[styles.miniRarity, { backgroundColor: rarityConf.color + "20" }]}>
                        <Text style={[styles.miniRarityText, { color: rarityConf.color }]}>
                          {rarityConf.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.listPhrase}>{card.phrase} — {card.meaning}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => handleKeepCard(idx)}
                      style={[styles.actionBtn, isKept && styles.actionBtnActive]}
                    >
                      <Ionicons name="bookmark" size={16} color={isKept ? "#22C55E" : C.muted} />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          `Sell ${card.name}?`,
                          `You'll receive ${card.sellValue} spheres.`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { text: "Sell", style: "destructive", onPress: () => handleSellCard(idx) },
                          ],
                        );
                      }}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.sellText}>{card.sellValue}</Text>
                      <Ionicons name="cash-outline" size={14} color="#D4A017" />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>

          {/* Bottom bar */}
          <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.bottomBar}>
            {soldCoins > 0 && (
              <Text style={styles.soldLabel}>+{soldCoins} spheres earned</Text>
            )}
            <Pressable
              onPress={handleKeepAll}
              style={({ pressed }) => [styles.keepAllBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.keepAllText}>Keep All & Close</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // Summary — done
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }} edges={["top"]}>
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: "center" }}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <Text style={[styles.summaryTitle, { marginTop: 16 }]}>Pack Complete!</Text>
          <Text style={[styles.summarySubtitle, { marginTop: 8 }]}>
            {drawnCards.length} cards added to your collection
          </Text>
          {soldCoins > 0 && (
            <Text style={[styles.summarySubtitle, { color: "#D4A017", marginTop: 4 }]}>
              +{soldCoins} spheres earned from sales
            </Text>
          )}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.keepAllBtn, { marginTop: 32 }, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.keepAllText}>Back to Shop</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 18,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(250,250,249,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Sealed pack ──
  packCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  packHalf: {
    width: W * 0.62,
    height: H * 0.24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  packTop: {
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    zIndex: 2,
  },
  packBottom: {
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    marginTop: -2,
  },
  packFoil: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foilStripe: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#FFF",
    width: "100%",
  },
  packWatermark: {
    position: "absolute",
    top: -10,
    right: -10,
    opacity: 1,
  },
  packLabelArea: {
    alignItems: "center",
    gap: 8,
  },
  packBrandStrip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 99,
  },
  packTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  packSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  packSeal: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  packBottomLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  packBottomText: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.4,
  },
  tearLine: {
    height: 4,
    width: W * 0.55,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tearDot: {
    width: 5,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  hint: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: C.muted,
    paddingBottom: 40,
  },

  // ── Card reveal ──
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingTop: 20,
    paddingBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(250,250,249,0.12)",
  },
  cardCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  revealCard: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 2,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardGlow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    bottom: -40,
    borderRadius: 60,
    opacity: 0.15,
  },
  rarityBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  cardIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  cardPhrase: {
    fontSize: 28,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  cardMeaning: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(250,250,249,0.6)",
  },
  langChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  langChipText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  cardValue: {
    fontSize: 12,
    color: "rgba(212,160,23,0.6)",
    fontWeight: "600",
    marginTop: 10,
  },

  // ── Summary list ──
  summaryTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.ink,
    textAlign: "center",
    letterSpacing: -0.5,
    paddingTop: 20,
  },
  summarySubtitle: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    paddingBottom: 16,
  },
  cardList: {
    paddingHorizontal: 18,
    paddingBottom: 120,
    gap: 10,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  listName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.ink,
  },
  miniRarity: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
  },
  miniRarityText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  listPhrase: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(250,250,249,0.06)",
  },
  actionBtnActive: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },
  sellText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D4A017",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: C.bg,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    alignItems: "center",
    gap: 8,
  },
  soldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D4A017",
  },
  keepAllBtn: {
    width: "100%",
    backgroundColor: "#22C55E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  keepAllText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.3,
  },
});
