// ── Animated mouth / articulation "video" ───────────────────────────────────
// A premium mid-sagittal cross-section of the mouth whose tongue, lips and
// jaw actually MOVE from rest to the target articulation as a loop. No video
// files needed — pure SVG + Reanimated so it runs offline, scales cleanly,
// and ships on every platform Expo supports.
//
// The component has two jobs:
//   1. Show a still, anatomically plausible diagram for any phoneme.
//   2. When `playing` is true, animate the articulators through a
//      (rest → prep → peak → release → rest) cycle so learners see HOW the
//      sound is made, not just a frozen pose.
//
// We model the tongue as a 3-point quadratic curve (back, mid, tip). Each
// point is a Reanimated shared value, which lets us morph the tongue path
// smoothly between phonemes without re-rendering the whole tree. Lips and
// jaw use plain transforms — simpler and cheaper.

import React, { useEffect, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, {
  Path,
  Circle,
  Ellipse,
  Line,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/lib/constants";
import { getPhoneme, type PhonemePose, PHONEME_IDS } from "@/lib/phonemes";

const APath = Animated.createAnimatedComponent(Path);
const AEllipse = Animated.createAnimatedComponent(Ellipse);
const ACircle = Animated.createAnimatedComponent(Circle);
// SVG <G> accepts `transform` as a string prop, so we can drive it via
// useAnimatedProps and get jaw rotation/translate without breaking the SVG
// scene graph (an Animated.View wrapper would — SVG children must be SVG).
const AG = Animated.createAnimatedComponent(G);

// ── Props ───────────────────────────────────────────────────────────────────

export interface AnimatedMouthProps {
  /** Target phoneme key — see PHONEME_IDS in src/lib/phonemes.ts. */
  phoneme: string;
  /** True when the component should loop the articulation animation. */
  playing?: boolean;
  /** "side" cross-section (most informative) or "front" lip view. */
  view?: "side" | "front";
  /** Pixel size of the square viewport. */
  size?: number;
  /** Optional inline play/pause button. Defaults to true. */
  showControls?: boolean;
  /** Called when the user taps the embedded play/pause button. */
  onTogglePlay?: () => void;
  /** Initial anatomy labels state. Users can toggle via the info button. */
  labelsDefault?: boolean;
  /** Shows the anatomy-label info toggle. Defaults to true. */
  showLabelsToggle?: boolean;
}

// ── Side-view coordinate system ──────────────────────────────────────────────
// Everything below is expressed as a fraction of the viewport so the same
// path math scales with `size`. We lay the face in profile, nose on the left.

const REST_POSE: PhonemePose = {
  tongueBack: { x: 0.72, y: 0.60 },
  tongueMid: { x: 0.55, y: 0.62 },
  tongueTip: { x: 0.36, y: 0.58 },
  lipRound: 0.15,
  lipOpen: 0.35,
  jawOpen: 0.35,
  airflow: "oral",
  voicing: true,
  hint: "Relax everything. This is the neutral rest position.",
};

// ── Main component ──────────────────────────────────────────────────────────

export function AnimatedMouth({
  phoneme,
  playing = false,
  view = "side",
  size = 220,
  showControls = true,
  onTogglePlay,
  labelsDefault = false,
  showLabelsToggle = true,
}: AnimatedMouthProps) {
  const target = useMemo(() => getPhoneme(phoneme), [phoneme]);
  const [showLabels, setShowLabels] = React.useState(labelsDefault);

  // Cycle progress — 0 = rest, 1 = full articulation peak.
  const cycle = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      // (rest 120 → prep 260 → hold 360 → release 220 → rest 220) ≈ 1.18s
      cycle.value = withRepeat(
        withSequence(
          withDelay(120, withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) })),
          withDelay(360, withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }))
        ),
        -1,
        false
      );
    } else {
      cycle.value = withTiming(0.0, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [playing]);

  // When phoneme changes or cycle progresses, interpolate toward the target.
  // We do this via useAnimatedProps that reads cycle + target constants.
  const tonguePath = useAnimatedProps(() => {
    const t = cycle.value;
    const bx = interpolate(t, [0, 1], [REST_POSE.tongueBack.x, target.tongueBack.x]) * size;
    const by = interpolate(t, [0, 1], [REST_POSE.tongueBack.y, target.tongueBack.y]) * size;
    const mx = interpolate(t, [0, 1], [REST_POSE.tongueMid.x, target.tongueMid.x]) * size;
    const my = interpolate(t, [0, 1], [REST_POSE.tongueMid.y, target.tongueMid.y]) * size;
    const tx = interpolate(t, [0, 1], [REST_POSE.tongueTip.x, target.tongueTip.x]) * size;
    const ty = interpolate(t, [0, 1], [REST_POSE.tongueTip.y, target.tongueTip.y]) * size;

    // Base of tongue (static, at jaw floor)
    const baseY = 0.78 * size;
    const rootX = 0.85 * size;
    const tipBelowX = tx;
    const tipBelowY = baseY;

    // Smooth bezier through the three animated control points; drop down to
    // the mouth floor at each end so the tongue looks filled, not a wire.
    return {
      d:
        `M ${rootX} ${baseY} ` +
        `L ${bx} ${by} ` +
        `Q ${mx} ${my} ${tx} ${ty} ` +
        `L ${tipBelowX} ${tipBelowY} Z`,
    } as any;
  });

  // Tongue tip dot — tiny highlight for "this is where the action is".
  const tongueTipDot = useAnimatedProps(() => {
    const t = cycle.value;
    return {
      cx: interpolate(t, [0, 1], [REST_POSE.tongueTip.x, target.tongueTip.x]) * size,
      cy: interpolate(t, [0, 1], [REST_POSE.tongueTip.y, target.tongueTip.y]) * size,
    } as any;
  });

  // Jaw translation — swings the lower-jaw group down as jawOpen grows.
  // Drives the SVG <G> transform attribute directly so children stay inside
  // the SVG scene graph (wrapping in Animated.View would break that).
  const jawProps = useAnimatedProps(() => {
    const t = cycle.value;
    const openness = interpolate(t, [0, 1], [REST_POSE.jawOpen, target.jawOpen]);
    const dy = openness * size * 0.06;
    return { transform: `translate(0, ${dy})` } as any;
  });

  // Lip ellipse — rx shrinks with roundness, ry grows with openness.
  const lipsProps = useAnimatedProps(() => {
    const t = cycle.value;
    const round = interpolate(t, [0, 1], [REST_POSE.lipRound, target.lipRound]);
    const open = interpolate(t, [0, 1], [REST_POSE.lipOpen, target.lipOpen]);
    const rxPct = 0.09 - round * 0.035;
    const ryPct = 0.02 + open * 0.05;
    return {
      rx: rxPct * size,
      ry: ryPct * size,
    } as any;
  });

  // Airflow dash offset animates to give a "stream" impression.
  const airflowDash = useSharedValue(0);
  useEffect(() => {
    airflowDash.value = withRepeat(
      withTiming(20, { duration: 1100, easing: Easing.linear }),
      -1,
      false
    );
  }, []);
  const airflowProps = useAnimatedProps(() => ({
    strokeDashoffset: -airflowDash.value,
  } as any));

  // Voice box pulse when voicing.
  const voiceProps = useAnimatedProps(() => {
    const t = cycle.value;
    const glow = interpolate(t, [0, 1], [0.35, target.voicing ? 1 : 0.25]);
    return {
      opacity: glow,
    } as any;
  });

  // Front-view specific lip oval — a small circle that morphs between an
  // open round "O" for rounded vowels and a wide smile for spread vowels.
  const frontLipProps = useAnimatedProps(() => {
    const t = cycle.value;
    const round = interpolate(t, [0, 1], [REST_POSE.lipRound, target.lipRound]);
    const open = interpolate(t, [0, 1], [REST_POSE.lipOpen, target.lipOpen]);
    const rx = interpolate(round, [0, 1], [0.22, 0.09]) * size;
    const ry = interpolate(open, [0, 1], [0.02, 0.14]) * size;
    return { rx, ry } as any;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "#FBF7F1",
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="am-skin" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FCE7CF" />
              <Stop offset="100%" stopColor="#F1C8A2" />
            </LinearGradient>
            <LinearGradient id="am-tongue" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E85D78" />
              <Stop offset="100%" stopColor="#B63954" />
            </LinearGradient>
            <RadialGradient id="am-cavity" cx="50%" cy="45%" r="60%">
              <Stop offset="0%" stopColor="#2A1720" />
              <Stop offset="100%" stopColor="#14070D" />
            </RadialGradient>
            <LinearGradient id="am-lip" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#E89A8F" />
              <Stop offset="100%" stopColor="#C97A6E" />
            </LinearGradient>
          </Defs>

          {view === "side" ? (
            <SideView
              size={size}
              target={target}
              tonguePath={tonguePath}
              tongueTipDot={tongueTipDot}
              jawProps={jawProps}
              lipsProps={lipsProps}
              airflowProps={airflowProps}
              voiceProps={voiceProps}
              showLabels={showLabels}
            />
          ) : (
            <FrontView
              size={size}
              target={target}
              frontLipProps={frontLipProps}
              voiceProps={voiceProps}
              showLabels={showLabels}
            />
          )}
        </Svg>

        {/* Anatomy labels toggle — top-right corner. Tiny button that flips
            on the callout layer without repositioning any of the diagram. */}
        {showLabelsToggle ? (
          <Pressable
            onPress={() => setShowLabels((v) => !v)}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: showLabels ? COLORS.text : "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
            }}
            accessibilityLabel={showLabels ? "Hide anatomy labels" : "Show anatomy labels"}
          >
            <Ionicons
              name={showLabels ? "information" : "information-outline"}
              size={15}
              color={showLabels ? "#FFFFFF" : COLORS.text}
            />
          </Pressable>
        ) : null}

        {/* Live status label — only visible while animating */}
        {playing && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: "rgba(17,17,16,0.74)",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 10,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: COLORS.gold,
              }}
            />
            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>
              /{phoneme}/ · LIVE
            </Text>
          </Animated.View>
        )}
      </View>

      {showControls && (
        <Pressable
          onPress={onTogglePlay}
          style={({ pressed }) => ({
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: playing ? COLORS.gold : COLORS.text,
            paddingHorizontal: 18,
            paddingVertical: 11,
            borderRadius: 22,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons
            name={playing ? "pause" : "play"}
            size={14}
            color="#FFFFFF"
          />
          <Text style={{ color: "#FFF", fontSize: 13, fontWeight: "700", letterSpacing: 0.3 }}>
            {playing ? "Pause articulation" : "Play articulation"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Side view: the informative cross-section ────────────────────────────────

function SideView({
  size,
  target,
  tonguePath,
  tongueTipDot,
  jawProps,
  lipsProps,
  airflowProps,
  voiceProps,
  showLabels,
}: {
  size: number;
  target: PhonemePose;
  tonguePath: any;
  tongueTipDot: any;
  jawProps: any;
  lipsProps: any;
  airflowProps: any;
  voiceProps: any;
  showLabels: boolean;
}) {
  const s = size;
  // Head silhouette path (profile, facing left)
  const headPath =
    `M ${0.98 * s} ${0.14 * s} ` +
    `Q ${0.92 * s} ${0.02 * s} ${0.52 * s} ${0.03 * s} ` +
    `Q ${0.22 * s} ${0.05 * s} ${0.10 * s} ${0.18 * s} ` + // forehead / nose
    `Q ${0.02 * s} ${0.28 * s} ${0.10 * s} ${0.36 * s} ` + // nose bridge
    `L ${0.20 * s} ${0.42 * s} ` +
    `L ${0.12 * s} ${0.44 * s} ` + // nose tip
    `L ${0.18 * s} ${0.50 * s} ` +
    `L ${0.13 * s} ${0.56 * s} ` + // philtrum
    `L ${0.20 * s} ${0.60 * s} ` + // upper lip
    `L ${0.22 * s} ${0.68 * s} ` + // lip opening
    `L ${0.18 * s} ${0.76 * s} ` + // lower lip
    `L ${0.26 * s} ${0.86 * s} ` + // chin
    `Q ${0.50 * s} ${0.98 * s} ${0.90 * s} ${0.96 * s} ` +
    `L ${0.98 * s} ${0.90 * s} Z`;

  // Palate: hard palate (front, flat) + soft palate (back, curved) + uvula
  const palatePath =
    `M ${0.22 * s} ${0.44 * s} ` +
    `Q ${0.45 * s} ${0.40 * s} ${0.70 * s} ${0.42 * s} ` + // hard palate
    `Q ${0.85 * s} ${0.50 * s} ${0.80 * s} ${0.60 * s} `; // soft palate dropping

  return (
    <>
      {/* Head silhouette */}
      <Path d={headPath} fill="url(#am-skin)" stroke="#C9A080" strokeWidth={1.2} />

      {/* Dark mouth cavity */}
      <Path
        d={
          `M ${0.20 * s} ${0.44 * s} ` +
          `L ${0.85 * s} ${0.44 * s} ` +
          `L ${0.85 * s} ${0.80 * s} ` +
          `L ${0.20 * s} ${0.78 * s} Z`
        }
        fill="url(#am-cavity)"
      />

      {/* Hard + soft palate */}
      <Path
        d={palatePath}
        stroke="#D8A990"
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* Alveolar ridge dot (behind upper teeth) — where many consonants land */}
      <Circle
        cx={0.26 * s}
        cy={0.45 * s}
        r={3.5}
        fill={target.tongueTip.x < 0.35 ? COLORS.gold : "#D8A990"}
      />

      {/* Uvula */}
      <Circle cx={0.82 * s} cy={0.62 * s} r={3} fill="#D8A990" />

      {/* Upper teeth */}
      <Line
        x1={0.20 * s}
        y1={0.50 * s}
        x2={0.30 * s}
        y2={0.50 * s}
        stroke="#FFFFFF"
        strokeWidth={3.2}
        strokeLinecap="round"
      />

      {/* Airflow stream — shows approximate direction air takes */}
      <APath
        d={
          target.airflow === "nasal"
            ? `M ${0.40 * s} ${0.50 * s} Q ${0.30 * s} ${0.38 * s} ${0.18 * s} ${0.25 * s}`
            : target.airflow === "lateral"
            ? `M ${0.45 * s} ${0.65 * s} Q ${0.32 * s} ${0.68 * s} ${0.14 * s} ${0.66 * s}`
            : `M ${0.55 * s} ${0.62 * s} Q ${0.35 * s} ${0.64 * s} ${0.14 * s} ${0.64 * s}`
        }
        stroke={COLORS.accent}
        strokeWidth={1.8}
        strokeDasharray="4 5"
        strokeLinecap="round"
        fill="none"
        animatedProps={airflowProps}
      />

      {/* ── Jaw group — tongue + lower teeth + lower lip move together ── */}
      <AG animatedProps={jawProps}>
        {/* Tongue body (animated) */}
        <APath
          animatedProps={tonguePath}
          fill="url(#am-tongue)"
          stroke="#922842"
          strokeWidth={1.5}
        />
        {/* Tongue tip highlight */}
        <ACircle
          animatedProps={tongueTipDot}
          r={4}
          fill="#FF8096"
          stroke="#922842"
          strokeWidth={1.2}
        />
        {/* Lower teeth */}
        <Line
          x1={0.20 * s}
          y1={0.76 * s}
          x2={0.30 * s}
          y2={0.76 * s}
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Lower lip */}
        <AEllipse
          cx={0.18 * s}
          cy={0.74 * s}
          animatedProps={lipsProps}
          fill="url(#am-lip)"
          stroke="#AE6352"
          strokeWidth={0.6}
        />
      </AG>

      {/* Upper lip — slight move but not as dramatic as lower */}
      <Ellipse
        cx={0.18 * s}
        cy={0.61 * s}
        rx={0.09 * s}
        ry={0.025 * s}
        fill="url(#am-lip)"
        stroke="#AE6352"
        strokeWidth={0.6}
      />

      {/* Vocal cords indicator */}
      <G>
        <ACircle
          cx={0.78 * s}
          cy={0.88 * s}
          r={8}
          animatedProps={voiceProps}
          fill="none"
          stroke={COLORS.gold}
          strokeWidth={1.8}
        />
        <Path
          d={`M ${0.74 * s} ${0.86 * s} Q ${0.76 * s} ${0.84 * s} ${0.78 * s} ${0.86 * s}`}
          stroke={COLORS.gold}
          strokeWidth={1}
          fill="none"
        />
        <Path
          d={`M ${0.78 * s} ${0.86 * s} Q ${0.80 * s} ${0.84 * s} ${0.82 * s} ${0.86 * s}`}
          stroke={COLORS.gold}
          strokeWidth={1}
          fill="none"
        />
      </G>

      {/* Anatomy labels — callouts with tiny pointer lines. Rendered last
          so they sit on top of the diagram. */}
      {showLabels ? <SideAnatomyLabels size={s} /> : null}
    </>
  );
}

// ── Side-view labels overlay ──────────────────────────────────────────
// Hand-placed callouts aimed at the anatomical landmarks a learner cares
// about. Pointer lines are short, the labels themselves are tiny so they
// don't obscure the mouth animation.

function SideAnatomyLabels({ size }: { size: number }) {
  const labels: Array<{
    text: string;
    anchor: { x: number; y: number };    // target on the anatomy (0..1)
    tip: { x: number; y: number };       // label position (0..1)
    align?: "left" | "right";
  }> = [
    { text: "Hard palate", anchor: { x: 0.38, y: 0.42 }, tip: { x: 0.42, y: 0.22 }, align: "left" },
    { text: "Soft palate", anchor: { x: 0.75, y: 0.50 }, tip: { x: 0.86, y: 0.30 }, align: "right" },
    { text: "Tongue", anchor: { x: 0.52, y: 0.62 }, tip: { x: 0.58, y: 0.86 }, align: "left" },
    { text: "Upper teeth", anchor: { x: 0.25, y: 0.50 }, tip: { x: 0.08, y: 0.36 }, align: "right" },
    { text: "Lips", anchor: { x: 0.18, y: 0.64 }, tip: { x: 0.04, y: 0.58 }, align: "right" },
    { text: "Vocal cords", anchor: { x: 0.78, y: 0.88 }, tip: { x: 0.92, y: 0.92 }, align: "right" },
  ];
  return (
    <G>
      {labels.map((l) => {
        const ax = l.anchor.x * size;
        const ay = l.anchor.y * size;
        const tx = l.tip.x * size;
        const ty = l.tip.y * size;
        return (
          <G key={l.text}>
            <Path
              d={`M ${ax} ${ay} L ${tx} ${ty}`}
              stroke="#111110"
              strokeOpacity={0.45}
              strokeWidth={0.8}
              strokeDasharray="2 2"
              fill="none"
            />
            <Circle cx={ax} cy={ay} r={1.8} fill="#111110" opacity={0.55} />
            <SvgTextLabel text={l.text} x={tx} y={ty} align={l.align || "left"} />
          </G>
        );
      })}
    </G>
  );
}

// ── Front view: great for lip rounding (u / ü / o) ──────────────────────────

function FrontView({
  size,
  target,
  frontLipProps,
  voiceProps,
  showLabels,
}: {
  size: number;
  target: PhonemePose;
  frontLipProps: any;
  voiceProps: any;
  showLabels: boolean;
}) {
  const s = size;
  return (
    <>
      {/* Head outline — front */}
      <Ellipse
        cx={0.5 * s}
        cy={0.5 * s}
        rx={0.42 * s}
        ry={0.47 * s}
        fill="url(#am-skin)"
        stroke="#C9A080"
        strokeWidth={1.2}
      />
      {/* Nose hint */}
      <Path
        d={`M ${0.48 * s} ${0.36 * s} Q ${0.46 * s} ${0.52 * s} ${0.5 * s} ${0.56 * s} Q ${0.54 * s} ${0.52 * s} ${0.52 * s} ${0.36 * s}`}
        fill="none"
        stroke="#C9A080"
        strokeWidth={1.3}
      />
      {/* Lip oval (animated between smile and rounded O) */}
      <AEllipse
        cx={0.5 * s}
        cy={0.72 * s}
        animatedProps={frontLipProps}
        fill="url(#am-cavity)"
        stroke="#AE6352"
        strokeWidth={2}
      />
      {/* Upper lip contour */}
      <Path
        d={`M ${0.35 * s} ${0.70 * s} Q ${0.5 * s} ${0.66 * s} ${0.65 * s} ${0.70 * s}`}
        fill="none"
        stroke="#C97A6E"
        strokeWidth={1.6}
      />
      {/* Teeth hint when lips open enough */}
      <Line
        x1={0.42 * s}
        y1={0.72 * s}
        x2={0.58 * s}
        y2={0.72 * s}
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Voice pulse */}
      <ACircle
        cx={0.5 * s}
        cy={0.92 * s}
        r={6}
        animatedProps={voiceProps}
        fill="none"
        stroke={target.voicing ? COLORS.gold : "transparent"}
        strokeWidth={2}
      />

      {/* Anatomy labels for the front view — fewer callouts since the front
          view is more about lip shape than articulatory detail. */}
      {showLabels ? (
        <G>
          <FrontLabel text="Upper lip" anchor={{ x: 0.5, y: 0.68 }} tip={{ x: 0.78, y: 0.56 }} align="right" size={s} />
          <FrontLabel text="Lower lip" anchor={{ x: 0.5, y: 0.78 }} tip={{ x: 0.78, y: 0.88 }} align="right" size={s} />
          <FrontLabel text="Teeth" anchor={{ x: 0.5, y: 0.72 }} tip={{ x: 0.2, y: 0.58 }} align="left" size={s} />
          {target.voicing ? (
            <FrontLabel text="Voice on" anchor={{ x: 0.5, y: 0.92 }} tip={{ x: 0.16, y: 0.94 }} align="left" size={s} />
          ) : null}
        </G>
      ) : null}
    </>
  );
}

function FrontLabel({
  text,
  anchor,
  tip,
  align,
  size,
}: {
  text: string;
  anchor: { x: number; y: number };
  tip: { x: number; y: number };
  align: "left" | "right";
  size: number;
}) {
  const ax = anchor.x * size;
  const ay = anchor.y * size;
  const tx = tip.x * size;
  const ty = tip.y * size;
  return (
    <G>
      <Path
        d={`M ${ax} ${ay} L ${tx} ${ty}`}
        stroke="#111110"
        strokeOpacity={0.45}
        strokeWidth={0.8}
        strokeDasharray="2 2"
        fill="none"
      />
      <Circle cx={ax} cy={ay} r={1.8} fill="#111110" opacity={0.55} />
      <SvgTextLabel text={text} x={tx} y={ty} align={align} />
    </G>
  );
}

// ── Shared SVG label pill ────────────────────────────────────────────
// Tiny rounded pill drawn inside the SVG so the label lives in the same
// transform space as the mouth. Keeps positioning crisp across sizes.

function SvgTextLabel({
  text,
  x,
  y,
  align,
}: {
  text: string;
  x: number;
  y: number;
  align: "left" | "right";
}) {
  // Rough width heuristic so the pill fits a variety of label strings without
  // measuring text on the native side. 5.6 px/char is close for our small
  // weights (11 pt) inside the viewport.
  const padH = 6;
  const padV = 3;
  const widthApprox = Math.max(30, text.length * 5.6 + padH * 2);
  const height = 14;
  const rx = x + (align === "left" ? -widthApprox : 0);
  const ry = y - height / 2;
  return (
    <G>
      <Rect
        x={rx}
        y={ry}
        width={widthApprox}
        height={height}
        rx={7}
        ry={7}
        fill="#FFFFFF"
        stroke="#111110"
        strokeOpacity={0.12}
        strokeWidth={0.7}
      />
      <SvgText
        x={rx + padH}
        y={ry + 10}
        fontSize={8.5}
        fontWeight="700"
        fill="#111110"
      >
        {text}
      </SvgText>
    </G>
  );
}

// Re-export the phoneme id list so Tutor UI can suggest phonemes.
export { PHONEME_IDS };
