// ── Country popup (liquid glass) ────────────────────────────────────────────
// Shown when the user taps a highlighted country on the Globe. A centered
// bottom sheet with an expo-blur frosted background, a big flag chip, the
// language name, the accent region, and a human line the tutor could say
// about speaking there. Tap anywhere outside to dismiss.

import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import {
  ACCENT_REGIONS,
  type LanguageAccents,
  type AccentRegion,
} from "@/lib/accent-regions";

export interface CountryPopupData {
  /** The language whose reach was tapped. */
  languageCode: string;
  /** Raw country name from the geojson, e.g. "France" / "United Kingdom". */
  country: string;
  /** Optional specific region we matched within the language. */
  region?: AccentRegion;
}

interface Props {
  data: CountryPopupData | null;
  onClose: () => void;
}

/**
 * Reverse-lookup: given a raw country name from the globe geojson and the
 * user's learning languages, return the best (languageCode, accent region)
 * match. Handles slight name variations (e.g. "United States of America"
 * vs "United States").
 */
export function findCountryMatch(
  country: string,
  languageCodes: string[]
): CountryPopupData | null {
  if (!country) return null;
  const lower = country.toLowerCase();
  for (const code of languageCodes) {
    const data = ACCENT_REGIONS[code];
    if (!data) continue;
    for (const region of data.regions) {
      const rc = region.country.toLowerCase();
      if (rc === lower || rc.includes(lower) || lower.includes(rc)) {
        return { languageCode: code, country, region };
      }
    }
    // Fallback: language covers the country via curated maps. Even without
    // a specific region match we can still say "you can speak X here".
    const known = LANG_COUNTRIES[code] || [];
    for (const knownCountry of known) {
      const k = knownCountry.toLowerCase();
      if (k === lower || k.includes(lower) || lower.includes(k)) {
        return { languageCode: code, country };
      }
    }
  }
  return null;
}

// Curated country lists per language — keeps the popup accurate even when
// ACCENT_REGIONS doesn't carry an exact region match. Mirrors the data in
// app/(tabs)/globe.tsx's LANG_DATA.
const LANG_COUNTRIES: Record<string, string[]> = {
  en: ["United States", "United Kingdom", "Canada", "Australia", "India", "South Africa", "Nigeria", "Ireland", "New Zealand"],
  es: ["Spain", "Mexico", "Colombia", "Argentina", "Peru", "Chile", "Venezuela", "Ecuador", "Cuba", "Dominican Republic", "Uruguay", "Bolivia", "Paraguay"],
  fr: ["France", "Canada", "Belgium", "Switzerland", "Senegal", "Ivory Coast", "Morocco", "Cameroon", "Democratic Republic of the Congo", "Haiti", "Tunisia", "Algeria"],
  de: ["Germany", "Austria", "Switzerland", "Luxembourg", "Liechtenstein"],
  it: ["Italy", "Switzerland", "San Marino", "Vatican"],
  ja: ["Japan"],
  zh: ["China", "Taiwan", "Singapore", "Hong Kong", "Macau"],
  nl: ["Netherlands", "Belgium", "Suriname"],
  hi: ["India", "Fiji", "Nepal"],
  pt: ["Portugal", "Brazil", "Angola", "Mozambique", "Cape Verde"],
  ar: ["Egypt", "Saudi Arabia", "Morocco", "Algeria", "Tunisia", "Jordan", "Lebanon", "Syria", "Iraq", "UAE"],
};

// ── Component ────────────────────────────────────────────────────────────────

export function CountryPopup({ data, onClose }: Props) {
  const visible = !!data;
  const translateY = useSharedValue(60);
  const scale = useSharedValue(0.92);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, { duration: 220 });
      translateY.value = withSpring(0, { damping: 16, stiffness: 180 });
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    } else {
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(60, { duration: 180, easing: Easing.in(Easing.cubic) });
      scale.value = withTiming(0.92, { duration: 180 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  // Resolve everything we need to render when `data` is set. Kept in a
  // memo so we don't reshape on every backdrop animation frame.
  const resolved = useMemo(() => {
    if (!data) return null;
    const accents: LanguageAccents | undefined = ACCENT_REGIONS[data.languageCode];
    const flag = data.region?.flag || accents?.regions[0]?.flag || "🌍";
    const languageLabel = accents?.label || "Language";
    const accentName = data.region?.name;
    const blurb = data.region?.blurb;
    const prestige = !!data.region?.prestige;

    // Story line: try to write something concretely useful + warm. Combines
    // the language name + country so the user feels the reach.
    const storyLine = data.region
      ? `You can speak ${languageLabel} here — ${data.country} runs on the ${data.region.name} accent.`
      : `You can speak ${languageLabel} in ${data.country}. A real door opens here.`;

    const otherRegions = accents?.regions?.filter((r) => r !== data.region).slice(0, 3) ?? [];

    return { accents, flag, languageLabel, accentName, blurb, prestige, storyLine, otherRegions };
  }, [data]);

  if (!data || !resolved) {
    // Always mount the modal for instant re-opens; render nothing when there's
    // no selection.
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {/* Dimmed backdrop (taps dismiss) */}
        <Pressable
          onPress={onClose}
          style={{ position: "absolute", inset: 0 as any }}
        >
          <Animated.View
            style={[
              { flex: 1, backgroundColor: "rgba(5,10,28,0.55)" },
              backdropStyle,
            ]}
          />
        </Pressable>

        {/* Liquid-glass card */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            {
              width: "86%",
              maxWidth: 400,
              borderRadius: 28,
              overflow: "hidden",
              shadowColor: "#0B1533",
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.35,
              shadowRadius: 36,
              elevation: 20,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.25)",
            },
            cardStyle,
          ]}
        >
          <BlurView
            intensity={80}
            tint="dark"
            style={{
              padding: 22,
              backgroundColor: "rgba(20,30,60,0.35)",
            }}
          >
            {/* ── Flag + prestige chip ─────────────────────────────── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 36 }}>{resolved.flag}</Text>
              </View>
              {resolved.prestige ? (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 10,
                    backgroundColor: "rgba(59,130,246,0.24)",
                    borderWidth: 1,
                    borderColor: "rgba(147,197,253,0.6)",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Ionicons name="sparkles" size={11} color="#DBEAFE" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: "#DBEAFE",
                      letterSpacing: 1,
                    }}
                  >
                    STANDARD
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ── Headline ───────────────────────────────────────── */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "rgba(180,210,255,0.75)",
                letterSpacing: 1.2,
                marginBottom: 4,
              }}
            >
              {resolved.languageLabel.toUpperCase()}
              {resolved.accentName ? ` · ${resolved.accentName.toUpperCase()}` : ""}
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "#FFFFFF",
                letterSpacing: -0.4,
                marginBottom: 10,
              }}
            >
              {data.country}
            </Text>

            {/* ── Story line ─────────────────────────────────────── */}
            <Text
              style={{
                fontSize: 14,
                color: "rgba(240,245,255,0.88)",
                lineHeight: 20,
                marginBottom: resolved.blurb ? 14 : 18,
              }}
            >
              {resolved.storyLine}
            </Text>

            {/* ── Accent blurb ──────────────────────────────────── */}
            {resolved.blurb ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                  }}
                >
                  <Ionicons name="mic-outline" size={13} color="#93C5FD" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: "rgba(180,210,255,0.85)",
                      letterSpacing: 1,
                    }}
                  >
                    HOW IT SOUNDS
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: "rgba(240,245,255,0.92)",
                    lineHeight: 19,
                  }}
                >
                  {resolved.blurb}
                </Text>
              </View>
            ) : null}

            {/* ── Other regions chips ──────────────────────────── */}
            {resolved.otherRegions.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: "rgba(180,210,255,0.75)",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  OTHER PLACES
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {resolved.otherRegions.map((r) => (
                    <View
                      key={r.country + r.name}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.14)",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{r.flag}</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#FFFFFF",
                          fontWeight: "600",
                        }}
                      >
                        {r.country}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* ── Close CTA ─────────────────────────────────────── */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(59,130,246,0.9)",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.88 : 1,
                shadowColor: "#3B82F6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 10,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#FFFFFF",
                  letterSpacing: 0.3,
                }}
              >
                Got it
              </Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}
