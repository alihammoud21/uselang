import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getCoinBalance, spendCoins, addCoins } from "@/lib/challenge-store";
import { getProgressSummary, getLevel } from "@/lib/progress-store";
import {
  SHOP_CATALOG,
  purchaseItem,
  getInventory,
  getHintTokens,
  hasStreakFreeze,
  hasXpBoost,
  hasCoinDoubler,
  type ShopItemId,
  type ItemCategory,
  SHOP_CATALOG as CATALOG,
} from "@/lib/shop-store";

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
};

const CATEGORY_LABELS: Record<ItemCategory | "all", string> = {
  all: "All",
  utility: "Utility",
  boost: "Boost",
  pack: "Phrase Packs",
  cosmetic: "Cosmetic",
};

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [level, setLevel] = useState(1);
  const [filter, setFilter] = useState<ItemCategory | "all">("all");
  const [owned, setOwned] = useState<ShopItemId[]>([]);
  const [hintCount, setHintCount] = useState(0);
  const [activeEffects, setActiveEffects] = useState({ streakFreeze: false, xpBoost: false, coinDoubler: false });

  const load = useCallback(async () => {
    const [bal, summary, inv, hints, sf, xb, cd] = await Promise.all([
      getCoinBalance(),
      getProgressSummary(),
      getInventory(),
      getHintTokens(),
      hasStreakFreeze(),
      hasXpBoost(),
      hasCoinDoubler(),
    ]);
    setCoins(bal);
    setLevel(getLevel(summary.xp).level);
    setOwned(inv);
    setHintCount(hints);
    setActiveEffects({ streakFreeze: sf, xpBoost: xb, coinDoubler: cd });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBuy = useCallback(async (item: typeof CATALOG[0]) => {
    const isConsumed = item.id === "hint_token";
    const alreadyOwned = owned.includes(item.id) && !isConsumed;

    if (alreadyOwned) {
      Alert.alert("Already Owned", `You already have ${item.name}.`);
      return;
    }
    if (level < item.levelRequired) {
      Alert.alert("Level Required", `Reach Level ${item.levelRequired} to unlock this.`);
      return;
    }
    if (coins < item.price) {
      Alert.alert(
        "Not Enough Coins",
        `You need 🪙 ${item.price - coins} more coins.\nComplete weekly challenges on the Today tab to earn coins!`
      );
      return;
    }

    Alert.alert(
      `Buy ${item.name}?`,
      `Cost: 🪙 ${item.price}\n\n${item.description}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            const result = await spendCoins(item.price);
            if (!result.success) {
              Alert.alert("Error", "Purchase failed. Try again.");
              return;
            }
            const err = await purchaseItem(item.id);
            if (err) {
              Alert.alert("Error", err);
              return;
            }
            setCoins(result.balance);
            await load(); // refresh inventory + effects
            const successMsg = (() => {
              switch (item.id) {
                case "streak_freeze": return "Your streak is protected for today!";
                case "xp_boost": return "Next session earns 2× XP!";
                case "hint_token": return "3 hint tokens added to your wallet!";
                case "slow_speed": return "0.6× speed now available in the Speak tab!";
                case "coin_doubler": return "Next challenge claim earns 2× coins!";
                case "pack_travel": return "Travel phrases unlocked in Quick mode!";
                case "pack_food": return "Food & dining phrases unlocked!";
                case "pack_business": return "Business phrases unlocked!";
                case "dark_theme": return "Midnight theme activated!";
                case "sand_theme": return "Desert Sand theme activated!";
                case "gold_orb": return "Gold orb skin active in Speak!";
                case "midnight_orb": return "Midnight orb skin active in Speak!";
                case "badge_polyglot": return "Polyglot badge added to your profile!";
                case "badge_scholar": return "Scholar badge added to your profile!";
                default: return "Item added to your inventory!";
              }
            })();
            Alert.alert("Purchased! 🎉", successMsg);
          },
        },
      ]
    );
  }, [coins, level, owned, load]);

  const categories: Array<ItemCategory | "all"> = ["all", "utility", "boost", "pack", "cosmetic"];
  const filtered = filter === "all" ? CATALOG : CATALOG.filter((i) => i.category === filter);

  const hasActiveEffects = activeEffects.streakFreeze || activeEffects.xpBoost || activeEffects.coinDoubler || hintCount > 0;

  // ── Admin redeem code ──
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemExpanded, setRedeemExpanded] = useState(false);

  const ADMIN_CODES: Record<string, { label: string; coins: number; unlockAll: boolean }> = {
    "USELANG-ADMIN-2025":  { label: "Admin Access",  coins: 99999, unlockAll: true },
    "USELANG-TESTER":      { label: "Tester Pack",   coins: 10000, unlockAll: false },
    "USELANG-BETA":        { label: "Beta Reward",   coins: 5000,  unlockAll: false },
  };

  const handleRedeem = useCallback(async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;
    const entry = ADMIN_CODES[code];
    if (!entry) {
      Alert.alert("Invalid Code", "This code is not recognized.");
      return;
    }
    await addCoins(entry.coins);
    if (entry.unlockAll) {
      for (const item of CATALOG) {
        if (!owned.includes(item.id)) {
          await purchaseItem(item.id);
        }
      }
    }
    await load();
    setRedeemCode("");
    Alert.alert(
      `${entry.label} Redeemed! 🎉`,
      `+🪙 ${entry.coins.toLocaleString()}${entry.unlockAll ? "\nAll shop items unlocked!" : ""}`
    );
  }, [redeemCode, owned, load]);

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={S.headerTitle}>Shop</Text>
        <View style={S.coinPill}>
          <Text style={S.coinPillIcon}>🪙</Text>
          <Text style={S.coinPillText}>{coins}</Text>
        </View>
      </View>

      {/* Level + hint token info row */}
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
        <Text style={S.levelHint}>Higher levels unlock exclusive items</Text>
      </View>

      {/* Active effects banner */}
      {hasActiveEffects && (
        <View style={S.effectsBanner}>
          <Text style={S.effectsTitle}>ACTIVE EFFECTS</Text>
          <View style={S.effectsRow}>
            {activeEffects.streakFreeze && (
              <View style={S.effectChip}>
                <Ionicons name="snow-outline" size={12} color="#3B82F6" />
                <Text style={[S.effectChipText, { color: "#3B82F6" }]}>Streak Safe</Text>
              </View>
            )}
            {activeEffects.xpBoost && (
              <View style={S.effectChip}>
                <Ionicons name="flash-outline" size={12} color={C.gold} />
                <Text style={[S.effectChipText, { color: C.gold }]}>2× XP</Text>
              </View>
            )}
            {activeEffects.coinDoubler && (
              <View style={S.effectChip}>
                <Ionicons name="layers-outline" size={12} color={C.amber} />
                <Text style={[S.effectChipText, { color: C.amber }]}>2× Coins</Text>
              </View>
            )}
            {hintCount > 0 && (
              <View style={S.effectChip}>
                <Ionicons name="bulb-outline" size={12} color={C.gold} />
                <Text style={[S.effectChipText, { color: C.gold }]}>{hintCount} Hints</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Redeem code section */}
      <Pressable
        onPress={() => setRedeemExpanded(!redeemExpanded)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 10 }}
      >
        <Ionicons name="gift-outline" size={16} color={C.amber} />
        <Text style={{ fontFamily: "Geist-SemiBold", fontSize: 13, color: C.ink, flex: 1 }}>Redeem a code</Text>
        <Ionicons name={redeemExpanded ? "chevron-up" : "chevron-down"} size={14} color={C.muted} />
      </Pressable>
      {redeemExpanded && (
        <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingBottom: 10, gap: 8 }}>
          <TextInput
            style={{
              flex: 1, height: 40, borderRadius: 12,
              backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
              paddingHorizontal: 14, fontSize: 14, fontFamily: "Geist-Medium",
              color: C.ink,
            }}
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
            style={({ pressed }) => ({
              height: 40, paddingHorizontal: 18, borderRadius: 12,
              backgroundColor: redeemCode.trim() ? C.amber : C.locked,
              alignItems: "center", justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: "Geist-Bold", fontSize: 13, color: redeemCode.trim() ? "#FFF" : C.muted }}>Redeem</Text>
          </Pressable>
        </View>
      )}

      {/* Category filter pills — fixed height so position never shifts */}
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filterRow}
          style={{ flex: 1 }}
        >
          {categories.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setFilter(cat)}
              style={[S.filterPill, filter === cat && S.filterPillActive]}
            >
              <Text style={[S.filterPillText, filter === cat && S.filterPillTextActive]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Items grid */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={S.grid} showsVerticalScrollIndicator={false}>
        {filtered.map((item) => {
          const locked = level < item.levelRequired;
          const affordable = coins >= item.price;
          const isOwned = owned.includes(item.id) && !item.consumable;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleBuy(item)}
              style={({ pressed }) => [
                S.itemCard,
                locked && S.itemCardLocked,
                isOwned && S.itemCardOwned,
                pressed && S.itemCardPressed,
              ]}
            >
              {/* Icon */}
              <View style={[S.itemIcon, { backgroundColor: locked ? C.locked : item.iconBg }]}>
                <Ionicons name={item.icon as any} size={26} color={locked ? C.muted : item.iconColor} />
              </View>

              {/* Top-right badge */}
              {isOwned ? (
                <View style={[S.lockBadge, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
                  <Ionicons name="checkmark-circle" size={10} color="#22C55E" />
                  <Text style={[S.lockBadgeText, { color: "#22C55E" }]}>Owned</Text>
                </View>
              ) : locked ? (
                <View style={S.lockBadge}>
                  <Ionicons name="lock-closed" size={10} color={C.muted} />
                  <Text style={S.lockBadgeText}>Lvl {item.levelRequired}</Text>
                </View>
              ) : null}

              <Text style={[S.itemName, locked && S.itemTextDim]}>{item.name}</Text>
              <Text style={S.itemDesc} numberOfLines={2}>{item.description}</Text>

              <View style={S.catPill}>
                <Text style={S.catPillText}>{CATEGORY_LABELS[item.category].toUpperCase()}</Text>
              </View>

              {/* Price / owned button */}
              <View style={[
                S.priceBtn,
                isOwned && S.priceBtnOwned,
                !affordable && !locked && !isOwned && S.priceBtnLow,
                locked && S.priceBtnLocked,
              ]}>
                {isOwned ? (
                  <Text style={[S.priceBtnText, { color: "#22C55E" }]}>✓ Owned</Text>
                ) : locked ? (
                  <Text style={[S.priceBtnText, { color: C.muted }]}>Locked</Text>
                ) : (
                  <Text style={[S.priceBtnText, !affordable && { color: C.muted }]}>
                    🪙 {item.price}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center", justifyContent: "center",
    marginRight: 10,
    borderWidth: 0.5, borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: C.ink,
    letterSpacing: -0.5,
  },
  coinPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF8E8",
    borderWidth: 1, borderColor: "rgba(212,160,23,0.30)",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99,
  },
  coinPillIcon: { fontSize: 14 },
  coinPillText: { fontSize: 14, fontWeight: "700", color: "#8A6200" },

  levelRow: {
    flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap",
    paddingHorizontal: 18, marginBottom: 10,
  },
  levelBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: C.goldBg,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
  },
  levelBadgeText: { fontSize: 12, fontWeight: "700", color: C.gold },
  levelHint: { flex: 1, fontSize: 11, color: C.muted },

  effectsBanner: {
    marginHorizontal: 18, marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: C.border,
  },
  effectsTitle: {
    fontSize: 9, fontWeight: "700", letterSpacing: 1.5, color: C.muted,
    marginBottom: 8,
  },
  effectsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  effectChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(26,22,20,0.04)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99,
  },
  effectChipText: { fontSize: 12, fontWeight: "600" },

  filterRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8,
    alignItems: "center",
    flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.border,
    alignSelf: "center",
  },
  filterPillActive: { backgroundColor: C.amber, borderColor: C.amber },
  filterPillText: { fontSize: 13, fontWeight: "600", color: C.inkSub },
  filterPillTextActive: { color: "#FFF" },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    gap: 12,
  },
  itemCard: {
    width: "47%",
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
  },
  itemCardLocked: { opacity: 0.55 },
  itemCardOwned: { borderColor: "rgba(34,197,94,0.30)", borderWidth: 1 },
  itemCardPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },

  itemIcon: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  lockBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(26,22,20,0.07)",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99,
  },
  lockBadgeText: { fontSize: 10, fontWeight: "600", color: C.muted },

  itemName: { fontSize: 14, fontWeight: "700", color: C.ink, letterSpacing: -0.2, marginBottom: 4 },
  itemTextDim: { color: C.muted },
  itemDesc: { fontSize: 12, color: C.inkSub, lineHeight: 17, marginBottom: 10 },

  catPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(26,22,20,0.05)",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 99, marginBottom: 10,
  },
  catPillText: { fontSize: 9, fontWeight: "700", color: C.muted, letterSpacing: 0.8 },

  priceBtn: {
    backgroundColor: C.amber,
    borderRadius: 99, paddingVertical: 9,
    alignItems: "center",
  },
  priceBtnOwned: { backgroundColor: "rgba(34,197,94,0.10)" },
  priceBtnLow: {
    backgroundColor: "rgba(26,22,20,0.06)",
  },
  priceBtnLocked: {
    backgroundColor: "rgba(26,22,20,0.05)",
  },
  priceBtnText: {
    fontSize: 13, fontWeight: "600", color: "#FFF",
  },
});
