// ── Mastery tracker ──────────────────────────────────────────────────────────
// Classifies each tutor round-trip into a high-level category (greeting,
// food, numbers, directions, etc.) and records whether the user nailed it.
// When the rolling score for a category crosses a threshold, the Tutor
// screen can surface a motivational "You've learned a new greeting"
// moment. Keeps things concrete and rewarding.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Categories ───────────────────────────────────────────────────────────────
// The keyword lists are intentionally generous — we cast a wide net and
// pick the first category whose patterns match. If nothing matches we fall
// back to "general", which never triggers a mastery badge.

export type MasteryCategory =
  | "greeting"
  | "farewell"
  | "gratitude"
  | "introduction"
  | "numbers"
  | "food"
  | "directions"
  | "time"
  | "shopping"
  | "emergency"
  | "travel"
  | "smalltalk"
  | "general";

interface CategoryPattern {
  id: MasteryCategory;
  label: string;           // Used in the mastery banner (e.g. "a new greeting")
  icon: string;            // Ionicons name
  patterns: RegExp[];
}

// Patterns span English + major target languages we support. Keeping a
// single source of truth here (vs. per-language files) since these phrase
// banks are small and we only need loose matches to categorize.
const PATTERNS: CategoryPattern[] = [
  {
    id: "greeting",
    label: "a new greeting",
    icon: "hand-left-outline",
    patterns: [
      /\b(hello|hi|hey|good\s*morning|good\s*evening|good\s*afternoon)\b/i,
      /\b(hola|buenos\s*d[ií]as|buenas\s*tardes|buenas\s*noches)\b/i,
      /\b(bonjour|salut|bonsoir)\b/i,
      /\b(guten\s*(tag|morgen|abend)|hallo|servus)\b/i,
      /\b(ciao|buongiorno|buonasera)\b/i,
      /\b(ol[áa]|bom\s*dia|boa\s*tarde|boa\s*noite)\b/i,
      /(こんにちは|おはよう|こんばんは)/,
      /(你好|早上好|下午好|晚上好|嗨)/,
      /\b(namaste|नमस्ते)\b/i,
    ],
  },
  {
    id: "farewell",
    label: "a new way to say goodbye",
    icon: "exit-outline",
    patterns: [
      /\b(goodbye|bye|see\s*you|take\s*care)\b/i,
      /\b(adi[óo]s|chao|hasta\s*luego|hasta\s*pronto)\b/i,
      /\b(au\s*revoir|à\s*bient[ôo]t|salut)\b/i,
      /\b(tsch[üu]ss|auf\s*wiedersehen)\b/i,
      /\b(arrivederci|ciao)\b/i,
      /(さようなら|またね|じゃあね)/,
      /(再见|拜拜)/,
    ],
  },
  {
    id: "gratitude",
    label: "how to say thanks",
    icon: "heart-outline",
    patterns: [
      /\b(thanks|thank\s*you|appreciate)\b/i,
      /\b(gracias|muchas\s*gracias)\b/i,
      /\b(merci|merci\s*beaucoup)\b/i,
      /\b(danke|vielen\s*dank)\b/i,
      /\b(grazie|grazie\s*mille)\b/i,
      /\b(obrigad[oa])\b/i,
      /(ありがとう|どうも)/,
      /(谢谢|多谢)/,
    ],
  },
  {
    id: "introduction",
    label: "how to introduce yourself",
    icon: "person-outline",
    patterns: [
      /\b(my\s*name\s*is|i'?m\s+(?:called|named|a))\b/i,
      /\b(me\s*llamo|mi\s*nombre\s*es)\b/i,
      /\b(je\s*m'?appelle|je\s*suis)\b/i,
      /\b(ich\s*hei[ßs]e|mein\s*name\s*ist)\b/i,
      /\b(mi\s*chiamo|sono)\b/i,
      /\b(eu\s*me\s*chamo|me\s*chamo)\b/i,
      /(私は.+です|私の名前は)/,
      /(我叫|我是)/,
    ],
  },
  {
    id: "numbers",
    label: "how to count",
    icon: "calculator-outline",
    patterns: [
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|hundred)\b/i,
      /\b(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|cien)\b/i,
      /\b(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|cent)\b/i,
      /\b(eins|zwei|drei|vier|f[üu]nf|sechs|sieben|acht|neun|zehn|zwanzig|hundert)\b/i,
      /\b(uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|venti|cento)\b/i,
      /(一|二|三|四|五|六|七|八|九|十|百|千)/,
    ],
  },
  {
    id: "food",
    label: "how to order food",
    icon: "restaurant-outline",
    patterns: [
      /\b(menu|order|eat|drink|water|coffee|tea|bread|wine|beer|restaurant|food|hungry|thirsty)\b/i,
      /\b(men[úu]|pedir|comer|beber|agua|caf[ée]|pan|vino|cerveza)\b/i,
      /\b(carte|commander|manger|boire|eau|caf[ée]|pain|vin|bi[èe]re)\b/i,
      /\b(speisekarte|bestellen|essen|trinken|wasser|kaffee|brot|wein|bier)\b/i,
      /\b(men[úu]|ordinare|mangiare|bere|acqua|caff[èe]|pane|vino|birra)\b/i,
      /(食べ|飲み|水|お茶|コーヒー|パン|ワイン|ビール|メニュー|注文)/,
      /(菜单|点餐|吃|喝|水|茶|咖啡|面包|酒)/,
    ],
  },
  {
    id: "directions",
    label: "how to ask directions",
    icon: "compass-outline",
    patterns: [
      /\b(where\s*is|how\s*do\s*i\s*get|left|right|straight|near|far|station|street|hotel)\b/i,
      /\b(d[óo]nde\s*est[áa]|a\s*la\s*izquierda|a\s*la\s*derecha|recto|cerca|lejos)\b/i,
      /\b(o[ùu]\s*est|[àa]\s*gauche|[àa]\s*droite|tout\s*droit|pr[èe]s|loin)\b/i,
      /\b(wo\s*ist|links|rechts|geradeaus|nah|weit)\b/i,
      /(どこ|右|左|まっすぐ|近く|遠く|駅)/,
      /(在哪里|左边|右边|一直|附近|远|车站)/,
    ],
  },
  {
    id: "time",
    label: "how to talk about time",
    icon: "time-outline",
    patterns: [
      /\b(time|today|tomorrow|yesterday|now|later|minute|hour|morning|night|week|month|year)\b/i,
      /\b(hora|hoy|ma[ñn]ana|ayer|ahora|m[áa]s\s*tarde|semana|mes|a[ñn]o)\b/i,
      /\b(heure|aujourd'?hui|demain|hier|maintenant|plus\s*tard|semaine|mois|ann[ée]e)\b/i,
      /\b(zeit|heute|morgen|gestern|jetzt|sp[äa]ter|woche|monat|jahr)\b/i,
      /(今日|明日|昨日|今|後で|時間|週|月|年)/,
      /(今天|明天|昨天|现在|小时|分钟|周|月|年)/,
    ],
  },
  {
    id: "shopping",
    label: "how to shop",
    icon: "bag-outline",
    patterns: [
      /\b(how\s*much|cost|price|buy|sell|store|shop|size|color)\b/i,
      /\b(cu[áa]nto\s*cuesta|precio|comprar|tienda|talla|color)\b/i,
      /\b(combien|co[ûu]te|prix|acheter|magasin|taille|couleur)\b/i,
      /\b(wie\s*viel|preis|kaufen|gesch[äa]ft|gr[öo][ßs]e|farbe)\b/i,
      /(いくら|値段|買う|お店|サイズ|色)/,
      /(多少钱|价格|买|商店|大小|颜色)/,
    ],
  },
  {
    id: "emergency",
    label: "how to get help",
    icon: "medical-outline",
    patterns: [
      /\b(help|emergency|doctor|hospital|police|ambulance|hurt|sick|pain)\b/i,
      /\b(ayuda|emergencia|m[ée]dico|hospital|polic[íi]a|ambulancia|dolor)\b/i,
      /\b(aide|urgence|m[ée]decin|h[ôo]pital|police|douleur)\b/i,
      /\b(hilfe|notfall|arzt|krankenhaus|polizei|schmerz)\b/i,
      /(助けて|救急|医者|病院|警察|痛い)/,
      /(救命|紧急|医生|医院|警察|疼)/,
    ],
  },
  {
    id: "travel",
    label: "how to travel",
    icon: "airplane-outline",
    patterns: [
      /\b(airport|train|bus|ticket|passport|flight|taxi|arrive|depart)\b/i,
      /\b(aeropuerto|tren|autob[úu]s|billete|pasaporte|vuelo|taxi)\b/i,
      /\b(a[ée]roport|train|bus|billet|passeport|vol|taxi)\b/i,
      /\b(flughafen|zug|bus|ticket|pass|flug|taxi)\b/i,
      /(空港|電車|バス|切符|パスポート|飛行機|タクシー)/,
      /(机场|火车|公交|票|护照|飞机|出租车)/,
    ],
  },
  {
    id: "smalltalk",
    label: "how to make small talk",
    icon: "chatbubbles-outline",
    patterns: [
      /\b(how\s*are\s*you|how'?s\s*it\s*going|nice\s*to\s*meet|what'?s\s*up)\b/i,
      /\b(c[óo]mo\s*est[áa]s|qu[ée]\s*tal|mucho\s*gusto)\b/i,
      /\b(comment\s*[çc]a\s*va|enchant[ée])\b/i,
      /\b(wie\s*geht'?s|freut\s*mich)\b/i,
      /(お元気|はじめまして|調子)/,
      /(你好吗|很高兴|怎么样)/,
    ],
  },
];

export function classifyPhrase(phrase: string): MasteryCategory {
  if (!phrase) return "general";
  for (const p of PATTERNS) {
    if (p.patterns.some((re) => re.test(phrase))) return p.id;
  }
  return "general";
}

export function getCategoryMeta(
  id: MasteryCategory
): { label: string; icon: string } {
  if (id === "general") return { label: "something new", icon: "sparkles-outline" };
  const hit = PATTERNS.find((p) => p.id === id);
  return hit ? { label: hit.label, icon: hit.icon } : { label: "something new", icon: "sparkles-outline" };
}

// ── Storage ──────────────────────────────────────────────────────────────────

const KEYS = {
  scores: "lang:mastery:scores",           // { "greeting:es": { samples: [score], lastAt: ts, celebrated: true? } }
  celebrations: "lang:mastery:celebrations", // { category: ts }
} as const;

interface CategoryBucket {
  samples: number[];     // last ~6 attempt scores
  lastAt: number;
  celebrated: boolean;   // have we already shown the "you learned …" banner?
}

type BucketMap = Record<string, CategoryBucket>;

async function readBuckets(): Promise<BucketMap> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.scores);
    return raw ? (JSON.parse(raw) as BucketMap) : {};
  } catch {
    return {};
  }
}

async function writeBuckets(map: BucketMap): Promise<void> {
  await AsyncStorage.setItem(KEYS.scores, JSON.stringify(map));
}

function bucketKey(languageCode: string, category: MasteryCategory) {
  return `${category}:${languageCode}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface MasteryOutcome {
  category: MasteryCategory;
  celebrated: boolean;          // true when THIS update newly unlocked mastery
  average: number;
  sampleCount: number;
  categoryLabel: string;        // for the banner copy
  categoryIcon: string;
}

const MASTER_AVG = 85;
const MIN_SAMPLES = 2;

export async function recordMasteryAttempt(
  languageCode: string,
  phrase: string,
  score: number
): Promise<MasteryOutcome> {
  const category = classifyPhrase(phrase);
  const meta = getCategoryMeta(category);

  // We never celebrate "general" — it's a catch-all with no meaningful grouping.
  if (category === "general") {
    return {
      category,
      celebrated: false,
      average: score,
      sampleCount: 1,
      categoryLabel: meta.label,
      categoryIcon: meta.icon,
    };
  }

  const map = await readBuckets();
  const key = bucketKey(languageCode, category);
  const existing = map[key] || { samples: [], lastAt: 0, celebrated: false };

  const samples = [score, ...existing.samples].slice(0, 6);
  const avg = samples.reduce((s, v) => s + v, 0) / samples.length;

  let celebratedNow = false;
  if (!existing.celebrated && samples.length >= MIN_SAMPLES && avg >= MASTER_AVG) {
    celebratedNow = true;
  }

  map[key] = {
    samples,
    lastAt: Date.now(),
    celebrated: existing.celebrated || celebratedNow,
  };
  await writeBuckets(map);

  return {
    category,
    celebrated: celebratedNow,
    average: Math.round(avg),
    sampleCount: samples.length,
    categoryLabel: meta.label,
    categoryIcon: meta.icon,
  };
}

export async function getRecentlyLearnedCategories(limit = 3): Promise<Array<{
  category: MasteryCategory;
  languageCode: string;
  label: string;
  at: number;
}>> {
  const map = await readBuckets();
  const mastered: Array<{ key: string; at: number }> = [];
  for (const [key, bucket] of Object.entries(map)) {
    if (bucket.celebrated) mastered.push({ key, at: bucket.lastAt });
  }
  mastered.sort((a, b) => b.at - a.at);
  return mastered.slice(0, limit).map(({ key, at }) => {
    const [categoryId, languageCode] = key.split(":") as [MasteryCategory, string];
    const meta = getCategoryMeta(categoryId);
    return { category: categoryId, languageCode, label: meta.label, at };
  });
}
