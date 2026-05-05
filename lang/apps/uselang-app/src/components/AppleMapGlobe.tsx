/**
 * AppleMapGlobe — real Apple Maps satellite globe for the Map tab.
 *
 * Uses react-native-maps with PROVIDER_DEFAULT (MapKit) so on iOS 17+ the
 * map automatically switches to a full 3D globe when zoomed out this far.
 * mapType="satelliteFlyover" gives real Earth satellite imagery with 3D depth.
 *
 * Language pins are rendered as coloured MapView Markers matching the
 * NativeGlobe colour palette so the rest of the screen UI doesn't need
 * any changes.
 */

import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

// ── Language marker colours (same palette as NativeGlobe) ────────────────────
const LANG_COLORS: Record<string, string> = {
  en: "#60A5FA",
  fr: "#3B82F6",
  es: "#F59E0B",
  de: "#6EE7B7",
  it: "#FB923C",
  ja: "#E879F9",
  zh: "#F87171",
  nl: "#34D399",
  hi: "#FBBF24",
};

// Country centroids — one dot per major language-speaking region
const LANG_COORDS: { lat: number; lon: number; lang: string }[] = [
  // English
  { lat: 37.09, lon: -95.71, lang: "en" },
  { lat: 56.13, lon: -106.35, lang: "en" },
  { lat: -25.27, lon: 133.78, lang: "en" },
  { lat: 55.38, lon: -3.44, lang: "en" },
  { lat: -40.90, lon: 174.89, lang: "en" },
  // French
  { lat: 46.23, lon: 2.21, lang: "fr" },
  { lat: -3.37, lon: 29.92, lang: "fr" },
  { lat: 45.50, lon: -73.57, lang: "fr" },
  { lat: 7.37, lon: 12.35, lang: "fr" },
  // Spanish
  { lat: 40.46, lon: -3.75, lang: "es" },
  { lat: 23.63, lon: -102.55, lang: "es" },
  { lat: -38.42, lon: -63.62, lang: "es" },
  { lat: 4.57, lon: -74.30, lang: "es" },
  { lat: -9.19, lon: -75.02, lang: "es" },
  // German
  { lat: 51.17, lon: 10.45, lang: "de" },
  { lat: 47.52, lon: 14.55, lang: "de" },
  { lat: 46.82, lon: 8.23, lang: "de" },
  // Italian
  { lat: 41.87, lon: 12.57, lang: "it" },
  // Japanese
  { lat: 36.20, lon: 138.25, lang: "ja" },
  // Mandarin
  { lat: 35.86, lon: 104.20, lang: "zh" },
  { lat: 23.70, lon: 120.96, lang: "zh" },
  { lat: 1.35, lon: 103.82, lang: "zh" },
  // Hindi
  { lat: 20.59, lon: 78.96, lang: "hi" },
  // Dutch
  { lat: 52.13, lon: 5.29, lang: "nl" },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface AppleMapGlobeProps {
  /** Full pixel height of the map container */
  height: number;
  /** Language codes to highlight with coloured pins */
  highlightLanguages?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppleMapGlobe({
  height,
  highlightLanguages = [],
}: AppleMapGlobeProps) {
  // satelliteFlyover: real satellite imagery with 3D perspective.
  // On iOS 17+ MapKit automatically renders this as a rotating globe when
  // the camera altitude is set high enough.
  // On iOS 16 it shows a flat satellite world map at global zoom — still
  // dramatically better than the custom SVG globe.
  const mapType = Platform.OS === "ios" ? "satelliteFlyover" : "satellite";

  return (
    <View style={{ width: "100%", height, overflow: "hidden" }}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        mapType={mapType as any}
        // Camera: positioned ~18 000 km above the Atlantic / Africa region so
        // the viewer can see Europe, the Americas, and Africa simultaneously —
        // a classic "globe" framing. Users can scroll/pinch to rotate & zoom.
        camera={{
          center: { latitude: 20, longitude: 0 },
          altitude: 18_000_000,
          heading: 0,
          pitch: 0,
        }}
        minZoomLevel={0}
        scrollEnabled
        zoomEnabled
        rotateEnabled
        pitchEnabled={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        loadingEnabled
        loadingBackgroundColor="#050816"
        loadingIndicatorColor="rgba(140,195,255,0.55)"
      >
        {LANG_COORDS.map((m, i) => {
          const isHL = highlightLanguages.includes(m.lang);
          if (!isHL) return null;
          const color = LANG_COLORS[m.lang] ?? "#60A5FA";
          return (
            <Marker
              key={`${m.lang}-${i}`}
              coordinate={{ latitude: m.lat, longitude: m.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              {/* Custom dot marker with a glowing halo */}
              <View style={[styles.markerOuter, { borderColor: color }]}>
                <View style={[styles.markerInner, { backgroundColor: color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  markerOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    // Subtle shadow so markers are visible on bright terrain
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
