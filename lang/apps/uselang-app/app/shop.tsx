import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCoinBalance, spendCoins, addCoins } from "@/lib/challenge-store";
import { getProgressSummary, getLevel } from "@/lib/progress-store";
import { PACK_CATALOG, getUniqueCardCount, getTotalCardCount, CARD_CATALOG } from "@/lib/postcard-store";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppTheme } from "@/lib/theme-context";
import {
  SHOP_CATALOG,
  purchaseItem,
  getInventory,
  getHintTokens,
  hasStreakFreeze,
  hasXpBoost,
  hasCoinDoubler,
  isGameUnlocked,
  GAME_ROUTES,
  activateGodMode,
  type ShopItemId,
  type ItemCategory,
  type GameId,
  SHOP_CATALOG as CATALOG,
} from "@/lib/shop-store";
import { getUserProfile } from "@/lib/user-store";

const { width: SW } = Dimensions.get("window");

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       "#F4EFE6",
  card:     "#FFFFFF",
  ink:      "#1A1614",
  inkSub:   "#6B6360",
  muted:    "#A09790",
  border:   "rgba(26,22,20,0.09)",
  amber:    "#A85D2E",
  amberBg:  "rgba(168,93,46,0.09)",
  gold:     "#D4A017",
  goldBg:   "rgba(212,160,23,0.10)",
  locked:   "rgba(26,22,20,0.04)",
  gameBg:   "#0C1520",
  gameCard: "#162030",
};

const CATEGORY_LABELS: Record<ItemCategory | "all", string> = {
  all: "All",
  game: "Games",
  utility: "Utility",
  boost: "Boost",
  pack: "Phrase Packs",
  cosmetic: "Cosmetic",
};

// ── Admin redeem codes (module-level to avoid stale closure) ────────────────
const ADMIN_CODES: Record<string, { label: string; coins: number; unlockAll: boolean; godMode?: boolean }> = {
  "USELANG-GOD":        { label: "God Mode",     coins: 999999,  unlockAll: true, godMode: true },
  "USELANG-ADMIN-2025": { label: "Admin Access", coins: 99999,   unlockAll: true },
  "USELANG-TESTER":     { label: "Tester Pack",  coins: 10000,   unlockAll: false },
  "USELANG-BETA":       { label: "Beta Reward",  coins: 5000,    unlockAll: false },
  "USELANG-MILLION":    { label: "Millionaire",  coins: 1000000, unlockAll: false },
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter();
  const { setTheme: setContextTheme } = useAppTheme();
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [filter, setFilter] = useState<ItemCategory | "all">("all");
  const [owned, setOwned] = useState<ShopItemId[]>([]);
  const [hintCount, setHintCount] = useState(0);
  const [activeEffects, setActiveEffects] = useState({ streakFreeze: false, xpBoost: false, coinDoubler: false });
  const [uniqueCards, setUniqueCards] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [langCode, setLangCode] = useState("zh");

  const load = useCallback(async () => {
    const [bal, summary, inv, hints, sf, xb, cd, profile] = await Promise.all([
      getCoinBalance(),
      getProgressSummary(),
      getInventory(),
      getHintTokens(),
      hasStreakFreeze(),
      hasXpBoost(),
      hasCoinDoubler(),
      getUserProfile(),
    ]);
    setCoins(bal);
    setLevel(getLevel(summary.xp).level);
    setOwned(inv);
    setHintCount(hints);
    setActiveEffects({ streakFreeze: sf, xpBoost: xb, coinDoubler: cd });
    if (profile?.learningLanguage) setLangCode(profile.learningLanguage.slice(0, 2));
    const [uc, tc] = await Promise.all([getUniqueCardCount(), getTotalCardCount()]);
    setUniqueCards(uc);
    setTotalCards(tc);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Game purchase + launch ──
  const handleGameTap = useCallback(async (item: typeof CATALOG[0]) => {
    const gameId = item.id as GameId;
    const unlocked = await isGameUnlocked(gameId);
    if (unlocked) {
      const route = GAME_ROUTES[gameId];
      router.push({ pathname: route as any, params: { lang: langCode } });
      return;
    }
    if (coins < item.price) {
      Alert.alert("Not Enough Spheres", `You need ${item.price - coins} more spheres.`);
      return;
    }
    Alert.alert(
      `Unlock ${item.name}?`,
      `${item.description}\n\nCost: ${item.price} spheres`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unlock & Play",
          onPress: async () => {
            const result = await spendCoins(item.price);
            if (!result.success) { Alert.alert("Error", "Purchase failed."); return; }
            await purchaseItem(item.id);
            setCoins(result.balance);
            await load();
            const route = GAME_ROUTES[gameId];
            router.push({ pathname: route as any, params: { lang: langCode } });
          },
        },
      ],
    );
  }, [coins, langCode, load, router]);

  // ── Generic item purchase ──
  const handleBuy = useCallback(async (item: typeof CATALOG[0]) => {
    if (item.category === "game") { handleGameTap(item); return; }
    const isConsumed = item.consumable;
    const alreadyOwned = owned.includes(item.id) && !isConsumed;

    if (alreadyOwned) {
      Alert.alert("Already Owned", `You already have ${item.name}.`);
      return;
    }
    if (coins < item.price) {
      Alert.alert("Not Enough Spheres", `You need ${item.price - coins} more spheres.\nComplete weekly challenges on the Today tab to earn spheres!`);
      return;
    }

    Alert.alert(
      `Buy ${item.name}?`,
      `Cost: ${item.price} spheres\n\n${item.description}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            const result = await spendCoins(item.price);
            if (!result.success) { Alert.alert("Error", "Purchase failed."); return; }
            if (item.id === "bonus_drop") { await addCoins(100); }
            const err = await purchaseItem(item.id);
            if (err) { Alert.alert("Error", err); return; }
            if (item.id === "dark_theme") setContextTheme("midnight").catch(() => {});
            if (item.id === "sand_theme") setContextTheme("dune").catch(() => {});
            setCoins(item.id === "bonus_drop" ? (result.balance + 100) : result.balance);
            await load();
            Alert.alert("Purchased!", `${item.name} has been added to your inventory.`);
          },
        },
      ],
    );
  }, [coins, owned, load, handleGameTap]);

  const categories: Array<ItemCategory | "all"> = ["all", "game", "utility", "boost", "pack", "cosmetic"];
  const gameItems = CATALOG.filter((i) => i.category === "game");
  const nonGameItems = filter === "all"
    ? CATALOG.filter((i) => i.category !== "game")
    : CATALOG.filter((i) => i.category === filter && i.category !== "game");
  const showGames = filter === "all" || filter === "game";

  const hasActiveEffects = activeEffects.streakFreeze || activeEffects.xpBoost || activeEffects.coinDoubler || hintCount > 0;

  // ── Admin redeem code ──
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemExpanded, setRedeemExpanded] = useState(false);

  const handleRedeem = useCallback(async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;
    const entry = ADMIN_CODES[code];
    if (!entry) { Alert.alert("Invalid Code", "This code is not recognized."); return; }
    await addCoins(entry.coins);
    if (entry.godMode) {
      await activateGodMode();
    } else if (entry.unlockAll) {
      for (const item of CATALOG) { if (!owned.includes(item.id)) await purchaseItem(item.id); }
      await Promise.all([
        AsyncStorage.setItem("lang:examUnlock:zh", "1"),
        AsyncStorage.setItem("lang:examUnlock:es", "1"),
        AsyncStorage.setItem("lang:examUnlock:fr", "1"),
      ]);
    }
    await load();
    setRedeemCode("");
    const msg = entry.godMode
      ? `+${entry.coins.toLocaleString()} spheres\nEVERYTHING unlocked — all items, exams, lessons, dev mode, level 100!`
      : `+${entry.coins.toLocaleString()} spheres${entry.unlockAll ? "\nAll items + exams unlocked!" : ""}`;
    Alert.alert(`${entry.label} Redeemed!`, msg);
  }, [redeemCode, owned, load]);

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={S.headerTitle}>Shop</Text>
        <View style={S.coinPill}>
          <Text style={S.coinPillIcon}>⚪</Text>
          <Text style={S.coinPillText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── Level + effects row ── */}
        <View style={S.levelRow}>
          <View style={S.levelBadge}>
            <Ionicons name="star" size={13} color={C.gold} />
            <Text style={S.levelBadgeText}>Level {level}</Text>
          </View>
          {hintCount > 0 && (
            <View style={[S.levelBadge, { backgroundColor: "rgba(212,160,23,0.12)" }]}>
              <Ionicons name="bulb-outline" size={13} color={C.gold} />
              <Text style={S.levelBadgeText}>{hintCount} hints</Text>
            </View>
          )}
          {hasActiveEffects && (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {activeEffects.streakFreeze && (
                <View style={S.effectChip}>
                  <Ionicons name="snow-outline" size={11} color="#3B82F6" />
                </View>
              )}
              {activeEffects.xpBoost && (
                <View style={S.effectChip}>
                  <Ionicons name="flash-outline" size={11} color={C.gold} />
                </View>
              )}
              {activeEffects.coinDoubler && (
                <View style={S.effectChip}>
                  <Ionicons name="layers-outline" size={11} color={C.amber} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Featured Banner ── */}
        <Animated.View entering={FadeInDown.delay(50).duration(500)} style={S.featuredBanner}>
          <View style={S.featuredBadge}>
            <Text style={S.featuredBadgeText}>NEW</Text>
          </View>
          <View style={S.featuredContent}>
            <Text style={S.featuredTitle}>Vocabulary Games</Text>
            <Text style={S.featuredSub}>Play Flappy Boat, Memory Match, Word Chase & more while learning new words!</Text>
          </View>
          <View style={S.featuredIconBox}>
            <Ionicons name="game-controller-outline" size={36} color="rgba(255,255,255,0.6)" />
          </View>
        </Animated.View>

        {/* ── Games Section ── */}
        {showGames && (
          <View style={{ marginTop: 18 }}>
            <View style={S.sectionHeader}>
              <Ionicons name="game-controller-outline" size={16} color={C.amber} />
              <Text style={S.sectionTitle}>GAMES</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 14, paddingBottom: 6 }}
            >
              {gameItems.map((game, idx) => {
                const isUnlocked = owned.includes(game.id);
                return (
                  <Animated.View key={game.id} entering={FadeInDown.delay(idx * 80 + 100).duration(500)}>
                    <Pressable
                      onPress={() => handleGameTap(game)}
                      style={({ pressed }) => [S.gameCard, pressed && { opacity: 0.88, transform: [{ scale: 0.97 }] }]}
                    >
                      <View style={[S.gameCardTop, { backgroundColor: game.iconBg.replace("0.12", "0.25") }]}>
                        <Ionicons name={game.icon as any} size={26} color={game.iconColor} />
                        {isUnlocked && (
                          <View style={S.gameUnlockedBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                            <Text style={S.gameUnlockedText}>Play</Text>
                          </View>
                        )}
                      </View>
                      <View style={S.gameCardBottom}>
                        <Text style={S.gameCardName}>{game.name}</Text>
                        <Text style={S.gameCardDesc} numberOfLines={2}>{game.description}</Text>
                        <View style={[S.gameCardPrice, isUnlocked && { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                          <Text style={[S.gameCardPriceText, isUnlocked && { color: "#22C55E" }]}>
                            {isUnlocked ? "Unlocked" : `⚪ ${game.price}`}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Postcard Packs ── */}
        {(filter === "all" || filter === "pack") && (
          <View style={S.packSection}>
            <View style={S.packSectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Ionicons name="images-outline" size={16} color={C.amber} />
                <Text style={S.packSectionTitle}>POSTCARD PACKS</Text>
              </View>
              {totalCards > 0 && (
                <Pressable onPress={() => router.push("/collection")} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={S.packCollectionCount}>{uniqueCards}/{CARD_CATALOG.length}</Text>
                  <Ionicons name="chevron-forward" size={12} color={C.amber} />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 12, paddingBottom: 4 }}
            >
              {PACK_CATALOG.map((pack, idx) => (
                <Animated.View key={pack.id} entering={FadeInDown.delay(idx * 60 + 100).duration(400)}>
                  <Pressable
                    onPress={() => {
                      if (coins < pack.price) { Alert.alert("Not Enough Spheres", `You need ${pack.price - coins} more.`); return; }
                      Alert.alert(`Buy ${pack.name}?`, `${pack.description}\n\nCost: ${pack.price} spheres`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open Pack", onPress: async () => {
                          const result = await spendCoins(pack.price);
                          if (!result.success) { Alert.alert("Error", "Purchase failed."); return; }
                          setCoins(result.balance);
                          router.push({ pathname: "/pack-opening", params: { packId: pack.id } });
                        }},
                      ]);
                    }}
                    style={({ pressed }) => [S.packCard, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
                  >
                    <View style={[S.packCardGradient, { backgroundColor: pack.color }]}>
                      <Ionicons name={pack.icon as any} size={32} color="rgba(255,255,255,0.35)" />
                    </View>
                    <View style={S.packCardBody}>
                      <Text style={S.packCardName}>{pack.name}</Text>
                      <Text style={S.packCardDesc} numberOfLines={2}>{pack.description}</Text>
                      <View style={S.packCardPrice}>
                        <Text style={S.packCardPriceText}>{pack.price} spheres</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Category filter pills ── */}
        <View style={{ height: 52 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow} style={{ flex: 1 }}>
            {categories.map((cat) => (
              <Pressable key={cat} onPress={() => setFilter(cat)} style={[S.filterPill, filter === cat && S.filterPillActive]}>
                <Text style={[S.filterPillText, filter === cat && S.filterPillTextActive]}>{CATEGORY_LABELS[cat]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Items grid (non-game) ── */}
        {nonGameItems.length > 0 && (
          <View style={S.grid}>
            {nonGameItems.map((item, idx) => {
              const affordable = coins >= item.price;
              const isOwnedItem = owned.includes(item.id) && !item.consumable;
              return (
                <Animated.View key={item.id} entering={FadeInDown.delay(idx * 40 + 50).duration(400)} style={{ width: "47%" }}>
                  <Pressable
                    onPress={() => handleBuy(item)}
                    style={({ pressed }) => [S.itemCard, isOwnedItem && S.itemCardOwned, pressed && S.itemCardPressed]}
                  >
                    <View style={[S.itemIcon, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
                    </View>
                    {isOwnedItem && (
                      <View style={[S.lockBadge, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                        <Ionicons name="checkmark-circle" size={10} color="#22C55E" />
                      </View>
                    )}
                    <Text style={S.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={S.itemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={[S.priceBtn, isOwnedItem && S.priceBtnOwned, !affordable && !isOwnedItem && S.priceBtnLow]}>
                      {isOwnedItem ? (
                        <Text style={[S.priceBtnText, { color: "#22C55E" }]}>Owned</Text>
                      ) : (
                        <Text style={[S.priceBtnText, !affordable && { color: C.muted }]}>⚪ {item.price}</Text>
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* ── My Items (quick access to owned) ── */}
        {owned.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 6 }}>
            <View style={S.sectionHeader}>
              <Ionicons name="bag-check-outline" size={16} color={C.amber} />
              <Text style={S.sectionTitle}>MY ITEMS</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
              {/* Collection shortcut always shows if any cards */}
              {totalCards > 0 && (
                <Pressable onPress={() => router.push("/collection")} style={S.myItemChip}>
                  <Ionicons name="images-outline" size={16} color="#8B5CF6" />
                  <Text style={S.myItemLabel}>Collection ({uniqueCards})</Text>
                </Pressable>
              )}
              {/* Show owned games */}
              {gameItems.filter(g => owned.includes(g.id)).map(g => (
                <Pressable key={g.id} onPress={() => handleGameTap(g)} style={S.myItemChip}>
                  <Ionicons name={g.icon as any} size={16} color={g.iconColor} />
                  <Text style={S.myItemLabel}>{g.name}</Text>
                </Pressable>
              ))}
              {/* Lyrics — one chip per purchased language */}
              {(["zh", "es", "fr"] as const).map((lc) =>
                owned.includes(`lyrics_${lc}` as ShopItemId) ? (
                  <Pressable key={lc} onPress={() => router.push({ pathname: "/lyrics" as any, params: { lang: lc } })} style={S.myItemChip}>
                    <Ionicons name="musical-notes-outline" size={16} color="#EC4899" />
                    <Text style={S.myItemLabel}>{lc === "zh" ? "Mandarin Lyrics" : lc === "es" ? "Spanish Lyrics" : "French Lyrics"}</Text>
                  </Pressable>
                ) : null
              )}
              {/* Chatbot */}
              {owned.includes("chatbot_assistant" as ShopItemId) && (
                <Pressable onPress={() => router.push({ pathname: "/chatbot" as any, params: { lang: langCode } })} style={S.myItemChip}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0EA5E9" />
                  <Text style={S.myItemLabel}>AI Chat</Text>
                </Pressable>
              )}
              {/* Themes */}
              {(owned.includes("dark_theme" as ShopItemId) || owned.includes("sand_theme" as ShopItemId)) && (
                <Pressable onPress={() => router.push("/(tabs)/settings" as any)} style={S.myItemChip}>
                  <Ionicons name="color-palette-outline" size={16} color="#6366F1" />
                  <Text style={S.myItemLabel}>Themes</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {/* ── Redeem code ── */}
        <Pressable onPress={() => setRedeemExpanded(!redeemExpanded)} style={S.redeemRow}>
          <Ionicons name="gift-outline" size={16} color={C.amber} />
          <Text style={S.redeemLabel}>Redeem a code</Text>
          <Ionicons name={redeemExpanded ? "chevron-up" : "chevron-down"} size={14} color={C.muted} />
        </Pressable>
        {redeemExpanded && (
          <View style={S.redeemInputRow}>
            <TextInput
              style={S.redeemInput}
              placeholder="Enter code…"
              placeholderTextColor={C.muted}
              value={redeemCode}
              onChangeText={setRedeemCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleRedeem}
            />
            <Pressable
              onPress={handleRedeem}
              disabled={!redeemCode.trim()}
              style={({ pressed }) => [S.redeemBtn, { backgroundColor: redeemCode.trim() ? C.amber : C.locked, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={{ fontWeight: "700", fontSize: 13, color: redeemCode.trim() ? "#FFF" : C.muted }}>Redeem</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: "center", justifyContent: "center", marginRight: 10, borderWidth: 0.5, borderColor: C.border },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  coinPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFF8E8", borderWidth: 1, borderColor: "rgba(212,160,23,0.30)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  coinPillIcon: { fontSize: 14 },
  coinPillText: { fontSize: 14, fontWeight: "700", color: "#8A6200" },

  levelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", paddingHorizontal: 18, marginBottom: 10 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.goldBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  levelBadgeText: { fontSize: 12, fontWeight: "700", color: C.gold },

  effectChip: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(26,22,20,0.05)", alignItems: "center", justifyContent: "center" },

  // ── Featured Banner ──
  featuredBanner: {
    marginHorizontal: 18, marginBottom: 6, borderRadius: 20, overflow: "hidden",
    backgroundColor: C.gameBg, flexDirection: "row", alignItems: "center",
    paddingVertical: 18, paddingHorizontal: 20, position: "relative",
  },
  featuredBadge: {
    position: "absolute", top: 12, left: 14,
    backgroundColor: "#F59E0B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  featuredBadgeText: { fontSize: 9, fontWeight: "800", color: "#000", letterSpacing: 0.8 },
  featuredContent: { flex: 1, marginTop: 14 },
  featuredTitle: { fontSize: 20, fontWeight: "800", color: "#F3EDE3", letterSpacing: -0.3 },
  featuredSub: { fontSize: 12, color: "rgba(243,237,227,0.60)", lineHeight: 17, marginTop: 4 },
  featuredIconBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", marginLeft: 14 },

  // ── Section Headers ──
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 18, paddingBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: C.muted },

  // ── Game Cards ──
  gameCard: {
    width: SW * 0.38, backgroundColor: C.card, borderRadius: 16, overflow: "hidden",
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  gameCardTop: { height: 68, alignItems: "center", justifyContent: "center", position: "relative" },
  gameUnlockedBadge: {
    position: "absolute", top: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(34,197,94,0.18)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  gameUnlockedText: { fontSize: 11, fontWeight: "700", color: "#22C55E" },
  gameCardBottom: { padding: 10 },
  gameCardName: { fontSize: 13, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  gameCardDesc: { fontSize: 10, color: C.inkSub, lineHeight: 14, marginTop: 2 },
  gameCardPrice: {
    marginTop: 10, alignSelf: "flex-start",
    backgroundColor: C.goldBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99,
  },
  gameCardPriceText: { fontSize: 12, fontWeight: "700", color: "#8A6200" },

  // ── Filter pills ──
  filterRow: { paddingHorizontal: 18, paddingBottom: 12, gap: 8, alignItems: "center", flexDirection: "row" },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: C.card, borderWidth: 0.5, borderColor: C.border, alignSelf: "center" },
  filterPillActive: { backgroundColor: C.amber, borderColor: C.amber },
  filterPillText: { fontSize: 13, fontWeight: "600", color: C.inkSub },
  filterPillTextActive: { color: "#FFF" },

  // ── Item Grid ──
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 12 },
  itemCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 14,
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    position: "relative",
  },
  itemCardOwned: { borderColor: "rgba(34,197,94,0.30)", borderWidth: 1 },
  itemCardPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  itemIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  lockBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99,
  },
  itemName: { fontSize: 13, fontWeight: "700", color: C.ink, letterSpacing: -0.2, marginBottom: 3 },
  itemDesc: { fontSize: 11, color: C.inkSub, lineHeight: 15, marginBottom: 10, minHeight: 30 },
  priceBtn: { backgroundColor: C.amber, borderRadius: 99, paddingVertical: 8, alignItems: "center" },
  priceBtnOwned: { backgroundColor: "rgba(34,197,94,0.10)" },
  priceBtnLow: { backgroundColor: "rgba(26,22,20,0.06)" },
  priceBtnText: { fontSize: 12, fontWeight: "600", color: "#FFF" },

  // ── Postcard Pack styles ──
  packSection: { paddingTop: 14, paddingBottom: 10 },
  packSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 10 },
  packSectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, color: C.muted },
  packCollectionCount: { fontSize: 12, fontWeight: "600", color: C.amber },
  packCard: {
    width: 138, backgroundColor: C.card, borderRadius: 14, overflow: "hidden",
    borderWidth: 0.5, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  packCardGradient: { height: 50, alignItems: "center", justifyContent: "center" },
  packCardBody: { padding: 10 },
  packCardName: { fontSize: 12, fontWeight: "700", color: C.ink, letterSpacing: -0.2 },
  packCardDesc: { fontSize: 10, color: C.inkSub, lineHeight: 14, marginTop: 2 },
  packCardPrice: { marginTop: 8, alignSelf: "flex-start", backgroundColor: C.goldBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  packCardPriceText: { fontSize: 12, fontWeight: "700", color: "#8A6200" },

  // ── Redeem ──
  redeemRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  redeemLabel: { fontWeight: "600", fontSize: 13, color: C.ink, flex: 1 },
  redeemInputRow: { flexDirection: "row", paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  redeemInput: {
    flex: 1, height: 40, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, fontSize: 14, fontWeight: "500", color: C.ink,
  },
  redeemBtn: { height: 40, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  // ── My Items ──
  myItemChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.card, borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 0.5, borderColor: C.border,
  },
  myItemLabel: { fontSize: 12, fontWeight: "600", color: C.ink },
});
