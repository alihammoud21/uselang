// ── Dev-mode Gemma stub ─────────────────────────────────────────────────────
//
// Used when the real ExecuTorch Gemma weights aren't bundled (assets/models
// /gemma/ is empty in dev). Returns plausible TutorResponse-shaped JSON so
// every offline-only feature (Quick Mode, LiveLang, lesson coaching) keeps
// working end-to-end while the real model is being staged.
//
// Hard rules:
//   • Pure local. No fetch, no API keys, no network.
//   • Never returns empty output.
//   • Tolerates any phrase — curated responses for the common ones, a
//     reasonable fallback for everything else.
//   • Output shape mirrors `coerceResponse` in gemma-tutor.ts so the UI never
//     sees a malformed payload.
//
// When the real model.pte lands and `GEMMA_BUNDLE.bundled === true`, the
// engine bypasses this stub automatically — no callsite changes required.

import type { ChatMessage } from "./gemma-engine";

// ── Known languages ────────────────────────────────────────────────────────
// We only need readable names + ISO codes for the stub's curated entries.
// Anything else falls through to the generic-translation branch.

const LANG_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Mandarin",
  ar: "Arabic",
  hi: "Hindi",
  nl: "Dutch",
};

function labelFor(code?: string): string {
  if (!code) return "the target language";
  return LANG_LABELS[code] || LANG_LABELS[code.slice(0, 2)] || code;
}

// ── Curated entries ────────────────────────────────────────────────────────
// Map of (intent → target lang → coaching data). Intent matching is fuzzy:
// we lowercase, strip punctuation, and check substring or keyword.

interface StubChunk {
  target: string;
  english: string;
  phonetic: string;
  tip: string;
}

interface StubEntry {
  phrase: string;
  phonetic: string;
  meaning: string;
  context: string;
  pronunciationTip: string;
  articulation: {
    tonguePlacement: string;
    lipShape: string;
    airflow: string;
    stress: string;
  };
  chunks?: StubChunk[];
}

type LangMap = Record<string, StubEntry>;

const CURATED: { match: (s: string) => boolean; byLang: LangMap }[] = [
  // hello / hi
  {
    match: (s) => /\bhello\b|\bhi\b|greet/i.test(s),
    byLang: {
      es: {
        phrase: "Hola",
        phonetic: "OH-lah",
        meaning: "hello",
        context: "Casual greeting that works any time of day.",
        pronunciationTip: "The 'h' is silent; lead with a clear 'O'.",
        articulation: {
          tonguePlacement: "Tongue rests low and forward; 'l' touches just behind the teeth.",
          lipShape: "Round the lips slightly for the 'O', open for 'ah'.",
          airflow: "Voiced and steady — no aspiration on the 'h'.",
          stress: "Stress the first syllable: OH-lah.",
        },
        chunks: [{ target: "Hola", english: "hello", phonetic: "OH-lah", tip: "The 'h' is silent" }],
      },
      zh: {
        phrase: "你好",
        phonetic: "nǐ hǎo",
        meaning: "hello",
        context: "Universal Mandarin greeting, polite and friendly.",
        pronunciationTip: "Say it like: NEE how. Both syllables use third tone — let your voice dip then lift.",
        articulation: {
          tonguePlacement: "Tongue tip down, mid for 'nǐ'; tongue mid for 'hǎo'.",
          lipShape: "Lips relaxed for 'nǐ', then open into 'hǎo'.",
          airflow: "Voiced, light. No aspiration on the 'h'.",
          stress: "Both syllables drop and rise (third tone).",
        },
        chunks: [
          { target: "你", english: "you", phonetic: "nǐ", tip: "Third tone: dip your voice down low, then let it rise — like asking 'huh?'" },
          { target: "好", english: "good", phonetic: "hǎo", tip: "Third tone: start low and rise. Round your lips slightly for the 'ao' — like saying 'how' without the 'h'" },
        ],
      },
      fr: {
        phrase: "Bonjour",
        phonetic: "bohn-ZHOOR",
        meaning: "hello",
        context: "Standard greeting from morning until evening.",
        pronunciationTip: "Nasalize the 'on' — air through the nose, mouth slightly open.",
        articulation: {
          tonguePlacement: "Tongue back for 'on'; tip up for 'jour'.",
          lipShape: "Round and forward for 'jour', as if blowing.",
          airflow: "Soft, voiced; the 'r' is at the back of the throat.",
          stress: "Light stress on the second syllable.",
        },
        chunks: [
          { target: "Bon", english: "good", phonetic: "bohn", tip: "Nasal 'on' sound" },
          { target: "jour", english: "day", phonetic: "ZHOOR", tip: "Soft j like 'zh' in measure" },
        ],
      },
      de: {
        phrase: "Hallo",
        phonetic: "HAH-loh",
        meaning: "hello",
        context: "Casual all-day greeting.",
        pronunciationTip: "Crisp 'h', then a relaxed 'l'.",
        articulation: {
          tonguePlacement: "Tongue mid for 'h', tip up for 'l'.",
          lipShape: "Open for 'a', round slightly for 'o'.",
          airflow: "Voiced and even.",
          stress: "Stress the first syllable.",
        },
      },
      it: {
        phrase: "Ciao",
        phonetic: "CHOW",
        meaning: "hi / bye",
        context: "Casual hello and goodbye between friends.",
        pronunciationTip: "Pronounce like the English word 'chow'.",
        articulation: {
          tonguePlacement: "Tongue blade against the roof for 'ch'.",
          lipShape: "Open and round into 'ow'.",
          airflow: "Quick burst on 'ch', voiced 'ow'.",
          stress: "Single stressed syllable.",
        },
      },
    },
  },
  // thank you
  {
    match: (s) => /\bthank\b|\bthanks\b|grateful/i.test(s),
    byLang: {
      es: {
        phrase: "Gracias",
        phonetic: "GRAH-syahs",
        meaning: "thank you",
        context: "Standard thank-you, fits any context.",
        pronunciationTip: "Roll the 'r' lightly; the 'ci' is soft.",
        articulation: {
          tonguePlacement: "Tongue tap behind the teeth for 'r'.",
          lipShape: "Open and relaxed.",
          airflow: "Voiced, soft on 'ci'.",
          stress: "GRA-cias — first syllable.",
        },
        chunks: [
          { target: "Gracias", english: "thank you", phonetic: "GRAH-syahs", tip: "Roll the r lightly" },
        ],
      },
      zh: {
        phrase: "谢谢",
        phonetic: "xièxiè",
        meaning: "thank you",
        context: "Casual or formal — works either way.",
        pronunciationTip: "Say it like: SHYEH-shyeh. Both syllables fourth tone — quick, sharp drop.",
        articulation: {
          tonguePlacement: "Tongue blade near the alveolar ridge.",
          lipShape: "Spread slightly, like a small smile.",
          airflow: "Light aspiration on 'sh'.",
          stress: "Both syllables sharp falling tone.",
        },
        chunks: [
          { target: "谢", english: "thank", phonetic: "xiè", tip: "The 'x' sounds like 'sh' in 'she' but sharper — press tongue flat behind front teeth. Fourth tone: drop sharply like saying 'No!'" },
          { target: "谢", english: "thank (repeated)", phonetic: "xiè", tip: "Same sound again — say it twice for politeness, like 'thanks-thanks'" },
        ],
      },
      fr: {
        phrase: "Merci",
        phonetic: "mehr-SEE",
        meaning: "thank you",
        context: "Universal French thank-you.",
        pronunciationTip: "Soft 'r' at the back, clean 'ee'.",
        articulation: {
          tonguePlacement: "Back of tongue for 'r'; tip down for 'ee'.",
          lipShape: "Spread for 'ee'.",
          airflow: "Voiced and smooth.",
          stress: "Stress on 'SEE'.",
        },
        chunks: [
          { target: "Merci", english: "thank you", phonetic: "mehr-SEE", tip: "Stress the second syllable" },
        ],
      },
      de: {
        phrase: "Danke",
        phonetic: "DAHN-keh",
        meaning: "thank you",
        context: "Standard thank-you.",
        pronunciationTip: "Crisp consonants, short 'e' at the end.",
        articulation: {
          tonguePlacement: "Tongue tip for 'd' and 'k'.",
          lipShape: "Slightly open and relaxed.",
          airflow: "Voiced, with a soft release.",
          stress: "First syllable.",
        },
      },
    },
  },
  // where is the bathroom / restroom
  {
    match: (s) => /bathroom|restroom|toilet|where.*(toilet|bathroom)/i.test(s),
    byLang: {
      es: {
        phrase: "¿Dónde está el baño?",
        phonetic: "DOHN-deh es-TAH el BAH-nyo",
        meaning: "Where is the bathroom?",
        context: "Polite, works in any restaurant or café.",
        pronunciationTip: "The 'ñ' is a quick 'ny' as in 'canyon'.",
        articulation: {
          tonguePlacement: "Tongue middle pushes up for 'ñ'.",
          lipShape: "Open through 'ah' vowels.",
          airflow: "Voiced and even.",
          stress: "Stress: DOHN-deh, es-TAH, BAH-nyo.",
        },
        chunks: [
          { target: "¿Dónde", english: "where", phonetic: "DOHN-deh", tip: "Question word" },
          { target: "está", english: "is", phonetic: "es-TAH", tip: "Verb 'to be' for location" },
          { target: "el", english: "the", phonetic: "el", tip: "Masculine article" },
          { target: "baño?", english: "bathroom", phonetic: "BAH-nyo", tip: "ñ sounds like 'ny' in canyon" },
        ],
      },
      zh: {
        phrase: "洗手间在哪里",
        phonetic: "xǐshǒujiān zài nǎlǐ",
        meaning: "Where is the bathroom?",
        context: "Polite — works in restaurants, shops, and on the street.",
        pronunciationTip: "Say it like: shee-show-jyen zye nah-lee.",
        articulation: {
          tonguePlacement: "Tongue blade up for 'sh'; tip down for 'lǐ'.",
          lipShape: "Spread and relaxed across the whole phrase.",
          airflow: "Voiced; light burst on the initial 'x'.",
          stress: "Tones 3-3-1 / 4-3-3 — third tones dip then rise.",
        },
        chunks: [
          { target: "洗手间", english: "bathroom", phonetic: "xǐshǒujiān", tip: "Three words: 'shee-show-jyen'. The 'x' is like 'sh' but sharper. Literally means 'wash-hand-room'" },
          { target: "在", english: "is at", phonetic: "zài", tip: "Fourth tone — drop your voice sharply, like saying 'There!' while pointing" },
          { target: "哪里", english: "where", phonetic: "nǎlǐ", tip: "Both third tone: dip low then rise, dip low then rise — like a gentle question" },
        ],
      },
      fr: {
        phrase: "Où sont les toilettes ?",
        phonetic: "OO sohn lay twa-LET",
        meaning: "Where is the bathroom?",
        context: "Always plural in French.",
        pronunciationTip: "Nasal 'on' in 'sont'; clear 'ay' in 'les'.",
        articulation: {
          tonguePlacement: "Tongue back for 'on'.",
          lipShape: "Round for 'OO', spread for 'ay'.",
          airflow: "Light, voiced.",
          stress: "Final syllable: twa-LET.",
        },
        chunks: [
          { target: "Où", english: "where", phonetic: "OO", tip: "Round lips" },
          { target: "sont", english: "are", phonetic: "sohn", tip: "Nasal 'on' sound" },
          { target: "les", english: "the (plural)", phonetic: "lay", tip: "Plural article" },
          { target: "toilettes", english: "bathrooms", phonetic: "twa-LET", tip: "Always plural in French" },
        ],
      },
    },
  },
  // i want / i'd like / i need — BARE intent only.
  // Anything with an object ("I want coffee", "I want to go to the mall")
  // must fall through to either a more specific curated entry below or to
  // the verb+noun composer, which will produce a real translated phrase
  // instead of the sentence-starter "我要…".
  {
    match: (s) => /^\s*i\s+(?:want|need|'?d\s+like)\s*[?.!]?\s*$/i.test(s),
    byLang: {
      es: {
        phrase: "Quiero…",
        phonetic: "kee-EH-roh",
        meaning: "I want…",
        context: "Use this with any food, drink, or item.",
        pronunciationTip: "Trill the 'r' lightly between vowels.",
        articulation: {
          tonguePlacement: "Tongue tap on the alveolar ridge for 'r'.",
          lipShape: "Spread for 'ee', round for 'oh'.",
          airflow: "Voiced.",
          stress: "kee-EH-roh — middle syllable.",
        },
      },
      zh: {
        phrase: "我要…",
        phonetic: "WOH yow",
        meaning: "I want…",
        context: "Direct — fine in restaurants and shops.",
        pronunciationTip: "Both third tone, then mark the noun after.",
        articulation: {
          tonguePlacement: "Tongue mid, low.",
          lipShape: "Round, then open.",
          airflow: "Voiced and steady.",
          stress: "Dip-and-rise on both syllables.",
        },
      },
    },
  },
  // ask for directions
  {
    match: (s) => /direction|how to get|where is .* street|find .* (museum|station|airport)/i.test(s),
    byLang: {
      es: {
        phrase: "¿Cómo llego a…?",
        phonetic: "KOH-moh YEH-goh ah",
        meaning: "How do I get to…?",
        context: "Polite way to ask for directions to anywhere.",
        pronunciationTip: "Double 'l' in 'llego' sounds like English 'y'.",
        articulation: {
          tonguePlacement: "Tongue middle for 'll'.",
          lipShape: "Open for 'ah' vowels.",
          airflow: "Voiced.",
          stress: "KOH-moh, YEH-goh.",
        },
        chunks: [
          { target: "¿Cómo", english: "how", phonetic: "KOH-moh", tip: "Question word" },
          { target: "llego", english: "do I get", phonetic: "YEH-goh", tip: "Double l = y sound" },
          { target: "a…?", english: "to…?", phonetic: "ah", tip: "Add destination after" },
        ],
      },
      zh: {
        phrase: "请问怎么走",
        phonetic: "CHING wen ZUH-mma DZOH",
        meaning: "Excuse me, how do I get there?",
        context: "Polite — start with this when stopping a stranger.",
        pronunciationTip: "Soften 'q' to a 'ch'; the 'z' in 'zou' is unaspirated.",
        articulation: {
          tonguePlacement: "Tongue blade for 'q', tip up for 'z'.",
          lipShape: "Spread for 'i', round for 'ou'.",
          airflow: "Light aspiration on 'q'.",
          stress: "Tone pattern 3-4 / 3-1 / 3.",
        },
        chunks: [
          { target: "请问", english: "excuse me", phonetic: "qǐng wèn", tip: "The 'q' sounds like 'ch' in 'cheese' — tongue flat behind teeth. Third tone then fourth tone" },
          { target: "怎么", english: "how", phonetic: "zěnme", tip: "The 'z' is like 'dz' — tongue touches behind top teeth briefly. Say 'dzun-muh'" },
          { target: "走", english: "go / walk", phonetic: "zǒu", tip: "Third tone: voice goes down then up. Rhymes with 'go' but starts with a 'dz' sound" },
        ],
      },
    },
  },
  // order food at a restaurant
  {
    match: (s) => /order .*(food|meal)|at a restaurant|menu/i.test(s),
    byLang: {
      es: {
        phrase: "Quisiera ordenar, por favor.",
        phonetic: "kee-SYEH-rah or-deh-NAR pohr fah-VOR",
        meaning: "I'd like to order, please.",
        context: "Polite opener at any restaurant.",
        pronunciationTip: "Stress the second syllable of each long word.",
        articulation: {
          tonguePlacement: "Tongue taps for 'r' between vowels.",
          lipShape: "Open through the long 'ah' sounds.",
          airflow: "Voiced and smooth.",
          stress: "kee-SYEH-rah, or-deh-NAR.",
        },
        chunks: [
          { target: "Quisiera", english: "I would like", phonetic: "kee-SYEH-rah", tip: "Polite form of 'querer'" },
          { target: "ordenar", english: "to order", phonetic: "or-deh-NAR", tip: "Stress the last syllable" },
          { target: "por favor", english: "please", phonetic: "pohr fah-VOR", tip: "Always polite to add" },
        ],
      },
      zh: {
        phrase: "我要点菜",
        phonetic: "woh YOW dyen TSAI",
        meaning: "I'd like to order.",
        context: "Direct and clear — say this to your server.",
        pronunciationTip: "The 'c' in 'cai' is a sharp 'ts'.",
        articulation: {
          tonguePlacement: "Tongue tip near upper teeth for 'c'.",
          lipShape: "Slightly spread.",
          airflow: "Aspirated 'ts' burst.",
          stress: "Tones: 3-4-3-4.",
        },
        chunks: [
          { target: "我", english: "I", phonetic: "wǒ", tip: "Third tone: say 'woh' and let your voice dip down then come back up" },
          { target: "要", english: "want to", phonetic: "yào", tip: "Fourth tone: say 'yow' and drop your voice sharply — like a firm command" },
          { target: "点菜", english: "order food", phonetic: "diǎn cài", tip: "dyen-tsai. The 'c' in cài sounds like 'ts' — tongue tip behind top teeth, blow a puff of air" },
        ],
      },
    },
  },
  // introduce yourself
  {
    match: (s) => /introduce.*self|my name is|self-?introduction/i.test(s),
    byLang: {
      es: {
        phrase: "Me llamo…",
        phonetic: "may YAH-moh",
        meaning: "My name is…",
        context: "Add your name after — works in any introduction.",
        pronunciationTip: "Double 'l' is a 'y' sound; close with a clean 'oh'.",
        articulation: {
          tonguePlacement: "Tongue middle for 'll'.",
          lipShape: "Open for 'ah', round for 'oh'.",
          airflow: "Voiced.",
          stress: "may YAH-moh.",
        },
        chunks: [
          { target: "Me", english: "myself", phonetic: "may", tip: "Reflexive pronoun" },
          { target: "llamo", english: "I am called", phonetic: "YAH-moh", tip: "Double 'l' = 'y' sound" },
          { target: "…", english: "(your name)", phonetic: "", tip: "Add your name here" },
        ],
      },
      zh: {
        phrase: "我叫…",
        phonetic: "WOH JYOW",
        meaning: "I am called…",
        context: "Add your name after this.",
        pronunciationTip: "The 'j' is closer to 'jy' than English 'j'.",
        articulation: {
          tonguePlacement: "Tongue blade pressed up for 'j'.",
          lipShape: "Spread, then open.",
          airflow: "Voiced, no burst.",
          stress: "Tones: 3-4.",
        },
        chunks: [
          { target: "我", english: "I", phonetic: "wǒ", tip: "Third tone: say 'woh' with your voice dipping down then rising — like you're unsure" },
          { target: "叫", english: "am called", phonetic: "jiào", tip: "The 'j' is like 'j' in 'jeep' but softer — tongue behind front teeth. Fourth tone: drop sharply" },
          { target: "…", english: "(your name)", phonetic: "", tip: "Just say your name normally here" },
        ],
      },
    },
  },
  // I love pizza — exact spec example. Curated wins over the generic
  // verb+noun composition so we can hand-craft the natural articulation.
  {
    match: (s) => /\bi\s+(?:really\s+)?love\s+pizza\b/i.test(s),
    byLang: {
      zh: {
        phrase: "我喜欢披萨",
        phonetic: "wǒ xǐhuān pīsà",
        meaning: "I like / love pizza.",
        context: "Casual — use this when telling someone your food preference.",
        pronunciationTip: "Say it like: woh shee-hwahn pee-sah.",
        articulation: {
          tonguePlacement: "Tongue tip down for 'wǒ'; blade up for 'xǐ'.",
          lipShape: "Round for 'wǒ', spread for 'xǐ', open for 'sà'.",
          airflow: "Voiced; light aspiration on 'p'.",
          stress: "Tones 3-3-1 / 1-4 — third tones dip-and-rise.",
        },
        chunks: [
          { target: "我", english: "I", phonetic: "wǒ", tip: "Third tone: say 'woh' — voice dips down, then rises back up" },
          { target: "喜欢", english: "like / love", phonetic: "xǐhuān", tip: "The 'x' is like 'sh' in 'she' but sharper. 'shee-hwahn' — third tone then first (high flat)" },
          { target: "披萨", english: "pizza", phonetic: "pīsà", tip: "Just like English 'pizza' but flatter: 'pee-sah'. First tone then fourth tone" },
        ],
      },
      es: {
        phrase: "Me encanta la pizza",
        phonetic: "meh en-KAHN-tah lah PEET-sah",
        meaning: "I love pizza.",
        context: "Casual — perfect for talking about a favorite food.",
        pronunciationTip: "'Encanta' is stronger than 'gusta' — closer to 'I adore'.",
        articulation: {
          tonguePlacement: "Tongue middle for 'n'; tap for the soft 'r' sounds.",
          lipShape: "Open through 'ah' vowels.",
          airflow: "Voiced and steady.",
          stress: "Stress: en-KAHN-tah.",
        },
        chunks: [
          { target: "Me", english: "to me", phonetic: "meh", tip: "Indirect object" },
          { target: "encanta", english: "enchants / I love", phonetic: "en-KAHN-tah", tip: "Stronger than gusta" },
          { target: "la", english: "the", phonetic: "lah", tip: "Feminine article" },
          { target: "pizza", english: "pizza", phonetic: "PEET-sah", tip: "Same word" },
        ],
      },
      fr: {
        phrase: "J'adore la pizza",
        phonetic: "zha-DOR lah peed-ZAH",
        meaning: "I love pizza.",
        context: "Strong, casual — used the same way as English 'I love it'.",
        pronunciationTip: "Soft 'j' like 'zh' in measure; back 'r' in 'adore'.",
        articulation: {
          tonguePlacement: "Back of tongue for the French 'r'.",
          lipShape: "Slightly forward for 'j', open for 'ah'.",
          airflow: "Voiced.",
          stress: "Stress: zha-DOR.",
        },
        chunks: [
          { target: "J'", english: "I", phonetic: "zhuh", tip: "Contracted from 'Je'" },
          { target: "adore", english: "love / adore", phonetic: "ah-DOR", tip: "Back-of-throat r" },
          { target: "la", english: "the", phonetic: "lah", tip: "Feminine article" },
          { target: "pizza", english: "pizza", phonetic: "peed-ZAH", tip: "French pronunciation" },
        ],
      },
      ja: {
        phrase: "私はピザが大好きです",
        phonetic: "watashi wa piza ga daisuki desu",
        meaning: "I love pizza.",
        context: "Polite — use 'daisuki' (大好き) for strong liking.",
        pronunciationTip: "Say it like: wah-tah-shee wah pee-zah gah dye-skee dess.",
        articulation: {
          tonguePlacement: "Tongue tip up for 't'; mid for 'k'.",
          lipShape: "Spread, relaxed.",
          airflow: "Voiced; flatten the final 'desu'.",
          stress: "Even pitch — Japanese is mostly flat.",
        },
      },
    },
  },
  // I want to go to the kitchen — exact spec example.
  {
    match: (s) =>
      /\bi\s*(?:'?d\s+like|want|would\s+like)\s+to\s+go\s+to\s+(?:the\s+)?kitchen\b/i.test(s),
    byLang: {
      zh: {
        phrase: "我想去厨房",
        phonetic: "wǒ xiǎng qù chúfáng",
        meaning: "I want to go to the kitchen.",
        context: "Casual — use at home or to a host.",
        pronunciationTip: "Say it like: woh shyahng chyoo choo-fahng.",
        articulation: {
          tonguePlacement: "Tongue blade up for 'q' in 'qù'.",
          lipShape: "Round for 'qù'; spread for 'xiǎng'.",
          airflow: "Light burst on 'q'; voiced through 'fáng'.",
          stress: "Tones 3-3-4 / 2-2.",
        },
      },
      es: {
        phrase: "Quiero ir a la cocina",
        phonetic: "kee-EH-ro eer ah lah ko-SEE-nah",
        meaning: "I want to go to the kitchen.",
        context: "Direct and clear at home or in a restaurant.",
        pronunciationTip: "'Ir a' blends to 'EE-rah'.",
        articulation: {
          tonguePlacement: "Tongue tap for 'r' in 'quiero'.",
          lipShape: "Spread for 'ee'; open for 'ah'.",
          airflow: "Voiced and smooth.",
          stress: "kee-EH-ro, ko-SEE-nah.",
        },
      },
    },
  },
  // can you take me to X / please take me to X / take me to the train station, etc.
  {
    match: (s) =>
      /(?:can\s+you\s+|please\s+)?take\s+me\s+to\s+(?:the\s+)?train\s+station/i.test(s)
      || /(?:can\s+you\s+tell|how\s+do\s+I\s+get\s+|how\s+to\s+get\s+).*train\s+station/i.test(s),
    byLang: {
      zh: {
        phrase: "请带我去火车站",
        phonetic: "qǐng dài wǒ qù huǒchēzhàn",
        meaning: "Please take me to the train station.",
        context: "Say this to a taxi driver or someone helping you navigate.",
        pronunciationTip: "Say it like: cheeng die woh chyoo hwoh-chuh-jahn.",
        articulation: {
          tonguePlacement: "The 'q' is like 'ch' in cheese — tongue flat behind front teeth.",
          lipShape: "Spread for 'q'; open for 'ai'; round for 'uo'.",
          airflow: "Light aspiration on 'q' and 'ch'.",
          stress: "Tones 3-4-3-4 / 3-1-4.",
        },
        chunks: [
          { target: "请", english: "please", phonetic: "qǐng", tip: "The 'q' sounds like 'ch' in 'cheese'. Third tone: voice dips then rises" },
          { target: "带我", english: "take me", phonetic: "dài wǒ", tip: "dài = fourth tone, drop sharply. wǒ = third tone, dip and rise" },
          { target: "去", english: "to / go to", phonetic: "qù", tip: "Fourth tone: drop sharply. Lips round forward" },
          { target: "火车站", english: "train station", phonetic: "huǒchēzhàn", tip: "hwoh-chuh-jahn. Literally: fire-car-station" },
        ],
      },
      es: {
        phrase: "¿Puede llevarme a la estación de tren?",
        phonetic: "PWEH-deh yeh-VAR-meh ah lah es-tah-SYON deh trehn",
        meaning: "Can you take me to the train station?",
        context: "Polite request for a taxi driver or anyone offering help.",
        pronunciationTip: "'Ll' sounds like English 'y'; stress the verb.",
        articulation: {
          tonguePlacement: "Tongue middle for 'll'; tap for 'r' in tren.",
          lipShape: "Open through 'ah' vowels.",
          airflow: "Voiced and steady.",
          stress: "PWEH-deh, yeh-VAR-meh, es-tah-SYON.",
        },
        chunks: [
          { target: "¿Puede", english: "Can you", phonetic: "PWEH-deh", tip: "From 'poder' (can)" },
          { target: "llevarme", english: "take me", phonetic: "yeh-VAR-meh", tip: "Double ll = y sound" },
          { target: "a la", english: "to the", phonetic: "ah lah", tip: "Feminine article" },
          { target: "estación de tren", english: "train station", phonetic: "es-tah-SYON deh trehn", tip: "Stress the last syllable of estación" },
        ],
      },
      fr: {
        phrase: "Pouvez-vous m'emmener à la gare ?",
        phonetic: "poo-VAY voo mam-NAY ah lah GAR",
        meaning: "Can you take me to the train station?",
        context: "Polite — use this with a taxi or asking a local for help.",
        pronunciationTip: "Silent 's' in 'vous'; back 'r' in 'gare'.",
        articulation: {
          tonguePlacement: "Back of tongue for 'r' in gare.",
          lipShape: "Round for 'ou'; relaxed open for 'ah'.",
          airflow: "Soft and voiced.",
          stress: "poo-VAY voo mam-NAY ah lah GAR.",
        },
        chunks: [
          { target: "Pouvez-vous", english: "Can you", phonetic: "poo-VAY voo", tip: "Formal 'can you' — polite register" },
          { target: "m'emmener", english: "take me", phonetic: "mam-NAY", tip: "Contracted 'me emmener'" },
          { target: "à la gare", english: "to the train station", phonetic: "ah lah GAR", tip: "Gare rhymes with 'far' but with a French r" },
        ],
      },
    },
  },
  // take me to the airport / I need to get to the airport
  {
    match: (s) =>
      /(?:can\s+you\s+|please\s+)?take\s+me\s+to\s+(?:the\s+)?airport/i.test(s)
      || /(?:need\s+to\s+get\s+to|get\s+to)\s+(?:the\s+)?airport/i.test(s),
    byLang: {
      zh: {
        phrase: "请带我去机场",
        phonetic: "qǐng dài wǒ qù jīchǎng",
        meaning: "Please take me to the airport.",
        context: "Essential phrase for taxi rides to the airport.",
        pronunciationTip: "Say it like: cheeng die woh chyoo jee-chahng.",
        articulation: {
          tonguePlacement: "The 'j' is like 'jee' — tongue flat behind front teeth.",
          lipShape: "Spread for 'j'; open for 'ch'.",
          airflow: "No aspiration on 'j'; light burst on 'ch'.",
          stress: "Tones 3-4-3-4 / 1-3.",
        },
        chunks: [
          { target: "请带我去", english: "please take me to", phonetic: "qǐng dài wǒ qù", tip: "Standard polite request opener" },
          { target: "机场", english: "airport", phonetic: "jīchǎng", tip: "jee-chahng. Literally: plane-field" },
        ],
      },
      es: {
        phrase: "¿Puede llevarme al aeropuerto?",
        phonetic: "PWEH-deh yeh-VAR-meh ahl ai-eh-ro-PWER-toh",
        meaning: "Can you take me to the airport?",
        context: "Essential for taxis and rideshares.",
        pronunciationTip: "'Aero' flows quickly: ai-EH-ro.",
        articulation: {
          tonguePlacement: "Tongue tap for 'r'.",
          lipShape: "Open for 'ah' vowels.",
          airflow: "Voiced and steady.",
          stress: "PWEH-deh, ai-eh-ro-PWER-toh.",
        },
      },
      fr: {
        phrase: "Pouvez-vous m'emmener à l'aéroport ?",
        phonetic: "poo-VAY voo mam-NAY ah lai-eh-ro-POR",
        meaning: "Can you take me to the airport?",
        context: "Polite request for a taxi or driver.",
        pronunciationTip: "'Aéroport' flows as three quick beats.",
        articulation: {
          tonguePlacement: "Back of tongue for 'r'.",
          lipShape: "Round for 'ou'.",
          airflow: "Soft and voiced.",
          stress: "Final syllable: ai-eh-ro-POR.",
        },
      },
    },
  },
  // call me a taxi / I need a taxi / order a cab / get a cab
  {
    match: (s) => /\b(?:call|get|need|want|order|book|hail)\s+(?:me\s+)?(?:a\s+)?(?:taxi|cab|ride|rideshare)\b|(?:order|book|get|call|hail)\s+(?:a\s+)?(?:taxi|cab)|(?:taxi|cab)\s+(?:please|now|service)/i.test(s),
    byLang: {
      zh: {
        phrase: "请帮我叫一辆出租车",
        phonetic: "qǐng bāng wǒ jiào yī liàng chūzūchē",
        meaning: "Please call me a taxi.",
        context: "Ask a hotel receptionist or local to hail a cab.",
        pronunciationTip: "Say it like: cheeng bahng woh jyow yee lyang choo-tsoo-chuh.",
        articulation: {
          tonguePlacement: "Tongue blade for 'j' in jiào; tip for 'ch' in chē.",
          lipShape: "Open through 'ah' vowels.",
          airflow: "Aspirated 'ch'; voiced 'j'.",
          stress: "Tones 3-1-3-4 / 1-4-1.",
        },
        chunks: [
          { target: "请帮我", english: "please help me", phonetic: "qǐng bāng wǒ", tip: "Polite request opener" },
          { target: "叫", english: "call / hail", phonetic: "jiào", tip: "Fourth tone: drop sharply" },
          { target: "一辆", english: "one (vehicle)", phonetic: "yī liàng", tip: "Measure word for vehicles" },
          { target: "出租车", english: "taxi", phonetic: "chūzūchē", tip: "Literally: rent-out-car" },
        ],
      },
      es: {
        phrase: "Quiero pedir un taxi, por favor.",
        phonetic: "kee-EH-ro peh-DEER oon TAK-see pohr fah-VOR",
        meaning: "I want to order a taxi, please.",
        context: "Use this at a hotel reception desk, app, or on the street.",
        pronunciationTip: "Stress each verb: kee-EH-ro, peh-DEER. The 'r' in 'por' taps lightly.",
        articulation: {
          tonguePlacement: "Tongue tap for 'r' in quiero and pedir.",
          lipShape: "Open for 'ah' vowels throughout.",
          airflow: "Voiced and smooth.",
          stress: "kee-EH-ro peh-DEER oon TAK-see.",
        },
        chunks: [
          { target: "Quiero", english: "I want", phonetic: "kee-EH-ro", tip: "Stress the 'EH' — 'kee-EH-ro'. The 'qu' makes a 'k' sound." },
          { target: "pedir", english: "to order / to ask for", phonetic: "peh-DEER", tip: "Stress the last syllable: peh-DEER. Tongue tap the 'r' at the end." },
          { target: "un taxi,", english: "a taxi,", phonetic: "oon TAK-see", tip: "'Un' rhymes with 'moon' without the 'm'. 'Taxi' is the same word!" },
          { target: "por favor.", english: "please.", phonetic: "pohr fah-VOR", tip: "Always polite to add. Say it like 'pour fah-VOR'." },
        ],
      },
      fr: {
        phrase: "Je voudrais commander un taxi, s'il vous plaît.",
        phonetic: "zhuh voo-DRAY koh-mahn-DAY uhn tak-SEE seel voo PLAY",
        meaning: "I would like to order a taxi, please.",
        context: "Polite and direct — use at a hotel, app, or on the street.",
        pronunciationTip: "'Voudrais' is soft: voo-DRAY. 'Commander' = koh-mahn-DAY.",
        articulation: {
          tonguePlacement: "Back of tongue for nasal 'an' in commander.",
          lipShape: "Round for 'ou' in voudrais.",
          airflow: "Voiced.",
          stress: "voo-DRAY, koh-mahn-DAY, seel voo PLAY.",
        },
        chunks: [
          { target: "Je voudrais", english: "I would like", phonetic: "zhuh voo-DRAY", tip: "The 'j' is soft like 'zh' in measure. 'voudrais' = voo-DRAY." },
          { target: "commander", english: "to order", phonetic: "koh-mahn-DAY", tip: "Three beats: koh-mahn-DAY. Nasal 'an' in the middle." },
          { target: "un taxi,", english: "a taxi,", phonetic: "uhn tak-SEE", tip: "'Un' has a nasal 'un' sound. 'Taxi' is the same word!" },
          { target: "s'il vous plaît.", english: "please.", phonetic: "seel voo PLAY", tip: "Silent 's' in vous. 'plaît' = PLAY." },
        ],
      },
    },
  },
  // I want to go to the mall — exact spec example.
  {
    match: (s) =>
      /\bi\s*(?:'?d\s+like|want|would\s+like)\s+to\s+go\s+to\s+(?:the\s+)?mall\b/i.test(s),
    byLang: {
      zh: {
        phrase: "我想去商场",
        phonetic: "wǒ xiǎng qù shāngchǎng",
        meaning: "I want to go to the mall.",
        context: "Casual — use this with friends, family, or a taxi driver.",
        pronunciationTip: "Say it like: woh shyahng chyoo shahng-chahng.",
        articulation: {
          tonguePlacement: "Tongue blade up for 'sh' in 'shāng'.",
          lipShape: "Spread, then open into 'chǎng'.",
          airflow: "Aspirated burst on 'ch' / 'sh'.",
          stress: "Tones 3-3-4 / 1-3.",
        },
      },
      es: {
        phrase: "Quiero ir al centro comercial",
        phonetic: "kee-EH-ro eer ahl SEN-tro ko-mer-SYAHL",
        meaning: "I want to go to the mall.",
        context: "Standard — works for any shopping center.",
        pronunciationTip: "'Al' is the contraction of 'a el' — say it as one beat.",
        articulation: {
          tonguePlacement: "Tongue tap for 'r'.",
          lipShape: "Open through 'ah' vowels.",
          airflow: "Voiced and steady.",
          stress: "kee-EH-ro, ko-mer-SYAHL.",
        },
      },
    },
  },
];

// ── Generic fallback ───────────────────────────────────────────────────────
// When the user's request doesn't match a curated entry AND the verb+noun
// composition can't piece something together, we return a SAFE target-
// language practice prompt — never an English echo. The dev stub's hard rule:
// `naturalPhrase` must always be in the target language so the UI never
// displays the source language as if it were the answer.

const PRACTICE_PROMPTS: Record<string, StubEntry> = {
  zh: {
    phrase: "让我们练习一下",
    phonetic: "ràng wǒmen liànxí yīxià",
    meaning: "Let's practice this together.",
    context: "Local stub response — bundle the real Gemma model into assets/models/gemma/ for a precise translation.",
    pronunciationTip: "Say it like: rahng woh-men lyen-shee yee-shyah.",
    articulation: {
      tonguePlacement: "Tongue back for 'r'; blade up for 'x' / 'sh'.",
      lipShape: "Slightly spread.",
      airflow: "Voiced; light burst on 'x'.",
      stress: "Tones 4-3-2 / 4-2 / 1-4.",
    },
  },
  es: {
    phrase: "Vamos a practicarlo",
    phonetic: "BAH-mos ah prahk-tee-KAR-lo",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model into assets/models/gemma/ for a precise translation.",
    pronunciationTip: "Roll the 'r' lightly between vowels.",
    articulation: {
      tonguePlacement: "Tongue tap on the alveolar ridge for 'r'.",
      lipShape: "Open for 'ah' vowels.",
      airflow: "Voiced.",
      stress: "BAH-mos, prahk-tee-KAR-lo.",
    },
  },
  fr: {
    phrase: "Pratiquons cela",
    phonetic: "prah-tee-KOHN suh-LAH",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "Nasal 'on' in 'pratiquons'.",
    articulation: {
      tonguePlacement: "Back of tongue for nasal 'on'.",
      lipShape: "Round for 'ohn'.",
      airflow: "Soft, voiced.",
      stress: "Final syllable: prah-tee-KOHN.",
    },
  },
  de: {
    phrase: "Lass uns das üben",
    phonetic: "lahs oons dahs ÜH-ben",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "The 'ü' is rounded — pucker for 'ee'.",
    articulation: {
      tonguePlacement: "Tongue forward; lips rounded for 'ü'.",
      lipShape: "Tightly rounded.",
      airflow: "Voiced.",
      stress: "Stress: ÜH-ben.",
    },
  },
  it: {
    phrase: "Pratichiamolo",
    phonetic: "prah-tee-KYAH-mo-lo",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "'Chi' is a hard 'k' sound, not 'ch'.",
    articulation: {
      tonguePlacement: "Back of tongue up for 'k'.",
      lipShape: "Open through 'ah'.",
      airflow: "Voiced.",
      stress: "prah-tee-KYAH-mo-lo.",
    },
  },
  ja: {
    phrase: "これを練習しましょう",
    phonetic: "kore o renshū shimashō",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "Say it like: KOH-reh oh ren-shoo shee-mah-shoh.",
    articulation: {
      tonguePlacement: "Tongue tip up for 'r' (a soft tap).",
      lipShape: "Spread, relaxed.",
      airflow: "Voiced; flatten the long 'ū'.",
      stress: "Even pitch.",
    },
  },
  hi: {
    phrase: "चलो इसका अभ्यास करते हैं",
    phonetic: "chalo iska abhyaas karte hain",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "Say it like: CHA-loh iss-kah ab-yahs KAR-teh hain.",
    articulation: {
      tonguePlacement: "Tongue tip up for 'r'; blade up for 'sh'.",
      lipShape: "Open and relaxed.",
      airflow: "Voiced.",
      stress: "Stress: CHA-loh, ab-YAHS.",
    },
  },
  nl: {
    phrase: "Laten we dit oefenen",
    phonetic: "LAH-tuhn vuh dit OO-feh-nen",
    meaning: "Let's practice this.",
    context: "Local stub response — bundle the real Gemma model for full coverage.",
    pronunciationTip: "Say 'oo' as in English 'food'.",
    articulation: {
      tonguePlacement: "Tongue mid; blade up for 'd'.",
      lipShape: "Slightly rounded for 'oo'.",
      airflow: "Voiced.",
      stress: "LAH-tuhn, OO-feh-nen.",
    },
  },
  en: {
    phrase: "Let's practice this together.",
    phonetic: "LETS prak-tis this tuh-GETH-er",
    meaning: "Let's practice this together.",
    context: "Local stub response — pick a different language to practice translation.",
    pronunciationTip: "Soften the 'th' — voice it lightly.",
    articulation: {
      tonguePlacement: "Tongue tip between teeth for 'th'.",
      lipShape: "Open and relaxed.",
      airflow: "Voiced.",
      stress: "LETS, prak-tis, tuh-GETH-er.",
    },
  },
};

// ── Pinyin → English-readable "say it like" converter ─────────────────────
// Maps pinyin syllables to how an English speaker would actually say them.
// This bridges the gap between academic pinyin and what native TTS produces.

const PINYIN_SAY_LIKE: Record<string, string> = {
  // Greetings & essentials
  "nǐ": "nee", "hǎo": "haow", "ma": "mah", "wǒ": "waw", "shì": "shrr",
  "de": "duh", "le": "luh", "ne": "nuh", "ba": "bah", "la": "lah",
  "men": "mun",
  // Actions
  "jiào": "jee-ow", "xiè": "shee-eh", "qǐng": "cheeng", "wèn": "wun",
  "zěnme": "dzun-muh", "zǒu": "dzoh", "yào": "yow", "diǎn": "dee-en",
  "cài": "tsai", "xiǎng": "shee-ahng", "qù": "chew", "chú": "choo",
  "fáng": "fahng", "shāng": "shahng", "chǎng": "chahng",
  "xǐ": "shee", "shǒu": "show", "jiān": "jee-en", "zài": "dzai",
  "nǎ": "nah", "lǐ": "lee", "huān": "hwahn", "pī": "pee", "sà": "sah",
  "kā": "kah", "fēi": "fay", "chá": "chah", "shuǐ": "shway",
  "mǐ": "mee", "fàn": "fahn", "guǎn": "gwahn",
  // Common words
  "bù": "boo", "duì": "dway", "qǐ": "chee", "méi": "may",
  "yǒu": "yoh", "zhī": "jrr", "dào": "dow", "lái": "lai",
  "hěn": "hun", "dà": "dah", "xiǎo": "shee-ow",
  // Food & places
  "chī": "chrr", "hē": "huh", "mǎi": "my", "kàn": "kahn",
  "shuō": "shwoh", "tīng": "teeng", "zuò": "dzwoh", "zhù": "joo",
  "diàn": "dee-en", "lù": "loo", "chē": "chuh", "fēijī": "fay-jee",
  "huǒchē": "hwoh-chuh", "gōngyuán": "gong-yoo-en",
  "yīyuàn": "ee-yoo-en", "xuéxiào": "shweh-shee-ow",
  // Pronouns & particles
  "tā": "tah", "wǒmen": "waw-mun", "nǐmen": "nee-mun",
  "zhè": "juh", "nà": "nah", "shénme": "shun-muh",
  "wèishénme": "way-shun-muh",
  "duōshǎo": "dwoh-shaow", "jǐ": "jee",
  // Numbers
  "yī": "ee", "èr": "are", "sān": "sahn", "sì": "suh",
  "wǔ": "woo", "liù": "lee-oh", "qī": "chee", "bā": "bah",
  "jiǔ": "jee-oh", "shí": "shrr",
};

/**
 * Convert pinyin (with tone marks) to English-readable pronunciation.
 * Falls back to a simplified approximation for unknown syllables.
 */
export function pinyinToSayLike(pinyin: string): string {
  if (!pinyin) return "";
  const syllables = pinyin.trim().split(/\s+/);
  return syllables.map(s => {
    const lower = s.toLowerCase().replace(/[,.:;!?]+$/, "");
    if (PINYIN_SAY_LIKE[lower]) return PINYIN_SAY_LIKE[lower];
    // Fallback: convert pinyin initials and finals to English-readable sounds
    let approx = lower
      // Initials first (order matters — longer matches before shorter)
      .replace(/^zh/, "j").replace(/^ch/, "ch").replace(/^sh/, "sh")
      .replace(/^q/, "ch").replace(/^x/, "sh").replace(/^c/, "ts")
      .replace(/^z/, "dz").replace(/^r/, "r")
      // Finals / vowel combos (before individual vowels)
      .replace(/iang/g, "ee-ahng").replace(/iong/g, "ee-ohng")
      .replace(/uang/g, "wahng").replace(/üan/g, "yoo-en")
      .replace(/ang/g, "ahng").replace(/eng/g, "ung").replace(/ing/g, "eeng")
      .replace(/ong/g, "ohng").replace(/ian/g, "ee-en").replace(/uan/g, "wahn")
      .replace(/üe/g, "yoo-eh").replace(/ün/g, "yoon")
      .replace(/ao/g, "ow").replace(/ou/g, "oh").replace(/ai/g, "eye")
      .replace(/ei/g, "ay").replace(/an/g, "ahn").replace(/en/g, "un")
      .replace(/in/g, "een").replace(/un/g, "wun")
      .replace(/iu/g, "ee-oh").replace(/ui/g, "way").replace(/uo/g, "woh")
      .replace(/ie/g, "ee-eh").replace(/üe/g, "yoo-eh")
      // Individual toned vowels
      .replace(/[āáǎà]/g, "ah").replace(/[ēéěè]/g, "uh")
      .replace(/[īíǐì]/g, "ee").replace(/[ōóǒò]/g, "oh")
      .replace(/[ūúǔù]/g, "oo").replace(/[ǖǘǚǜü]/g, "yoo");
    return approx;
  }).join("-");
}

// ── Mandarin sound tips (analogy-based) ──────────────────────────────────
// Maps pinyin initials/finals to plain-language pronunciation hints.
// Used to auto-assign tips to chunks based on their pinyin content.

const MANDARIN_SOUND_TIPS: { pattern: RegExp; tip: string }[] = [
  { pattern: /^zh/i,  tip: "Like 'j' in 'judge' but curl your tongue back" },
  { pattern: /^ch/i,  tip: "Like 'ch' in 'church' but curl your tongue back" },
  { pattern: /^sh/i,  tip: "Like 'sh' in 'shirt' but curl your tongue back" },
  { pattern: /^q/i,   tip: "Like 'ch' in 'cheese' — tongue flat behind your front teeth" },
  { pattern: /^x/i,   tip: "Like 'sh' in 'she' but sharper — tongue flat, not curled" },
  { pattern: /^r/i,   tip: "Like the 's' in 'measure' — tongue curled up slightly" },
  { pattern: /ü/i,    tip: "Say 'ee' but round your lips like you're about to whistle" },
  { pattern: /ǎ|ǐ|ǒ|ǔ|ě/,  tip: "Third tone: dip your voice down low, then let it rise — like asking 'huh?'" },
  { pattern: /à|ì|ò|ù|è/,   tip: "Fourth tone: drop your voice sharply — like saying 'No!' firmly" },
  { pattern: /ā|ī|ō|ū|ē/,   tip: "First tone: keep your voice high and flat — like singing one steady note" },
  { pattern: /á|í|ó|ú|é/,    tip: "Second tone: raise your voice up — like asking 'What?'" },
];

/** Get a pronunciation tip for a pinyin string based on its sounds. */
export function getMandariTipForPinyin(pinyin: string): string {
  if (!pinyin) return "";
  for (const { pattern, tip } of MANDARIN_SOUND_TIPS) {
    if (pattern.test(pinyin)) return tip;
  }
  return "";
}

const DEFAULT_ARTICULATION: Record<string, StubEntry["articulation"]> = {
  zh: {
    tonguePlacement: "Keep the tip of your tongue behind your bottom teeth for most sounds. For 'zh', 'ch', and 'sh', curl your tongue tip up toward the roof of your mouth. For 'j', 'q', and 'x', press your tongue flat behind your front teeth.",
    lipShape: "Round your lips for 'u' sounds. Keep them relaxed and open for 'a'. For 'o', make a small circle with your lips.",
    airflow: "For 'p', 't', 'k' sounds, blow a small puff of air. For 'b', 'd', 'g' sounds, say them softer with no puff.",
    stress: "Mandarin has four tones: 1st stays high and flat, 2nd goes up like a question, 3rd dips down then rises, 4th drops sharply. Getting the tone right changes the meaning of the word.",
  },
  fr: {
    tonguePlacement: "The French 'r' comes from the back of your throat (like a gentle gargle). For nasal sounds like 'on' and 'an', let air flow through your nose while your mouth stays slightly open.",
    lipShape: "Push your lips forward like you're about to blow out a candle for 'u'. Keep them spread for 'i'. French vowels are short and crisp — don't let them slide.",
    airflow: "Keep your voice smooth and connected. In French, words blend into each other — don't pause between short words.",
    stress: "In French, the emphasis always falls on the LAST syllable. Keep the earlier parts of the word light and even.",
  },
  es: {
    tonguePlacement: "For a single 'r', quickly tap your tongue behind your upper teeth (like saying 'butter' fast). For 'rr', let your tongue trill with multiple quick taps. For 'ñ' (like in 'señor'), press the middle of your tongue against the roof of your mouth.",
    lipShape: "Spanish vowels are simple and short — 'a' is wide open, 'e' is halfway, 'i' is a smile, 'o' is round, 'u' is a tight circle.",
    airflow: "Keep your voice steady. The 'h' is always silent in Spanish. The 'j' sounds like a strong 'h' from the back of your throat.",
    stress: "Words ending in a vowel, 'n', or 's' — stress the second-to-last syllable. Everything else — stress the last. An accent mark (like á) overrides these rules.",
  },
};

function genericEntry(targetLang: string, userPhrase: string): StubEntry {
  const code = targetLang.slice(0, 2);
  const cleaned = userPhrase.replace(/[?!.]+$/g, "").trim();
  const langLabel = LANG_LABELS[code] || code;
  const defaultArt = DEFAULT_ARTICULATION[code] || {
    tonguePlacement: "Follow the phonetic guide above.",
    lipShape: "Open and relaxed for vowels; close lightly for consonants.",
    airflow: "Voiced and steady.",
    stress: "Stress the syllables shown in CAPS in the phonetic.",
  };

  let translated = "";
  if (cleaned) {
    try {
      const result = translateLine(cleaned, "en", code);
      if (result && result.toLowerCase() !== cleaned.toLowerCase()) {
        translated = result;
      }
    } catch { /* ignore */ }
  }

  if (translated) {
    return {
      phrase: translated,
      phonetic: "",
      meaning: cleaned,
      context: `Try saying it slowly, one syllable at a time.`,
      pronunciationTip: "Listen carefully and repeat after the tutor.",
      articulation: defaultArt,
    };
  }

  const fallbackPhrase = SAFE_PRACTICE_PHRASES[code];
  if (fallbackPhrase) {
    return {
      phrase: fallbackPhrase.phrase,
      phonetic: fallbackPhrase.phonetic,
      meaning: fallbackPhrase.meaning,
      context: `Here's a useful ${langLabel} phrase to practice.`,
      pronunciationTip: "Listen carefully and repeat after the tutor.",
      articulation: defaultArt,
    };
  }

  return {
    phrase: cleaned || "(unknown)",
    phonetic: "",
    meaning: cleaned || "Unknown phrase",
    context: `Practice makes perfect!`,
    pronunciationTip: "Listen carefully and repeat after the tutor.",
    articulation: defaultArt,
  };
}

// Safe fallback phrases when we can't translate — always in the target language.
const SAFE_PRACTICE_PHRASES: Record<string, { phrase: string; phonetic: string; meaning: string }> = {
  fr: { phrase: "Comment allez-vous ?", phonetic: "koh-MAWN tah-lay VOO", meaning: "How are you?" },
  es: { phrase: "¿Cómo estás?", phonetic: "KOH-moh ehs-TAHS", meaning: "How are you?" },
  de: { phrase: "Wie geht es Ihnen?", phonetic: "vee GAYT es EE-nen", meaning: "How are you?" },
  it: { phrase: "Come stai?", phonetic: "KOH-meh STAI", meaning: "How are you?" },
  pt: { phrase: "Como você está?", phonetic: "KOH-moo voh-SEH ehs-TAH", meaning: "How are you?" },
  ja: { phrase: "お元気ですか？", phonetic: "oh-GEN-kee DES-ka", meaning: "How are you?" },
  zh: { phrase: "你好吗？", phonetic: "nǐ hǎo ma", meaning: "How are you?" },
  ko: { phrase: "잘 지내세요?", phonetic: "jal ji-NAE-se-yo", meaning: "How are you?" },
  ar: { phrase: "كيف حالك؟", phonetic: "KAY-fa HAA-lak", meaning: "How are you?" },
  hi: { phrase: "आप कैसे हैं?", phonetic: "aap KAI-say HAIN", meaning: "How are you?" },
  nl: { phrase: "Hoe gaat het?", phonetic: "hoo HAAT het", meaning: "How are you?" },
  ru: { phrase: "Как дела?", phonetic: "kak dye-LAH", meaning: "How are you?" },
};

// ── Verb + noun composition ───────────────────────────────────────────────
// Powers the most common conversational openers when no curated full-phrase
// match exists. Each pattern is a regex with a capture for the object/place,
// plus per-target-language verb forms. Compose either uses a `{noun}`
// placeholder (Japanese, Hindi, Mandarin locative) or simple verb+noun
// concatenation depending on the language's word order.

interface VerbForm {
  /** Target-language phrase. May contain `{noun}` for languages where the
   *  object goes in the middle (Japanese / Hindi / locative "X 在哪里"). */
  phrase: string;
  /** Pinyin / romanization with the same templating rules. */
  phonetic: string;
  /** English-style "say it like" guide. */
  sayLike: string;
}

interface VerbPattern {
  match: RegExp;
  verbs: Record<string, VerbForm>;
  /** Joiner between verb and noun when no `{noun}` placeholder. Defaults
   *  to "" for Mandarin/Japanese (no space) and " " for everything else. */
  joiner?: Record<string, string>;
}

const VERB_PATTERNS: VerbPattern[] = [
  // I want to go to X / I'd like to go to X / I would like to go to X.
  // Listed first so "I want to go to the kitchen" doesn't accidentally
  // match the more general "I want X" pattern below.
  {
    match: /\bi\s*(?:'?d\s+like|want|would\s+like|need)\s+to\s+go\s+(?:to\s+)?(?:the\s+|a\s+|an\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "我想去", phonetic: "wǒ xiǎng qù", sayLike: "woh shyahng chyoo" },
      es: { phrase: "Quiero ir a", phonetic: "kee-EH-ro eer ah", sayLike: "kee-EH-roh eer ah" },
      fr: { phrase: "Je voudrais aller à", phonetic: "zhuh voo-DRAY ah-LAY ah", sayLike: "zhuh voo-DRAY ah-LAY ah" },
      de: { phrase: "Ich möchte zu {noun} gehen", phonetic: "ikh MEUKH-tuh tsoo {noun} GAY-en", sayLike: "ikh MUH-khta tsoo {noun} GAY-en" },
      it: { phrase: "Vorrei andare a", phonetic: "vo-RAY ahn-DAH-reh ah", sayLike: "voh-RAY ahn-DAH-reh ah" },
      ja: { phrase: "{noun}に行きたいです", phonetic: "{noun} ni ikitai desu", sayLike: "{noun} nee ee-kee-tye dess" },
      hi: { phrase: "मुझे {noun} जाना है", phonetic: "mujhe {noun} jaana hai", sayLike: "moo-jay {noun} JAH-nah hai" },
      nl: { phrase: "Ik wil naar", phonetic: "ik vil nahr", sayLike: "ik vil nahr" },
    },
    joiner: { zh: "", es: " ", fr: " ", it: " ", nl: " " },
  },
  // I love X / I really love X.
  {
    match: /\bi\s+(?:really\s+)?love\s+(.+)/i,
    verbs: {
      zh: { phrase: "我喜欢", phonetic: "wǒ xǐhuān", sayLike: "woh shee-hwahn" },
      es: { phrase: "Me encanta", phonetic: "meh en-KAHN-tah", sayLike: "meh en-KAHN-tah" },
      fr: { phrase: "J'adore", phonetic: "zha-DOR", sayLike: "zha-DOR" },
      de: { phrase: "Ich liebe", phonetic: "ikh LEE-buh", sayLike: "ikh LEE-buh" },
      it: { phrase: "Adoro", phonetic: "ah-DOH-ro", sayLike: "ah-DOH-roh" },
      ja: { phrase: "私は{noun}が大好きです", phonetic: "watashi wa {noun} ga daisuki desu", sayLike: "wah-tah-shee wah {noun} gah dye-skee dess" },
      hi: { phrase: "मुझे {noun} बहुत पसंद है", phonetic: "mujhe {noun} bahut pasand hai", sayLike: "moo-jay {noun} ba-HOOT pa-SAHND hai" },
      nl: { phrase: "Ik hou van", phonetic: "ik how van", sayLike: "ik how vahn" },
    },
    joiner: { zh: "", es: " ", fr: " ", it: " ", nl: " ", de: " " },
  },
  // I'd like to order X / I would like to order X / I want to order X / I'd like to have X.
  // Must be listed BEFORE the generic "I want X" pattern so "to order" is consumed
  // and only the object (food/item) reaches the noun lookup.
  {
    match: /\bi\s*(?:'?d\s+like\s+to\s+(?:order|have)|would\s+like\s+to\s+(?:order|have)|want\s+to\s+(?:order|have|try))\s+(?:the\s+|a\s+|an\s+|some\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "我想点", phonetic: "wǒ xiǎng diǎn", sayLike: "woh shyahng dyen" },
      es: { phrase: "Quisiera pedir", phonetic: "kee-SYEH-rah peh-DEER", sayLike: "kee-SYEH-rah peh-DEER" },
      fr: { phrase: "Je voudrais commander", phonetic: "zhuh voo-DRAY ko-mahn-DAY", sayLike: "zhuh voo-DRAY ko-mahn-DAY" },
      de: { phrase: "Ich möchte bestellen", phonetic: "ikh MEUKH-tuh beh-SHTEL-en", sayLike: "ikh MUH-khta beh-SHTEL-en" },
      it: { phrase: "Vorrei ordinare", phonetic: "vo-RAY or-dee-NAH-reh", sayLike: "voh-RAY or-dee-NAH-reh" },
      ja: { phrase: "{noun}をお願いします", phonetic: "{noun} o onegaishimasu", sayLike: "{noun} oh oh-neh-gai-shee-mahss" },
      nl: { phrase: "Ik wil graag bestellen", phonetic: "ik vil khrahkh beh-STEL-en", sayLike: "ik vil khrahkh beh-STEL-en" },
    },
    joiner: { zh: "", es: " ", fr: " ", de: " ", it: " ", nl: " " },
  },
  // I want X / I'd like X / I need X.
  {
    match: /\bi\s*(?:'?d\s+like|want|would\s+like|need)\s+(?:the\s+|a\s+|an\s+|some\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "我要", phonetic: "wǒ yào", sayLike: "woh yow" },
      es: { phrase: "Quiero", phonetic: "kee-EH-ro", sayLike: "kee-EH-roh" },
      fr: { phrase: "Je voudrais", phonetic: "zhuh voo-DRAY", sayLike: "zhuh voo-DRAY" },
      de: { phrase: "Ich möchte", phonetic: "ikh MEUKH-tuh", sayLike: "ikh MUH-khta" },
      it: { phrase: "Vorrei", phonetic: "vo-RAY", sayLike: "voh-RAY" },
      ja: { phrase: "{noun}が欲しいです", phonetic: "{noun} ga hoshii desu", sayLike: "{noun} gah hoh-SHEE dess" },
      hi: { phrase: "मुझे {noun} चाहिए", phonetic: "mujhe {noun} chaahiye", sayLike: "moo-jay {noun} CHAH-hi-yeh" },
      nl: { phrase: "Ik wil graag", phonetic: "ik vil khrahkh", sayLike: "ik vil khrahkh" },
    },
    joiner: { zh: "", es: " ", fr: " ", it: " ", nl: " ", de: " " },
  },
  // where is X / where's X / where are X.
  {
    match: /\bwhere\s*(?:'?s|is|are)\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "{noun}在哪里", phonetic: "{noun} zài nǎlǐ", sayLike: "{noun} zye nah-lee" },
      es: { phrase: "¿Dónde está {noun}?", phonetic: "DOHN-deh es-TAH {noun}", sayLike: "DOHN-deh es-TAH {noun}" },
      fr: { phrase: "Où est {noun} ?", phonetic: "oo eh {noun}", sayLike: "OO eh {noun}" },
      de: { phrase: "Wo ist {noun}?", phonetic: "vo ist {noun}", sayLike: "voh ist {noun}" },
      it: { phrase: "Dov'è {noun}?", phonetic: "doh-VEH {noun}", sayLike: "doh-VEH {noun}" },
      ja: { phrase: "{noun}はどこですか", phonetic: "{noun} wa doko desu ka", sayLike: "{noun} wah DOH-koh dess kah" },
      hi: { phrase: "{noun} कहाँ है?", phonetic: "{noun} kahaan hai", sayLike: "{noun} ka-HAHN hai" },
      nl: { phrase: "Waar is {noun}?", phonetic: "vahr iss {noun}", sayLike: "vahr iss {noun}" },
    },
  },
  // can you take me to X / please take me to X (generic, after specific station/airport entries)
  {
    match: /(?:can\s+you\s+|please\s+)?take\s+me\s+to\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "请带我去", phonetic: "qǐng dài wǒ qù", sayLike: "cheeng die woh chyoo" },
      es: { phrase: "Lléveme a", phonetic: "YEH-veh-meh ah", sayLike: "YEH-veh-meh ah" },
      fr: { phrase: "Emmenez-moi à", phonetic: "em-NAY mwa ah", sayLike: "em-NAY mwa ah" },
      de: { phrase: "Bringen Sie mich zu", phonetic: "BRING-en zee mikh tsoo", sayLike: "BRING-en zee mikh tsoo" },
      it: { phrase: "Mi porti a", phonetic: "mee POR-tee ah", sayLike: "mee POR-tee ah" },
    },
    joiner: { zh: "", es: " ", fr: " ", de: " ", it: " " },
  },
  // can I have X / could I have X / may I have X.
  {
    match: /\b(?:can|could|may)\s+i\s+(?:have|get|order)\s+(?:the\s+|a\s+|an\s+|some\s+)?(.+)/i,
    verbs: {
      zh: { phrase: "我可以要", phonetic: "wǒ kěyǐ yào", sayLike: "woh kuh-yee yow" },
      es: { phrase: "¿Me da", phonetic: "meh DAH", sayLike: "meh DAH" },
      fr: { phrase: "Je peux avoir", phonetic: "zhuh PUH ah-VWAR", sayLike: "zhuh PUH ah-VWAR" },
      de: { phrase: "Kann ich {noun} haben", phonetic: "kahn ikh {noun} HAH-ben", sayLike: "kahn ikh {noun} HAH-ben" },
      it: { phrase: "Posso avere", phonetic: "POH-soh ah-VEH-reh", sayLike: "POH-soh ah-VEH-reh" },
      ja: { phrase: "{noun}をください", phonetic: "{noun} o kudasai", sayLike: "{noun} oh koo-DAH-sye" },
    },
    joiner: { zh: "", es: " ", fr: " ", it: " " },
  },
];

interface NounEntry {
  word: string;
  phonetic: string;
  sayLike: string;
}

// Per-language noun dictionary. Keys are normalized English (lowercase, no
// articles, singular). The compose helper strips "the / a / an / some" and
// collapses inner whitespace before lookup.
const NOUNS: Record<string, Record<string, NounEntry>> = {
  zh: {
    pizza: { word: "披萨", phonetic: "pīsà", sayLike: "pee-sah" },
    coffee: { word: "咖啡", phonetic: "kāfēi", sayLike: "kah-fay" },
    tea: { word: "茶", phonetic: "chá", sayLike: "chah" },
    water: { word: "水", phonetic: "shuǐ", sayLike: "shway" },
    beer: { word: "啤酒", phonetic: "píjiǔ", sayLike: "pee-jyo" },
    food: { word: "食物", phonetic: "shíwù", sayLike: "shr-woo" },
    rice: { word: "米饭", phonetic: "mǐfàn", sayLike: "mee-fahn" },
    noodles: { word: "面条", phonetic: "miàntiáo", sayLike: "myen-tyao" },
    bread: { word: "面包", phonetic: "miànbāo", sayLike: "myen-bao" },
    kitchen: { word: "厨房", phonetic: "chúfáng", sayLike: "choo-fahng" },
    bathroom: { word: "洗手间", phonetic: "xǐshǒujiān", sayLike: "shee-show-jyen" },
    restroom: { word: "洗手间", phonetic: "xǐshǒujiān", sayLike: "shee-show-jyen" },
    toilet: { word: "厕所", phonetic: "cèsuǒ", sayLike: "tsuh-swoh" },
    mall: { word: "商场", phonetic: "shāngchǎng", sayLike: "shahng-chahng" },
    market: { word: "市场", phonetic: "shìchǎng", sayLike: "shr-chahng" },
    store: { word: "商店", phonetic: "shāngdiàn", sayLike: "shahng-dyen" },
    restaurant: { word: "餐厅", phonetic: "cāntīng", sayLike: "tsahn-ting" },
    cafe: { word: "咖啡馆", phonetic: "kāfēi guǎn", sayLike: "kah-fay gwahn" },
    "train station": { word: "火车站", phonetic: "huǒchēzhàn", sayLike: "hwoh-chuh-jahn" },
    airport: { word: "机场", phonetic: "jīchǎng", sayLike: "jee-chahng" },
    hotel: { word: "酒店", phonetic: "jiǔdiàn", sayLike: "jyo-dyen" },
    taxi: { word: "出租车", phonetic: "chūzūchē", sayLike: "choo-tsoo-chuh" },
    bus: { word: "公交车", phonetic: "gōngjiāochē", sayLike: "gong-jyao-chuh" },
    subway: { word: "地铁", phonetic: "dìtiě", sayLike: "dee-tyeh" },
    doctor: { word: "医生", phonetic: "yīshēng", sayLike: "yee-shung" },
    hospital: { word: "医院", phonetic: "yīyuàn", sayLike: "yee-ywahn" },
    pharmacy: { word: "药店", phonetic: "yàodiàn", sayLike: "yow-dyen" },
    bank: { word: "银行", phonetic: "yínháng", sayLike: "yin-hahng" },
    home: { word: "家", phonetic: "jiā", sayLike: "jyah" },
    school: { word: "学校", phonetic: "xuéxiào", sayLike: "shweh-shyao" },
    park: { word: "公园", phonetic: "gōngyuán", sayLike: "gong-ywahn" },
    beach: { word: "海滩", phonetic: "hǎitān", sayLike: "hai-tahn" },
    book: { word: "书", phonetic: "shū", sayLike: "shoo" },
    menu: { word: "菜单", phonetic: "càidān", sayLike: "tsai-dahn" },
    bill: { word: "账单", phonetic: "zhàngdān", sayLike: "jahng-dahn" },
    money: { word: "钱", phonetic: "qián", sayLike: "chyen" },
    phone: { word: "电话", phonetic: "diànhuà", sayLike: "dyen-hwah" },
    wifi: { word: "无线网络", phonetic: "wúxiàn wǎngluò", sayLike: "woo-shyen wahng-lwoh" },
    dog: { word: "狗", phonetic: "gǒu", sayLike: "go" },
    cat: { word: "猫", phonetic: "māo", sayLike: "mao" },
    music: { word: "音乐", phonetic: "yīnyuè", sayLike: "yin-yweh" },
    movie: { word: "电影", phonetic: "diànyǐng", sayLike: "dyen-ying" },
    friend: { word: "朋友", phonetic: "péngyǒu", sayLike: "pung-yo" },
    family: { word: "家人", phonetic: "jiārén", sayLike: "jyah-ren" },
    car: { word: "车", phonetic: "chē", sayLike: "chuh" },
    wine: { word: "葡萄酒", phonetic: "pútáojiǔ", sayLike: "poo-tao-jyo" },
    chocolate: { word: "巧克力", phonetic: "qiǎokèlì", sayLike: "chyao-kuh-lee" },
    cheese: { word: "奶酪", phonetic: "nǎilào", sayLike: "nai-lao" },
    "ice cream": { word: "冰淇淋", phonetic: "bīngqílín", sayLike: "bing-chee-lin" },
  },
  es: {
    pizza: { word: "pizza", phonetic: "PEET-zah", sayLike: "PEET-sah" },
    coffee: { word: "un café", phonetic: "oon kah-FEH", sayLike: "oon kah-FEH" },
    tea: { word: "un té", phonetic: "oon TEH", sayLike: "oon TEH" },
    water: { word: "agua", phonetic: "AH-gwah", sayLike: "AH-gwah" },
    beer: { word: "una cerveza", phonetic: "OO-nah ser-VEH-sah", sayLike: "OO-nah sehr-VEH-sah" },
    wine: { word: "vino", phonetic: "VEE-noh", sayLike: "VEE-noh" },
    food: { word: "comida", phonetic: "ko-MEE-dah", sayLike: "ko-MEE-dah" },
    bread: { word: "pan", phonetic: "PAHN", sayLike: "PAHN" },
    cheese: { word: "queso", phonetic: "KEH-soh", sayLike: "KEH-soh" },
    chocolate: { word: "chocolate", phonetic: "cho-ko-LAH-teh", sayLike: "cho-koh-LAH-teh" },
    "ice cream": { word: "helado", phonetic: "eh-LAH-doh", sayLike: "eh-LAH-doh" },
    dog: { word: "los perros", phonetic: "los PEH-rros", sayLike: "los PEH-rros" },
    cat: { word: "los gatos", phonetic: "los GAH-tos", sayLike: "los GAH-tos" },
    music: { word: "la música", phonetic: "lah MOO-see-kah", sayLike: "lah MOO-see-kah" },
    movie: { word: "una película", phonetic: "OO-nah peh-LEE-koo-lah", sayLike: "OO-nah peh-LEE-koo-lah" },
    friend: { word: "un amigo", phonetic: "oon ah-MEE-goh", sayLike: "oon ah-MEE-goh" },
    family: { word: "la familia", phonetic: "lah fah-MEE-lyah", sayLike: "lah fah-MEE-lyah" },
    car: { word: "un carro", phonetic: "oon KAH-rro", sayLike: "oon KAH-rro" },
    kitchen: { word: "la cocina", phonetic: "lah ko-SEE-nah", sayLike: "lah koh-SEE-nah" },
    bathroom: { word: "el baño", phonetic: "el BAH-nyoh", sayLike: "el BAH-nyoh" },
    mall: { word: "el centro comercial", phonetic: "el SEN-troh ko-mer-SYAL", sayLike: "el SEN-troh ko-mer-SYAL" },
    store: { word: "la tienda", phonetic: "lah TYEN-dah", sayLike: "lah TYEN-dah" },
    restaurant: { word: "el restaurante", phonetic: "el res-tow-RAHN-teh", sayLike: "el res-tow-RAHN-teh" },
    airport: { word: "el aeropuerto", phonetic: "el ai-eh-ro-PWER-toh", sayLike: "el ai-eh-roh-PWEHR-toh" },
    hotel: { word: "el hotel", phonetic: "el oh-TEL", sayLike: "el oh-TEHL" },
    taxi: { word: "un taxi", phonetic: "oon TAK-see", sayLike: "oon TAK-see" },
    bus: { word: "el autobús", phonetic: "el ow-toh-BOOS", sayLike: "el ow-toh-BOOS" },
    doctor: { word: "un médico", phonetic: "oon MEH-dee-koh", sayLike: "oon MEH-dee-koh" },
    hospital: { word: "el hospital", phonetic: "el os-pee-TAL", sayLike: "el os-pee-TAL" },
    home: { word: "casa", phonetic: "KAH-sah", sayLike: "KAH-sah" },
    school: { word: "la escuela", phonetic: "lah es-KWEH-lah", sayLike: "lah es-KWEH-lah" },
    book: { word: "un libro", phonetic: "oon LEE-bro", sayLike: "oon LEE-broh" },
    menu: { word: "la carta", phonetic: "lah KAR-tah", sayLike: "lah KAHR-tah" },
    bill: { word: "la cuenta", phonetic: "lah KWEN-tah", sayLike: "lah KWEHN-tah" },
    money: { word: "dinero", phonetic: "dee-NEH-roh", sayLike: "dee-NEH-roh" },
    phone: { word: "un teléfono", phonetic: "oon teh-LEH-fo-no", sayLike: "oon teh-LEH-foh-noh" },
  },
  fr: {
    pizza: { word: "une pizza", phonetic: "ün peed-ZAH", sayLike: "uhn peed-ZAH" },
    coffee: { word: "un café", phonetic: "uhn ka-FAY", sayLike: "uhn kah-FAY" },
    tea: { word: "un thé", phonetic: "uhn TAY", sayLike: "uhn TAY" },
    water: { word: "de l'eau", phonetic: "duh LOH", sayLike: "duh LOH" },
    beer: { word: "une bière", phonetic: "ün bee-YEHR", sayLike: "uhn bee-YEHR" },
    wine: { word: "du vin", phonetic: "dü VAN", sayLike: "doo VAN" },
    food: { word: "à manger", phonetic: "ah mahn-ZHAY", sayLike: "ah mahn-ZHAY" },
    bread: { word: "du pain", phonetic: "dü PAN", sayLike: "doo PAN" },
    cheese: { word: "du fromage", phonetic: "dü fro-MAHZH", sayLike: "doo froh-MAHZH" },
    chocolate: { word: "du chocolat", phonetic: "dü sho-ko-LAH", sayLike: "doo shoh-koh-LAH" },
    "ice cream": { word: "une glace", phonetic: "ün GLAHS", sayLike: "uhn GLAHS" },
    dog: { word: "les chiens", phonetic: "lay shee-EN", sayLike: "lay shee-EN" },
    cat: { word: "les chats", phonetic: "lay SHAH", sayLike: "lay SHAH" },
    music: { word: "la musique", phonetic: "lah mü-ZEEK", sayLike: "lah moo-ZEEK" },
    movie: { word: "un film", phonetic: "uhn FEELM", sayLike: "uhn FEELM" },
    friend: { word: "un ami", phonetic: "uhn ah-MEE", sayLike: "uhn ah-MEE" },
    family: { word: "la famille", phonetic: "lah fa-MEE-yuh", sayLike: "lah fah-MEE-yuh" },
    car: { word: "une voiture", phonetic: "ün vwa-TÜHR", sayLike: "uhn vwah-TOOR" },
    kitchen: { word: "la cuisine", phonetic: "lah kwee-ZEEN", sayLike: "lah kwee-ZEEN" },
    bathroom: { word: "les toilettes", phonetic: "lay twa-LET", sayLike: "lay twah-LET" },
    mall: { word: "le centre commercial", phonetic: "luh SAHN-truh ko-mer-SYAL", sayLike: "luh SAHN-truh ko-mer-SYAL" },
    store: { word: "le magasin", phonetic: "luh ma-ga-ZAN", sayLike: "luh ma-ga-ZAN" },
    restaurant: { word: "le restaurant", phonetic: "luh res-toh-RAHN", sayLike: "luh res-toh-RAHN" },
    airport: { word: "l'aéroport", phonetic: "lai-eh-ro-POR", sayLike: "lai-eh-roh-POR" },
    hotel: { word: "l'hôtel", phonetic: "loh-TEL", sayLike: "loh-TEL" },
    taxi: { word: "un taxi", phonetic: "uhn tak-SEE", sayLike: "uhn tak-SEE" },
    bus: { word: "le bus", phonetic: "luh BÜSS", sayLike: "luh BOOS" },
    doctor: { word: "un médecin", phonetic: "uhn may-DSAN", sayLike: "uhn may-DSAN" },
    hospital: { word: "l'hôpital", phonetic: "loh-pee-TAL", sayLike: "loh-pee-TAL" },
    home: { word: "la maison", phonetic: "lah may-ZON", sayLike: "lah may-ZON" },
    school: { word: "l'école", phonetic: "lay-KOL", sayLike: "lay-KOL" },
    book: { word: "un livre", phonetic: "uhn LEEV-ruh", sayLike: "uhn LEEV-ruh" },
    menu: { word: "le menu", phonetic: "luh muh-NÜ", sayLike: "luh muh-NU" },
    bill: { word: "l'addition", phonetic: "lah-dee-SYON", sayLike: "lah-dee-SYON" },
    money: { word: "de l'argent", phonetic: "duh lar-ZHAHN", sayLike: "duh lar-ZHAHN" },
    phone: { word: "un téléphone", phonetic: "uhn tay-lay-FON", sayLike: "uhn tay-lay-FON" },
  },
  de: {
    pizza: { word: "eine Pizza", phonetic: "EYE-ne PEET-sah", sayLike: "EYE-neh PEET-zah" },
    coffee: { word: "einen Kaffee", phonetic: "EYE-nen KA-fey", sayLike: "EYE-nen KAH-fay" },
    water: { word: "Wasser", phonetic: "VAH-ser", sayLike: "VAH-sehr" },
    food: { word: "etwas zu essen", phonetic: "ET-vahs tsoo ES-sen", sayLike: "ET-vahs tsoo ESS-sen" },
    kitchen: { word: "der Küche", phonetic: "der KÜ-khe", sayLike: "der KOO-khe" },
    bathroom: { word: "der Toilette", phonetic: "der toy-LET-te", sayLike: "der toy-LET-teh" },
    mall: { word: "dem Einkaufszentrum", phonetic: "dem INE-kowfs-tsen-troom", sayLike: "dem INE-kowfs-tsen-troom" },
    restaurant: { word: "das Restaurant", phonetic: "dahs res-tow-RAHN", sayLike: "dahs res-toh-RAHN" },
    hotel: { word: "das Hotel", phonetic: "dahs ho-TEL", sayLike: "dahs hoh-TELL" },
  },
  it: {
    pizza: { word: "una pizza", phonetic: "OO-nah PEET-tsah", sayLike: "OO-nah PEET-tsah" },
    coffee: { word: "un caffè", phonetic: "oon kahf-FEH", sayLike: "oon kahf-FEH" },
    water: { word: "dell'acqua", phonetic: "dell-LAHK-kwah", sayLike: "dell-LAHK-kwah" },
    food: { word: "qualcosa da mangiare", phonetic: "kwahl-KOH-sah dah mahn-JAH-reh", sayLike: "kwahl-KOH-sah dah mahn-JAH-reh" },
    kitchen: { word: "la cucina", phonetic: "lah koo-CHEE-nah", sayLike: "lah koo-CHEE-nah" },
    bathroom: { word: "il bagno", phonetic: "eel BAH-nyoh", sayLike: "eel BAH-nyoh" },
    restaurant: { word: "il ristorante", phonetic: "eel ree-stoh-RAHN-teh", sayLike: "eel ree-stoh-RAHN-teh" },
    hotel: { word: "l'albergo", phonetic: "lahl-BEHR-goh", sayLike: "lahl-BEHR-goh" },
  },
  ja: {
    pizza: { word: "ピザ", phonetic: "piza", sayLike: "PEE-zah" },
    coffee: { word: "コーヒー", phonetic: "kōhī", sayLike: "KOH-hee" },
    water: { word: "水", phonetic: "mizu", sayLike: "mee-zoo" },
    kitchen: { word: "台所", phonetic: "daidokoro", sayLike: "die-DOH-koh-roh" },
    bathroom: { word: "トイレ", phonetic: "toire", sayLike: "TOY-reh" },
    restaurant: { word: "レストラン", phonetic: "resutoran", sayLike: "reh-soo-TOH-rahn" },
    hotel: { word: "ホテル", phonetic: "hoteru", sayLike: "HOH-teh-roo" },
    airport: { word: "空港", phonetic: "kūkō", sayLike: "KOO-koh" },
    book: { word: "本", phonetic: "hon", sayLike: "hohn" },
  },
  hi: {
    pizza: { word: "पिज़्ज़ा", phonetic: "pizza", sayLike: "PEET-sah" },
    coffee: { word: "कॉफ़ी", phonetic: "kofii", sayLike: "KAW-fee" },
    water: { word: "पानी", phonetic: "paani", sayLike: "PAH-nee" },
    bathroom: { word: "बाथरूम", phonetic: "baathruum", sayLike: "BAHTH-room" },
    restaurant: { word: "रेस्टोरेंट", phonetic: "restorent", sayLike: "RES-toh-rent" },
    hotel: { word: "होटल", phonetic: "hotal", sayLike: "HOH-tel" },
  },
  nl: {
    pizza: { word: "een pizza", phonetic: "uhn PEED-zah", sayLike: "uhn PEED-zah" },
    coffee: { word: "een koffie", phonetic: "uhn KOF-fee", sayLike: "uhn KOF-fee" },
    water: { word: "water", phonetic: "VAH-ter", sayLike: "VAH-ter" },
    bathroom: { word: "de wc", phonetic: "duh vay-SAY", sayLike: "duh vay-SAY" },
    restaurant: { word: "het restaurant", phonetic: "het res-toh-RAHN", sayLike: "het res-toh-RAHN" },
    hotel: { word: "het hotel", phonetic: "het hoh-TEL", sayLike: "het hoh-TELL" },
  },
};

function normalizeNounKey(raw: string): string {
  let key = raw
    .replace(/[?!.,]+$/g, "")
    .replace(/^(?:the|a|an|some)\s+/i, "")
    .trim()
    .toLowerCase();
  // Basic English plural → singular so "dogs" finds "dog", "noodles" finds "noodle"
  if (key.endsWith("ies")) key = key.slice(0, -3) + "y"; // "cities" → "city"
  else if (key.endsWith("es") && !key.endsWith("ses")) key = key.slice(0, -2); // "dishes" → "dish"
  else if (key.endsWith("s") && !key.endsWith("ss")) key = key.slice(0, -1); // "dogs" → "dog"
  return key;
}

function fillTemplate(template: string, noun: string): string {
  if (template.includes("{noun}")) return template.replace("{noun}", noun);
  return template; // Caller will join with the noun separately.
}

function composeFromPattern(intent: string, targetCode: string): StubEntry | null {
  const target = targetCode.slice(0, 2);
  for (const pattern of VERB_PATTERNS) {
    const m = intent.match(pattern.match);
    if (!m) continue;
    const verb = pattern.verbs[target];
    if (!verb) continue;
    const objectKey = normalizeNounKey(m[1] || "");
    if (!objectKey) continue;
    const noun = NOUNS[target]?.[objectKey];
    if (!noun) continue;

    // Compose the phrase. Templates with `{noun}` get filled inline;
    // otherwise we concatenate verb + joiner + noun.
    const joiner = pattern.joiner?.[target] ?? " ";
    const phrase = verb.phrase.includes("{noun}")
      ? fillTemplate(verb.phrase, noun.word)
      : `${verb.phrase}${joiner}${noun.word}`;
    const phonetic = verb.phonetic.includes("{noun}")
      ? fillTemplate(verb.phonetic, noun.phonetic)
      : `${verb.phonetic}${joiner === "" ? " " : joiner}${noun.phonetic}`;
    const sayLike = verb.sayLike.includes("{noun}")
      ? fillTemplate(verb.sayLike, noun.sayLike)
      : `${verb.sayLike} ${noun.sayLike}`;

    return {
      phrase,
      phonetic,
      meaning: intent.charAt(0).toUpperCase() + intent.slice(1),
      context: `Composed from a small offline dictionary. Bundle the real Gemma model into assets/models/gemma/ for natural phrasing.`,
      pronunciationTip: `Say it like: ${sayLike}.`,
      articulation: {
        tonguePlacement: "Mirror the rhythm of the phonetic guide.",
        lipShape: "Open and relaxed for vowels; close lightly for consonants.",
        airflow: "Voiced and steady.",
        stress: "Stress the verb syllable first, then the noun.",
      },
    };
  }
  return null;
}

// ── Direct noun lookup ────────────────────────────────────────────────────
// When the user asks for a standalone word or short phrase (e.g. "pizza",
// "the bathroom", "coffee"), look it up directly in the NOUNS dictionary.
// This catches the very common "How do I say X?" → intent = "X" case.
function directNounLookup(intent: string, targetCode: string): StubEntry | null {
  const target = targetCode.slice(0, 2);
  const key = normalizeNounKey(intent);
  if (!key) return null;
  const noun = NOUNS[target]?.[key];
  if (!noun) return null;
  return {
    phrase: noun.word,
    phonetic: noun.phonetic,
    meaning: key.charAt(0).toUpperCase() + key.slice(1),
    context: `Great choice! Practice this word until it feels natural.`,
    pronunciationTip: `Say it like: ${noun.sayLike}.`,
    articulation: {
      tonguePlacement: "Follow the phonetic guide above.",
      lipShape: "Open and relaxed for vowels; close lightly for consonants.",
      airflow: "Voiced and steady.",
      stress: `Stress: ${noun.sayLike}.`,
    },
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isStubChat(): boolean {
  return true;
}

/**
 * Generate the stub response. Inspects the messages to find the target
 * language and the user's phrase, then returns plausible TutorResponse JSON.
 */
export function stubGenerateTutorJson(
  messages: ChatMessage[],
): Record<string, unknown> {
  const system = messages.find((m) => m.role === "system")?.content || "";
  const user = messages.find((m) => m.role === "user")?.content || "";

  // Pull native + target codes out of the system prompt. The prompt format
  // is stable: 'lang="zh"' / 'native (English)'.
  const targetMatch = system.match(/learning\s+([A-Z][a-zA-Z]+)/);
  const targetLabel = targetMatch?.[1] || "Spanish";
  const nativeMatch = system.match(/user speaks\s+([A-Z][a-zA-Z]+)/);
  const nativeLabel = nativeMatch?.[1] || "English";
  const targetCode = labelToCode(targetLabel);
  const nativeCode = labelToCode(nativeLabel);

  const rawUserPhrase = extractUserPhrase(user);
  // Strip wrappers like "How do I say X" / "How to say X" — the user's
  // intent is just X. Without this the stub echoes the wrapper back into
  // its own tutor copy ("here's how to say 'how do I say hello'…") which
  // sounds robotic and doubles up the question.
  const intent = stripQuestionWrapper(rawUserPhrase);
  // Three-tier resolution. The composition layer is what closes the
  // long-tail bug "How do I say I love pizza in Mandarin?" → English echo:
  //   1. Curated full-phrase match (best — has explanation, articulation)
  //   2. Verb+noun composition ("I love pizza" → "我喜欢披萨")
  //   3. Generic safe practice prompt (NEVER echoes the source language)
  const entry =
    matchCurated(intent, targetCode) ||
    composeFromPattern(intent, targetCode) ||
    directNounLookup(intent, targetCode) ||
    genericEntry(targetCode, intent);

  // Build segmented audio so cross-language playback works the same as the
  // real Gemma path — short coaching in native, target phrase in target.
  // Vary the lead-in across calls so two prompts in a row don't open with
  // the identical "Here is how to say…" — feels more like a tutor.
  const audioSegments: { lang: string; text: string }[] = [];
  if (nativeCode !== targetCode) {
    audioSegments.push(
      { lang: nativeCode, text: leadIn(intent, targetLabel) },
      { lang: targetCode, text: entry.phrase },
      { lang: nativeCode, text: trailingTip(entry) },
    );
  } else {
    audioSegments.push({ lang: targetCode, text: entry.phrase });
  }

  const result: Record<string, unknown> = {
    naturalPhrase: entry.phrase,
    phonetic: entry.phonetic,
    literalMeaning: entry.meaning,
    context: entry.context,
    pronunciationTip: entry.pronunciationTip,
    articulation: entry.articulation,
    correctionLine: "",
    repeatPrompt: `Now you try.`,
    homework: [],
    localReply: entry.meaning,
    shouldRepeat: true,
    audioText: entry.phrase,
    audioSegments,
  };

  if (entry.chunks && entry.chunks.length > 0) {
    result.chunks = entry.chunks;
  } else {
    // Fallback: at least one chunk so phrase mode doesn't instantly complete
    result.chunks = [{
      target: entry.phrase,
      english: entry.meaning,
      phonetic: entry.phonetic,
      tip: entry.pronunciationTip || "",
    }];
  }

  return result;
}

/**
 * Plain chat. Used by the LiveLang translation loop and any callsite that
 * wants a single string back. The system prompt may explicitly ask for a
 * translation — when it does, return ONLY the translated sentence in the
 * native language, exactly the contract `processTranslate` expects.
 */
export function stubChat(messages: ChatMessage[]): string {
  const system = messages.find((m) => m.role === "system")?.content || "";
  const user = messages.find((m) => m.role === "user")?.content || "";

  // Broad translate-prompt detection. processTranslate uses formats like:
  //   "Translate the Chinese text to English. Write only …"
  //   "Translate Spanish to English. Write only …"
  //   "Translate from French into English. Reply …"
  //   "Translate the user's French text into English. Output …"
  //   "Translate English to Mandarin. Write only …"
  // We match generously — any "Translate …X… to/into …Y…" pattern.
  const translateMatch =
    system.match(/Translate from\s+([A-Z][a-zA-Z\s()]+?)\s+(?:into|to)\s+([A-Z][a-zA-Z\s()]+?)\s*[.,:]?\s*(?:Reply|Output|Write|Nothing|$)/i) ||
    system.match(/Translate the user's\s+([A-Z][a-zA-Z\s()]+?)\s+text\s+(?:into|to)\s+([A-Z][a-zA-Z\s()]+?)\s*[.,:]?\s*(?:Reply|Output|Write|Nothing|$)/i) ||
    system.match(/Translate (?:the\s+)?([A-Z][a-zA-Z\s()]+?)\s+(?:text\s+)?(?:into|to)\s+([A-Z][a-zA-Z\s()]+?)\s*[.,:]?\s*(?:Reply|Output|Write|Nothing|$)/i) ||
    system.match(/Translate\s+(?:into|to)\s+([A-Z][a-zA-Z\s()]+?)\s*[.,:]?\s*(?:Reply|Output|Write|Nothing|$)/i);
  if (translateMatch) {
    // The "Translate into X" pattern only captures the target (group 1).
    // The "Translate from X into Y" pattern captures both (groups 1, 2).
    const hasSource = translateMatch[2] !== undefined;
    const sourceLabel = hasSource ? translateMatch[1].trim() : "English";
    const targetLabel = hasSource ? translateMatch[2].trim() : translateMatch[1].trim();
    const sourceCode = labelToCode(sourceLabel);
    const targetCode = labelToCode(targetLabel);
    const result = translateLine(user.trim(), sourceCode, targetCode);

    // Validate: CJK targets must have actual CJK chars; reject digit-prefixed garbage
    const isCJKTarget = ["zh", "ja", "ko"].includes(targetCode.slice(0, 2));
    if (result) {
      if (isCJKTarget) {
        const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(result);
        const startsDigit = /^\d/.test(result);
        if (!hasCJK || startsDigit) {
          // Garbage — return safe practice phrase for the target language
          const safe = SAFE_PRACTICE_PHRASES[targetCode.slice(0, 2)];
          return safe ? safe.phrase : "";
        }
      }
      return result;
    }
    // Empty result — return the safe practice phrase so we never echo source text
    const safe = SAFE_PRACTICE_PHRASES[targetCode.slice(0, 2)];
    return safe ? safe.phrase : user.trim();
  }

  // Default: tutor-style chat, condensed to one line.
  const json = stubGenerateTutorJson(messages);
  return [json.naturalPhrase, json.phonetic && `(${json.phonetic})`, json.context]
    .filter(Boolean)
    .join(" — ");
}

// ── Translate-line helpers ─────────────────────────────────────────────────
// Bidirectional dictionary built from the curated entries. Used by the
// LiveLang loop to produce a real translation when the spoken text matches
// a known phrase, instead of the AI parroting back the source language.

const TRANSLATE_DICT: Record<string, Record<string, string>> = (() => {
  const out: Record<string, Record<string, string>> = {};
  for (const c of CURATED) {
    for (const [langCode, entry] of Object.entries(c.byLang)) {
      if (!out[langCode]) out[langCode] = {};
      // Map the localized phrase → English meaning, and the English meaning
      // → the localized phrase. Lowercase keys for case-insensitive lookup.
      const phraseKey = entry.phrase.toLowerCase().trim();
      const meaningKey = entry.meaning.toLowerCase().trim();
      out[langCode][phraseKey] = entry.meaning;
      if (!out["en"]) out["en"] = {};
      out["en"][meaningKey] = entry.phrase; // for en → langCode lookup uses byLang
    }
  }
  return out;
})();

function translateLine(text: string, sourceCode: string, targetCode: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  // If the source and target match, just echo cleanly.
  if (sourceCode === targetCode) return trimmed;

  // Curated lookup: source phrase → English meaning. We always pivot through
  // English because the dictionary is anchored on the English `meaning`.
  const lower = trimmed.toLowerCase();
  const sourceDict = TRANSLATE_DICT[sourceCode] || TRANSLATE_DICT[sourceCode.slice(0, 2)];
  const englishMeaning = sourceDict?.[lower];

  if (englishMeaning) {
    if (targetCode === "en") return englishMeaning;
    // English → target: re-look-up in CURATED
    for (const c of CURATED) {
      const entry = c.byLang[targetCode];
      if (entry && entry.meaning.toLowerCase() === englishMeaning.toLowerCase()) {
        return entry.phrase;
      }
    }
  }

  // Word-by-word backup. Hits the long tail of heard phrases that aren't in
  // the curated dict — e.g. "今天的天气很好" → "today's weather very good".
  // Imperfect, but it's REAL target-language output instead of an echo. The
  // bundled Gemma model replaces this with proper grammar at runtime.
  const wordwise = wordByWordTranslate(trimmed, sourceCode, targetCode);
  if (wordwise) return wordwise;

  // Hard rule: NEVER return the source text untranslated. Return empty
  // so the caller knows translation failed and can handle it appropriately.
  return "";
}

// ── Word-by-word translation backup ────────────────────────────────────────
// Used by Live Mode when the user hears a phrase that isn't a curated full
// match. We tokenize and look up each token in a per-source-language word
// table, then join with target-language word order for trivial cases. Keeps
// the offline stub useful for the most common heard phrases (weather, time,
// feelings, "let's go", etc.) without pretending to be a real model.

const WORD_TABLE_ZH_EN: Record<string, string> = {
  "今天": "today",
  "明天": "tomorrow",
  "昨天": "yesterday",
  "现在": "now",
  "天气": "weather",
  "很好": "is very good",
  "好": "good",
  "不好": "not good",
  "热": "hot",
  "冷": "cold",
  "下雨": "is raining",
  "晴天": "sunny",
  "我": "I",
  "你": "you",
  "他": "he",
  "她": "she",
  "我们": "we",
  "你们": "you (plural)",
  "他们": "they",
  "是": "am/is",
  "不是": "am/is not",
  "有": "have",
  "没有": "don't have",
  "想": "want to",
  "要": "want",
  "去": "go",
  "来": "come",
  "吃": "eat",
  "喝": "drink",
  "看": "see / watch",
  "听": "hear / listen",
  "说": "speak",
  "学": "learn",
  "中文": "Mandarin Chinese",
  "英文": "English",
  "日文": "Japanese",
  "饭": "food",
  "水": "water",
  "茶": "tea",
  "咖啡": "coffee",
  "学校": "school",
  "家": "home",
  "公司": "company",
  "朋友": "friend",
  "老师": "teacher",
  "学生": "student",
  "今天的": "today's",
  "明天的": "tomorrow's",
  "你好": "hello",
  "再见": "goodbye",
  "谢谢": "thank you",
  "对不起": "sorry",
  "请": "please",
  "好的": "okay",
};

const WORD_TABLE_FR_EN: Record<string, string> = {
  "bonjour": "hello",
  "bonsoir": "good evening",
  "bonne nuit": "good night",
  "au revoir": "goodbye",
  "salut": "hi",
  "merci": "thank you",
  "merci beaucoup": "thank you very much",
  "s'il vous plaît": "please",
  "oui": "yes",
  "non": "no",
  "je": "I",
  "tu": "you",
  "il": "he",
  "elle": "she",
  "nous": "we",
  "vous": "you",
  "ils": "they",
  "suis": "am",
  "est": "is",
  "sont": "are",
  "m'appelle": "am called",
  "je m'appelle": "my name is",
  "comment": "how",
  "comment allez-vous": "how are you",
  "ça va": "how's it going",
  "bien": "well / good",
  "très bien": "very well",
  "mal": "bad",
  "et": "and",
  "mais": "but",
  "avec": "with",
  "sans": "without",
  "dans": "in",
  "sur": "on",
  "pour": "for",
  "de": "of",
  "le": "the",
  "la": "the",
  "les": "the",
  "un": "a",
  "une": "a",
  "j'aime": "I like",
  "j'adore": "I love",
  "je veux": "I want",
  "je voudrais": "I would like",
  "je ne sais pas": "I don't know",
  "je ne comprends pas": "I don't understand",
  "je comprends": "I understand",
  "parlez-vous anglais": "do you speak English",
  "excusez-moi": "excuse me",
  "pardon": "sorry",
  "désolé": "sorry",
  "aujourd'hui": "today",
  "demain": "tomorrow",
  "hier": "yesterday",
  "maintenant": "now",
  "café": "coffee",
  "eau": "water",
  "thé": "tea",
  "pain": "bread",
  "maison": "house",
  "ami": "friend",
  "famille": "family",
  "temps": "weather / time",
  "jour": "day",
  "nuit": "night",
  "matin": "morning",
  "soir": "evening",
  "beau": "beautiful",
  "petit": "small",
  "grand": "big",
  "nouveau": "new",
  "bon": "good",
  "où": "where",
  "quand": "when",
  "pourquoi": "why",
  "qui": "who",
  "quoi": "what",
  "combien": "how much",
};

const WORD_TABLE_ES_EN: Record<string, string> = {
  "hola": "hello",
  "adiós": "goodbye",
  "gracias": "thank you",
  "por favor": "please",
  "sí": "yes",
  "no": "no",
  "yo": "I",
  "tú": "you",
  "él": "he",
  "ella": "she",
  "nosotros": "we",
  "ellos": "they",
  "soy": "am",
  "es": "is",
  "son": "are",
  "me llamo": "my name is",
  "cómo estás": "how are you",
  "bien": "well / good",
  "muy bien": "very well",
  "mal": "bad",
  "y": "and",
  "pero": "but",
  "con": "with",
  "sin": "without",
  "en": "in",
  "para": "for",
  "quiero": "I want",
  "necesito": "I need",
  "no sé": "I don't know",
  "no entiendo": "I don't understand",
  "entiendo": "I understand",
  "hablas inglés": "do you speak English",
  "perdón": "sorry",
  "disculpe": "excuse me",
  "hoy": "today",
  "mañana": "tomorrow",
  "ayer": "yesterday",
  "ahora": "now",
  "café": "coffee",
  "agua": "water",
  "comida": "food",
  "casa": "house",
  "amigo": "friend",
  "familia": "family",
  "bueno": "good",
  "grande": "big",
  "pequeño": "small",
  "dónde": "where",
  "cuándo": "when",
  "por qué": "why",
  "qué": "what",
  "quién": "who",
  "cuánto": "how much",
};

const WORD_TABLE_JA_EN: Record<string, string> = {
  "今日": "today",
  "明日": "tomorrow",
  "昨日": "yesterday",
  "天気": "weather",
  "いい": "good",
  "良い": "good",
  "悪い": "bad",
  "暑い": "hot",
  "寒い": "cold",
  "雨": "rain",
  "私": "I",
  "あなた": "you",
  "は": "",
  "が": "",
  "を": "",
  "の": "",
  "です": "is",
  "ます": "",
  "ね": "",
  "とても": "very",
  "好き": "like",
  "食べる": "eat",
  "飲む": "drink",
  "行く": "go",
  "来る": "come",
  "見る": "see",
  "聞く": "hear",
  "話す": "speak",
  "学ぶ": "learn",
  "こんにちは": "hello",
  "さようなら": "goodbye",
  "ありがとう": "thank you",
  "すみません": "excuse me / sorry",
};

function wordByWordTranslate(text: string, sourceCode: string, targetCode: string): string {
  // We only have English as a target for the word table backup. For non-
  // English targets, fall through (the caller will return source unchanged
  // for now — the real Gemma handles other pairs).
  if (targetCode !== "en") return "";
  const src = sourceCode.slice(0, 2);
  const table =
    src === "zh" ? WORD_TABLE_ZH_EN :
    src === "ja" ? WORD_TABLE_JA_EN :
    src === "fr" ? WORD_TABLE_FR_EN :
    src === "es" ? WORD_TABLE_ES_EN :
    null;
  if (!table) return "";

  // For space-delimited languages (French, Spanish, etc.) tokenize on
  // whitespace and try multi-word → single-word lookups. For Mandarin/
  // Japanese, use greedy left-to-right longest-match character scanning.
  const isSpaceDelimited = src === "fr" || src === "es" || src === "de" || src === "it" || src === "pt" || src === "nl";
  const out: string[] = [];
  let unmatched = 0;

  if (isSpaceDelimited) {
    const words = text.toLowerCase().replace(/[?!.,;:]+/g, "").split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length) {
      let matched = false;
      // Try longest multi-word phrase first (up to 4 words)
      for (let len = Math.min(4, words.length - i); len > 0; len--) {
        const phrase = words.slice(i, i + len).join(" ");
        if (table[phrase] !== undefined) {
          const word = table[phrase];
          if (word) out.push(word);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatched++;
        i++;
      }
    }
  } else {
    // Greedy left-to-right longest-match tokenization for CJK.
    let i = 0;
    while (i < text.length) {
      let matched = "";
      for (let len = Math.min(6, text.length - i); len > 0; len--) {
        const slice = text.slice(i, i + len);
        if (table[slice] !== undefined) {
          matched = slice;
          const word = table[slice];
          if (word) out.push(word);
          i += len;
          break;
        }
      }
      if (!matched) {
        unmatched += 1;
        i += 1;
      }
    }
  }

  // Need at least one real match. Single-word source phrases ("ありがとう",
  // "你好") are common in Live Mode and should still translate.
  if (out.length === 0) return "";
  // If most of the input was unmatched, the result will read as garbage.
  // Cut it off and let the caller emit the unavailable message.
  if (unmatched > out.length * 2) return "";
  return out.join(" ").trim();
}

// ── Lead-in / trailing tip variation ───────────────────────────────────────
// Tiny rotating pool keyed on a hash of the intent. Same intent → same lead
// each time (so it's not jittery), different intents → different leads.

const LEAD_INS = [
  (intent: string, lang: string) => `In ${lang}, "${intent}" is`,
  (intent: string, lang: string) => `${intent} — in ${lang}, you say`,
  (intent: string, lang: string) => `For "${intent}" in ${lang}, try`,
  (intent: string, lang: string) => `${intent} in ${lang}:`,
];

function leadIn(intent: string, targetLabel: string): string {
  const idx = stableIndex(intent.toLowerCase(), LEAD_INS.length);
  return LEAD_INS[idx](intent, targetLabel);
}

function trailingTip(entry: StubEntry): string {
  // Pull the most useful single sentence — pronunciationTip if it's specific,
  // otherwise the context line. Avoid echoing the meaning back (the user can
  // already see it on the Key Concept card).
  return (entry.pronunciationTip || entry.context).trim();
}

function stableIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % mod;
}

// ── Question-wrapper stripping ─────────────────────────────────────────────
// "How do I say hello" → "hello". Preserves quoted phrases, handles common
// politeness wrappers, drops a trailing language qualifier.

export function stripQuestionWrapper(raw: string): string {
  let s = raw.trim();
  // Drop trailing punctuation.
  s = s.replace(/[?!.]+$/g, "").trim();

  // Quoted phrase wins outright: "how do you say 'good morning'?" → "good morning"
  const quoted = s.match(/['"]([^'"]+)['"]/);
  if (quoted) return quoted[1].trim();

  // "how (do/would) (i/you/we) say <X> [in <lang>]"
  // "how to say <X> [in <lang>]"
  // "what's <X> in <lang>"
  // "translate <X> [to <lang>]"
  // "say <X> in <lang>"
  const patterns: RegExp[] = [
    /^(?:how\s+(?:do|would|can)\s+(?:i|you|we)\s+say|how\s+to\s+say|tell\s+me\s+how\s+to\s+say|teach\s+me\s+(?:to\s+say|how\s+to\s+say)|i\s+want\s+to\s+say|i'?d\s+like\s+to\s+say)\s+(.+?)(?:\s+in\s+\w+(?:\s+\w+)?)?$/i,
    /^what(?:'s|\s+is)\s+(.+?)\s+in\s+\w+(?:\s+\w+)?$/i,
    /^translate\s+(.+?)(?:\s+(?:to|into)\s+\w+(?:\s+\w+)?)?$/i,
    /^say\s+(.+?)\s+in\s+\w+(?:\s+\w+)?$/i,
    // "How do I introduce myself" / "How do I order food" → "introduce myself" / "order food"
    /^(?:how\s+(?:do|would|can|should)\s+(?:i|you|we))\s+(.+?)(?:\s+in\s+\w+(?:\s+\w+)?)?$/i,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m && m[1]) return m[1].trim().replace(/^["']|["']$/g, "");
  }

  // No wrapper detected — return as-is. The phrase IS the intent.
  return s;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// Accepts the ISO code, the canonical label from `LANG_LABELS`, and the
// longer variants the offline-voice-session emits ("Mandarin Chinese",
// "Brazilian Portuguese", "Chinese (Simplified)"). Always lowercases for
// case-insensitive matching. Defaults to "es" if nothing matches — that
// only happens with garbage input we'll never see in practice.
export function labelToCode(label: string): string {
  const lower = label.toLowerCase().trim();
  // Direct ISO code match.
  if (LANG_LABELS[lower]) return lower;
  // Canonical label match.
  for (const [code, name] of Object.entries(LANG_LABELS)) {
    if (name.toLowerCase() === lower) return code;
  }
  // Fuzzy alias match — covers the long variants from `humanLang` in
  // `offline-voice-session.ts` and any reasonable user-typed variant.
  const aliases: Record<string, string> = {
    "mandarin chinese": "zh",
    "mandarin": "zh",
    "chinese": "zh",
    "chinese (simplified)": "zh",
    "simplified chinese": "zh",
    "brazilian portuguese": "pt",
    "canadian french": "fr",
    "japanese (jp)": "ja",
  };
  if (aliases[lower]) return aliases[lower];
  // Substring fallback: "Mandarin Chinese" contains "mandarin" → zh.
  for (const [code, name] of Object.entries(LANG_LABELS)) {
    if (lower.includes(name.toLowerCase())) return code;
  }
  return "es";
}

function matchCurated(userPhrase: string, targetCode: string): StubEntry | null {
  for (const c of CURATED) {
    if (c.match(userPhrase)) {
      return c.byLang[targetCode] || c.byLang[targetCode.slice(0, 2)] || null;
    }
  }
  return null;
}

/** Return curated phonetic for a user phrase in the target language, or null if not in curated list. */
export function getCuratedPhonetic(userPhrase: string, targetCode: string): string | null {
  const code = targetCode.slice(0, 2);
  const stripped = stripQuestionWrapper(userPhrase);
  for (const phrase of [stripped, userPhrase]) {
    const entry = matchCurated(phrase, code);
    if (entry?.phonetic) return entry.phonetic;
  }
  return null;
}

function extractUserPhrase(userTurn: string): string {
  // The user turn from gemma-tutor.ts is:
  //   "User said: <text>\nScenario: ...\n"
  // Pull just the first 'User said' line; if that's missing, use the whole
  // first non-empty line.
  const said = userTurn.match(/User said:\s*(.+)/i);
  if (said) return said[1].trim();
  const first = userTurn.split("\n").map((l) => l.trim()).find(Boolean);
  return first || "hello";
}

// ── Local word-composition engine (100% offline, no APIs) ──────────────────
// Maps English words → target language equivalents. Used as a fallback when
// the curated phrase list doesn't match and Gemma isn't loaded.
// Grammar is simplified: Subject + 在/está/est + Verb + Object for progressive;
// Subject + Verb + Object for simple present.

interface WordEntry { zh: string; zhPin: string; es: string; fr: string }

const EN_WORDS: Record<string, WordEntry> = {
  // People & pronouns
  i:       { zh:"我", zhPin:"wǒ",    es:"yo",       fr:"je" },
  me:      { zh:"我", zhPin:"wǒ",    es:"mí",       fr:"moi" },
  you:     { zh:"你", zhPin:"nǐ",    es:"tú",       fr:"tu" },
  he:      { zh:"他", zhPin:"tā",    es:"él",       fr:"il" },
  she:     { zh:"她", zhPin:"tā",    es:"ella",     fr:"elle" },
  we:      { zh:"我们",zhPin:"wǒmen",es:"nosotros", fr:"nous" },
  they:    { zh:"他们",zhPin:"tāmen",es:"ellos",    fr:"ils" },
  my:      { zh:"我的",zhPin:"wǒ de",es:"mi",       fr:"mon" },
  your:    { zh:"你的",zhPin:"nǐ de",es:"tu",       fr:"ton" },
  his:     { zh:"他的",zhPin:"tā de",es:"su",       fr:"son" },
  her:     { zh:"她的",zhPin:"tā de",es:"su",       fr:"son" },
  our:     { zh:"我们的",zhPin:"wǒmen de",es:"nuestro",fr:"notre" },
  // Animals
  cat:     { zh:"猫", zhPin:"māo",   es:"gato",     fr:"chat" },
  dog:     { zh:"狗", zhPin:"gǒu",   es:"perro",    fr:"chien" },
  bird:    { zh:"鸟", zhPin:"niǎo",  es:"pájaro",   fr:"oiseau" },
  fish:    { zh:"鱼", zhPin:"yú",    es:"pez",      fr:"poisson" },
  horse:   { zh:"马", zhPin:"mǎ",    es:"caballo",  fr:"cheval" },
  cow:     { zh:"牛", zhPin:"niú",   es:"vaca",     fr:"vache" },
  pig:     { zh:"猪", zhPin:"zhū",   es:"cerdo",    fr:"cochon" },
  chicken: { zh:"鸡", zhPin:"jī",    es:"pollo",    fr:"poulet" },
  rabbit:  { zh:"兔子",zhPin:"tùzi", es:"conejo",   fr:"lapin" },
  bear:    { zh:"熊", zhPin:"xióng", es:"oso",      fr:"ours" },
  // Food & drink
  food:    { zh:"食物",zhPin:"shíwù",es:"comida",   fr:"nourriture" },
  water:   { zh:"水", zhPin:"shuǐ",  es:"agua",     fr:"eau" },
  rice:    { zh:"米饭",zhPin:"mǐfàn",es:"arroz",    fr:"riz" },
  bread:   { zh:"面包",zhPin:"miànbāo",es:"pan",    fr:"pain" },
  meat:    { zh:"肉", zhPin:"ròu",   es:"carne",    fr:"viande" },
  chicken_food: { zh:"鸡肉",zhPin:"jīròu",es:"pollo",fr:"poulet" },
  fish_food: { zh:"鱼",zhPin:"yú",  es:"pescado",  fr:"poisson" },
  vegetables: { zh:"蔬菜",zhPin:"shūcài",es:"verduras",fr:"légumes" },
  fruit:   { zh:"水果",zhPin:"shuǐguǒ",es:"fruta", fr:"fruit" },
  apple:   { zh:"苹果",zhPin:"píngguǒ",es:"manzana",fr:"pomme" },
  orange:  { zh:"橙子",zhPin:"chéngzi",es:"naranja",fr:"orange" },
  milk:    { zh:"牛奶",zhPin:"niúnǎi",es:"leche",  fr:"lait" },
  coffee:  { zh:"咖啡",zhPin:"kāfēi",es:"café",    fr:"café" },
  tea:     { zh:"茶", zhPin:"chá",   es:"té",       fr:"thé" },
  beer:    { zh:"啤酒",zhPin:"píjiǔ",es:"cerveza",  fr:"bière" },
  wine:    { zh:"葡萄酒",zhPin:"pútáojiǔ",es:"vino",fr:"vin" },
  soup:    { zh:"汤", zhPin:"tāng",  es:"sopa",     fr:"soupe" },
  noodles: { zh:"面条",zhPin:"miàntiáo",es:"fideos",fr:"nouilles" },
  // Places
  restaurant: { zh:"餐厅",zhPin:"cāntīng",es:"restaurante",fr:"restaurant" },
  hotel:   { zh:"酒店",zhPin:"jiǔdiàn",es:"hotel",  fr:"hôtel" },
  hospital: { zh:"医院",zhPin:"yīyuàn",es:"hospital",fr:"hôpital" },
  airport:  { zh:"机场",zhPin:"jīchǎng",es:"aeropuerto",fr:"aéroport" },
  station:  { zh:"车站",zhPin:"chēzhàn",es:"estación",fr:"gare" },
  school:   { zh:"学校",zhPin:"xuéxiào",es:"escuela",fr:"école" },
  bank:     { zh:"银行",zhPin:"yínháng",es:"banco",  fr:"banque" },
  market:   { zh:"市场",zhPin:"shìchǎng",es:"mercado",fr:"marché" },
  store:    { zh:"商店",zhPin:"shāngdiàn",es:"tienda",fr:"magasin" },
  park:     { zh:"公园",zhPin:"gōngyuán",es:"parque",fr:"parc" },
  beach:    { zh:"海滩",zhPin:"hǎitān",es:"playa",  fr:"plage" },
  home:     { zh:"家", zhPin:"jiā",   es:"casa",     fr:"maison" },
  house:    { zh:"房子",zhPin:"fángzi",es:"casa",    fr:"maison" },
  room:     { zh:"房间",zhPin:"fángjiān",es:"habitación",fr:"chambre" },
  toilet:   { zh:"厕所",zhPin:"cèsuǒ",es:"baño",   fr:"toilettes" },
  // Common verbs (infinitive / base)
  eat:     { zh:"吃", zhPin:"chī",   es:"comer",    fr:"manger" },
  drink:   { zh:"喝", zhPin:"hē",    es:"beber",    fr:"boire" },
  go:      { zh:"去", zhPin:"qù",    es:"ir",       fr:"aller" },
  come:    { zh:"来", zhPin:"lái",   es:"venir",    fr:"venir" },
  want:    { zh:"想要",zhPin:"xiǎng yào",es:"querer",fr:"vouloir" },
  need:    { zh:"需要",zhPin:"xūyào",es:"necesitar",fr:"avoir besoin" },
  have:    { zh:"有", zhPin:"yǒu",   es:"tener",    fr:"avoir" },
  see:     { zh:"看", zhPin:"kàn",   es:"ver",      fr:"voir" },
  look:    { zh:"看", zhPin:"kàn",   es:"mirar",    fr:"regarder" },
  find:    { zh:"找", zhPin:"zhǎo",  es:"encontrar",fr:"trouver" },
  buy:     { zh:"买", zhPin:"mǎi",   es:"comprar",  fr:"acheter" },
  pay:     { zh:"付款",zhPin:"fùkuǎn",es:"pagar",  fr:"payer" },
  help_v:  { zh:"帮助",zhPin:"bāngzhù",es:"ayudar",fr:"aider" },
  speak:   { zh:"说话",zhPin:"shuōhuà",es:"hablar", fr:"parler" },
  say:     { zh:"说", zhPin:"shuō",  es:"decir",    fr:"dire" },
  understand: { zh:"明白",zhPin:"míngbai",es:"entender",fr:"comprendre" },
  know:    { zh:"知道",zhPin:"zhīdao",es:"saber",   fr:"savoir" },
  like:    { zh:"喜欢",zhPin:"xǐhuan",es:"gustar",  fr:"aimer" },
  love:    { zh:"爱", zhPin:"ài",    es:"amar",     fr:"aimer" },
  sleep:   { zh:"睡觉",zhPin:"shuìjiào",es:"dormir",fr:"dormir" },
  wake:    { zh:"醒来",zhPin:"xǐng lái",es:"despertar",fr:"se réveiller" },
  work:    { zh:"工作",zhPin:"gōngzuò",es:"trabajar",fr:"travailler" },
  study:   { zh:"学习",zhPin:"xuéxí",es:"estudiar", fr:"étudier" },
  play:    { zh:"玩", zhPin:"wán",   es:"jugar",    fr:"jouer" },
  walk:    { zh:"走路",zhPin:"zǒulù",es:"caminar",  fr:"marcher" },
  run:     { zh:"跑", zhPin:"pǎo",   es:"correr",   fr:"courir" },
  sit:     { zh:"坐", zhPin:"zuò",   es:"sentarse", fr:"s'asseoir" },
  stand:   { zh:"站", zhPin:"zhàn",  es:"pararse",  fr:"se lever" },
  open:    { zh:"打开",zhPin:"dǎkāi",es:"abrir",    fr:"ouvrir" },
  close:   { zh:"关闭",zhPin:"guānbì",es:"cerrar",  fr:"fermer" },
  wait:    { zh:"等", zhPin:"děng",  es:"esperar",  fr:"attendre" },
  call:    { zh:"打电话",zhPin:"dǎ diànhuà",es:"llamar",fr:"appeler" },
  order:   { zh:"点", zhPin:"diǎn",  es:"pedir",    fr:"commander" },
  book:    { zh:"预订",zhPin:"yùdìng",es:"reservar", fr:"réserver" },
  // Common adjectives
  big:     { zh:"大", zhPin:"dà",    es:"grande",   fr:"grand" },
  small:   { zh:"小", zhPin:"xiǎo",  es:"pequeño",  fr:"petit" },
  good:    { zh:"好", zhPin:"hǎo",   es:"bueno",    fr:"bon" },
  bad:     { zh:"坏", zhPin:"huài",  es:"malo",     fr:"mauvais" },
  hot:     { zh:"热", zhPin:"rè",    es:"caliente", fr:"chaud" },
  cold:    { zh:"冷", zhPin:"lěng",  es:"frío",     fr:"froid" },
  fast:    { zh:"快", zhPin:"kuài",  es:"rápido",   fr:"rapide" },
  slow:    { zh:"慢", zhPin:"màn",   es:"lento",    fr:"lent" },
  new:     { zh:"新", zhPin:"xīn",   es:"nuevo",    fr:"nouveau" },
  old:     { zh:"旧", zhPin:"jiù",   es:"viejo",    fr:"vieux" },
  happy:   { zh:"高兴",zhPin:"gāoxìng",es:"feliz",  fr:"heureux" },
  hungry:  { zh:"饿", zhPin:"è",     es:"hambriento",fr:"affamé" },
  thirsty: { zh:"渴", zhPin:"kě",    es:"sediento", fr:"assoiffé" },
  tired:   { zh:"累", zhPin:"lèi",   es:"cansado",  fr:"fatigué" },
  sick:    { zh:"病", zhPin:"bìng",  es:"enfermo",  fr:"malade" },
  lost:    { zh:"迷路",zhPin:"mílù", es:"perdido",  fr:"perdu" },
  free:    { zh:"免费",zhPin:"miǎnfèi",es:"gratis",fr:"gratuit" },
  expensive: { zh:"贵",zhPin:"guì",  es:"caro",     fr:"cher" },
  cheap:   { zh:"便宜",zhPin:"piányí",es:"barato",  fr:"pas cher" },
  near:    { zh:"近", zhPin:"jìn",   es:"cerca",    fr:"près" },
  far:     { zh:"远", zhPin:"yuǎn",  es:"lejos",    fr:"loin" },
  // Common nouns
  time:    { zh:"时间",zhPin:"shíjiān",es:"tiempo",  fr:"temps" },
  day:     { zh:"天", zhPin:"tiān",  es:"día",      fr:"jour" },
  night:   { zh:"晚上",zhPin:"wǎnshàng",es:"noche", fr:"nuit" },
  morning: { zh:"早上",zhPin:"zǎoshàng",es:"mañana",fr:"matin" },
  today:   { zh:"今天",zhPin:"jīntiān",es:"hoy",    fr:"aujourd'hui" },
  tomorrow:{ zh:"明天",zhPin:"míngtiān",es:"mañana",fr:"demain" },
  money:   { zh:"钱", zhPin:"qián",  es:"dinero",   fr:"argent" },
  ticket:  { zh:"票", zhPin:"piào",  es:"billete",  fr:"billet" },
  bag:     { zh:"包", zhPin:"bāo",   es:"bolsa",    fr:"sac" },
  phone:   { zh:"手机",zhPin:"shǒujī",es:"teléfono",fr:"téléphone" },
  car:     { zh:"汽车",zhPin:"qìchē",es:"coche",    fr:"voiture" },
  taxi:    { zh:"出租车",zhPin:"chūzūchē",es:"taxi",fr:"taxi" },
  bus:     { zh:"公共汽车",zhPin:"gōnggòng qìchē",es:"autobús",fr:"bus" },
  train:   { zh:"火车",zhPin:"huǒchē",es:"tren",   fr:"train" },
  road:    { zh:"路", zhPin:"lù",    es:"calle",    fr:"rue" },
  map:     { zh:"地图",zhPin:"dìtú",  es:"mapa",    fr:"carte" },
  problem: { zh:"问题",zhPin:"wèntí",es:"problema", fr:"problème" },
  help:    { zh:"帮助",zhPin:"bāngzhù",es:"ayuda",   fr:"aide" },
  // Numbers
  one:     { zh:"一", zhPin:"yī",    es:"uno",      fr:"un" },
  two:     { zh:"二", zhPin:"èr",    es:"dos",      fr:"deux" },
  three:   { zh:"三", zhPin:"sān",   es:"tres",     fr:"trois" },
  // Articles / misc (dropped in zh)
  a:       { zh:"",   zhPin:"",      es:"un",       fr:"un" },
  an:      { zh:"",   zhPin:"",      es:"un",       fr:"un" },
  the:     { zh:"",   zhPin:"",      es:"el",       fr:"le" },
  is:      { zh:"是", zhPin:"shì",   es:"es",       fr:"est" },
  are:     { zh:"是", zhPin:"shì",   es:"son",      fr:"sont" },
  was:     { zh:"是", zhPin:"shì",   es:"era",      fr:"était" },
  not:     { zh:"不", zhPin:"bù",    es:"no",       fr:"ne pas" },
  and:     { zh:"和", zhPin:"hé",    es:"y",        fr:"et" },
  or:      { zh:"或者",zhPin:"huòzhě",es:"o",       fr:"ou" },
  in:      { zh:"在", zhPin:"zài",   es:"en",       fr:"dans" },
  on:      { zh:"上", zhPin:"shàng", es:"en",       fr:"sur" },
  to:      { zh:"去", zhPin:"qù",    es:"a",        fr:"à" },
  at:      { zh:"在", zhPin:"zài",   es:"en",       fr:"à" },
  for:     { zh:"为", zhPin:"wèi",   es:"para",     fr:"pour" },
  with:    { zh:"和", zhPin:"hé",    es:"con",      fr:"avec" },
  very:    { zh:"很", zhPin:"hěn",   es:"muy",      fr:"très" },
  please:  { zh:"请", zhPin:"qǐng",  es:"por favor",fr:"s'il vous plaît" },
  thank:   { zh:"谢谢",zhPin:"xièxiè",es:"gracias", fr:"merci" },
  thanks:  { zh:"谢谢",zhPin:"xièxiè",es:"gracias", fr:"merci" },
  sorry:   { zh:"对不起",zhPin:"duìbuqǐ",es:"lo siento",fr:"désolé" },
  excuse:  { zh:"打扰一下",zhPin:"dǎrǎo yīxià",es:"disculpa",fr:"excusez" },
  yes:     { zh:"是的",zhPin:"shì de",es:"sí",      fr:"oui" },
  no:      { zh:"不", zhPin:"bù",    es:"no",       fr:"non" },
  ok:      { zh:"好的",zhPin:"hǎo de",es:"de acuerdo",fr:"d'accord" },
  where:   { zh:"哪里",zhPin:"nǎlǐ", es:"dónde",    fr:"où" },
  when:    { zh:"什么时候",zhPin:"shénme shíhòu",es:"cuándo",fr:"quand" },
  how:     { zh:"怎么",zhPin:"zěnme",es:"cómo",     fr:"comment" },
  much:    { zh:"多少",zhPin:"duōshǎo",es:"mucho",  fr:"beaucoup" },
  more:    { zh:"更多",zhPin:"gèng duō",es:"más",   fr:"plus" },
  this:    { zh:"这", zhPin:"zhè",   es:"este",     fr:"ce" },
  that:    { zh:"那", zhPin:"nà",    es:"ese",      fr:"ce" },
  here:    { zh:"这里",zhPin:"zhèlǐ",es:"aquí",     fr:"ici" },
  there:   { zh:"那里",zhPin:"nàlǐ",es:"allí",      fr:"là-bas" },
};

// Verb "-ing" forms → base verb for lookup
function baseVerb(word: string): string {
  if (word.endsWith("ing") && word.length > 5) {
    const stem = word.slice(0, -3);
    if (EN_WORDS[stem]) return stem;
    if (EN_WORDS[stem + "e"]) return stem + "e"; // eating→eat
    if (stem.slice(-1) === stem.slice(-2, -1)) return stem.slice(0, -1); // running→run
  }
  if (word.endsWith("s") && EN_WORDS[word.slice(0, -1)]) return word.slice(0, -1);
  if (word.endsWith("es") && EN_WORDS[word.slice(0, -2)]) return word.slice(0, -2);
  if (word.endsWith("ed") && EN_WORDS[word.slice(0, -2)]) return word.slice(0, -2);
  return word;
}

type ComposedTranslation = {
  phrase: string;
  phonetic: string;
  chunks: Array<{ target: string; english: string; phonetic: string; tip: string }>;
};

/**
 * Compose a translation for an arbitrary English phrase using the local
 * vocabulary table. Returns null if fewer than 40% of words are found
 * (indicating too many unknowns for a reliable result).
 * 100% offline — no network, no API keys.
 */
export function composeLocalTranslation(
  englishPhrase: string,
  targetCode: string,
): ComposedTranslation | null {
  const code = targetCode.slice(0, 2) as "zh" | "es" | "fr";
  if (!["zh", "es", "fr"].includes(code)) return null;

  const tokens = englishPhrase
    .toLowerCase()
    .replace(/[?!.,;:]+/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) return null;

  // Detect progressive "is/are ... -ing" pattern
  const hasProgressive = tokens.some((t) => t.endsWith("ing") && t.length > 4);

  const translatedTokens: Array<{ src: string; tgt: string; pin: string }> = [];
  let hits = 0;

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const base = baseVerb(raw);
    const entry = EN_WORDS[raw] || EN_WORDS[base];

    if (entry) {
      hits++;
      const tgt = entry[code as "zh" | "es" | "fr"] as string;
      const pin = entry.zhPin;
      // Skip empty placeholders (articles dropped in zh)
      if (tgt === "") continue;
      // Progressive marker for zh: insert 在 before -ing verb
      if (code === "zh" && raw.endsWith("ing") && raw.length > 4 && hasProgressive) {
        translatedTokens.push({ src: raw, tgt: "在" + tgt, pin: "zài " + pin });
      } else {
        translatedTokens.push({ src: raw, tgt, pin });
      }
    }
  }

  // Require at least 40% vocabulary coverage for a usable result
  if (hits / tokens.length < 0.4) return null;

  // Build target phrase
  let phrase = "";
  if (code === "zh") {
    phrase = translatedTokens.map((t) => t.tgt).join("");
  } else {
    phrase = translatedTokens.map((t) => t.tgt).join(" ").replace(/\s+/g, " ").trim();
    // Capitalise first letter
    phrase = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  }
  if (!phrase) return null;

  // Build phonetic (zh only)
  const phonetic = code === "zh"
    ? translatedTokens.map((t) => t.pin).filter(Boolean).join(" ")
    : "";

  // Build chunks: group every 2-3 tokens into a chunk
  const CHUNK_SIZE = 2;
  const chunkData: Array<{ target: string; english: string; phonetic: string; tip: string }> = [];
  for (let i = 0; i < translatedTokens.length; i += CHUNK_SIZE) {
    const slice = translatedTokens.slice(i, i + CHUNK_SIZE);
    const tgtPart = code === "zh"
      ? slice.map((t) => t.tgt).join("")
      : slice.map((t) => t.tgt).join(" ").trim();
    const srcPart = slice.map((t) => t.src).join(" ");
    const pinPart = slice.map((t) => t.pin).filter(Boolean).join(" ");
    if (tgtPart) {
      chunkData.push({ target: tgtPart, english: srcPart, phonetic: pinPart, tip: "" });
    }
  }
  if (chunkData.length === 0) {
    chunkData.push({ target: phrase, english: englishPhrase, phonetic, tip: "" });
  }

  return { phrase, phonetic, chunks: chunkData };
}
