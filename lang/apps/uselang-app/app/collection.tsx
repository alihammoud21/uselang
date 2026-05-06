// ── Postcard Collection Screen ────────────────────────────────────────────────
// Browse all collected postcards, see stats, and sell duplicates.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  getCollection,
  getCard,
  CARD_CATALOG,
  RARITY_CONFIG,
  sellCard,
  getPacksOpened,
  type OwnedCard,
  type PostcardCard,
} from "@/lib/postcard-store";
import { addCoins, getCoinBalance } from "@/lib/challenge-store";

const C = {
  bg: "#F4EFE6",
  card: "#FFFFFF",
  ink: "#1A1614",
  inkSub: "#6B6360",
  muted: "#A09790",
  border: "rgba(26,22,20,0.09)",
  amber: "#A85D2E",
};

type FilterRarity = "all" | "common" | "uncommon" | "rare" | "legendary" | "mythic";

export default function CollectionScreen() {
  const router = useRouter();
  const [collection, setCollection] = useState<OwnedCard[]>([]);
  const [packsOpened, setPacksOpened] = useState(0);
  const [coins, setCoins] = useState(0);
  const [filter, setFilter] = useState<FilterRarity>("all");

  const load = useCallback(async () => {
    const [coll, po, bal] = await Promise.all([
      getCollection(),
      getPacksOpened(),
      getCoinBalance(),
    ]);
    setCollection(coll);
    setPacksOpened(po);
    setCoins(bal);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Build grouped card list: cardId → { card, count }
  const grouped = collection.reduce<Record<string, { card: PostcardCard; count: number; firstObtained: number }>>((acc, oc) => {
    const card = getCard(oc.cardId);
    if (!card) return acc;
    if (!acc[oc.cardId]) {
      acc[oc.cardId] = { card, count: 0, firstObtained: oc.obtainedAt };
    }
    acc[oc.cardId].count++;
    return acc;
  }, {});

  const entries = Object.values(grouped)
    .filter((e) => filter === "all" || e.card.rarity === filter)
    .sort((a, b) => {
      const order: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3, mythic: 4 };
      return order[b.card.rarity] - order[a.card.rarity];
    });

  const uniqueCount = new Set(collection.map((c) => c.cardId)).size;

  const handleSell = useCallback(async (cardId: string, cardName: string) => {
    const card = getCard(cardId);
    if (!card) return;
    Alert.alert(
      `Sell ${cardName}?`,
      `You'll receive ${card.sellValue} spheres.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sell",
          style: "destructive",
          onPress: async () => {
            const value = await sellCard(cardId);
            if (value > 0) await addCoins(value);
            await load();
          },
        },
      ],
    );
  }, [load]);

  const filters: FilterRarity[] = ["all", "common", "uncommon", "rare", "legendary", "mythic"];

  return (
    <SafeAreaView style={S.safe} edges={["top"]}>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </Pressable>
        <Text style={S.headerTitle}>Collection</Text>
        <View style={S.statPill}>
          <Text style={S.statPillText}>{uniqueCount}/{CARD_CATALOG.length}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statValue}>{collection.length}</Text>
          <Text style={S.statLabel}>Total Cards</Text>
        </View>
        <View style={S.statCard}>
          <Text style={S.statValue}>{uniqueCount}</Text>
          <Text style={S.statLabel}>Unique</Text>
        </View>
        <View style={S.statCard}>
          <Text style={S.statValue}>{packsOpened}</Text>
          <Text style={S.statLabel}>Packs Opened</Text>
        </View>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.filterRow}
      >
        {filters.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              S.filterPill,
              filter === f && { backgroundColor: f === "all" ? C.amber : RARITY_CONFIG[f].color },
            ]}
          >
            <Text
              style={[
                S.filterPillText,
                filter === f && { color: "#FFF" },
              ]}
            >
              {f === "all" ? "All" : RARITY_CONFIG[f].label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Cards */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={S.grid} showsVerticalScrollIndicator={false}>
        {entries.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Ionicons name="images-outline" size={48} color={C.muted} />
            <Text style={{ fontSize: 15, color: C.muted, marginTop: 12, fontWeight: "600" }}>
              {filter === "all" ? "No cards yet — open a pack in the Shop!" : `No ${filter} cards yet`}
            </Text>
          </View>
        )}
        {entries.map((entry, idx) => {
          const { card, count } = entry;
          const rarityConf = RARITY_CONFIG[card.rarity];
          return (
            <Animated.View
              key={card.id}
              entering={FadeInDown.delay(idx * 40).duration(350)}
              style={[S.cardItem, { borderColor: rarityConf.color + "30" }]}
            >
              <View style={[S.cardIcon, { backgroundColor: card.color + "15" }]}>
                <Ionicons name={card.icon as any} size={28} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={S.cardName}>{card.name}</Text>
                  {count > 1 && (
                    <View style={S.countBadge}>
                      <Text style={S.countBadgeText}>×{count}</Text>
                    </View>
                  )}
                </View>
                <Text style={S.cardPhrase}>{card.phrase}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={[S.rarityDot, { backgroundColor: rarityConf.color }]} />
                  <Text style={[S.rarityLabel, { color: rarityConf.color }]}>{rarityConf.label}</Text>
                  <Text style={S.langLabel}>{card.lang.toUpperCase()}</Text>
                  <Text style={S.xpLabel}>+{card.xpBonus} XP</Text>
                </View>
              </View>
              {count > 1 && (
                <Pressable
                  onPress={() => handleSell(card.id, card.name)}
                  style={S.sellBtn}
                >
                  <Text style={S.sellBtnText}>{card.sellValue}</Text>
                  <Ionicons name="cash-outline" size={12} color="#D4A017" />
                </Pressable>
              )}
            </Animated.View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    flex: 1, fontSize: 22, fontWeight: "800",
    color: C.ink, letterSpacing: -0.5,
  },
  statPill: {
    backgroundColor: "rgba(168,93,46,0.10)",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 99,
  },
  statPillText: { fontSize: 13, fontWeight: "700", color: C.amber },

  statsRow: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 18, paddingBottom: 14,
  },
  statCard: {
    flex: 1, backgroundColor: C.card,
    borderRadius: 14, padding: 14,
    alignItems: "center",
    borderWidth: 0.5, borderColor: C.border,
  },
  statValue: { fontSize: 20, fontWeight: "800", color: C.ink },
  statLabel: { fontSize: 11, fontWeight: "600", color: C.muted, marginTop: 2 },

  filterRow: {
    paddingHorizontal: 18, paddingBottom: 14,
    gap: 8, flexDirection: "row",
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 99, backgroundColor: C.card,
    borderWidth: 0.5, borderColor: C.border,
  },
  filterPillText: { fontSize: 12, fontWeight: "600", color: C.inkSub },

  grid: { paddingHorizontal: 18, gap: 10 },
  cardItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, padding: 14,
  },
  cardIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: C.ink },
  cardPhrase: { fontSize: 13, color: C.inkSub, marginTop: 2 },
  countBadge: {
    backgroundColor: "rgba(168,93,46,0.12)",
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 99,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: C.amber },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityLabel: { fontSize: 10, fontWeight: "700" },
  langLabel: {
    fontSize: 9, fontWeight: "800", letterSpacing: 0.8,
    color: C.muted,
    backgroundColor: "rgba(26,22,20,0.05)",
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 99,
  },
  xpLabel: { fontSize: 10, fontWeight: "600", color: "#22C55E" },
  sellBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: "rgba(212,160,23,0.10)",
  },
  sellBtnText: { fontSize: 12, fontWeight: "700", color: "#D4A017" },
});
