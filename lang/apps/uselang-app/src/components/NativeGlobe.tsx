import React, { useEffect, useMemo, useState } from "react";
import { View, Text } from "react-native";
import Svg, { Circle, Ellipse, G } from "react-native-svg";
import { COLORS } from "@/lib/constants";

// ── Continent silhouette centroids ───────────────────────────────────────────
// We render each continent as a small cluster of ellipses placed at realistic
// lat/lon anchors. Each anchor gets projected the same way city markers are,
// so continents rotate with the globe. Ellipse sizes/tints are hand-tuned to
// approximate real shapes without bloating the bundle with full geojson.
const CONTINENT_BLOBS: Array<{
  lat: number;
  lon: number;
  rxKm: number;  // relative width at equator
  ryKm: number;  // relative height
  tint?: string;
}> = [
  // North America — broad mass across the US / Mexico
  { lat: 45, lon: -100, rxKm: 0.30, ryKm: 0.22 },
  { lat: 60, lon: -100, rxKm: 0.26, ryKm: 0.16 }, // Canada top
  { lat: 20, lon: -100, rxKm: 0.16, ryKm: 0.14 }, // Mexico / Central
  // South America — tapered
  { lat: -10, lon: -60, rxKm: 0.20, ryKm: 0.18 },
  { lat: -30, lon: -65, rxKm: 0.14, ryKm: 0.18 },
  // Europe — small, north
  { lat: 50, lon: 15, rxKm: 0.18, ryKm: 0.12 },
  // Africa — big, centered
  { lat: 5, lon: 20, rxKm: 0.20, ryKm: 0.18 },
  { lat: -15, lon: 25, rxKm: 0.18, ryKm: 0.18 },
  // Middle East / west Asia bridge
  { lat: 32, lon: 45, rxKm: 0.12, ryKm: 0.10 },
  // Asia — very wide
  { lat: 45, lon: 90, rxKm: 0.32, ryKm: 0.18 },
  { lat: 30, lon: 110, rxKm: 0.22, ryKm: 0.16 },
  { lat: 25, lon: 80, rxKm: 0.14, ryKm: 0.12 }, // India
  // Southeast Asia / Indonesia
  { lat: 0, lon: 115, rxKm: 0.12, ryKm: 0.08 },
  // Australia
  { lat: -25, lon: 135, rxKm: 0.18, ryKm: 0.12 },
  // Greenland cap
  { lat: 72, lon: -42, rxKm: 0.12, ryKm: 0.10 },
];

// ── Country centroids with language tags ─────────────────────────────────────

interface CountryMarker {
  lat: number;
  lon: number;
  lang: string[];
  size?: number;
}

const COUNTRY_MARKERS: CountryMarker[] = [
  // English
  { lat: 37.0902, lon: -95.7129, lang: ["en"], size: 5 },   // USA
  { lat: 56.1304, lon: -106.3468, lang: ["en"], size: 3 },  // Canada
  { lat: -25.2744, lon: 133.7751, lang: ["en"], size: 3 },  // Australia
  { lat: 55.3781, lon: -3.436, lang: ["en"], size: 2 },     // UK
  { lat: -40.9006, lon: 174.886, lang: ["en"], size: 2 },   // New Zealand
  { lat: -30.5595, lon: 22.9375, lang: ["en"], size: 2 },   // South Africa
  // French
  { lat: 46.2276, lon: 2.2137, lang: ["fr"], size: 3 },     // France
  { lat: -3.3731, lon: 29.9189, lang: ["fr"], size: 2 },    // DRC
  { lat: 7.3697, lon: 12.3547, lang: ["fr"], size: 2 },     // Cameroon
  { lat: 14.4974, lon: -14.4524, lang: ["fr"], size: 2 },   // Senegal
  { lat: 4.3947, lon: 18.5582, lang: ["fr"], size: 2 },     // CAR
  { lat: 45.5017, lon: -73.5673, lang: ["fr"], size: 2 },   // Montreal
  // Spanish
  { lat: 40.4637, lon: -3.7492, lang: ["es"], size: 3 },    // Spain
  { lat: 23.6345, lon: -102.5528, lang: ["es"], size: 4 },  // Mexico
  { lat: -14.235, lon: -51.9253, lang: ["es"], size: 3 },   // Brazil/ish (pt but adj)
  { lat: -38.4161, lon: -63.6167, lang: ["es"], size: 3 },  // Argentina
  { lat: 4.5709, lon: -74.2973, lang: ["es"], size: 2 },    // Colombia
  { lat: -9.19, lon: -75.0152, lang: ["es"], size: 2 },     // Peru
  // German
  { lat: 51.1657, lon: 10.4515, lang: ["de"], size: 3 },    // Germany
  { lat: 47.5162, lon: 14.5501, lang: ["de"], size: 2 },    // Austria
  { lat: 46.8182, lon: 8.2275, lang: ["de"], size: 2 },     // Switzerland
  // Italian
  { lat: 41.8719, lon: 12.5674, lang: ["it"], size: 3 },    // Italy
  // Japanese
  { lat: 36.2048, lon: 138.2529, lang: ["ja"], size: 3 },   // Japan
  // Mandarin
  { lat: 35.8617, lon: 104.1954, lang: ["zh"], size: 5 },   // China
  { lat: 23.6978, lon: 120.9605, lang: ["zh"], size: 2 },   // Taiwan
  { lat: 1.3521, lon: 103.8198, lang: ["zh"], size: 2 },    // Singapore
  // Dutch
  { lat: 52.1326, lon: 5.2913, lang: ["nl"], size: 2 },     // Netherlands
  // Hindi
  { lat: 20.5937, lon: 78.9629, lang: ["hi"], size: 5 },    // India
];

// ── Language coverage data ────────────────────────────────────────────────────

export const LANGUAGE_REACH: Record<string, { countries: number; speakers: string }> = {
  en: { countries: 67, speakers: "1.5B" },
  fr: { countries: 29, speakers: "320M" },
  es: { countries: 21, speakers: "500M" },
  de: { countries: 6, speakers: "100M" },
  it: { countries: 4, speakers: "85M" },
  ja: { countries: 2, speakers: "125M" },
  zh: { countries: 5, speakers: "1.1B" },
  nl: { countries: 6, speakers: "30M" },
  hi: { countries: 4, speakers: "600M" },
};

// ── Props ────────────────────────────────────────────────────────────────────

interface NativeGlobeProps {
  size?: number;
  highlightLanguages?: string[];
  autoRotate?: boolean;
  showStats?: boolean;
}

const LANG_COLORS: Record<string, string> = {
  en: "#60A5FA", fr: "#3B82F6", es: "#F59E0B",
  de: "#6EE7B7", it: "#FB923C", ja: "#E879F9",
  zh: "#F87171", nl: "#34D399", hi: "#FBBF24",
};

function project(lat: number, lon: number, rotDeg: number, R: number) {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const lam0 = (rotDeg * Math.PI) / 180;
  const x = R * Math.cos(phi) * Math.sin(lam - lam0);
  const y = -R * Math.sin(phi);
  const visible = Math.cos(phi) * Math.cos(lam - lam0) > 0;
  return { x, y, visible };
}

export function NativeGlobe({
  size = 260,
  highlightLanguages = [],
  autoRotate = true,
  showStats = false,
}: NativeGlobeProps) {
  const R = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const [rot, setRot] = useState(20);

  useEffect(() => {
    if (!autoRotate) return;
    const id = setInterval(() => setRot((r) => (r + 0.4) % 360), 33);
    return () => clearInterval(id);
  }, [autoRotate]);

  const reach = useMemo(() => {
    let countries = 0; let speakers = "";
    highlightLanguages.forEach((l) => {
      const d = LANGUAGE_REACH[l];
      if (d && d.countries > countries) { countries = d.countries; speakers = d.speakers; }
    });
    return { countries, speakers };
  }, [highlightLanguages]);

  // Projected city markers — recomputed each frame via rot
  const dots = useMemo(() => {
    return COUNTRY_MARKERS.map((m, i) => {
      const { x, y, visible } = project(m.lat, m.lon, rot, R);
      const isHL = m.lang.some((l) => highlightLanguages.includes(l));
      const color = isHL ? (LANG_COLORS[m.lang[0]] ?? "#2E6BD8") : "rgba(255,255,255,0.22)";
      const r = isHL ? (m.size ?? 2.5) : 1.5;
      return { i, px: cx + x, py: cy + y, r, color, visible, isHL };
    });
  }, [rot, R, cx, cy, highlightLanguages]);

  // Projected continent silhouettes — these rotate with the globe so
  // landmasses sweep across the day side. Only show the ones facing us;
  // far-side blobs are hidden (they'd just be ghost copies).
  const continents = useMemo(() => {
    return CONTINENT_BLOBS.map((c, i) => {
      const p = project(c.lat, c.lon, rot, R);
      if (!p.visible) return null;
      // Foreshortening: blobs near the limb of the sphere should flatten.
      const phi = (c.lat * Math.PI) / 180;
      const lam = ((c.lon - rot) * Math.PI) / 180;
      const cosTerm = Math.max(0.18, Math.cos(phi) * Math.cos(lam));
      return {
        i,
        cx: cx + p.x,
        cy: cy + p.y,
        rx: c.rxKm * R * cosTerm,
        ry: c.ryKm * R,
        depth: cosTerm, // closer to 1 = center of day-side
      };
    }).filter(Boolean) as Array<{
      i: number;
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      depth: number;
    }>;
  }, [rot, R, cx, cy]);

  // Latitude arcs (static — don't depend on rotation)
  const latArcs = useMemo(() => [-60, -30, 0, 30, 60].map((lat) => {
    const phi = (lat * Math.PI) / 180;
    return { lat, rx: R * Math.cos(phi), ry: R * Math.cos(phi) * 0.13, yy: cy - R * Math.sin(phi) };
  }), [R, cy]);

  // Layered solid fills instead of gradient-url references. Several versions
  // of react-native-svg on Expo SDK 53 fall back to an opaque white fill when
  // they can't resolve `url(#id)` inside a <Circle fill>. We sidestep the
  // whole class of bugs by stacking circles with flat colors at carefully
  // chosen opacities — the eye reads the stack as a shaded sphere.
  const atmosphereR = R + 14;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        {/* Outer atmosphere — large softly-blue circle that reads as glow. */}
        <Circle cx={cx} cy={cy} r={atmosphereR} fill="rgba(120,170,255,0.12)" />
        <Circle cx={cx} cy={cy} r={R + 5} fill="rgba(120,170,255,0.22)" />

        {/* Ocean base (solid deep navy). */}
        <Circle cx={cx} cy={cy} r={R} fill="#0a1f3a" />

        {/* Mid-water highlight offset toward the upper-left so the sphere
            reads as a lit hemisphere rather than a flat disc. */}
        <Circle
          cx={cx - R * 0.28}
          cy={cy - R * 0.30}
          r={R * 0.95}
          fill="#1a4373"
          opacity={0.55}
        />
        <Circle
          cx={cx - R * 0.32}
          cy={cy - R * 0.34}
          r={R * 0.62}
          fill="#2f6aa8"
          opacity={0.45}
        />

        {/* Continent silhouettes (projected onto the sphere) */}
        {continents.map((c) => (
          <G key={`c-${c.i}`}>
            {/* Shadow pass */}
            <Ellipse
              cx={c.cx + 1.2}
              cy={c.cy + 1.2}
              rx={c.rx}
              ry={c.ry}
              fill="#051020"
              opacity={0.35 * c.depth}
            />
            {/* Land fill */}
            <Ellipse
              cx={c.cx}
              cy={c.cy}
              rx={c.rx}
              ry={c.ry}
              fill="#3d8659"
              opacity={0.55 + c.depth * 0.35}
            />
            {/* Subtle land highlight toward the lit edge */}
            <Ellipse
              cx={c.cx - c.rx * 0.18}
              cy={c.cy - c.ry * 0.18}
              rx={c.rx * 0.6}
              ry={c.ry * 0.6}
              fill="#66b27c"
              opacity={0.22 * c.depth}
            />
          </G>
        ))}

        {/* Latitude grid */}
        {latArcs.map(({ lat, rx, ry, yy }) => (
          <Ellipse key={lat} cx={cx} cy={yy} rx={rx} ry={ry}
            stroke="rgba(255,255,255,0.08)" strokeWidth={0.8} fill="none" />
        ))}

        {/* Longitude grid */}
        {[0, 30, 60, 90, 120, 150].map((lonOff) => {
          const lam = ((lonOff + rot) % 360) * Math.PI / 180;
          const vis = Math.cos(lam);
          if (vis < -0.1) return null;
          const op = (Math.max(0, vis) * 0.10).toFixed(2);
          const rx = Math.abs(R * Math.sin(lam));
          return (
            <Ellipse key={lonOff} cx={cx} cy={cy} rx={rx} ry={R}
              stroke={`rgba(255,255,255,${op})`} strokeWidth={0.8} fill="none" />
          );
        })}

        {/* Back markers (far side) — faint hints */}
        {dots.filter((d) => !d.visible).map((d) => (
          <Circle key={d.i} cx={d.px} cy={d.py} r={d.r * 0.55}
            fill={d.color} opacity={0.12} />
        ))}

        {/* Front markers with colored glow rings */}
        {dots.filter((d) => d.visible).map((d) => (
          <G key={d.i}>
            {d.isHL ? (
              <Circle cx={d.px} cy={d.py} r={d.r * 2.4}
                fill={d.color} opacity={0.22} />
            ) : null}
            <Circle cx={d.px} cy={d.py} r={d.r}
              fill={d.color} opacity={d.isHL ? 1 : 0.35} />
            {d.isHL ? (
              <Circle cx={d.px} cy={d.py} r={d.r * 0.45}
                fill="#FFFFFF" opacity={0.9} />
            ) : null}
          </G>
        ))}

        {/* Terminator — dark circle slightly shifted right creates a
            night-side shadow without needing a linear gradient. */}
        <Circle cx={cx + R * 0.35} cy={cy + R * 0.05} r={R}
          fill="#000000" opacity={0.22} />

        {/* Day-side specular highlight */}
        <Circle cx={cx - R * 0.35} cy={cy - R * 0.42} r={R * 0.36}
          fill="#FFFFFF" opacity={0.16} />
        <Circle cx={cx - R * 0.42} cy={cy - R * 0.48} r={R * 0.18}
          fill="#FFFFFF" opacity={0.22} />

        {/* Rim accent — thin bright stroke at the visible edge. */}
        <Circle cx={cx} cy={cy} r={R}
          fill="none" stroke="rgba(140,195,255,0.55)" strokeWidth={1.2} />
        <Circle cx={cx} cy={cy} r={R - 0.6}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.6} />
      </Svg>

      {showStats && highlightLanguages.length > 0 && reach.countries > 0 && (
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <Text style={{ fontSize: 40, fontWeight: "800", color: COLORS.text, letterSpacing: -1.5 }}>
            {reach.countries}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textSub, fontWeight: "600", letterSpacing: 0.2 }}>
            countries · {reach.speakers} speakers
          </Text>
        </View>
      )}
    </View>
  );
}
