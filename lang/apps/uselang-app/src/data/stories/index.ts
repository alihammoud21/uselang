// ── Story data index ─────────────────────────────────────────────────────────
export interface VocabWord {
  target: string;       // word in target language
  phonetic?: string;    // romanization / pinyin
  meaning: string;      // english meaning
}

export interface StoryChoice {
  id: string;
  label: string;         // shown on the button (in target lang)
  labelHint: string;     // translation shown underneath
  isRisky: boolean;      // risky path = higher XP but can backfire
  xpReward: number;
  xpPenalty: number;     // only applied if isRisky and rolled bad outcome
  outcome: string;       // narrative result shown after choice (english)
  outcomeTarget: string; // narrative result in target language
}

export interface StoryScene {
  id: string;
  narration: string;       // english narration shown above
  targetLine: string;      // key sentence in target language
  targetPhonetic?: string;
  choices: StoryChoice[];
}

export interface Story {
  id: string;
  languageCode: string;
  title: string;
  titleTarget: string;
  setting: string;        // one-liner setting description
  coverIcon: string;      // Ionicon name
  coverColor: string;
  vocab: VocabWord[];
  scenes: StoryScene[];
}

const ZH_STORY: Story = {
  id: "zh-shanghai",
  languageCode: "zh",
  title: "Lost in Shanghai",
  titleTarget: "在上海迷路了",
  setting: "You arrive in Shanghai and need to find your hotel.",
  coverIcon: "business",
  coverColor: "#1A237E",
  vocab: [
    { target: "你好", phonetic: "nǐ hǎo", meaning: "Hello" },
    { target: "谢谢", phonetic: "xiè xiè", meaning: "Thank you" },
    { target: "在哪里", phonetic: "zài nǎ lǐ", meaning: "Where is…" },
    { target: "酒店", phonetic: "jiǔ diàn", meaning: "Hotel" },
    { target: "帮助", phonetic: "bāng zhù", meaning: "Help" },
    { target: "出租车", phonetic: "chū zū chē", meaning: "Taxi" },
    { target: "多少钱", phonetic: "duō shǎo qián", meaning: "How much?" },
    { target: "地铁", phonetic: "dì tiě", meaning: "Subway" },
  ],
  scenes: [
    {
      id: "scene-1",
      narration: "You've just landed at Pudong Airport. A local sees you looking confused.",
      targetLine: "你好！需要帮助吗？",
      targetPhonetic: "nǐ hǎo! xū yào bāng zhù ma?",
      choices: [
        {
          id: "c1a",
          label: "谢谢！酒店在哪里？",
          labelHint: "Thank you! Where is the hotel?",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "The local smiles and points you toward the taxi stand.",
          outcomeTarget: "当然！出租车站在那边。",
        },
        {
          id: "c1b",
          label: "我不说中文。",
          labelHint: "I don't speak Chinese.",
          isRisky: true,
          xpReward: 25,
          xpPenalty: 10,
          outcome: "The local shrugs — but a passerby translates and helps!",
          outcomeTarget: "没关系，我帮你！",
        },
      ],
    },
    {
      id: "scene-2",
      narration: "You're in the taxi. The driver asks which hotel.",
      targetLine: "你去哪个酒店？",
      targetPhonetic: "nǐ qù nǎ gè jiǔ diàn?",
      choices: [
        {
          id: "c2a",
          label: "去外滩酒店，谢谢。",
          labelHint: "To the Bund Hotel, please.",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "The driver nods and takes off. You arrive in 20 minutes.",
          outcomeTarget: "好的，我知道那个地方！",
        },
        {
          id: "c2b",
          label: "多少钱？先告诉我。",
          labelHint: "How much? Tell me first.",
          isRisky: true,
          xpReward: 30,
          xpPenalty: 15,
          outcome: "Smart! The driver gives you a flat fare — but it takes longer because he takes the scenic route.",
          outcomeTarget: "一百二十块，固定价格。",
        },
      ],
    },
    {
      id: "scene-3",
      narration: "At the hotel, the receptionist asks if you have a reservation.",
      targetLine: "您有预订吗？",
      targetPhonetic: "nín yǒu yù dìng ma?",
      choices: [
        {
          id: "c3a",
          label: "有的，我叫阿里。",
          labelHint: "Yes, my name is Ali.",
          isRisky: false,
          xpReward: 20,
          xpPenalty: 0,
          outcome: "You check in smoothly. The receptionist is impressed by your Chinese!",
          outcomeTarget: "太好了！欢迎入住！",
        },
        {
          id: "c3b",
          label: "地铁站在哪里？",
          labelHint: "Where is the subway station?",
          isRisky: true,
          xpReward: 35,
          xpPenalty: 20,
          outcome: "The wrong question! The receptionist looks confused — but then laughs and helps you check in anyway.",
          outcomeTarget: "哈哈，先登记入住吧！",
        },
      ],
    },
  ],
};

const ES_STORY: Story = {
  id: "es-madrid",
  languageCode: "es",
  title: "A Day in Madrid",
  titleTarget: "Un día en Madrid",
  setting: "You spend a morning exploring Madrid and finding the market.",
  coverIcon: "sunny",
  coverColor: "#B71C1C",
  vocab: [
    { target: "Hola", meaning: "Hello" },
    { target: "Por favor", meaning: "Please" },
    { target: "Gracias", meaning: "Thank you" },
    { target: "¿Dónde está?", meaning: "Where is…?" },
    { target: "El mercado", meaning: "The market" },
    { target: "Quiero", meaning: "I want" },
    { target: "¿Cuánto cuesta?", meaning: "How much does it cost?" },
    { target: "La cuenta", meaning: "The bill" },
  ],
  scenes: [
    {
      id: "scene-1",
      narration: "You arrive at Puerta del Sol. A street vendor calls out to you.",
      targetLine: "¡Hola! ¿Quieres probar algo?",
      choices: [
        {
          id: "c1a",
          label: "Sí, ¿cuánto cuesta?",
          labelHint: "Yes, how much does it cost?",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "The vendor smiles and hands you a free sample of churros!",
          outcomeTarget: "¡Es gratis para ti! ¡Bienvenido a Madrid!",
        },
        {
          id: "c1b",
          label: "No gracias, busco el mercado.",
          labelHint: "No thanks, I'm looking for the market.",
          isRisky: true,
          xpReward: 25,
          xpPenalty: 10,
          outcome: "The vendor is slightly offended but points you in the right direction anyway.",
          outcomeTarget: "El mercado está a dos calles de aquí.",
        },
      ],
    },
    {
      id: "scene-2",
      narration: "At the market, you want to buy some jamón ibérico.",
      targetLine: "¿Dónde está el jamón ibérico?",
      choices: [
        {
          id: "c2a",
          label: "Quiero un poco, por favor.",
          labelHint: "I want some, please.",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "The vendor slices a generous portion and wraps it perfectly.",
          outcomeTarget: "¡Claro! ¿Cuánto quieres?",
        },
        {
          id: "c2b",
          label: "¿Puede hacer un descuento?",
          labelHint: "Can you give me a discount?",
          isRisky: true,
          xpReward: 30,
          xpPenalty: 15,
          outcome: "Bold! The vendor laughs, respects the hustle, and gives you 10% off.",
          outcomeTarget: "¡Muy bien! Te doy un descuento.",
        },
      ],
    },
    {
      id: "scene-3",
      narration: "Lunch at a tapas bar. The waiter brings the check without asking.",
      targetLine: "Aquí tiene la cuenta.",
      choices: [
        {
          id: "c3a",
          label: "Gracias. ¿Puedo pagar con tarjeta?",
          labelHint: "Thank you. Can I pay by card?",
          isRisky: false,
          xpReward: 20,
          xpPenalty: 0,
          outcome: "Of course! You tap your card and leave a smile behind.",
          outcomeTarget: "Por supuesto. Muchas gracias.",
        },
        {
          id: "c3b",
          label: "¡No pedí la cuenta todavía!",
          labelHint: "I didn't ask for the bill yet!",
          isRisky: true,
          xpReward: 30,
          xpPenalty: 10,
          outcome: "The waiter apologizes profusely and brings you a free dessert.",
          outcomeTarget: "Lo siento mucho. ¿Le traigo un postre?",
        },
      ],
    },
  ],
};

const FR_STORY: Story = {
  id: "fr-paris",
  languageCode: "fr",
  title: "Paris Mystery",
  titleTarget: "Mystère à Paris",
  setting: "You're visiting Paris and stumble upon a mystery near the Louvre.",
  coverIcon: "search",
  coverColor: "#1A237E",
  vocab: [
    { target: "Bonjour", meaning: "Hello / Good day" },
    { target: "S'il vous plaît", meaning: "Please" },
    { target: "Merci", meaning: "Thank you" },
    { target: "Où est…?", meaning: "Where is…?" },
    { target: "Je ne comprends pas", meaning: "I don't understand" },
    { target: "Combien ça coûte?", meaning: "How much does it cost?" },
    { target: "Excusez-moi", meaning: "Excuse me" },
    { target: "L'aide", meaning: "Help" },
  ],
  scenes: [
    {
      id: "scene-1",
      narration: "You're near the Louvre when someone drops a mysterious envelope and rushes away.",
      targetLine: "Excusez-moi! Vous avez oublié quelque chose!",
      choices: [
        {
          id: "c1a",
          label: "Attendez! C'est à vous?",
          labelHint: "Wait! Is this yours?",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "The stranger stops, looks surprised, and thanks you warmly.",
          outcomeTarget: "Merci beaucoup! Vous êtes très gentil.",
        },
        {
          id: "c1b",
          label: "Je garde l'enveloppe.",
          labelHint: "I'll keep the envelope.",
          isRisky: true,
          xpReward: 30,
          xpPenalty: 15,
          outcome: "Inside is a treasure map! But a guard spots you and asks questions.",
          outcomeTarget: "Qu'est-ce que vous faites là?",
        },
      ],
    },
    {
      id: "scene-2",
      narration: "You follow the stranger to a café near the Seine.",
      targetLine: "Bonjour, je peux vous aider?",
      choices: [
        {
          id: "c2a",
          label: "Oui, un café s'il vous plaît.",
          labelHint: "Yes, a coffee please.",
          isRisky: false,
          xpReward: 15,
          xpPenalty: 0,
          outcome: "Perfect cover! The stranger sits nearby and starts talking.",
          outcomeTarget: "Bien sûr. Et voilà!",
        },
        {
          id: "c2b",
          label: "Je cherche quelqu'un.",
          labelHint: "I'm looking for someone.",
          isRisky: true,
          xpReward: 25,
          xpPenalty: 10,
          outcome: "The waiter gives you a suspicious look but the stranger waves you over.",
          outcomeTarget: "Qui cherchez-vous?",
        },
      ],
    },
    {
      id: "scene-3",
      narration: "The stranger reveals the envelope contains a gift for the Louvre director. They need your help to translate.",
      targetLine: "Pouvez-vous m'aider à traduire?",
      choices: [
        {
          id: "c3a",
          label: "Oui, avec plaisir!",
          labelHint: "Yes, with pleasure!",
          isRisky: false,
          xpReward: 25,
          xpPenalty: 0,
          outcome: "You help successfully. The director invites you both for a private tour!",
          outcomeTarget: "Fantastique! Bienvenue au Louvre.",
        },
        {
          id: "c3b",
          label: "Je ne comprends pas le français assez bien.",
          labelHint: "I don't understand French well enough.",
          isRisky: true,
          xpReward: 35,
          xpPenalty: 20,
          outcome: "An honest admission — the director laughs and says your French is better than you think!",
          outcomeTarget: "Votre français est excellent! Ne vous inquiétez pas.",
        },
      ],
    },
  ],
};

export const STORIES: Story[] = [ZH_STORY, ES_STORY, FR_STORY];

export function getStory(languageCode: string): Story | undefined {
  return STORIES.find((s) => s.languageCode === languageCode);
}
