// ── Language Jokes data ──────────────────────────────────────────────────────

export interface Joke {
  id: string;
  setup: string;           // setup in target language
  setupRomanized?: string; // pinyin / romanization
  setupMeaning: string;    // english meaning of setup
  punchline: string;       // punchline in target language
  punchlineRomanized?: string;
  punchlineMeaning: string;// english meaning of punchline
  explanation?: string;    // why it's funny (for cultural context)
}

export interface LanguageJokes {
  languageCode: string;
  jokes: Joke[];
}

const ZH_JOKES: LanguageJokes = {
  languageCode: "zh",
  jokes: [
    {
      id: "zh-1",
      setup: "为什么数学书总是不开心？",
      setupRomanized: "Wèishéme shùxué shū zǒng shì bù kāixīn?",
      setupMeaning: "Why is the math book always unhappy?",
      punchline: "因为它有太多问题！",
      punchlineRomanized: "Yīnwèi tā yǒu tài duō wèntí!",
      punchlineMeaning: "Because it has too many problems!",
      explanation: "问题 (wèntí) means both 'problems' (math) and 'questions' — just like in English!",
    },
    {
      id: "zh-2",
      setup: "厨师的工作有什么秘密？",
      setupRomanized: "Chúshī de gōngzuò yǒu shénme mìmì?",
      setupMeaning: "What's the chef's work secret?",
      punchline: "他把所有事都炒起来！",
      punchlineRomanized: "Tā bǎ suǒyǒu shì dōu chǎo qǐlai!",
      punchlineMeaning: "He stir-fries everything!",
      explanation: "炒 (chǎo) means both 'to stir-fry' and 'to fire someone'. A classic double meaning!",
    },
    {
      id: "zh-3",
      setup: "我的朋友说他能说三种语言。",
      setupRomanized: "Wǒ de péngyǒu shuō tā néng shuō sān zhǒng yǔyán.",
      setupMeaning: "My friend says he can speak three languages.",
      punchline: "普通话、广东话和胡说！",
      punchlineRomanized: "Pǔtōnghuà, Guǎngdōnghuà hé húshuō!",
      punchlineMeaning: "Mandarin, Cantonese, and nonsense!",
      explanation: "胡说 (húshuō) means 'talking nonsense'. A play on listing languages!",
    },
    {
      id: "zh-4",
      setup: "两个鸡蛋在煎锅里。一个说：",
      setupRomanized: "Liǎng gè jīdàn zài jiān guō lǐ. Yī gè shuō:",
      setupMeaning: "Two eggs in a frying pan. One says:",
      punchline: "天啊，好热！另一个说：啊！一个会说话的鸡蛋！",
      punchlineRomanized: "Tiān a, hǎo rè! Lìng yīgè shuō: Ah! Yī gè huì shuōhuà de jīdàn!",
      punchlineMeaning: "It's so hot! The other says: Ahh! A talking egg!",
      explanation: "The twist — the surprised egg forgets it's also talking!",
    },
    {
      id: "zh-5",
      setup: "老师问学生：你能造一个关于时间的句子吗？",
      setupRomanized: "Lǎoshī wèn xuéshēng: Nǐ néng zào yīgè guānyú shíjiān de jùzi ma?",
      setupMeaning: "Teacher asks the student: Can you make a sentence about time?",
      punchline: "学生说：时间飞逝，就像我的作业。",
      punchlineRomanized: "Xuéshēng shuō: Shíjiān fēishì, jiù xiàng wǒ de zuòyè.",
      punchlineMeaning: "The student says: Time flies, just like my homework.",
      explanation: "Time flies, and so does the homework — into the trash!",
    },
  ],
};

const ES_JOKES: LanguageJokes = {
  languageCode: "es",
  jokes: [
    {
      id: "es-1",
      setup: "¿Cuál es el animal más antiguo?",
      setupMeaning: "What is the oldest animal?",
      punchline: "¡La cobra, porque ya existía antes de Dios! — 'Y dijo Dios: cobra'",
      punchlineMeaning: "The cobra, because it existed before God! — 'And God said: cobra (collect)'",
      explanation: "Cobra means both the snake AND 'to collect payment'. 'Dios cobra' = 'God charges'.",
    },
    {
      id: "es-2",
      setup: "¿Por qué los pájaros vuelan hacia el sur en invierno?",
      setupMeaning: "Why do birds fly south in winter?",
      punchline: "¡Porque caminar sería demasiado lejos!",
      punchlineMeaning: "Because walking would be too far!",
      explanation: "Classic anti-joke — takes the question literally!",
    },
    {
      id: "es-3",
      setup: "¿Qué le dijo el océano a la playa?",
      setupMeaning: "What did the ocean say to the beach?",
      punchline: "¡Nada! ¡El océano no habla!",
      punchlineMeaning: "Nothing! The ocean doesn't talk!",
      explanation: "Nada means both 'nothing' and 'he/she swims' in Spanish — double meaning!",
    },
    {
      id: "es-4",
      setup: "¿Por qué el libro de matemáticas es el más triste?",
      setupMeaning: "Why is the math book the saddest?",
      punchline: "¡Porque tiene demasiados problemas!",
      punchlineMeaning: "Because it has too many problems!",
    },
    {
      id: "es-5",
      setup: "¿Sabes por qué Napoleón compraba pantalones grandes?",
      setupMeaning: "Do you know why Napoleon bought big pants?",
      punchline: "Para tener Napoleón Bonaparte. ¡Bon-a-parte!",
      punchlineMeaning: "To have Napoleon 'good part'. Bon-a-parte!",
      explanation: "Bonaparte sounds like 'bon a parte' = 'good part' (of the pants) in Spanish slang.",
    },
  ],
};

const FR_JOKES: LanguageJokes = {
  languageCode: "fr",
  jokes: [
    {
      id: "fr-1",
      setup: "Pourquoi les plongeurs plongent-ils toujours en arrière?",
      setupMeaning: "Why do scuba divers always fall backwards?",
      punchline: "Parce que s'ils tombaient en avant, ils resteraient dans le bateau!",
      punchlineMeaning: "Because if they fell forward, they'd stay in the boat!",
    },
    {
      id: "fr-2",
      setup: "Qu'est-ce qu'un crocodile qui surveille la cour?",
      setupMeaning: "What is a crocodile that watches over the yard?",
      punchline: "Un croco-dîle!",
      punchlineMeaning: "A croco-yard! (dîle ≈ 'yard' in verlan slang)",
      explanation: "A play on 'crocodile' and 'surveille' — cour sounds like 'cour' (yard).",
    },
    {
      id: "fr-3",
      setup: "Quel est le comble pour un électricien?",
      setupMeaning: "What's the height of irony for an electrician?",
      punchline: "De ne pas être au courant!",
      punchlineMeaning: "To not be 'au courant'!",
      explanation: "'Au courant' means both 'informed/up to date' AND 'in the current' (electrical). Classic French wordplay!",
    },
    {
      id: "fr-4",
      setup: "Qu'est-ce que le Petit Prince a dit au renard?",
      setupMeaning: "What did the Little Prince say to the fox?",
      punchline: "Tu as de beaux yeux, tu sais? Et le renard dit: ça renard bien!",
      punchlineMeaning: "You have beautiful eyes, you know? And the fox said: That fox well!",
      explanation: "'Ça renard bien' sounds like 'Ça va bien' (I'm fine) — renard = fox!",
    },
    {
      id: "fr-5",
      setup: "Pourquoi les Français mangent-ils des escargots?",
      setupMeaning: "Why do French people eat snails?",
      punchline: "Parce qu'ils n'aiment pas le fast-food!",
      punchlineMeaning: "Because they don't like fast food!",
      explanation: "Snails are the opposite of fast food — perfectly French!",
    },
  ],
};

export const ALL_JOKES: LanguageJokes[] = [ZH_JOKES, ES_JOKES, FR_JOKES];

export function getJokesForLanguage(languageCode: string): Joke[] {
  return ALL_JOKES.find((j) => j.languageCode === languageCode)?.jokes ?? [];
}

export function getDailyJoke(languageCode: string): Joke | undefined {
  const jokes = getJokesForLanguage(languageCode);
  if (jokes.length === 0) return undefined;
  // Rotate by day number so a different joke shows each day
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return jokes[dayOfYear % jokes.length];
}
