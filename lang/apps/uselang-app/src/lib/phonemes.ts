// ── Phoneme pose database ────────────────────────────────────────────────────
// Each entry describes the articulation geometry of a single phoneme as a
// pose that the AnimatedMouth component can morph to. Coordinates are in the
// viewport's 0..1 space — (0,0) is top-left, (1,1) is bottom-right of the
// square SVG, with the mouth cavity running roughly x=[0.2, 0.85], y=[0.44,
// 0.78] when the jaw is closed.
//
// Poses are based on standard IPA articulation charts (place/manner/voicing)
// and tuned by eye so the visual matches how a native speaker's mouth would
// look mid-sound. Not clinical, but faithful enough to coach pronunciation.

export interface PhonemePose {
  /** Back of tongue (dorsum) — velar / palatal contact point. */
  tongueBack: { x: number; y: number };
  /** Middle of tongue (medium). Drives the arch height. */
  tongueMid: { x: number; y: number };
  /** Tongue tip (apex) — where dentals / alveolars happen. */
  tongueTip: { x: number; y: number };
  /** 0 = spread lips, 1 = fully rounded. */
  lipRound: number;
  /** 0 = lips sealed, 1 = wide open. */
  lipOpen: number;
  /** 0 = closed jaw, 1 = wide open. */
  jawOpen: number;
  /** Where the airstream exits. */
  airflow: "oral" | "nasal" | "lateral";
  /** True when vocal cords vibrate. */
  voicing: boolean;
  /** One-line physical cue the learner can act on. */
  hint: string;
  /** IPA symbol if the user wanted to look it up. */
  ipa?: string;
}

// ── Baseline templates (helpers, not exported) ───────────────────────────────

const alveolar = (tip: { x: number; y: number } = { x: 0.27, y: 0.46 }) => ({
  tongueBack: { x: 0.72, y: 0.58 },
  tongueMid: { x: 0.55, y: 0.58 },
  tongueTip: tip,
});
const velar = {
  tongueBack: { x: 0.78, y: 0.46 },
  tongueMid: { x: 0.66, y: 0.48 },
  tongueTip: { x: 0.45, y: 0.62 },
};
const bilabial = {
  tongueBack: { x: 0.72, y: 0.60 },
  tongueMid: { x: 0.55, y: 0.62 },
  tongueTip: { x: 0.40, y: 0.62 },
};
const highFront = {
  tongueBack: { x: 0.65, y: 0.52 },
  tongueMid: { x: 0.48, y: 0.48 },
  tongueTip: { x: 0.32, y: 0.50 },
};
const highBack = {
  tongueBack: { x: 0.80, y: 0.48 },
  tongueMid: { x: 0.68, y: 0.52 },
  tongueTip: { x: 0.50, y: 0.62 },
};
const lowOpen = {
  tongueBack: { x: 0.70, y: 0.68 },
  tongueMid: { x: 0.55, y: 0.70 },
  tongueTip: { x: 0.38, y: 0.68 },
};

// ── Full database ────────────────────────────────────────────────────────────

export const PHONEME_DB: Record<string, PhonemePose> = {
  // ── English vowels ────────────────────────────────────────────────────────
  a: {
    ...lowOpen,
    lipRound: 0, lipOpen: 0.85, jawOpen: 0.85,
    airflow: "oral", voicing: true,
    hint: "Drop the jaw wide, tongue flat and low. Like the doctor's 'ahh'.",
    ipa: "a",
  },
  æ: {
    ...lowOpen,
    tongueMid: { x: 0.50, y: 0.66 },
    lipRound: 0, lipOpen: 0.75, jawOpen: 0.7,
    airflow: "oral", voicing: true,
    hint: "Spread lips slightly, drop the jaw about two-thirds. As in 'cat'.",
    ipa: "æ",
  },
  e: {
    tongueBack: { x: 0.68, y: 0.52 },
    tongueMid: { x: 0.50, y: 0.54 },
    tongueTip: { x: 0.32, y: 0.54 },
    lipRound: 0.05, lipOpen: 0.5, jawOpen: 0.5,
    airflow: "oral", voicing: true,
    hint: "Mid tongue, lips relaxed and slightly spread.",
    ipa: "e",
  },
  i: {
    ...highFront,
    lipRound: 0, lipOpen: 0.28, jawOpen: 0.25,
    airflow: "oral", voicing: true,
    hint: "Tongue high and forward, lips spread like a small smile.",
    ipa: "i",
  },
  o: {
    tongueBack: { x: 0.76, y: 0.56 },
    tongueMid: { x: 0.64, y: 0.56 },
    tongueTip: { x: 0.48, y: 0.60 },
    lipRound: 0.75, lipOpen: 0.5, jawOpen: 0.5,
    airflow: "oral", voicing: true,
    hint: "Round your lips. Tongue sits mid-back.",
    ipa: "o",
  },
  u: {
    ...highBack,
    lipRound: 1, lipOpen: 0.2, jawOpen: 0.2,
    airflow: "oral", voicing: true,
    hint: "Lips tight, like a small whistle. Tongue high and back.",
    ipa: "u",
  },

  // ── French / German front rounded ────────────────────────────────────────
  y: {
    // French "u" as in "tu" — say 'i' but round the lips
    ...highFront,
    lipRound: 1, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: true,
    hint: "Say 'ee' — then round your lips like 'oo' without moving the tongue.",
    ipa: "y",
  },
  ü: {
    ...highFront,
    lipRound: 1, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: true,
    hint: "Say 'ee' — then round your lips like 'oo' without moving the tongue.",
    ipa: "y",
  },
  ø: {
    tongueBack: { x: 0.65, y: 0.54 },
    tongueMid: { x: 0.48, y: 0.54 },
    tongueTip: { x: 0.32, y: 0.54 },
    lipRound: 0.7, lipOpen: 0.4, jawOpen: 0.4,
    airflow: "oral", voicing: true,
    hint: "Say 'eh' with rounded lips, as in French 'peu'.",
    ipa: "ø",
  },

  // Nasal French vowels
  ɑ̃: {
    ...lowOpen,
    lipRound: 0.4, lipOpen: 0.7, jawOpen: 0.7,
    airflow: "nasal", voicing: true,
    hint: "Open 'ah' sent through the nose. Let the soft palate drop.",
    ipa: "ɑ̃",
  },
  ɛ̃: {
    tongueBack: { x: 0.68, y: 0.56 },
    tongueMid: { x: 0.50, y: 0.58 },
    tongueTip: { x: 0.34, y: 0.56 },
    lipRound: 0.2, lipOpen: 0.55, jawOpen: 0.55,
    airflow: "nasal", voicing: true,
    hint: "'eh' spread through the nose. As in French 'un' / 'vin'.",
    ipa: "ɛ̃",
  },

  // ── Consonants ────────────────────────────────────────────────────────────
  t: {
    ...alveolar(),
    lipRound: 0, lipOpen: 0.3, jawOpen: 0.3,
    airflow: "oral", voicing: false,
    hint: "Tap the tongue tip on the ridge behind the upper teeth, release.",
    ipa: "t",
  },
  d: {
    ...alveolar(),
    lipRound: 0, lipOpen: 0.3, jawOpen: 0.3,
    airflow: "oral", voicing: true,
    hint: "Like 't', but let the vocal cords buzz at the same time.",
    ipa: "d",
  },
  n: {
    ...alveolar(),
    lipRound: 0, lipOpen: 0.3, jawOpen: 0.3,
    airflow: "nasal", voicing: true,
    hint: "Tongue presses the ridge, air flows through the nose.",
    ipa: "n",
  },
  l: {
    ...alveolar({ x: 0.24, y: 0.46 }),
    lipRound: 0, lipOpen: 0.35, jawOpen: 0.35,
    airflow: "lateral", voicing: true,
    hint: "Tip touches the ridge; air slides out around the sides.",
    ipa: "l",
  },
  r: {
    // English r — tongue curled back, no contact
    tongueBack: { x: 0.68, y: 0.55 },
    tongueMid: { x: 0.50, y: 0.56 },
    tongueTip: { x: 0.35, y: 0.50 },
    lipRound: 0.25, lipOpen: 0.42, jawOpen: 0.42,
    airflow: "oral", voicing: true,
    hint: "Curl the tongue tip up and slightly back — never touch the roof.",
    ipa: "ɹ",
  },
  // Spanish / Italian rolled r (trill)
  rr: {
    ...alveolar({ x: 0.27, y: 0.47 }),
    lipRound: 0.1, lipOpen: 0.38, jawOpen: 0.38,
    airflow: "oral", voicing: true,
    hint: "Let the tongue tip flutter against the ridge. Start with 'butter' said fast.",
    ipa: "r",
  },
  // French guttural r
  ʁ: {
    tongueBack: { x: 0.80, y: 0.50 },
    tongueMid: { x: 0.65, y: 0.54 },
    tongueTip: { x: 0.46, y: 0.62 },
    lipRound: 0.15, lipOpen: 0.35, jawOpen: 0.35,
    airflow: "oral", voicing: true,
    hint: "Tongue back, vibrate at the uvula — like gargling softly.",
    ipa: "ʁ",
  },

  k: {
    ...velar,
    lipRound: 0, lipOpen: 0.32, jawOpen: 0.32,
    airflow: "oral", voicing: false,
    hint: "Back of tongue touches the soft palate, then releases cleanly.",
    ipa: "k",
  },
  g: {
    ...velar,
    lipRound: 0, lipOpen: 0.32, jawOpen: 0.32,
    airflow: "oral", voicing: true,
    hint: "Like 'k', but buzz the vocal cords through it.",
    ipa: "g",
  },
  ŋ: {
    ...velar,
    lipRound: 0, lipOpen: 0.3, jawOpen: 0.3,
    airflow: "nasal", voicing: true,
    hint: "Back of tongue touches soft palate, air through the nose. As in 'sing'.",
    ipa: "ŋ",
  },

  s: {
    ...alveolar({ x: 0.28, y: 0.49 }),
    lipRound: 0, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: false,
    hint: "Tongue near the ridge, narrow channel — air hisses through.",
    ipa: "s",
  },
  z: {
    ...alveolar({ x: 0.28, y: 0.49 }),
    lipRound: 0, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: true,
    hint: "Like 's', plus voice — a soft buzz.",
    ipa: "z",
  },
  ʃ: {
    tongueBack: { x: 0.68, y: 0.54 },
    tongueMid: { x: 0.50, y: 0.52 },
    tongueTip: { x: 0.36, y: 0.50 },
    lipRound: 0.4, lipOpen: 0.28, jawOpen: 0.28,
    airflow: "oral", voicing: false,
    hint: "Like 'sh'. Tongue pulled back a bit, lips slightly rounded.",
    ipa: "ʃ",
  },
  ʒ: {
    tongueBack: { x: 0.68, y: 0.54 },
    tongueMid: { x: 0.50, y: 0.52 },
    tongueTip: { x: 0.36, y: 0.50 },
    lipRound: 0.4, lipOpen: 0.28, jawOpen: 0.28,
    airflow: "oral", voicing: true,
    hint: "Like 'zh' in 'measure' — voiced version of 'sh'.",
    ipa: "ʒ",
  },
  f: {
    ...bilabial,
    tongueTip: { x: 0.42, y: 0.62 },
    lipRound: 0, lipOpen: 0.15, jawOpen: 0.18,
    airflow: "oral", voicing: false,
    hint: "Upper teeth touch the lower lip, breathe through.",
    ipa: "f",
  },
  v: {
    ...bilabial,
    tongueTip: { x: 0.42, y: 0.62 },
    lipRound: 0, lipOpen: 0.15, jawOpen: 0.18,
    airflow: "oral", voicing: true,
    hint: "Like 'f' but buzz the vocal cords.",
    ipa: "v",
  },
  p: {
    ...bilabial,
    lipRound: 0, lipOpen: 0, jawOpen: 0.1,
    airflow: "oral", voicing: false,
    hint: "Lips sealed. Build a little pressure, then release it in a puff.",
    ipa: "p",
  },
  b: {
    ...bilabial,
    lipRound: 0, lipOpen: 0, jawOpen: 0.1,
    airflow: "oral", voicing: true,
    hint: "Like 'p' but with voice — a soft vibration behind the lips.",
    ipa: "b",
  },
  m: {
    ...bilabial,
    lipRound: 0, lipOpen: 0, jawOpen: 0.1,
    airflow: "nasal", voicing: true,
    hint: "Lips closed, hum through the nose.",
    ipa: "m",
  },

  θ: {
    // English 'th' (unvoiced) as in 'think'
    tongueBack: { x: 0.68, y: 0.58 },
    tongueMid: { x: 0.50, y: 0.56 },
    tongueTip: { x: 0.20, y: 0.50 },
    lipRound: 0, lipOpen: 0.32, jawOpen: 0.32,
    airflow: "oral", voicing: false,
    hint: "Tongue tip between the teeth. Blow air softly, no voice.",
    ipa: "θ",
  },
  ð: {
    tongueBack: { x: 0.68, y: 0.58 },
    tongueMid: { x: 0.50, y: 0.56 },
    tongueTip: { x: 0.20, y: 0.50 },
    lipRound: 0, lipOpen: 0.32, jawOpen: 0.32,
    airflow: "oral", voicing: true,
    hint: "Same as 'th' in 'think' but voiced — the 'th' in 'this'.",
    ipa: "ð",
  },

  // ── Mandarin-specific ─────────────────────────────────────────────────────
  zh: {
    // Retroflex affricate
    tongueBack: { x: 0.60, y: 0.56 },
    tongueMid: { x: 0.45, y: 0.52 },
    tongueTip: { x: 0.33, y: 0.46 },
    lipRound: 0.2, lipOpen: 0.28, jawOpen: 0.28,
    airflow: "oral", voicing: false,
    hint: "Curl the tongue tip up and back until it almost touches the hard palate.",
    ipa: "ʈʂ",
  },
  x: {
    tongueBack: { x: 0.64, y: 0.52 },
    tongueMid: { x: 0.48, y: 0.50 },
    tongueTip: { x: 0.34, y: 0.50 },
    lipRound: 0, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: false,
    hint: "Tongue close to the front of the palate, like 'sh' with a flatter tongue.",
    ipa: "ɕ",
  },

  // ── Japanese-specific ─────────────────────────────────────────────────────
  tsu: {
    ...alveolar({ x: 0.26, y: 0.47 }),
    lipRound: 0.35, lipOpen: 0.22, jawOpen: 0.22,
    airflow: "oral", voicing: false,
    hint: "Start with 't', finish with 'su'. Fast tap, rounded lips.",
    ipa: "tsɯ",
  },
};

// ── Fallback + helpers ───────────────────────────────────────────────────────

const REST: PhonemePose = {
  tongueBack: { x: 0.72, y: 0.60 },
  tongueMid: { x: 0.55, y: 0.62 },
  tongueTip: { x: 0.36, y: 0.58 },
  lipRound: 0.15,
  lipOpen: 0.35,
  jawOpen: 0.35,
  airflow: "oral",
  voicing: true,
  hint: "Relax — this is the neutral rest position.",
};

/** Fetch a phoneme pose, trying a few normalizations before falling back. */
export function getPhoneme(key: string): PhonemePose {
  if (!key) return REST;
  const k = String(key).trim();
  if (PHONEME_DB[k]) return PHONEME_DB[k];
  const lower = k.toLowerCase();
  if (PHONEME_DB[lower]) return PHONEME_DB[lower];
  // Single-letter match on the first character
  const first = lower[0];
  if (PHONEME_DB[first]) return PHONEME_DB[first];
  return REST;
}

export const PHONEME_IDS = Object.keys(PHONEME_DB);
