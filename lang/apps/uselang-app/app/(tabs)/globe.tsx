import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { LANGUAGE_REACH } from "@/components/NativeGlobe";
import { AppleMapGlobe } from "@/components/AppleMapGlobe";
import { getUserProfile } from "@/lib/user-store";
import { ACCENT_REGIONS, type AccentRegion, type LanguageAccents } from "@/lib/accent-regions";
import { getLocationsForLanguage, LOCATION_ICONS } from "@/data/map-locations";
import { getLanguageProgress, subscribeLessonProgress } from "@/lib/lesson-store";
import type { MapLocation, MapLocationTier, LanguageProgress } from "@/lib/lesson-types";

const { height: SH } = Dimensions.get("window");
const GLOBE_H = Math.min(SH * 0.52, 420);
const SPACE_BG = "#050816";

// ── Component ─────────────────────────────────────────────────────────────────

// Tier colors for location badges
const TIER_GLOW: Record<MapLocationTier, string> = {
  locked: "rgba(0,0,0,0.05)",
  bronze: "rgba(205,127,50,0.18)",
  silver: "rgba(160,160,160,0.18)",
  gold: "rgba(196,166,124,0.22)",
};
const TIER_TEXT: Record<MapLocationTier, string> = {
  locked: "#888",
  bronze: "#CD7F32",
  silver: "#808080",
  gold: "#C4A67C",
};

export default function GlobeScreen() {
  const [knownLanguages, setKnownLanguages] = useState<string[]>(["en"]);
  const [learningLang, setLearningLang] = useState("zh");
  const [langProgress, setLangProgress] = useState<LanguageProgress | null>(null);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [tappedLocation, setTappedLocation] = useState<{ loc: MapLocation; tier: MapLocationTier } | null>(null);

  const loadData = React.useCallback(async () => {
    const profile = await getUserProfile();
    const known = profile.knownLanguages.length > 0 ? profile.knownLanguages : ["en"];
    const learning = profile.learningLanguage || "zh";
    setKnownLanguages(known);
    setLearningLang(learning);
    setMapLocations(getLocationsForLanguage(learning));
    const prog = await getLanguageProgress(learning);
    setLangProgress(prog);
  }, []);

  useEffect(() => {
    loadData();
    const unsub = subscribeLessonProgress(() => loadData());
    return unsub;
  }, [loadData]);

  const totalCountries = useMemo(() => {
    let max = 0;
    knownLanguages.forEach((c) => {
      const d = LANGUAGE_REACH[c];
      if (d && d.countries > max) max = d.countries;
    });
    return max;
  }, [knownLanguages]);

  const [openAccents, setOpenAccents] = useState<LanguageAccents | null>(null);

  const totalSpeakersM = useMemo(() => {
    return knownLanguages.reduce((acc, code) => acc + (ACCENT_REGIONS[code]?.speakersMillions ?? 0), 0);
  }, [knownLanguages]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, backgroundColor: COLORS.bg }}
        style={{ backgroundColor: COLORS.bg }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Globe — Apple Maps satellite globe ──────────────────────── */}
        <View
          style={{
            height: GLOBE_H,
            backgroundColor: SPACE_BG,
            overflow: "hidden",
          }}
        >
          {/* Apple Maps fills the entire header — real satellite Earth */}
          <AppleMapGlobe
            height={GLOBE_H}
            highlightLanguages={knownLanguages}
          />

          {/* Section label top-left — floats above the map */}
          <Text
            style={{
              position: "absolute",
              top: 10,
              left: 22,
              fontSize: 11,
              fontWeight: "800",
              color: "rgba(255,255,255,0.85)",
              letterSpacing: 1.2,
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            YOUR WORLD
          </Text>

          {/* Hint badge — updated for map gestures */}
          <View
            style={{
              position: "absolute",
              bottom: 14,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: "rgba(0,0,0,0.45)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <Ionicons name="globe-outline" size={12} color="rgba(180,210,255,0.9)" />
            <Text
              style={{
                fontSize: 11,
                color: "rgba(210,225,255,0.9)",
                fontWeight: "600",
                letterSpacing: 0.3,
              }}
            >
              Pinch & drag to explore
            </Text>
          </View>
        </View>

        {/* ── Title (below globe, on the cream bg) ──────────────────── */}
        <View style={{ paddingHorizontal: 22, paddingTop: 18, backgroundColor: COLORS.bg }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.6 }}>
            Every language opens{"\n"}new countries.
          </Text>
        </View>

        {/* ── Stats row ──────────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 20 }}>
          <StatCard
            value={String(knownLanguages.length)}
            label={knownLanguages.length === 1 ? "LANGUAGE" : "LANGUAGES"}
          />
          <StatCard
            value={String(totalCountries)}
            label="COUNTRIES"
          />
          <StatCard
            value={totalSpeakersM >= 1000 ? `${(totalSpeakersM / 1000).toFixed(1)}B` : `${totalSpeakersM}M`}
            label="SPEAKERS"
          />
        </View>

        {/* ── Your languages with accent region cards ──────────────── */}
        <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.9, paddingHorizontal: 22, marginBottom: 10 }}>
          YOUR LANGUAGES · ACCENT REGIONS
        </Text>
        <View style={{ paddingHorizontal: 20 }}>
          {knownLanguages.map((code) => {
            const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
            const accents = ACCENT_REGIONS[code];
            if (!lang || !accents) return null;
            return (
              <Pressable
                key={code}
                onPress={() => setOpenAccents(accents)}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: COLORS.goldLight,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.gold, letterSpacing: 0.5 }}>
                    {code.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>
                    {lang.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 2 }}>
                    {accents.regions.length} accents · {accents.countries} countries · {accents.speakersMillions >= 1000 ? `${(accents.speakersMillions / 1000).toFixed(1)}B` : `${accents.speakersMillions}M`} speakers
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
                    {accents.regions.slice(0, 4).map((r) => (
                      <Text key={r.name} style={{ fontSize: 14 }}>{r.flag}</Text>
                    ))}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {/* ── Lesson-unlocked locations ─────────────────────── */}
        {mapLocations.length > 0 && (
          <>
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.textMuted, letterSpacing: 0.9, paddingHorizontal: 22, marginTop: 20, marginBottom: 10 }}>
              UNLOCKED LOCATIONS
            </Text>
            <View style={{ paddingHorizontal: 20 }}>
              {mapLocations.map((loc) => {
                const tier = langProgress?.locationTiers[loc.id] || "locked";
                const unlocked = tier !== "locked";
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => unlocked && setTappedLocation({ loc, tier: tier as MapLocationTier })}
                    style={({ pressed }) => ({
                      backgroundColor: unlocked ? COLORS.surface : "rgba(0,0,0,0.02)",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: unlocked ? 1 : 0,
                      borderColor: TIER_GLOW[tier],
                      opacity: (unlocked ? 1 : 0.5) * (pressed ? 0.88 : 1),
                      shadowColor: unlocked ? TIER_TEXT[tier] : "transparent",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: unlocked ? 0.25 : 0,
                      shadowRadius: unlocked ? 12 : 0,
                    })}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: unlocked ? TIER_GLOW[tier] : "rgba(0,0,0,0.04)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Ionicons
                        name={(LOCATION_ICONS[loc.locationType] || "location-outline") as any}
                        size={22}
                        color={unlocked ? TIER_TEXT[tier] : "#AAA"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "700", color: unlocked ? COLORS.text : "#999" }}>
                        {loc.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSub, marginTop: 2 }}>
                        {loc.country}
                      </Text>
                    </View>
                    {unlocked && (
                      <View style={{ backgroundColor: TIER_GLOW[tier], paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: TIER_TEXT[tier], textTransform: "uppercase" }}>
                          {tier}
                        </Text>
                      </View>
                    )}
                    {!unlocked && (
                      <Ionicons name="lock-closed" size={16} color="#CCC" />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* ── Expand your world ───────────────────────────────── */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 14,
            padding: 18,
            backgroundColor: COLORS.surface,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: COLORS.goldDim,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.text, marginBottom: 4 }}>
            Expand your world
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textSub, lineHeight: 18 }}>
            Every language you learn lights up new countries. Complete lessons to unlock locations.
          </Text>
        </View>
      </ScrollView>

      {/* ── Accent region popup ──────────────────────────────── */}
      <AccentSheet accents={openAccents} onClose={() => setOpenAccents(null)} />

      {/* ── Unlocked location pin popup ───────────────────────── */}
      <Modal
        visible={tappedLocation !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setTappedLocation(null)}
      >
        <Pressable
          style={LS.locModalBackdrop}
          onPress={() => setTappedLocation(null)}
        >
          <Pressable style={LS.locSheet} onPress={(e) => e.stopPropagation()}>
            {tappedLocation && (() => {
              const { loc, tier } = tappedLocation;
              const tierColor = TIER_TEXT[tier];
              return (
                <>
                  <View style={LS.locSheetHandle} />
                  <View style={[LS.locIconCircle, { backgroundColor: TIER_GLOW[tier] }]}>
                    <Ionicons
                      name={(LOCATION_ICONS[loc.locationType] || "location-outline") as any}
                      size={28}
                      color={tierColor}
                    />
                  </View>
                  <Text style={LS.locSheetTier}>{tier.toUpperCase()} · UNLOCKED</Text>
                  <Text style={LS.locSheetName}>{loc.name}</Text>
                  <Text style={LS.locSheetCountry}>{loc.country}</Text>
                  <Pressable
                    style={LS.locSheetClose}
                    onPress={() => setTappedLocation(null)}
                  >
                    <Text style={LS.locSheetCloseText}>Close</Text>
                  </Pressable>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.text, letterSpacing: -0.6 }}>
        {value}
      </Text>
      <Text
        style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontWeight: "700",
          marginTop: 2,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Accent breakdown sheet ───────────────────────────────────────────────
// Shows all accent regions for a language with the quick note on how they
// differ. Good answer to "if I learn Spanish, what accents am I getting?"

function AccentSheet({
  accents,
  onClose,
}: {
  accents: LanguageAccents | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!accents}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: COLORS.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 10,
            paddingBottom: 32,
            maxHeight: SH * 0.8,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <View
              style={{
                width: 42,
                height: 4,
                borderRadius: 2,
                backgroundColor: COLORS.borderLight,
              }}
            />
          </View>

          {accents && (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: COLORS.textMuted,
                  letterSpacing: 1,
                }}
              >
                {accents.label.toUpperCase()} · ACCENT MAP
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: COLORS.text,
                  letterSpacing: -0.4,
                  marginTop: 4,
                  marginBottom: 14,
                }}
              >
                {accents.regions.length} ways to speak{" "}
                {accents.label.toLowerCase()}.
              </Text>

              {accents.regions.map((r) => (
                <AccentRow key={`${r.country}-${r.name}`} region={r} />
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AccentRow({ region }: { region: AccentRegion }) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: COLORS.borderLight,
      }}
    >
      <Text style={{ fontSize: 26, marginRight: 14 }}>{region.flag}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>
            {region.name}
          </Text>
          {region.prestige && (
            <View
              style={{
                backgroundColor: COLORS.goldLight,
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 6,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "700", color: COLORS.gold, letterSpacing: 0.5 }}>
                STANDARD
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 1, marginBottom: 3 }}>
          {region.country}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textSub, lineHeight: 18 }}>
          {region.blurb}
        </Text>
      </View>
    </View>
  );
}

// ── Location pin popup styles ────────────────────────────────────────────────
const LS = StyleSheet.create({
  locModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "flex-end",
  },
  locSheet: {
    backgroundColor: "#FFFCF5",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 40,
    alignItems: "center",
  },
  locSheetHandle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginBottom: 22,
  },
  locIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  locSheetTier: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    color: "#A09790",
    marginBottom: 8,
  },
  locSheetName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1614",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 4,
  },
  locSheetCountry: {
    fontSize: 14,
    color: "#6B6360",
    marginBottom: 28,
  },
  locSheetClose: {
    backgroundColor: "rgba(168,93,46,0.10)",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 99,
  },
  locSheetCloseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#A85D2E",
  },
});
