// ── Design Tokens ────────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bg: "#F7F7F5",
  surface: "#FFFFFF",
  surface2: "#F2F2F0",
  surfaceRaised: "#FFFFFF",

  // Text
  text: "#111110",
  textSub: "#767674",
  textMuted: "#B4B4B2",

  // Borders
  border: "rgba(0,0,0,0.07)",
  borderLight: "rgba(0,0,0,0.04)",

  // Primary accent — premium royal blue (was warm gold; repointed to match
  // the white/blue VoiceSphere and the blue-marble Globe). Existing
  // COLORS.gold / goldLight / goldDim usages across Today, Plan, Smart Board,
  // and the lesson-complete overlay now all read as blue automatically.
  gold: "#2E6BD8",
  goldLight: "rgba(46,107,216,0.12)",
  goldDim: "rgba(46,107,216,0.28)",

  // Orb / Sphere
  orbCenter: "#EFF5FF",
  orbMid: "#C3DEFF",
  orbEdge: "#85BAFF",
  orbGlow: "rgba(113,179,255,0.18)",

  // State colors
  danger: "#EF4444",
  success: "#22C55E",

  // Legacy aliases for compat
  ink: "#111110",
  inkLight: "#767674",
  cream: "#F7F7F5",
  creamDark: "#F2F2F0",
  accent: "#2563EB",
  accentLight: "#93C5FD",
  white: "#FFFFFF",
} as const;

export const SPHERE_COLORS = {
  idle: {
    centerStop1: "#EFF5FF",
    centerStop2: "#C3DEFF",
    edgeStop: "#85BAFF",
    glowColor: "rgba(113,179,255,0.15)",
    ringColor: "rgba(133,186,255,0.20)",
  },
  listening: {
    centerStop1: "#EAF2FF",
    centerStop2: "#A8D4FF",
    edgeStop: "#5BA3FF",
    glowColor: "rgba(91,163,255,0.22)",
    ringColor: "rgba(91,163,255,0.30)",
  },
  thinking: {
    centerStop1: "#FFF8EE",
    centerStop2: "#FFE5B8",
    edgeStop: "#F5C67A",
    glowColor: "rgba(245,198,122,0.18)",
    ringColor: "rgba(245,198,122,0.25)",
  },
  speaking: {
    centerStop1: "#F0F6FF",
    centerStop2: "#B8D8FF",
    edgeStop: "#6AAFF8",
    glowColor: "rgba(106,175,248,0.20)",
    ringColor: "rgba(106,175,248,0.28)",
  },
  blocked: {
    centerStop1: "#F5F5F5",
    centerStop2: "#E0E0E0",
    edgeStop: "#C8C8C8",
    glowColor: "rgba(180,180,180,0.10)",
    ringColor: "rgba(180,180,180,0.15)",
  },
} as const;

// ── Voice mode sphere palette (ChatGPT Voice-style) ──────────────────────────
// Cloud-like gradient: cream/white top, aqua-yellow midtones, deep blue bottom.
// Used in Tutor (hands-free) mode against a black canvas.
export const VOICE_SPHERE_COLORS = {
  idle: {
    top: "#FFFEF7",         // cream
    mid: "#F4F0C8",         // soft yellow-green
    side: "#8FD4E8",         // aqua highlight
    bottom: "#1C7FE8",       // deep blue
    glow: "rgba(120,190,255,0.18)",
    ring: "rgba(140,200,255,0.22)",
  },
  listening: {
    top: "#FFFFFF",
    mid: "#F9F2AE",
    side: "#6FCFEA",
    bottom: "#0E6FE0",
    glow: "rgba(80,170,255,0.28)",
    ring: "rgba(80,170,255,0.35)",
  },
  thinking: {
    top: "#FFF8E0",
    mid: "#F7E08A",
    side: "#A2D8E8",
    bottom: "#2A7FD8",
    glow: "rgba(250,210,110,0.18)",
    ring: "rgba(250,210,110,0.24)",
  },
  speaking: {
    top: "#FFFDEF",
    mid: "#F4EEB2",
    side: "#7FCDE8",
    bottom: "#0E7FEE",
    glow: "rgba(110,180,255,0.30)",
    ring: "rgba(110,180,255,0.36)",
  },
  blocked: {
    top: "#ECECEC",
    mid: "#D0D0D0",
    side: "#B5B5B5",
    bottom: "#7A7A7A",
    glow: "rgba(180,180,180,0.12)",
    ring: "rgba(180,180,180,0.18)",
  },
} as const;

// ── Supported Languages ──────────────────────────────────────────────────────

export interface Language {
  code: string;
  label: string;
  locale: string;
  sttCode: string;
  flag: string;
  elevenLabsVoiceId: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "en", label: "English", locale: "en-US", sttCode: "en-US", flag: "🇺🇸", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "es", label: "Spanish", locale: "es-419", sttCode: "es", flag: "🇪🇸", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "fr", label: "French", locale: "fr-FR", sttCode: "fr", flag: "🇫🇷", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "de", label: "German", locale: "de-DE", sttCode: "de", flag: "🇩🇪", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "it", label: "Italian", locale: "it-IT", sttCode: "it", flag: "🇮🇹", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "ja", label: "Japanese", locale: "ja-JP", sttCode: "ja", flag: "🇯🇵", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "zh", label: "Mandarin", locale: "zh-CN", sttCode: "zh-CN", flag: "🇨🇳", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "nl", label: "Dutch", locale: "nl-NL", sttCode: "nl", flag: "🇳🇱", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
  { code: "hi", label: "Hindi", locale: "hi-IN", sttCode: "hi", flag: "🇮🇳", elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM" },
];

// ── Usage Tiers ──────────────────────────────────────────────────────────────

export type PlanTier = "free" | "trial" | "starter" | "pro" | "unlimited";

export const DAILY_LIMITS: Record<PlanTier, number> = {
  free: 5,
  trial: 15,
  starter: 20,
  pro: 60,
  unlimited: Infinity,
};

// ── AI States ────────────────────────────────────────────────────────────────

export type AIState = "idle" | "listening" | "thinking" | "speaking" | "blocked";

export const STATE_LABELS: Record<AIState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  thinking: "UseLang is thinking...",
  speaking: "UseLang is speaking...",
  blocked: "Limit reached",
};

// ── Training Modes ───────────────────────────────────────────────────────────
// "quick"   — utility: ask how to say a thing, get a crisp answer + coach
// "tutor"   — the real lesson: hands-free back-and-forth conversation
// "drill"   — repeat-after-me: tutor gives a line, user repeats, system scores
// "regular" is the legacy name for "tutor" — kept as alias so old profile data
// keeps working.

export type TrainMode = "quick" | "phrase" | "tutor" | "drill" | "regular";
