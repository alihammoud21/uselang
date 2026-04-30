import React from "react";
import { View, Text } from "react-native";
import Svg, {
  Path,
  Circle,
  Ellipse,
  Line,
  G,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { COLORS } from "@/lib/constants";

// ── Phoneme articulatory data ────────────────────────────────────────────────
// Each phoneme maps to parameters that drive the SVG diagram.
// tongueX/Y: tip position (0-1 normalized in mouth cavity)
// tongueCurve: how arched the tongue body is (0=flat, 1=high arch)
// lipRoundness: 0=spread, 1=fully rounded
// lipOpenness: 0=closed, 1=wide open
// jawOpen: 0=closed, 1=fully open
// airflow: "oral" | "nasal" | "lateral"
// voicing: true = vocal cords vibrate

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

// ── Accent colors ────────────────────────────────────────────────────────────

const AMBER_ACCENT = "#A85D2E";
const AMBER_ACCENT_BG = "rgba(168,93,46,0.10)";

// ── Component ────────────────────────────────────────────────────────────────

interface TongueDiagramProps {
  phoneme: string;
  size?: number;
}

export function TongueDiagram({ phoneme, size = 160 }: TongueDiagramProps) {
  const data = getPhonemeData(phoneme);
  const w = size;
  const h = size;
  const sideW = w * 0.58;
  const frontW = w * 0.38;

  const cavityLeft = w * 0.15;
  const cavityRight = w * 0.85;
  const cavityTop = h * 0.15;
  const cavityBottom = h * 0.75;
  const cavityW = cavityRight - cavityLeft;
  const cavityH = cavityBottom - cavityTop;

  const tipX = cavityLeft + data.tongueX * cavityW;
  const tipY = cavityTop + data.tongueY * cavityH;

  const tongueStartX = cavityLeft + cavityW * 0.15;
  const tongueStartY = cavityBottom;
  const tongueEndX = cavityRight - cavityW * 0.1;
  const tongueEndY = cavityBottom;
  const curveHeight = cavityH * (0.3 + data.tongueCurve * 0.5);

  const jawY = cavityBottom + h * (0.05 + data.jawOpen * 0.12);

  const lipTopY = cavityTop - h * 0.02;
  const lipBottomY = cavityTop + h * (0.08 + data.lipOpenness * 0.15);
  const lipWidth = w * (0.12 - data.lipRoundness * 0.04);

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          backgroundColor: "rgba(250, 247, 242, 0.92)",
          borderRadius: 24,
          padding: 16,
          alignItems: "center",
        }}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Defs>
            <LinearGradient id="skinGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#fce4c8" />
              <Stop offset="40%" stopColor="#f5d2af" />
              <Stop offset="100%" stopColor="#e8bfa0" />
            </LinearGradient>
            <LinearGradient id="tongueGrad" x1="0" y1="0" x2="0.3" y2="1">
              <Stop offset="0%" stopColor="#e85a72" />
              <Stop offset="50%" stopColor="#d43d58" />
              <Stop offset="100%" stopColor="#b82e48" />
            </LinearGradient>
            <LinearGradient id="cavityGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#1e0e16" />
              <Stop offset="100%" stopColor="#0d0508" />
            </LinearGradient>
            <LinearGradient id="lipGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#d98a8a" />
              <Stop offset="100%" stopColor="#c46e72" />
            </LinearGradient>
          </Defs>

          {/* Head outline */}
          <Path
            d={`M ${sideW * 0.08} ${h * 0.16}
                Q ${sideW * 0.48} ${h * 0.02} ${sideW * 0.9} ${h * 0.14}
                L ${sideW * 0.92} ${h * 0.82}
                Q ${sideW * 0.5} ${h * 0.96} ${sideW * 0.08} ${h * 0.82} Z`}
            fill="url(#skinGrad)"
            stroke="#d4a882"
            strokeWidth={1}
          />

          {/* Oral cavity */}
          <Ellipse
            cx={sideW * 0.5}
            cy={(cavityTop + cavityBottom) / 2}
            rx={sideW * 0.32}
            ry={cavityH * 0.45 + data.jawOpen * cavityH * 0.1}
            fill="url(#cavityGrad)"
          />

          {/* Palate */}
          <Path
            d={`M ${cavityLeft + cavityW * 0.1} ${cavityTop + cavityH * 0.1}
                Q ${sideW * 0.5} ${cavityTop - cavityH * 0.1} ${sideW * 0.88} ${cavityTop + cavityH * 0.1}`}
            fill="none"
            stroke="#c49a80"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Alveolar ridge */}
          <Circle
            cx={cavityLeft + cavityW * 0.22}
            cy={cavityTop + cavityH * 0.08}
            r={3}
            fill="#c49a80"
          />

          {/* Tongue body */}
          <Path
            d={`M ${tongueStartX} ${tongueStartY}
                Q ${tipX} ${tipY - curveHeight * 0.2} ${tipX} ${tipY}
                Q ${tipX + cavityW * 0.16} ${tipY - curveHeight * 0.1} ${Math.min(tongueEndX, sideW * 0.86)} ${tongueEndY}`}
            fill="url(#tongueGrad)"
            stroke="#a82840"
            strokeWidth={1.5}
          />

          {/* Tongue tip dot */}
          <Circle cx={tipX} cy={tipY} r={4} fill="#f06080" stroke="#a82840" strokeWidth={1} />

          {/* Upper lip */}
          <Ellipse
            cx={sideW * 0.1}
            cy={lipTopY}
            rx={lipWidth}
            ry={h * 0.035}
            fill="url(#lipGrad)"
            stroke="#b56068"
            strokeWidth={0.5}
          />

          {/* Lower lip */}
          <Ellipse
            cx={sideW * 0.1}
            cy={lipBottomY}
            rx={lipWidth * 1.1}
            ry={h * 0.04}
            fill="url(#lipGrad)"
            stroke="#b56068"
            strokeWidth={0.5}
          />

          {/* Teeth */}
          <Line
            x1={cavityLeft + cavityW * 0.05}
            y1={cavityTop + cavityH * 0.02}
            x2={cavityLeft + cavityW * 0.25}
            y2={cavityTop + cavityH * 0.02}
            stroke="white"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Nasal airflow indicator */}
          {data.airflow === "nasal" && (
            <G>
              <Path
                d={`M ${w * 0.5} ${cavityTop - cavityH * 0.05}
                    L ${w * 0.5} ${h * 0.02}`}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                strokeDasharray="3,3"
                fill="none"
              />
              <Path
                d={`M ${w * 0.47} ${h * 0.06} L ${w * 0.5} ${h * 0.02} L ${w * 0.53} ${h * 0.06}`}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                fill="none"
              />
            </G>
          )}
          {/* Oral airflow indicator */}
          {data.airflow === "oral" && (
            <G>
              <Path
                d={`M ${cavityLeft + cavityW * 0.3} ${(cavityTop + cavityBottom) / 2}
                    L ${w * 0.05} ${(cavityTop + cavityBottom) / 2}`}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                strokeDasharray="3,3"
                fill="none"
              />
              <Path
                d={`M ${w * 0.09} ${(cavityTop + cavityBottom) / 2 - 3}
                    L ${w * 0.05} ${(cavityTop + cavityBottom) / 2}
                    L ${w * 0.09} ${(cavityTop + cavityBottom) / 2 + 3}`}
                stroke={COLORS.accent}
                strokeWidth={1.5}
                fill="none"
              />
            </G>
          )}

          {/* Voicing indicator */}
          {data.voicing && (
            <G>
              <Ellipse
                cx={w * 0.65}
                cy={h * 0.82}
                rx={8}
                ry={5}
                fill="none"
                stroke={COLORS.gold}
                strokeWidth={1.5}
              />
              <Path
                d={`M ${w * 0.6} ${h * 0.78} Q ${w * 0.62} ${h * 0.76} ${w * 0.64} ${h * 0.78}`}
                stroke={COLORS.gold}
                strokeWidth={1}
                fill="none"
              />
              <Path
                d={`M ${w * 0.66} ${h * 0.78} Q ${w * 0.68} ${h * 0.76} ${w * 0.7} ${h * 0.78}`}
                stroke={COLORS.gold}
                strokeWidth={1}
                fill="none"
              />
            </G>
          )}

          {/* Front view */}
          <G x={w - frontW} y={h * 0.16}>
            <Ellipse
              cx={frontW * 0.5}
              cy={h * 0.28}
              rx={frontW * (0.28 + data.lipRoundness * 0.05)}
              ry={h * (0.13 + data.lipOpenness * 0.08)}
              fill="url(#lipGrad)"
              stroke="#a8565e"
              strokeWidth={1}
            />
            <Ellipse
              cx={frontW * 0.5}
              cy={h * 0.28}
              rx={frontW * (0.2 - data.lipRoundness * 0.06)}
              ry={h * (0.07 + data.lipOpenness * 0.08)}
              fill="url(#cavityGrad)"
            />
            <Path
              d={`M ${frontW * 0.24} ${h * 0.24}
                  Q ${frontW * 0.5} ${h * 0.2} ${frontW * 0.76} ${h * 0.24}`}
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              opacity={data.jawOpen > 0.18 ? 0.95 : 0.35}
            />
            <Ellipse
              cx={frontW * (0.5 + (data.tongueX - 0.5) * 0.28)}
              cy={h * (0.35 - data.tongueCurve * 0.06)}
              rx={frontW * 0.2}
              ry={h * 0.08}
              fill="url(#tongueGrad)"
              stroke="#a82840"
              strokeWidth={1}
            />
            <Circle
              cx={frontW * (0.5 + (data.tongueX - 0.5) * 0.32)}
              cy={h * (0.31 + (data.tongueY - 0.4) * 0.18)}
              r={3}
              fill="#f06080"
              stroke="#a82840"
              strokeWidth={0.8}
            />
            <SvgText
              x={frontW * 0.5}
              y={h * 0.57}
              fill={COLORS.textMuted}
              fontSize={Math.max(8, size * 0.055)}
              fontWeight="700"
              textAnchor="middle"
            >
              FRONT
            </SvgText>
          </G>
          <SvgText
            x={sideW * 0.5}
            y={h * 0.92}
            fill={COLORS.textMuted}
            fontSize={Math.max(8, size * 0.055)}
            fontWeight="700"
            textAnchor="middle"
          >
            SIDE
          </SvgText>
        </Svg>

        {/* Tip text */}
        <Text
          style={{
            marginTop: 12,
            fontSize: 13,
            color: COLORS.text,
            textAlign: "center",
            lineHeight: 19,
            paddingHorizontal: 8,
            fontWeight: "500",
            letterSpacing: 0.1,
            opacity: 0.85,
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
