import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, Pressable, Modal, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { LANGUAGE_REACH } from "@/components/NativeGlobe";
import { EarthGlobe, type EarthMarker } from "@/components/EarthGlobe";
import { getUserProfile } from "@/lib/user-store";
import { ACCENT_REGIONS, type AccentRegion, type LanguageAccents } from "@/lib/accent-regions";
import { CountryPopup, findCountryMatch, type CountryPopupData } from "@/components/CountryPopup";
import { getLocationsForLanguage, LOCATION_ICONS } from "@/data/map-locations";
import { getLanguageProgress, subscribeLessonProgress } from "@/lib/lesson-store";
import type { MapLocation, MapLocationTier, LanguageProgress } from "@/lib/lesson-types";

const { width: SW, height: SH } = Dimensions.get("window");
const GLOBE_H = Math.min(SH * 0.52, 420);
const SPACE_BG = "#050816";
const STARS = [
  { left: "12%", top: "18%", size: 1.4, opacity: 0.6 },
  { left: "24%", top: "78%", size: 1.1, opacity: 0.45 },
  { left: "38%", top: "10%", size: 1.2, opacity: 0.55 },
  { left: "52%", top: "20%", size: 1.6, opacity: 0.75 },
  { left: "70%", top: "14%", size: 1, opacity: 0.5 },
  { left: "84%", top: "30%", size: 1.3, opacity: 0.65 },
  { left: "16%", top: "46%", size: 1, opacity: 0.48 },
  { left: "78%", top: "66%", size: 1.5, opacity: 0.7 },
  { left: "62%", top: "84%", size: 1.1, opacity: 0.5 },
  { left: "33%", top: "62%", size: 1.3, opacity: 0.62 },
];

// Language → representative speaker-city markers (lat, lng).
const LANG_MARKERS: Record<string, Array<{ lat: number; lng: number; label: string }>> = {
  en: [
    { lat: 40.7128, lng: -74.006, label: "New York" },
    { lat: 51.5074, lng: -0.1278, label: "London" },
    { lat: -33.8688, lng: 151.2093, label: "Sydney" },
    { lat: 28.6139, lng: 77.209, label: "Delhi" },
  ],
  es: [
    { lat: 40.4168, lng: -3.7038, label: "Madrid" },
    { lat: 19.4326, lng: -99.1332, label: "Mexico City" },
    { lat: -34.6037, lng: -58.3816, label: "Buenos Aires" },
    { lat: 4.711, lng: -74.0721, label: "Bogotá" },
  ],
  fr: [
    { lat: 48.8566, lng: 2.3522, label: "Paris" },
    { lat: 45.5017, lng: -73.5673, label: "Montréal" },
    { lat: 14.6928, lng: -17.4467, label: "Dakar" },
    { lat: 50.8503, lng: 4.3517, label: "Brussels" },
  ],
  de: [
    { lat: 52.52, lng: 13.405, label: "Berlin" },
    { lat: 48.2082, lng: 16.3738, label: "Vienna" },
    { lat: 47.3769, lng: 8.5417, label: "Zürich" },
  ],
  it: [
    { lat: 41.9028, lng: 12.4964, label: "Rome" },
    { lat: 45.4642, lng: 9.19, label: "Milan" },
  ],
  ja: [{ lat: 35.6762, lng: 139.6503, label: "Tokyo" }],
  zh: [
    { lat: 39.9042, lng: 116.4074, label: "Beijing" },
    { lat: 25.033, lng: 121.5654, label: "Taipei" },
    { lat: 1.3521, lng: 103.8198, label: "Singapore" },
  ],
  nl: [
    { lat: 52.3676, lng: 4.9041, label: "Amsterdam" },
    { lat: 50.8503, lng: 4.3517, label: "Brussels" },
  ],
  hi: [{ lat: 28.6139, lng: 77.209, label: "Delhi" }],
};

// ── Language → countries mapping ─────────────────────────────────────────────

const LANG_DATA: Record<string, { countries: string[]; count: number }> = {
  en: { countries: ["United States", "United Kingdom", "Canada", "Australia", "India", "South Africa", "Nigeria", "Ireland"], count: 59 },
  es: { countries: ["Spain", "Mexico", "Colombia", "Argentina", "Peru", "Chile", "Venezuela", "Ecuador"], count: 21 },
  fr: { countries: ["France", "Canada", "Belgium", "Switzerland", "Senegal", "Ivory Coast", "Morocco", "Cameroon"], count: 29 },
  de: { countries: ["Germany", "Austria", "Switzerland", "Luxembourg", "Liechtenstein"], count: 6 },
  it: { countries: ["Italy", "Switzerland", "San Marino", "Vatican"], count: 4 },
  ja: { countries: ["Japan"], count: 1 },
  zh: { countries: ["China", "Taiwan", "Singapore"], count: 3 },
  nl: { countries: ["Netherlands", "Belgium", "Suriname"], count: 3 },
  hi: { countries: ["India", "Fiji", "Nepal"], count: 3 },
};

// ── Globe.GL HTML ─────────────────────────────────────────────────────────────

function buildGlobeHtml(knownCodes: string[]): string {
  const highlightLabels = knownCodes
    .flatMap((c) => (LANG_DATA[c]?.countries ?? []))
    .map((c) => JSON.stringify(c));
  const highlights = `[${highlightLabels.join(",")}]`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:100%; height:100%; background:#080D18; overflow:hidden; }
    #g { width:100vw; height:100vh; }
    #tip { position:fixed;bottom:12px;left:50%;transform:translateX(-50%);
           font-family:-apple-system,sans-serif;font-size:12px;color:rgba(255,255,255,0.28);
           pointer-events:none; }
  </style>
</head>
<body>
  <div id="g"></div>
  <div id="tip">Drag to rotate · Pinch to zoom</div>
  <script src="https://unpkg.com/globe.gl@2.26.4/dist/globe.gl.min.js"></script>
  <script>
    var highlights = ${highlights};

    fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
      .then(r => r.json())
      .then(world => {
        var Globe = GlobeGl()
          .width(window.innerWidth)
          .height(window.innerHeight)
          .backgroundColor('rgba(0,0,0,0)')
          .showGraticules(false)
          .atmosphereColor('rgba(80,160,255,0.22)')
          .atmosphereAltitude(0.18)
          .polygonsData(world.features)
          .polygonCapColor(feat => {
            var name = feat.properties.NAME || feat.properties.name || '';
            return highlights.indexOf(name) >= 0
              ? 'rgba(196,166,124,0.82)'
              : 'rgba(38,48,78,0.88)';
          })
          .polygonSideColor(() => 'rgba(20,28,50,0.6)')
          .polygonStrokeColor(() => 'rgba(80,110,180,0.18)')
          .polygonAltitude(feat => {
            var name = feat.properties.NAME || feat.properties.name || '';
            return highlights.indexOf(name) >= 0 ? 0.018 : 0.006;
          })
          (document.getElementById('g'));

        Globe.controls().autoRotate = true;
        Globe.controls().autoRotateSpeed = 0.35;
        Globe.controls().enableZoom = true;
        Globe.controls().minDistance = 180;
        Globe.controls().maxDistance = 400;
        Globe.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0);
      })
      .catch(function() {
        var Globe = GlobeGl()
          .width(window.innerWidth)
          .height(window.innerHeight)
          .backgroundColor('rgba(0,0,0,0)')
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .atmosphereColor('rgba(80,160,255,0.22)')
          .atmosphereAltitude(0.18)
          (document.getElementById('g'));
        Globe.controls().autoRotate = true;
        Globe.controls().autoRotateSpeed = 0.35;
      });
  </script>
</body>
</html>`;
}

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

  const globeSize = Math.min(SW * 0.96, 380);

  // Flatten markers: language-city pins (blue) + unlocked location pins (gold)
  const markers = useMemo<EarthMarker[]>(() => {
    const list: EarthMarker[] = [];
    // Language speaker-city pins
    knownLanguages.forEach((code) => {
      const pins = LANG_MARKERS[code] || [];
      pins.forEach((p, i) => {
        list.push({
          id: `lang-${code}-${i}`,
          lat: p.lat,
          lng: p.lng,
          label: p.label,
          color: "#60A5FA",
          size: 1.0,
        });
      });
    });
    // Unlocked lesson-location pins (gold/amber — visually distinct from language markers)
    mapLocations.forEach((loc) => {
      const tier = langProgress?.locationTiers[loc.id] ?? "locked";
      if (tier === "locked") return;
      const tierColor = tier === "gold" ? "#C9A465" : tier === "silver" ? "#A0A0A0" : "#CD7F32";
      list.push({
        id: `loc-${loc.id}`,
        lat: loc.lat,
        lng: loc.lng,
        label: loc.name,
        color: tierColor,
        size: 0.52,
      });
    });
    return list;
  }, [knownLanguages, mapLocations, langProgress]);

  // Country names we want polygon-tinted as "reachable".
  const highlightCountries = useMemo(() => {
    const set = new Set<string>();
    knownLanguages.forEach((code) => {
      (LANG_DATA[code]?.countries || []).forEach((c) => set.add(c));
    });
    return Array.from(set);
  }, [knownLanguages]);
  const [openAccents, setOpenAccents] = useState<LanguageAccents | null>(null);

  // Liquid-glass popup shown when the user taps a highlighted country on
  // the globe. We reverse-look-up the raw geojson country name against the
  // user's known languages to figure out which accent region to show.
  const [openCountry, setOpenCountry] = useState<CountryPopupData | null>(null);
  const onCountryTap = (countryName: string) => {
    const match = findCountryMatch(countryName, knownLanguages);
    if (match) setOpenCountry(match);
  };

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
        {/* ── Globe — starry sky, real earth texture, tappable ───────── */}
        <View
          style={{
            height: GLOBE_H,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: SPACE_BG,
            overflow: "hidden",
          }}
        >
          {STARS.map((star, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                borderRadius: star.size / 2,
                backgroundColor: "#FFFFFF",
                opacity: star.opacity,
              } as any}
            />
          ))}
          <EarthGlobe
            size={globeSize}
            highlightCountries={highlightCountries}
            markers={markers}
            autoRotate
            onCountryTap={onCountryTap}
            onMarkerTap={(id) => {
              if (!id.startsWith("loc-")) return;
              const locId = id.replace("loc-", "");
              const loc = mapLocations.find((l) => l.id === locId);
              if (!loc) return;
              const tier = (langProgress?.locationTiers[loc.id] ?? "locked") as MapLocationTier;
              setTappedLocation({ loc, tier });
            }}
            background={SPACE_BG}
          />

          {/* Section label top-left */}
          <Text
            style={{
              position: "absolute",
              top: 10,
              left: 22,
              fontSize: 11,
              fontWeight: "800",
              color: "rgba(180,210,255,0.7)",
              letterSpacing: 1.2,
            }}
          >
            YOUR WORLD
          </Text>

          {/* Tap hint bottom — gently guides the user that the globe is
              interactive without being noisy. */}
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
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Ionicons name="finger-print-outline" size={12} color="rgba(180,210,255,0.85)" />
            <Text
              style={{
                fontSize: 11,
                color: "rgba(210,225,255,0.8)",
                fontWeight: "600",
                letterSpacing: 0.3,
              }}
            >
              Tap a highlighted country
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
                  <View
                    key={loc.id}
                    style={{
                      backgroundColor: unlocked ? COLORS.surface : "rgba(0,0,0,0.02)",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: unlocked ? 1 : 0,
                      borderColor: TIER_GLOW[tier],
                      opacity: unlocked ? 1 : 0.5,
                      shadowColor: unlocked ? TIER_TEXT[tier] : "transparent",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: unlocked ? 0.25 : 0,
                      shadowRadius: unlocked ? 12 : 0,
                    }}
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
                  </View>
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

      {/* ── Country tap popup (liquid glass) ─────────────────── */}
      <CountryPopup data={openCountry} onClose={() => setOpenCountry(null)} />

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
