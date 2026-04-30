// ── Accent regions ───────────────────────────────────────────────────────────
// Curated accent breakdowns per language so the globe can show meaningful
// "where you can speak and what shifts" cards \u2014 not just flags.

export interface AccentRegion {
  flag: string;
  name: string;          // "Paris" / "Quebec" / "Mexico"
  country: string;       // "France" / "Canada" / "Mexico"
  blurb: string;         // 1-line difference the learner will notice
  prestige?: boolean;    // "standard" accent \u2014 usually what coursebooks teach
}

export interface LanguageAccents {
  languageCode: string;
  label: string;
  speakersMillions: number;
  countries: number;
  regions: AccentRegion[];
}

export const ACCENT_REGIONS: Record<string, LanguageAccents> = {
  en: {
    languageCode: "en",
    label: "English",
    speakersMillions: 1500,
    countries: 67,
    regions: [
      { flag: "\ud83c\uddfa\ud83c\uddf8", name: "General American", country: "United States", blurb: "Neutral rhotic r, flat intonation. Default in film & tech.", prestige: true },
      { flag: "\ud83c\uddec\ud83c\udde7", name: "Received Pronunciation", country: "United Kingdom", blurb: "Non-rhotic (r drops at end of words). Clipped, precise vowels." },
      { flag: "\ud83c\udde8\ud83c\udde6", name: "Canadian", country: "Canada", blurb: "Mostly GA but 'out/about' shift, subtle 'eh' tag questions." },
      { flag: "\ud83c\udde6\ud83c\uddfa", name: "Australian", country: "Australia", blurb: "Rising intonation at sentence ends. 'Day' sounds like 'die'." },
      { flag: "\ud83c\uddee\ud83c\uddea", name: "Irish", country: "Ireland", blurb: "Lilting rhythm. 'Th' often becomes 't' or 'd'." },
      { flag: "\ud83c\uddee\ud83c\uddf3", name: "Indian English", country: "India", blurb: "Retroflex consonants, syllable-timed rhythm, /w/ \u2192 /v/." },
    ],
  },

  es: {
    languageCode: "es",
    label: "Spanish",
    speakersMillions: 560,
    countries: 21,
    regions: [
      { flag: "\ud83c\uddea\ud83c\uddf8", name: "Castilian", country: "Spain", blurb: "'c' & 'z' become 'th' (distinci\u00f3n). 'vosotros' for plural 'you'.", prestige: true },
      { flag: "\ud83c\uddf2\ud83c\uddfd", name: "Mexican", country: "Mexico", blurb: "Clear, neutral \u2014 the \"default\" Latin American accent in media." },
      { flag: "\ud83c\udde6\ud83c\uddf7", name: "Rioplatense", country: "Argentina", blurb: "'ll' & 'y' become 'sh'. Italian-style intonation." },
      { flag: "\ud83c\udde8\ud83c\uddf4", name: "Colombian (Bogot\u00e1)", country: "Colombia", blurb: "Considered very clear and easy for learners." },
      { flag: "\ud83c\udde8\ud83c\uddfa", name: "Caribbean", country: "Cuba / PR / DR", blurb: "Fast. End-of-syllable 's' often drops. Aspirated consonants." },
    ],
  },

  fr: {
    languageCode: "fr",
    label: "French",
    speakersMillions: 310,
    countries: 29,
    regions: [
      { flag: "\ud83c\uddeb\ud83c\uddf7", name: "M\u00e9tropolitain", country: "France", blurb: "Standard Parisian. Nasal vowels, silent end consonants.", prestige: true },
      { flag: "\ud83c\udde8\ud83c\udde6", name: "Qu\u00e9b\u00e9cois", country: "Canada (Quebec)", blurb: "Tighter nasals, 'tu' often affricated as 'tsu'. Old-French vocab survives." },
      { flag: "\ud83c\udde7\ud83c\uddea", name: "Belgian", country: "Belgium", blurb: "'septante' (70) and 'nonante' (90) instead of the French forms." },
      { flag: "\ud83c\udded\ud83c\uddf9", name: "Haitian", country: "Haiti", blurb: "Influenced by Haitian Creole; softer rhythm." },
      { flag: "\ud83c\uddf8\ud83c\uddf3", name: "West African", country: "Senegal / CIV", blurb: "Clearer r, faster cadence, influenced by Wolof/Bambara rhythm." },
    ],
  },

  de: {
    languageCode: "de",
    label: "German",
    speakersMillions: 95,
    countries: 6,
    regions: [
      { flag: "\ud83c\udde9\ud83c\uddea", name: "Hochdeutsch", country: "Germany", blurb: "Standard as heard on ARD news.", prestige: true },
      { flag: "\ud83c\udde6\ud83c\uddf9", name: "Austrian", country: "Austria", blurb: "Softer 'ch'. Vienna-isms: 'Servus' for hello, 'Gr\u00fc\u00df Gott' for good day." },
      { flag: "\ud83c\udde8\ud83c\udded", name: "Swiss German", country: "Switzerland", blurb: "Very distinct \u2014 many Germans can't follow it. Diglossic with Hochdeutsch." },
      { flag: "\ud83c\udde9\ud83c\uddea", name: "Bavarian", country: "Germany (Bayern)", blurb: "Strong regional accent. 'Gr\u00fc\u00df Gott', 'Serv\u1e22s'." },
    ],
  },

  it: {
    languageCode: "it",
    label: "Italian",
    speakersMillions: 68,
    countries: 4,
    regions: [
      { flag: "\ud83c\uddee\ud83c\uddf9", name: "Standard (Florentine)", country: "Italy", blurb: "The model Italian taught abroad.", prestige: true },
      { flag: "\ud83c\uddee\ud83c\uddf9", name: "Roman", country: "Italy (Rome)", blurb: "Open vowels, dropped end-vowels, 'er' articles." },
      { flag: "\ud83c\uddee\ud83c\uddf9", name: "Neapolitan", country: "Italy (Naples)", blurb: "Strong dialect continuum. Lyrical, musical cadence." },
      { flag: "\ud83c\udde8\ud83c\udded", name: "Swiss Italian", country: "Switzerland (Ticino)", blurb: "Close to standard but slower, more formal." },
    ],
  },

  pt: {
    languageCode: "pt",
    label: "Portuguese",
    speakersMillions: 260,
    countries: 10,
    regions: [
      { flag: "\ud83c\uddf5\ud83c\uddf9", name: "European", country: "Portugal", blurb: "Closed vowels, dropped unstressed syllables. Harder for learners." },
      { flag: "\ud83c\udde7\ud83c\uddf7", name: "Brazilian", country: "Brazil", blurb: "Open vowels, slower, softer. The most-taught variant globally.", prestige: true },
      { flag: "\ud83c\udde6\ud83c\uddf4", name: "Angolan", country: "Angola", blurb: "Close to European but clearer enunciation." },
    ],
  },

  ja: {
    languageCode: "ja",
    label: "Japanese",
    speakersMillions: 125,
    countries: 1,
    regions: [
      { flag: "\ud83c\uddef\ud83c\uddf5", name: "Standard (Tokyo)", country: "Japan", blurb: "The textbook dialect.", prestige: true },
      { flag: "\ud83c\uddef\ud83c\uddf5", name: "Kansai-ben", country: "Japan (Osaka/Kyoto)", blurb: "Different pitch accent, '-ya' copula, 'akan' for no." },
    ],
  },

  zh: {
    languageCode: "zh",
    label: "Chinese (Mandarin)",
    speakersMillions: 1100,
    countries: 5,
    regions: [
      { flag: "\ud83c\udde8\ud83c\uddf3", name: "P\u01d4t\u014dnghu\u00e0 (Beijing)", country: "China", blurb: "Standard Mandarin. Strong retroflex 'er' suffix.", prestige: true },
      { flag: "\ud83c\uddf9\ud83c\uddfc", name: "Taiwanese Mandarin", country: "Taiwan", blurb: "Softer retroflexes, less 'r' suffixing. Uses traditional characters." },
      { flag: "\ud83c\uddf8\ud83c\uddec", name: "Singaporean", country: "Singapore", blurb: "Tones flatten. Code-mixed with English and Hokkien." },
    ],
  },

  nl: {
    languageCode: "nl",
    label: "Dutch",
    speakersMillions: 25,
    countries: 3,
    regions: [
      { flag: "\ud83c\uddf3\ud83c\uddf1", name: "Netherlandic", country: "Netherlands", blurb: "Harder 'g' (guttural). Standard on NOS news.", prestige: true },
      { flag: "\ud83c\udde7\ud83c\uddea", name: "Flemish", country: "Belgium", blurb: "Softer 'g', clearer vowels. Often considered prettier-sounding." },
    ],
  },

  hi: {
    languageCode: "hi",
    label: "Hindi",
    speakersMillions: 600,
    countries: 4,
    regions: [
      { flag: "\ud83c\uddee\ud83c\uddf3", name: "Standard (Delhi/Doordarshan)", country: "India", blurb: "The news-anchor register.", prestige: true },
      { flag: "\ud83c\uddee\ud83c\uddf3", name: "Mumbai/Bollywood", country: "India", blurb: "Film Hindi \u2014 heavy English code-switching, softer." },
    ],
  },

  ar: {
    languageCode: "ar",
    label: "Arabic",
    speakersMillions: 420,
    countries: 22,
    regions: [
      { flag: "\ud83c\uddf8\ud83c\udde6", name: "Modern Standard", country: "Pan-Arab", blurb: "The written register. Used for news and formal settings.", prestige: true },
      { flag: "\ud83c\uddea\ud83c\uddec", name: "Egyptian", country: "Egypt", blurb: "Most-understood spoken variety. 'j' becomes hard 'g'." },
      { flag: "\ud83c\uddf1\ud83c\udde7", name: "Levantine", country: "Lebanon / Syria / Jordan", blurb: "Lighter, musical. 'q' often drops to glottal stop." },
      { flag: "\ud83c\uddf2\ud83c\udde6", name: "Maghrebi", country: "Morocco / Algeria / Tunisia", blurb: "Heavy French/Berber influence. Hardest for outsiders." },
    ],
  },
};

/**
 * Get accent data for a language, or a conservative default if unknown.
 */
export function getAccents(languageCode: string): LanguageAccents | null {
  return ACCENT_REGIONS[languageCode] ?? null;
}
