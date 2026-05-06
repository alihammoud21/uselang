// ── TONGUE UI SAFETY CONSTRAINTS ──────────────────────────────────────────────
// The diagram MUST feel: calm, soft, abstract, non-medical
// FORBIDDEN: realistic anatomy, sharp shapes, high-contrast reds,
//   detailed textures, anything resembling a real mouth
// ALLOWED: flat shapes, soft rounded edges, low-contrast colors,
//   subtle highlights only
// If design feels "biological" → simplify further
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { View, Text } from "react-native";
import Svg, {
  Rect,
  G,
  Text as SvgText,
} from "react-native-svg";

// ── Phoneme articulatory data ────────────────────────────────────────────────
// tongueX drives zone mapping: ≤0.35 Front, 0.35–0.65 Middle, >0.65 Back

interface PhonemeData {
  tongueX: number;
  tongueY: number;
  tongueCurve: number;
  lipRoundness: number;
  lipOpenness: number;
  jawOpen: number;
  airflow: "oral" | "nasal" | "lateral";
  voicing: boolean;
  tip: string;
}

const PHONEME_DB: Record<string, PhonemeData> = {
  // Vowels
  a: { tongueX: 0.5, tongueY: 0.7, tongueCurve: 0.1, lipRoundness: 0, lipOpenness: 0.9, jawOpen: 0.9, airflow: "oral", voicing: true, tip: "Jaw wide open, tongue flat and low" },
  e: { tongueX: 0.5, tongueY: 0.4, tongueCurve: 0.4, lipRoundness: 0.1, lipOpenness: 0.5, jawOpen: 0.5, airflow: "oral", voicing: true, tip: "Tongue mid-height, lips slightly spread" },
  i: { tongueX: 0.3, tongueY: 0.2, tongueCurve: 0.8, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Tongue high and forward, lips spread like a smile" },
  o: { tongueX: 0.6, tongueY: 0.5, tongueCurve: 0.3, lipRoundness: 0.8, lipOpenness: 0.5, jawOpen: 0.5, airflow: "oral", voicing: true, tip: "Lips rounded, tongue mid-back" },
  u: { tongueX: 0.7, tongueY: 0.2, tongueCurve: 0.7, lipRoundness: 1, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: true, tip: "Lips tightly rounded, tongue high and back" },
  
  // French specific
  "ü": { tongueX: 0.3, tongueY: 0.2, tongueCurve: 0.8, lipRoundness: 0.9, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: true, tip: "Say 'ee' but round your lips like 'oo'" },
  "ø": { tongueX: 0.4, tongueY: 0.35, tongueCurve: 0.5, lipRoundness: 0.7, lipOpenness: 0.4, jawOpen: 0.4, airflow: "oral", voicing: true, tip: "Say 'eh' with rounded lips" },
  
  // Consonants
  r: { tongueX: 0.7, tongueY: 0.3, tongueCurve: 0.5, lipRoundness: 0.2, lipOpenness: 0.4, jawOpen: 0.4, airflow: "oral", voicing: true, tip: "Tongue tip curled slightly back, vibrate the back of throat" },
  l: { tongueX: 0.25, tongueY: 0.15, tongueCurve: 0.3, lipRoundness: 0, lipOpenness: 0.4, jawOpen: 0.4, airflow: "lateral", voicing: true, tip: "Touch tongue tip to the ridge behind upper teeth" },
  n: { tongueX: 0.25, tongueY: 0.15, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "nasal", voicing: true, tip: "Tongue tip presses ridge behind upper teeth, air through nose" },
  t: { tongueX: 0.25, tongueY: 0.1, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: false, tip: "Quick tongue tap on the ridge behind upper teeth" },
  d: { tongueX: 0.25, tongueY: 0.1, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Like 't' but with vocal cord vibration" },
  k: { tongueX: 0.7, tongueY: 0.15, tongueCurve: 0.7, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: false, tip: "Back of tongue touches soft palate, then releases" },
  g: { tongueX: 0.7, tongueY: 0.15, tongueCurve: 0.7, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Like 'k' but with vocal cord vibration" },
  s: { tongueX: 0.3, tongueY: 0.15, tongueCurve: 0.4, lipRoundness: 0, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: false, tip: "Tongue tip near ridge, air hisses through narrow gap" },
  z: { tongueX: 0.3, tongueY: 0.15, tongueCurve: 0.4, lipRoundness: 0, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: true, tip: "Like 's' but buzz your vocal cords" },
  "ʃ": { tongueX: 0.4, tongueY: 0.2, tongueCurve: 0.5, lipRoundness: 0.4, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: false, tip: "Like 'sh' — tongue wider and further back than 's'" },
  "ʒ": { tongueX: 0.4, tongueY: 0.2, tongueCurve: 0.5, lipRoundness: 0.4, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Like the 'zh' in 'measure' — voiced version of 'sh'" },
  p: { tongueX: 0.5, tongueY: 0.5, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0, jawOpen: 0.1, airflow: "oral", voicing: false, tip: "Press lips together, then release with a puff of air" },
  b: { tongueX: 0.5, tongueY: 0.5, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0, jawOpen: 0.1, airflow: "oral", voicing: true, tip: "Like 'p' but with vocal cord vibration" },
  m: { tongueX: 0.5, tongueY: 0.5, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0, jawOpen: 0.1, airflow: "nasal", voicing: true, tip: "Lips together, hum — air flows through nose" },
  f: { tongueX: 0.5, tongueY: 0.5, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0.15, jawOpen: 0.15, airflow: "oral", voicing: false, tip: "Upper teeth lightly touch lower lip, blow air through" },
  v: { tongueX: 0.5, tongueY: 0.5, tongueCurve: 0.2, lipRoundness: 0, lipOpenness: 0.15, jawOpen: 0.15, airflow: "oral", voicing: true, tip: "Like 'f' but buzz your vocal cords" },
  
  // Chinese tones / sounds
  "zh": { tongueX: 0.45, tongueY: 0.15, tongueCurve: 0.6, lipRoundness: 0.2, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Curl tongue tip up and back, release with voice" },
  "x": { tongueX: 0.35, tongueY: 0.2, tongueCurve: 0.6, lipRoundness: 0, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: false, tip: "Like 'sh' but with tongue closer to front" },
  "q": { tongueX: 0.35, tongueY: 0.15, tongueCurve: 0.6, lipRoundness: 0, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: false, tip: "Like 'ch' but with tongue at front of palate" },

  // Japanese
  "tsu": { tongueX: 0.3, tongueY: 0.12, tongueCurve: 0.4, lipRoundness: 0.3, lipOpenness: 0.2, jawOpen: 0.2, airflow: "oral", voicing: false, tip: "Tongue tip behind teeth, release 'ts' then round for 'u'" },

  // Additional phonemes
  "ch": { tongueX: 0.35, tongueY: 0.15, tongueCurve: 0.6, lipRoundness: 0.2, lipOpenness: 0.25, jawOpen: 0.25, airflow: "oral", voicing: false, tip: "Press tongue behind upper ridge, release with a burst of air" },
  "h": { tongueX: 0.5, tongueY: 0.6, tongueCurve: 0.1, lipRoundness: 0, lipOpenness: 0.5, jawOpen: 0.5, airflow: "oral", voicing: false, tip: "Open mouth, push air from the back of throat - tongue stays relaxed" },
  "w": { tongueX: 0.7, tongueY: 0.25, tongueCurve: 0.6, lipRoundness: 0.9, lipOpenness: 0.15, jawOpen: 0.15, airflow: "oral", voicing: true, tip: "Round lips tightly and raise the back of tongue, then release" },
  "j": { tongueX: 0.3, tongueY: 0.15, tongueCurve: 0.8, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "oral", voicing: true, tip: "Raise front of tongue close to the palate and let voice flow through" },
  "ng": { tongueX: 0.75, tongueY: 0.15, tongueCurve: 0.7, lipRoundness: 0, lipOpenness: 0.3, jawOpen: 0.3, airflow: "nasal", voicing: true, tip: "Back of tongue touches soft palate, air flows through the nose" },
};

const DEFAULT_PHONEME: PhonemeData = {
  tongueX: 0.5,
  tongueY: 0.4,
  tongueCurve: 0.3,
  lipRoundness: 0.2,
  lipOpenness: 0.5,
  jawOpen: 0.5,
  airflow: "oral",
  voicing: true,
  tip: "Relax your mouth and try to match the sound",
};

function getPhonemeData(phoneme: string): PhonemeData {
  const key = phoneme.toLowerCase().trim();
  return PHONEME_DB[key] || DEFAULT_PHONEME;
}

// ── Random phoneme picker ────────────────────────────────────────────────────

const LANGUAGE_PHONEMES: Record<string, string[]> = {
  fr: ["r", "ü", "ø", "ʃ", "ʒ", "n"],
  es: ["r", "d", "b", "n", "l", "s"],
  zh: ["zh", "x", "q", "r", "ü", "t"],
};

const FALLBACK_PHONEMES = ["a", "e", "i", "o", "u", "s", "t", "n", "r", "l"];

function seededIndex(seed: number, length: number): number {
  let h = seed | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h % length;
}

export function getRandomPhonemeForLanguage(languageCode: string): string {
  const seed = Math.floor(Date.now() / 10000);
  const pool = LANGUAGE_PHONEMES[languageCode] ?? FALLBACK_PHONEMES;
  return pool[seededIndex(seed, pool.length)];
}

// ── Design tokens (SAFETY: soft, low-contrast, never medical) ────────────────
const ZONE_ACTIVE_FILL = "rgba(168,93,46,0.12)";
const ZONE_ACTIVE_BORDER = "rgba(168,93,46,0.25)";
const ZONE_INACTIVE_BORDER = "rgba(168,93,46,0.10)";
const OUTLINE_STROKE = "rgba(168,93,46,0.15)";
const CONTAINER_BG = "#FAF7F2";
const AMBER_ACCENT = "#A85D2E";
const AMBER_ACCENT_BG = "rgba(168,93,46,0.10)";
const LABEL_COLOR = "rgba(168,93,46,0.50)";
const TIP_COLOR = "#4A3E35";

type TongueZone = "front" | "middle" | "back";

function getActiveZone(tongueX: number): TongueZone {
  if (tongueX <= 0.35) return "front";
  if (tongueX <= 0.65) return "middle";
  return "back";
}

const ZONE_LABELS: Record<TongueZone, string> = {
  front: "Front",
  middle: "Middle",
  back: "Back",
};

const ZONE_DESCRIPTIONS: Record<TongueZone, string> = {
  front: "behind the teeth",
  middle: "at the palate",
  back: "near the soft palate",
};

// ── Component ────────────────────────────────────────────────────────────────

interface TongueDiagramProps {
  phoneme: string;
  size?: number;
}

export function TongueDiagram({ phoneme, size = 160 }: TongueDiagramProps) {
  const data = getPhonemeData(phoneme);
  const activeZone = getActiveZone(data.tongueX);
  const w = size;
  const h = size * 0.65;

  // Zone layout: 3 equal-width zones inside a rounded container
  const pad = 8;
  const gap = 5;
  const containerRx = 18;
  const zoneW = (w - pad * 2 - gap * 2) / 3;
  const zoneH = h - pad * 2;
  const zoneRx = 12;
  const zones: TongueZone[] = ["front", "middle", "back"];

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          backgroundColor: CONTAINER_BG,
          borderRadius: 24,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* Outer silhouette — soft rounded rectangle, NOT a mouth */}
          <Rect
            x={1}
            y={1}
            width={w - 2}
            height={h - 2}
            rx={containerRx}
            ry={containerRx}
            fill={CONTAINER_BG}
            stroke={OUTLINE_STROKE}
            strokeWidth={1.5}
          />

          {/* 3 zone rectangles */}
          {zones.map((zone, i) => {
            const isActive = zone === activeZone;
            const x = pad + i * (zoneW + gap);
            return (
              <G key={zone}>
                <Rect
                  x={x}
                  y={pad}
                  width={zoneW}
                  height={zoneH}
                  rx={zoneRx}
                  ry={zoneRx}
                  fill={isActive ? ZONE_ACTIVE_FILL : "transparent"}
                  stroke={isActive ? ZONE_ACTIVE_BORDER : ZONE_INACTIVE_BORDER}
                  strokeWidth={isActive ? 1.5 : 1}
                  strokeDasharray={isActive ? undefined : "4,4"}
                />
                <SvgText
                  x={x + zoneW / 2}
                  y={pad + zoneH / 2 + 4}
                  fill={isActive ? AMBER_ACCENT : LABEL_COLOR}
                  fontSize={Math.max(10, size * 0.07)}
                  fontWeight={isActive ? "700" : "500"}
                  textAnchor="middle"
                >
                  {ZONE_LABELS[zone]}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Tongue zone + description */}
        <Text
          style={{
            marginTop: 10,
            fontSize: 13,
            color: TIP_COLOR,
            textAlign: "center",
            lineHeight: 19,
            fontWeight: "500",
            letterSpacing: 0.1,
            opacity: 0.85,
          }}
        >
          Tongue: {ZONE_LABELS[activeZone]}, {ZONE_DESCRIPTIONS[activeZone]}
        </Text>

        {/* Tip text from PHONEME_DB */}
        <Text
          style={{
            marginTop: 4,
            fontSize: 12,
            color: TIP_COLOR,
            textAlign: "center",
            lineHeight: 17,
            paddingHorizontal: 8,
            fontWeight: "400",
            opacity: 0.65,
          }}
        >
          {data.tip}
        </Text>

        {/* Phoneme label pill */}
        <View
          style={{
            marginTop: 8,
            paddingHorizontal: 14,
            paddingVertical: 5,
            backgroundColor: AMBER_ACCENT_BG,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: AMBER_ACCENT,
              textAlign: "center",
              letterSpacing: 0.5,
            }}
          >
            /{phoneme}/
          </Text>
        </View>
      </View>
    </View>
  );
}
