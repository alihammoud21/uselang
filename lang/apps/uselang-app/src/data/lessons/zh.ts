// ── Mandarin Curriculum ──────────────────────────────────────────────────────
// The PRIMARY language — deepest content, most exercises, most polished.
// 100% offline. Every exercise is hand-crafted.

import type { LanguageCurriculum } from "@/lib/lesson-types";

export const MANDARIN_CURRICULUM: LanguageCurriculum = {
  languageCode: "zh",
  languageLabel: "Mandarin",
  units: [
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 1: Sounds & Basics
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u1",
      title: "Sounds & Basics",
      description: "Master the building blocks: tones, pinyin, and your first greetings.",
      lessons: [
        // ── Lesson 1.1: Tones & Pinyin ──────────────────────────────────
        {
          id: "zh-u1-l1",
          title: "The Four Tones",
          description: "Mandarin has 4 tones + a neutral tone. Getting these right is the #1 key to being understood.",
          realWorldAbility: "You can pronounce Mandarin tones correctly",
          parts: [
            {
              id: "zh-u1-l1-p1",
              title: "Meet the Tones",
              description: "Learn how each tone sounds and feels.",
              exercises: [
                { type: "vocab-card", word: "mā", pinyin: "mā", translation: "mother (1st tone: high flat)", tip: "Hold your voice steady and high, like singing a note." },
                { type: "vocab-card", word: "má", pinyin: "má", translation: "hemp (2nd tone: rising)", tip: "Like asking 'What?' — your voice rises from mid to high." },
                { type: "vocab-card", word: "mǎ", pinyin: "mǎ", translation: "horse (3rd tone: dip)", tip: "Voice dips down then back up, like a valley." },
                { type: "vocab-card", word: "mà", pinyin: "mà", translation: "scold (4th tone: falling)", tip: "Sharp and decisive, like giving a command: 'Stop!'" },
                { type: "vocab-card", word: "ma", pinyin: "ma", translation: "question particle (neutral tone)", tip: "Light and short. No stress at all." },
              ],
            },
            {
              id: "zh-u1-l1-p2",
              title: "Tone Practice",
              description: "Test your tone recognition.",
              exercises: [
                { type: "multiple-choice", question: "Which tone rises from mid to high?", options: ["1st tone (flat)", "2nd tone (rising)", "3rd tone (dip)", "4th tone (falling)"], correctIndex: 1, explanation: "The 2nd tone rises — think of asking a surprised 'What?'" },
                { type: "multiple-choice", question: "'mǎ' (horse) uses which tone?", options: ["1st tone", "2nd tone", "3rd tone", "4th tone"], correctIndex: 2, explanation: "The ˇ mark shows the 3rd tone — the dipping tone." },
                { type: "multiple-choice", question: "Which tone sounds like a sharp command?", options: ["1st (flat)", "2nd (rising)", "3rd (dip)", "4th (falling)"], correctIndex: 3, explanation: "The 4th tone falls sharply — decisive and quick." },
                { type: "fill-blank", sentence: "The tone mark ˉ (flat line) represents the ___ tone.", answer: "1st", explanation: "ˉ is flat → 1st tone, held high and steady." },
                { type: "match-pairs", pairs: [{ left: "mā", right: "mother" }, { left: "má", right: "hemp" }, { left: "mǎ", right: "horse" }, { left: "mà", right: "scold" }] },
              ],
            },
            {
              id: "zh-u1-l1-p3",
              title: "Real Pinyin Reading",
              description: "Read pinyin and identify meanings.",
              exercises: [
                { type: "multiple-choice", question: "What does 'tā' mean?", options: ["he/she", "too (also)", "soup", "candy"], correctIndex: 0, explanation: "'tā' (他/她) means he or she — same sound, different character." },
                { type: "translate", prompt: "nǐ hǎo", promptLang: "target", acceptedAnswers: ["hello", "hi", "hey"], explanation: "'nǐ hǎo' literally means 'you good' — the standard greeting." },
                { type: "reorder", words: ["hǎo", "nǐ"], correctOrder: ["nǐ", "hǎo"], translation: "Hello", explanation: "In Chinese: 'you' comes before 'good' → nǐ hǎo." },
              ],
            },
          ],
        },
        // ── Lesson 1.2: Basic Greetings ─────────────────────────────────
        {
          id: "zh-u1-l2",
          title: "Greetings",
          description: "Say hello, goodbye, and basic pleasantries.",
          realWorldAbility: "You can greet people in Mandarin",
          mapLocationId: "zh-map-street-beijing",
          parts: [
            {
              id: "zh-u1-l2-p1",
              title: "Essential Words",
              description: "Core greeting vocabulary.",
              exercises: [
                { type: "vocab-card", word: "你好", pinyin: "nǐ hǎo", translation: "hello", tip: "The universal Chinese greeting." },
                { type: "vocab-card", word: "再见", pinyin: "zài jiàn", translation: "goodbye", tip: "Literally 'again see' — see you again." },
                { type: "vocab-card", word: "谢谢", pinyin: "xiè xie", translation: "thank you", tip: "Both characters are 4th tone → neutral." },
                { type: "vocab-card", word: "不客气", pinyin: "bú kè qi", translation: "you're welcome", tip: "Literally 'not polite' — don't be so formal!" },
                { type: "vocab-card", word: "对不起", pinyin: "duì bu qǐ", translation: "sorry", tip: "Literally 'cannot face (you)' — I feel bad." },
                { type: "vocab-card", word: "没关系", pinyin: "méi guān xi", translation: "it's okay / no problem", tip: "The reply to 'sorry'." },
              ],
            },
            {
              id: "zh-u1-l2-p2",
              title: "Practice",
              description: "Use the greetings in context.",
              exercises: [
                { type: "translate", prompt: "hello", promptLang: "native", acceptedAnswers: ["你好", "ni hao", "nǐ hǎo"], explanation: "'你好' (nǐ hǎo) is the standard greeting." },
                { type: "translate", prompt: "thank you", promptLang: "native", acceptedAnswers: ["谢谢", "xie xie", "xiè xie"], explanation: "'谢谢' (xiè xie) — always appreciated!" },
                { type: "multiple-choice", question: "How do you say 'goodbye'?", options: ["谢谢", "再见", "你好", "对不起"], correctIndex: 1, explanation: "'再见' (zài jiàn) means goodbye — 'see you again'." },
                { type: "match-pairs", pairs: [{ left: "你好", right: "hello" }, { left: "再见", right: "goodbye" }, { left: "谢谢", right: "thank you" }, { left: "对不起", right: "sorry" }] },
                { type: "fill-blank", sentence: "A: 对不起！ B: ___", answer: "没关系", options: ["没关系", "谢谢", "再见"], explanation: "When someone says sorry, reply with '没关系' (it's okay)." },
              ],
            },
            {
              id: "zh-u1-l2-p3",
              title: "Street Encounter",
              description: "Use greetings in a real situation.",
              exercises: [
                { type: "scenario", situation: "You bump into someone on the street in Beijing.", npcLine: "哎呀！", npcLinePinyin: "āi yā!", npcLineTranslation: "Oh no!", options: [{ text: "对不起！", correct: true, feedback: "Perfect! '对不起' is the right response when you bump into someone." }, { text: "你好！", correct: false, feedback: "That means 'hello' — you need to apologize, not greet!" }, { text: "再见！", correct: false, feedback: "'再见' means goodbye — don't walk away without apologizing!" }] },
                { type: "scenario", situation: "A shopkeeper helps you find something.", npcLine: "给你。", npcLinePinyin: "gěi nǐ.", npcLineTranslation: "Here you go.", options: [{ text: "谢谢！", correct: true, feedback: "Yes! Always say thank you when someone helps you." }, { text: "对不起", correct: false, feedback: "That means 'sorry' — they helped you, say thanks!" }, { text: "没关系", correct: false, feedback: "'没关系' means 'no problem' — say thanks instead." }] },
                { type: "build-sentence", translation: "Hello, thank you, goodbye!", wordBank: ["你好", "谢谢", "再见", "对不起"], correctOrder: ["你好", "谢谢", "再见"], explanation: "A basic polite sequence: greet, thank, farewell." },
              ],
            },
          ],
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 2: Introductions
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u2",
      title: "Introductions",
      description: "Tell people your name, ask theirs, and have a basic self-introduction.",
      lessons: [
        {
          id: "zh-u2-l1",
          title: "What's Your Name?",
          description: "Learn to introduce yourself and ask someone's name.",
          realWorldAbility: "You can introduce yourself in Mandarin",
          mapLocationId: "zh-map-hotel-beijing",
          parts: [
            {
              id: "zh-u2-l1-p1",
              title: "Key Vocabulary",
              description: "Names and introductions.",
              exercises: [
                { type: "vocab-card", word: "我", pinyin: "wǒ", translation: "I / me", tip: "The most common word in Mandarin." },
                { type: "vocab-card", word: "你", pinyin: "nǐ", translation: "you", tip: "3rd tone — dips down then rises." },
                { type: "vocab-card", word: "叫", pinyin: "jiào", translation: "to be called / name is", tip: "Used for introducing names." },
                { type: "vocab-card", word: "什么", pinyin: "shén me", translation: "what", tip: "The universal question word." },
                { type: "vocab-card", word: "名字", pinyin: "míng zi", translation: "name", tip: "'míng' = name, 'zi' = character/word." },
                { type: "vocab-card", word: "是", pinyin: "shì", translation: "am / is / are", tip: "The verb 'to be'. Used for identity statements." },
              ],
            },
            {
              id: "zh-u2-l1-p2",
              title: "Sentence Patterns",
              description: "Build introduction sentences.",
              exercises: [
                { type: "vocab-card", word: "我叫…", pinyin: "wǒ jiào…", translation: "My name is…", tip: "The simplest way to say your name." },
                { type: "vocab-card", word: "你叫什么名字？", pinyin: "nǐ jiào shén me míng zi?", translation: "What is your name?", tip: "Literally: 'You called what name?'" },
                { type: "reorder", words: ["叫", "我", "小明"], correctOrder: ["我", "叫", "小明"], translation: "My name is Xiaoming", explanation: "Chinese word order: Subject + Verb + Object → 我叫小明" },
                { type: "reorder", words: ["名字", "什么", "你", "叫"], correctOrder: ["你", "叫", "什么", "名字"], translation: "What is your name?", explanation: "Question words stay in place in Chinese — no inversion needed." },
                { type: "build-sentence", translation: "I am a student", wordBank: ["我", "是", "学生", "你"], correctOrder: ["我", "是", "学生"], explanation: "'我是学生' — I + am + student. Simple SVO." },
              ],
            },
            {
              id: "zh-u2-l1-p3",
              title: "Meet Someone",
              description: "Practice a real introduction.",
              exercises: [
                { type: "scenario", situation: "You check into a hotel in Beijing. The receptionist greets you.", npcLine: "你好！你叫什么名字？", npcLinePinyin: "nǐ hǎo! nǐ jiào shén me míng zi?", npcLineTranslation: "Hello! What is your name?", options: [{ text: "我叫 David。", correct: true, feedback: "Perfect! '我叫 + name' is the standard response." }, { text: "你好。", correct: false, feedback: "That's just 'hello' — they asked your name!" }, { text: "谢谢。", correct: false, feedback: "'谢谢' means thank you — answer their question." }] },
                { type: "translate", prompt: "My name is Li Wei", promptLang: "native", acceptedAnswers: ["我叫李伟", "wǒ jiào lǐ wěi", "我叫 Li Wei"], explanation: "'我叫' + name is the standard pattern." },
                { type: "multiple-choice", question: "What does '你叫什么名字' mean?", options: ["How are you?", "What is your name?", "Where are you from?", "How old are you?"], correctIndex: 1, explanation: "'你叫什么名字？' = What is your name? Literally: 'You called what name?'" },
              ],
            },
          ],
        },
        {
          id: "zh-u2-l2",
          title: "Where Are You From?",
          description: "Talk about nationality and countries.",
          realWorldAbility: "You can tell people where you're from",
          parts: [
            {
              id: "zh-u2-l2-p1",
              title: "Countries & Nationality",
              description: "Learn country names and how to say where you're from.",
              exercises: [
                { type: "vocab-card", word: "中国", pinyin: "zhōng guó", translation: "China", tip: "Literally 'Middle Kingdom'." },
                { type: "vocab-card", word: "美国", pinyin: "měi guó", translation: "America / USA", tip: "Literally 'Beautiful Country'." },
                { type: "vocab-card", word: "人", pinyin: "rén", translation: "person / people", tip: "Add after a country for nationality: 中国人 = Chinese person." },
                { type: "vocab-card", word: "哪里", pinyin: "nǎ lǐ", translation: "where", tip: "Use in questions about location or origin." },
                { type: "vocab-card", word: "来", pinyin: "lái", translation: "to come (from)", tip: "Used with 从 (from): 我从美国来." },
                { type: "vocab-card", word: "从", pinyin: "cóng", translation: "from", tip: "Indicates origin: 从 + place + 来." },
              ],
            },
            {
              id: "zh-u2-l2-p2",
              title: "Practice Nationality",
              description: "Build sentences about where you're from.",
              exercises: [
                { type: "translate", prompt: "I am American", promptLang: "native", acceptedAnswers: ["我是美国人", "wǒ shì měi guó rén"], explanation: "'我是美国人' — I am American (person)." },
                { type: "reorder", words: ["人", "我", "是", "中国"], correctOrder: ["我", "是", "中国", "人"], translation: "I am Chinese", explanation: "我 + 是 + 中国人 — nationality = country + 人." },
                { type: "fill-blank", sentence: "你是哪里___？", answer: "人", options: ["人", "国", "来"], explanation: "'你是哪里人？' = Where are you from? (Which place's person?)" },
                { type: "multiple-choice", question: "How do you say 'I come from America'?", options: ["我是美国", "我从美国来", "美国是我", "我来美国"], correctIndex: 1, explanation: "'我从美国来' — I from America come. The 从…来 pattern." },
                { type: "match-pairs", pairs: [{ left: "中国", right: "China" }, { left: "美国", right: "America" }, { left: "法国", right: "France" }, { left: "日本", right: "Japan" }] },
              ],
            },
            {
              id: "zh-u2-l2-p3",
              title: "Conversation Practice",
              description: "Full introduction conversation.",
              exercises: [
                { type: "scenario", situation: "You meet someone at a hostel.", npcLine: "你好！你是哪里人？", npcLinePinyin: "nǐ hǎo! nǐ shì nǎ lǐ rén?", npcLineTranslation: "Hello! Where are you from?", options: [{ text: "我是美国人。你呢？", correct: true, feedback: "Great! You answered and asked back with '你呢?' (and you?)." }, { text: "我叫 David。", correct: false, feedback: "They asked where you're from, not your name." }, { text: "谢谢。", correct: false, feedback: "They're asking a question — answer it!" }] },
                { type: "build-sentence", translation: "I come from France", wordBank: ["我", "从", "法国", "来", "是"], correctOrder: ["我", "从", "法国", "来"], explanation: "'我从法国来' — I from France come." },
              ],
            },
          ],
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 3: Daily Essentials
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u3",
      title: "Daily Essentials",
      description: "Numbers, time, and basic verbs you'll use every day.",
      lessons: [
        {
          id: "zh-u3-l1",
          title: "Numbers 1–100",
          description: "Count in Mandarin — the system is beautifully logical.",
          realWorldAbility: "You can count and understand numbers in Mandarin",
          parts: [
            {
              id: "zh-u3-l1-p1",
              title: "Numbers 1–10",
              description: "The foundation of all Chinese numbers.",
              exercises: [
                { type: "vocab-card", word: "一", pinyin: "yī", translation: "1 (one)", tip: "The simplest character — just one stroke." },
                { type: "vocab-card", word: "二", pinyin: "èr", translation: "2 (two)", tip: "Two strokes. Also use 两 (liǎng) before measure words." },
                { type: "vocab-card", word: "三", pinyin: "sān", translation: "3 (three)" },
                { type: "vocab-card", word: "四", pinyin: "sì", translation: "4 (four)", tip: "Sounds similar to 死 (sǐ, death) — considered unlucky." },
                { type: "vocab-card", word: "五", pinyin: "wǔ", translation: "5 (five)" },
                { type: "vocab-card", word: "六", pinyin: "liù", translation: "6 (six)" },
                { type: "vocab-card", word: "七", pinyin: "qī", translation: "7 (seven)" },
                { type: "vocab-card", word: "八", pinyin: "bā", translation: "8 (eight)", tip: "Sounds like 发 (fā, prosperity) — very lucky!" },
                { type: "vocab-card", word: "九", pinyin: "jiǔ", translation: "9 (nine)" },
                { type: "vocab-card", word: "十", pinyin: "shí", translation: "10 (ten)" },
              ],
            },
            {
              id: "zh-u3-l1-p2",
              title: "Numbers 11–100",
              description: "Chinese numbers are logical: 11 = ten-one, 20 = two-ten.",
              exercises: [
                { type: "vocab-card", word: "十一", pinyin: "shí yī", translation: "11", tip: "Ten-one = 11. See the pattern?" },
                { type: "vocab-card", word: "二十", pinyin: "èr shí", translation: "20", tip: "Two-ten = 20." },
                { type: "vocab-card", word: "五十六", pinyin: "wǔ shí liù", translation: "56", tip: "Five-ten-six = 56. Beautifully logical!" },
                { type: "vocab-card", word: "一百", pinyin: "yì bǎi", translation: "100" },
                { type: "multiple-choice", question: "How do you say 37 in Chinese?", options: ["三七", "三十七", "七三十", "七十三"], correctIndex: 1, explanation: "37 = three-ten-seven = 三十七." },
                { type: "translate", prompt: "88", promptLang: "native", acceptedAnswers: ["八十八", "bā shí bā"], explanation: "88 = eight-ten-eight = 八十八. The luckiest number!" },
                { type: "fill-blank", sentence: "99 = 九___九", answer: "十", explanation: "99 = nine-ten-nine = 九十九." },
              ],
            },
            {
              id: "zh-u3-l1-p3",
              title: "Numbers in Action",
              description: "Use numbers in real contexts.",
              exercises: [
                { type: "translate", prompt: "How much is it?", promptLang: "native", acceptedAnswers: ["多少钱", "duō shǎo qián"], explanation: "'多少钱？' — the essential shopping phrase." },
                { type: "scenario", situation: "At a market, the vendor holds up 3 fingers.", npcLine: "三十块。", npcLinePinyin: "sān shí kuài.", npcLineTranslation: "30 yuan.", options: [{ text: "太贵了！二十块可以吗？", correct: true, feedback: "Bargaining! '太贵了' = too expensive. You offered 20." }, { text: "谢谢", correct: false, feedback: "You paid without bargaining — in Chinese markets, that's unusual!" }, { text: "你好", correct: false, feedback: "They told you the price, not greeted you." }] },
                { type: "match-pairs", pairs: [{ left: "十五", right: "15" }, { left: "四十二", right: "42" }, { left: "七十", right: "70" }, { left: "一百", right: "100" }] },
              ],
            },
          ],
        },
        {
          id: "zh-u3-l2",
          title: "Basic Verbs",
          description: "Essential action words: want, have, go, eat, drink.",
          realWorldAbility: "You can express basic wants and actions",
          parts: [
            {
              id: "zh-u3-l2-p1",
              title: "Core Verbs",
              description: "The verbs you'll use in every conversation.",
              exercises: [
                { type: "vocab-card", word: "想", pinyin: "xiǎng", translation: "to want / to think", tip: "Context matters: 我想要 = I want; 我想 = I think." },
                { type: "vocab-card", word: "要", pinyin: "yào", translation: "to want / need / will", tip: "Stronger than 想. '我要' = I want (determined)." },
                { type: "vocab-card", word: "有", pinyin: "yǒu", translation: "to have", tip: "Negated with 没 (méi), not 不 (bù)." },
                { type: "vocab-card", word: "去", pinyin: "qù", translation: "to go", tip: "我去 + place = I'm going to…" },
                { type: "vocab-card", word: "吃", pinyin: "chī", translation: "to eat" },
                { type: "vocab-card", word: "喝", pinyin: "hē", translation: "to drink" },
                { type: "vocab-card", word: "买", pinyin: "mǎi", translation: "to buy" },
                { type: "vocab-card", word: "看", pinyin: "kàn", translation: "to look / see / watch" },
              ],
            },
            {
              id: "zh-u3-l2-p2",
              title: "Using Verbs",
              description: "Build sentences with action verbs.",
              exercises: [
                { type: "reorder", words: ["吃", "我", "想", "饭"], correctOrder: ["我", "想", "吃", "饭"], translation: "I want to eat (rice/food)", explanation: "我想吃饭 — I + want + eat + rice. 饭 means rice/meal." },
                { type: "translate", prompt: "I want to drink water", promptLang: "native", acceptedAnswers: ["我想喝水", "wǒ xiǎng hē shuǐ", "我要喝水"], explanation: "'我想喝水' or '我要喝水' — I want to drink water." },
                { type: "fill-blank", sentence: "我___去中国。", answer: "想", options: ["想", "吃", "喝"], explanation: "'我想去中国' — I want to go to China." },
                { type: "multiple-choice", question: "How do you say 'I don't have'?", options: ["我不有", "我没有", "我不是", "我有不"], correctIndex: 1, explanation: "'有' is negated with '没' not '不'. So: 我没有." },
                { type: "build-sentence", translation: "I want to buy this", wordBank: ["我", "想", "要", "买", "这个"], correctOrder: ["我", "想", "买", "这个"], explanation: "'我想买这个' — I want to buy this." },
              ],
            },
          ],
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 4: Ordering Food (CRITICAL)
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u4",
      title: "Ordering Food",
      description: "The skill everyone needs: order food and drinks with confidence.",
      lessons: [
        {
          id: "zh-u4-l1",
          title: "Food & Drink Vocabulary",
          description: "Learn the names of common foods and beverages.",
          realWorldAbility: "You know food and drink names in Mandarin",
          parts: [
            {
              id: "zh-u4-l1-p1",
              title: "Drinks",
              description: "What to order at a café.",
              exercises: [
                { type: "vocab-card", word: "水", pinyin: "shuǐ", translation: "water" },
                { type: "vocab-card", word: "茶", pinyin: "chá", translation: "tea", tip: "Tea culture is central to China." },
                { type: "vocab-card", word: "咖啡", pinyin: "kā fēi", translation: "coffee", tip: "Sounds like 'coffee' — a loanword." },
                { type: "vocab-card", word: "牛奶", pinyin: "niú nǎi", translation: "milk", tip: "牛 = cow, 奶 = milk." },
                { type: "vocab-card", word: "啤酒", pinyin: "pí jiǔ", translation: "beer" },
                { type: "vocab-card", word: "果汁", pinyin: "guǒ zhī", translation: "juice", tip: "果 = fruit, 汁 = juice." },
              ],
            },
            {
              id: "zh-u4-l1-p2",
              title: "Foods",
              description: "Common dishes and ingredients.",
              exercises: [
                { type: "vocab-card", word: "米饭", pinyin: "mǐ fàn", translation: "rice (cooked)" },
                { type: "vocab-card", word: "面条", pinyin: "miàn tiáo", translation: "noodles" },
                { type: "vocab-card", word: "饺子", pinyin: "jiǎo zi", translation: "dumplings", tip: "The quintessential Chinese food." },
                { type: "vocab-card", word: "鸡肉", pinyin: "jī ròu", translation: "chicken (meat)" },
                { type: "vocab-card", word: "蔬菜", pinyin: "shū cài", translation: "vegetables" },
                { type: "vocab-card", word: "汤", pinyin: "tāng", translation: "soup" },
                { type: "match-pairs", pairs: [{ left: "咖啡", right: "coffee" }, { left: "饺子", right: "dumplings" }, { left: "米饭", right: "rice" }, { left: "茶", right: "tea" }, { left: "面条", right: "noodles" }] },
              ],
            },
          ],
        },
        {
          id: "zh-u4-l2",
          title: "Ordering at a Restaurant",
          description: "Use polite phrases to order food like a local.",
          realWorldAbility: "You can order food at a restaurant in Mandarin",
          mapLocationId: "zh-map-cafe-beijing",
          parts: [
            {
              id: "zh-u4-l2-p1",
              title: "Ordering Phrases",
              description: "Key sentences for ordering.",
              exercises: [
                { type: "vocab-card", word: "我想要…", pinyin: "wǒ xiǎng yào…", translation: "I would like…", tip: "Polite way to order: 我想要 + item." },
                { type: "vocab-card", word: "请给我…", pinyin: "qǐng gěi wǒ…", translation: "Please give me…", tip: "Slightly more formal than 我想要." },
                { type: "vocab-card", word: "一杯", pinyin: "yì bēi", translation: "one cup/glass of", tip: "Measure word for drinks." },
                { type: "vocab-card", word: "一份", pinyin: "yí fèn", translation: "one serving of", tip: "Measure word for portions/dishes." },
                { type: "vocab-card", word: "一碗", pinyin: "yì wǎn", translation: "one bowl of", tip: "Measure word for soup, noodles, rice." },
                { type: "vocab-card", word: "菜单", pinyin: "cài dān", translation: "menu" },
              ],
            },
            {
              id: "zh-u4-l2-p2",
              title: "Build Your Order",
              description: "Construct real ordering sentences.",
              exercises: [
                { type: "build-sentence", translation: "I want one cup of coffee", wordBank: ["我", "想要", "一杯", "咖啡", "一份"], correctOrder: ["我", "想要", "一杯", "咖啡"], explanation: "'我想要一杯咖啡' — I want one cup of coffee." },
                { type: "build-sentence", translation: "Please give me a bowl of noodles", wordBank: ["请", "给", "我", "一碗", "面条", "一杯"], correctOrder: ["请", "给", "我", "一碗", "面条"], explanation: "'请给我一碗面条' — Please give me a bowl of noodles." },
                { type: "translate", prompt: "I want one serving of dumplings", promptLang: "native", acceptedAnswers: ["我想要一份饺子", "wǒ xiǎng yào yí fèn jiǎo zi", "我要一份饺子"], explanation: "'我想要一份饺子' — measure word 份 for servings." },
                { type: "fill-blank", sentence: "请给我一___茶。", answer: "杯", options: ["杯", "碗", "份"], explanation: "Tea is served in a cup → 杯 (bēi)." },
              ],
            },
            {
              id: "zh-u4-l2-p3",
              title: "At the Café",
              description: "Full ordering scenario.",
              exercises: [
                { type: "scenario", situation: "You walk into a café in Beijing. The waiter approaches.", npcLine: "你好！请问要点什么？", npcLinePinyin: "nǐ hǎo! qǐng wèn yào diǎn shén me?", npcLineTranslation: "Hello! What would you like to order?", options: [{ text: "我想要一杯咖啡。", correct: true, feedback: "Perfect ordering! Natural and polite." }, { text: "咖啡。", correct: false, feedback: "Understandable but too blunt. Add '我想要' for politeness." }, { text: "你好！", correct: false, feedback: "They said hello already — time to order!" }] },
                { type: "scenario", situation: "The waiter asks if you want anything else.", npcLine: "还要别的吗？", npcLinePinyin: "hái yào bié de ma?", npcLineTranslation: "Anything else?", options: [{ text: "不用了，谢谢。", correct: true, feedback: "'不用了' (no need) + 谢谢 — perfectly polite." }, { text: "再见！", correct: false, feedback: "That means goodbye — you haven't gotten your order yet!" }, { text: "一杯咖啡", correct: false, feedback: "You already ordered coffee. They asked if you want MORE." }] },
                { type: "scenario", situation: "You're ready to pay.", npcLine: "一共三十五块。", npcLinePinyin: "yí gòng sān shí wǔ kuài.", npcLineTranslation: "That's 35 yuan total.", options: [{ text: "好的。可以微信支付吗？", correct: true, feedback: "Asking about WeChat Pay — very modern China!" }, { text: "太贵了！", correct: false, feedback: "35 yuan for café food is normal — not the time to bargain!" }, { text: "谢谢。", correct: false, feedback: "You'd say this AFTER paying, not before." }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "coffee", answer: "咖啡" }, { prompt: "water", answer: "水" }, { prompt: "tea", answer: "茶" }, { prompt: "noodles", answer: "面条" }, { prompt: "I want…", answer: "我想要" }, { prompt: "dumplings", answer: "饺子" }, { prompt: "rice", answer: "米饭" }, { prompt: "one cup of", answer: "一杯" }] },
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 5: Directions & Travel
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u5",
      title: "Directions & Travel",
      description: "Navigate streets, ask for directions, use transportation.",
      lessons: [
        {
          id: "zh-u5-l1",
          title: "Asking for Directions",
          description: "Find your way around a Chinese city.",
          realWorldAbility: "You can ask for and understand basic directions in Mandarin",
          mapLocationId: "zh-map-station-shanghai",
          parts: [
            {
              id: "zh-u5-l1-p1",
              title: "Direction Words",
              description: "Essential direction vocabulary.",
              exercises: [
                { type: "vocab-card", word: "左", pinyin: "zuǒ", translation: "left" },
                { type: "vocab-card", word: "右", pinyin: "yòu", translation: "right" },
                { type: "vocab-card", word: "前面", pinyin: "qián miàn", translation: "ahead / in front" },
                { type: "vocab-card", word: "后面", pinyin: "hòu miàn", translation: "behind / back" },
                { type: "vocab-card", word: "在哪里", pinyin: "zài nǎ lǐ", translation: "where is…?", tip: "The essential asking-for-directions phrase." },
                { type: "vocab-card", word: "地铁站", pinyin: "dì tiě zhàn", translation: "subway station" },
                { type: "vocab-card", word: "走", pinyin: "zǒu", translation: "to walk / go" },
              ],
            },
            {
              id: "zh-u5-l1-p2",
              title: "Asking Directions",
              description: "Build direction questions.",
              exercises: [
                { type: "build-sentence", translation: "Where is the subway station?", wordBank: ["地铁站", "在", "哪里", "请问"], correctOrder: ["请问", "地铁站", "在", "哪里"], explanation: "'请问，地铁站在哪里？' — Excuse me, where is the subway?" },
                { type: "translate", prompt: "Turn left", promptLang: "native", acceptedAnswers: ["左转", "zuǒ zhuǎn", "往左走"], explanation: "'左转' or '往左走' — turn left / go left." },
                { type: "fill-blank", sentence: "往___走，然后左转。", answer: "前面", options: ["前面", "后面", "左"], explanation: "Go straight ahead, then turn left." },
                { type: "scenario", situation: "You're lost near a subway station in Shanghai.", npcLine: "你好，需要帮忙吗？", npcLinePinyin: "nǐ hǎo, xū yào bāng máng ma?", npcLineTranslation: "Hello, do you need help?", options: [{ text: "请问，地铁站在哪里？", correct: true, feedback: "Great! Polite and clear — '请问' makes it respectful." }, { text: "我不知道。", correct: false, feedback: "That means 'I don't know' — they're offering to help!" }, { text: "再见。", correct: false, feedback: "Don't walk away — they want to help you!" }] },
              ],
            },
          ],
        },
        {
          id: "zh-u5-l2",
          title: "Taking Transportation",
          description: "Ride taxis, buses, and trains.",
          realWorldAbility: "You can use public transportation in China",
          mapLocationId: "zh-map-airport-shanghai",
          parts: [
            {
              id: "zh-u5-l2-p1",
              title: "Transport Vocabulary",
              description: "Vehicles and travel words.",
              exercises: [
                { type: "vocab-card", word: "出租车", pinyin: "chū zū chē", translation: "taxi" },
                { type: "vocab-card", word: "公共汽车", pinyin: "gōng gòng qì chē", translation: "bus" },
                { type: "vocab-card", word: "火车", pinyin: "huǒ chē", translation: "train", tip: "Literally 'fire vehicle'." },
                { type: "vocab-card", word: "飞机", pinyin: "fēi jī", translation: "airplane", tip: "Literally 'flying machine'." },
                { type: "vocab-card", word: "机场", pinyin: "jī chǎng", translation: "airport" },
                { type: "vocab-card", word: "到", pinyin: "dào", translation: "to arrive / to (destination)" },
              ],
            },
            {
              id: "zh-u5-l2-p2",
              title: "Getting Around",
              description: "Practical transport sentences.",
              exercises: [
                { type: "build-sentence", translation: "I want to go to the airport", wordBank: ["我", "想", "去", "机场", "到"], correctOrder: ["我", "想", "去", "机场"], explanation: "'我想去机场' — I want to go to the airport." },
                { type: "translate", prompt: "How much is the taxi?", promptLang: "native", acceptedAnswers: ["出租车多少钱", "chū zū chē duō shǎo qián"], explanation: "'出租车多少钱？' — How much is the taxi?" },
                { type: "scenario", situation: "You get in a taxi at Shanghai Pudong Airport.", npcLine: "去哪里？", npcLinePinyin: "qù nǎ lǐ?", npcLineTranslation: "Where to?", options: [{ text: "请去人民广场。", correct: true, feedback: "'请去' + destination — perfect taxi instruction!" }, { text: "你好！", correct: false, feedback: "The driver needs a destination, not a greeting." }, { text: "多少钱？", correct: false, feedback: "Ask the price after the ride, not before giving the destination." }] },
              ],
            },
          ],
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 6: Conversations
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u6",
      title: "Real Conversations",
      description: "Put it all together — natural speaking and common daily phrases.",
      lessons: [
        {
          id: "zh-u6-l1",
          title: "Common Phrases",
          description: "Phrases native speakers actually use every day.",
          realWorldAbility: "You can hold a basic daily conversation in Mandarin",
          mapLocationId: "zh-map-market-beijing",
          parts: [
            {
              id: "zh-u6-l1-p1",
              title: "Daily Phrases",
              description: "Phrases you'll hear and use constantly.",
              exercises: [
                { type: "vocab-card", word: "没问题", pinyin: "méi wèn tí", translation: "no problem" },
                { type: "vocab-card", word: "可以", pinyin: "kě yǐ", translation: "can / may / okay" },
                { type: "vocab-card", word: "不好意思", pinyin: "bù hǎo yì si", translation: "excuse me / embarrassed", tip: "Softer than 对不起 — more like 'pardon me'." },
                { type: "vocab-card", word: "太好了", pinyin: "tài hǎo le", translation: "great! / awesome!" },
                { type: "vocab-card", word: "等一下", pinyin: "děng yí xià", translation: "wait a moment" },
                { type: "vocab-card", word: "我听不懂", pinyin: "wǒ tīng bù dǒng", translation: "I don't understand (listening)", tip: "Essential survival phrase!" },
                { type: "vocab-card", word: "慢一点", pinyin: "màn yì diǎn", translation: "a bit slower please", tip: "Ask people to slow down for you." },
              ],
            },
            {
              id: "zh-u6-l1-p2",
              title: "Full Conversation",
              description: "Put everything together in a real exchange.",
              exercises: [
                { type: "scenario", situation: "You're at a market in Beijing. A vendor speaks fast.", npcLine: "这个很好吃你要不要尝一下只要十块钱！", npcLinePinyin: "zhè ge hěn hǎo chī nǐ yào bú yào cháng yí xià zhǐ yào shí kuài qián!", npcLineTranslation: "This is delicious, want to try? Only 10 yuan!", options: [{ text: "不好意思，慢一点。", correct: true, feedback: "Perfect! Asking them to slow down is completely natural." }, { text: "我听不懂。", correct: false, feedback: "This works too, but asking them to slow down is more proactive." }, { text: "太贵了！", correct: false, feedback: "10 yuan is cheap! And you haven't understood what they said yet." }] },
                { type: "translate", prompt: "No problem!", promptLang: "native", acceptedAnswers: ["没问题", "méi wèn tí"], explanation: "'没问题' — the go-to 'no problem' response." },
                { type: "build-sentence", translation: "I don't understand, please speak slower", wordBank: ["我", "听不懂", "请", "慢一点", "说"], correctOrder: ["我", "听不懂", "请", "说", "慢一点"], explanation: "'我听不懂，请说慢一点' — a survival sentence!" },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "hello", answer: "你好" }, { prompt: "thank you", answer: "谢谢" }, { prompt: "my name is…", answer: "我叫" }, { prompt: "I want coffee", answer: "我想要咖啡" }, { prompt: "where is…?", answer: "在哪里" }, { prompt: "how much?", answer: "多少钱" }, { prompt: "no problem", answer: "没问题" }, { prompt: "goodbye", answer: "再见" }, { prompt: "sorry", answer: "对不起" }, { prompt: "I don't understand", answer: "我听不懂" }] },
        },
      ],
    },
    {
      id: "zh-u7",
      title: "At the Market",
      description: "Bargain, buy, and navigate Chinese markets.",
      lessons: [
        {
          id: "zh-u7-l1",
          title: "Shopping & Bargaining",
          description: "Negotiate prices at a Chinese market.",
          realWorldAbility: "You can shop and bargain in Mandarin",
          parts: [
            {
              id: "zh-u7-l1-p1",
              title: "Shopping Vocabulary",
              description: "Prices, bargaining, and transactions.",
              exercises: [
                { type: "vocab-card", word: "多少钱？", pinyin: "duō shǎo qián?", translation: "How much money? / How much is it?", tip: "The most important shopping phrase in Mandarin." },
                { type: "vocab-card", word: "太贵了", pinyin: "tài guì le", translation: "Too expensive!", tip: "Used to start bargaining — say it confidently." },
                { type: "vocab-card", word: "便宜一点", pinyin: "pián yí yì diǎn", translation: "A little cheaper, please", tip: "The key bargaining phrase." },
                { type: "vocab-card", word: "我买了", pinyin: "wǒ mǎi le", translation: "I'll buy it / I bought it" },
                { type: "vocab-card", word: "能打折吗？", pinyin: "néng dǎ zhé ma?", translation: "Can you give a discount?", tip: "More direct discount request." },
                { type: "vocab-card", word: "我不要", pinyin: "wǒ bú yào", translation: "I don't want it", tip: "Walk-away phrase — often triggers a price drop." },
                { type: "vocab-card", word: "信用卡", pinyin: "xìn yòng kǎ", translation: "credit card" },
                { type: "vocab-card", word: "微信支付", pinyin: "wēi xìn zhī fù", translation: "WeChat Pay", tip: "Dominant payment in China — many vendors prefer it." },
              ],
            },
            {
              id: "zh-u7-l1-p2",
              title: "Bargaining Practice",
              description: "Negotiate like a local at Chinese markets.",
              exercises: [
                { type: "translate", prompt: "How much is it?", promptLang: "native", acceptedAnswers: ["多少钱？", "多少钱", "duō shǎo qián"], explanation: "'多少钱？' — the first thing you say at any market stall." },
                { type: "multiple-choice", question: "What does '太贵了' mean?", options: ["I'll take it", "Too expensive!", "Can I have a discount?", "How much?"], correctIndex: 1, explanation: "'太贵了' (tài guì le) = too expensive. The opening move in bargaining." },
                { type: "fill-blank", sentence: "___ 一点。(A bit cheaper)", answer: "便宜", options: ["便宜", "贵", "好", "多"], explanation: "'便宜一点' = a bit cheaper. '便宜' (pián yí) = cheap/cheaper." },
                { type: "scenario", situation: "At a market in Shanghai. You see a scarf you like.", npcLine: "这条围巾两百块。", npcLinePinyin: "zhè tiáo wéijīn liǎng bǎi kuài.", npcLineTranslation: "This scarf is 200 yuan.", options: [{ text: "太贵了！便宜一点吧。", correct: true, feedback: "Classic bargaining opener — polite but firm!" }, { text: "我买了！", correct: false, feedback: "You agreed immediately — try to bargain first!" }, { text: "我不要。", correct: false, feedback: "Walking away is valid, but try negotiating first." }] },
                { type: "build-sentence", translation: "Can you give a discount?", wordBank: ["能", "打折", "吗？", "买"], correctOrder: ["能", "打折", "吗？"], explanation: "'能打折吗？' — direct and effective discount request." },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "how much?", answer: "多少钱" }, { prompt: "too expensive", answer: "太贵了" }, { prompt: "a bit cheaper", answer: "便宜一点" }, { prompt: "I'll buy it", answer: "我买了" }, { prompt: "I don't want it", answer: "我不要" }, { prompt: "credit card", answer: "信用卡" }, { prompt: "discount", answer: "打折" }, { prompt: "WeChat Pay", answer: "微信支付" }] },
        },
        {
          id: "zh-u7-l2",
          title: "Food Market",
          description: "Order and buy food at a Chinese street market.",
          realWorldAbility: "You can buy food at a Chinese market",
          parts: [
            {
              id: "zh-u7-l2-p1",
              title: "Food Market Vocabulary",
              description: "Street food and fresh produce.",
              exercises: [
                { type: "vocab-card", word: "我要这个", pinyin: "wǒ yào zhè ge", translation: "I want this one", tip: "Point at what you want and say this." },
                { type: "vocab-card", word: "一斤", pinyin: "yì jīn", translation: "half a kilogram / one jin", tip: "Chinese unit of weight — 500g. Used at produce stalls." },
                { type: "vocab-card", word: "新鲜的", pinyin: "xīn xiān de", translation: "fresh" },
                { type: "vocab-card", word: "好吃", pinyin: "hǎo chī", translation: "delicious" },
                { type: "vocab-card", word: "辣", pinyin: "là", translation: "spicy" },
                { type: "vocab-card", word: "不要辣", pinyin: "bú yào là", translation: "no spice / not spicy", tip: "Crucial for spice-intolerant visitors!" },
                { type: "vocab-card", word: "打包", pinyin: "dǎ bāo", translation: "take away / to pack up" },
              ],
            },
            {
              id: "zh-u7-l2-p2",
              title: "Food Market Practice",
              description: "Navigate a Chinese food market.",
              exercises: [
                { type: "translate", prompt: "I want this one", promptLang: "native", acceptedAnswers: ["我要这个", "wǒ yào zhè ge"], explanation: "'我要这个' — point and say this at any market stall." },
                { type: "multiple-choice", question: "What does '不要辣' mean?", options: ["very spicy", "no spice please", "I want spice", "delicious"], correctIndex: 1, explanation: "'不要辣' = don't want spice. Essential for mild eaters!" },
                { type: "scenario", situation: "A street food vendor hands you a sample.", npcLine: "尝一下！好不好吃？", npcLinePinyin: "cháng yí xià! hǎo bù hǎo chī?", npcLineTranslation: "Try it! Is it delicious?", options: [{ text: "好吃！我要这个。", correct: true, feedback: "Complimenting and ordering — perfect!" }, { text: "太贵了！", correct: false, feedback: "They gave you a free sample — commenting on price is odd here." }] },
                { type: "fill-blank", sentence: "我要打___。(take away)", answer: "包", options: ["包", "折", "单", "样"], explanation: "'打包' = to pack up / take away." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "zh-u8",
      title: "Business & Formal Settings",
      description: "Professional Mandarin for meetings and formal situations.",
      lessons: [
        {
          id: "zh-u8-l1",
          title: "Meetings & Introductions",
          description: "Introduce yourself formally and handle meetings.",
          realWorldAbility: "You can introduce yourself professionally in Mandarin",
          parts: [
            {
              id: "zh-u8-l1-p1",
              title: "Business Vocabulary",
              description: "Professional phrases and titles.",
              exercises: [
                { type: "vocab-card", word: "您好", pinyin: "nín hǎo", translation: "Hello (formal / respectful)", tip: "'您' is the formal version of '你'. Use with elders and business contacts." },
                { type: "vocab-card", word: "我是…", pinyin: "wǒ shì…", translation: "I am… / I work at…", tip: "Standard professional self-introduction." },
                { type: "vocab-card", word: "名片", pinyin: "míng piàn", translation: "business card", tip: "Exchange with both hands in Chinese business culture." },
                { type: "vocab-card", word: "会议", pinyin: "huì yì", translation: "meeting / conference" },
                { type: "vocab-card", word: "合作", pinyin: "hé zuò", translation: "cooperation / collaboration" },
                { type: "vocab-card", word: "请坐", pinyin: "qǐng zuò", translation: "please sit down", tip: "Use this when inviting someone to sit." },
                { type: "vocab-card", word: "幸会", pinyin: "xìng huì", translation: "It's an honour to meet you", tip: "Formal version of 'nice to meet you'." },
                { type: "vocab-card", word: "我们开始吧", pinyin: "wǒ men kāi shǐ ba", translation: "Let's get started", tip: "Opens a meeting." },
              ],
            },
            {
              id: "zh-u8-l1-p2",
              title: "Meeting Practice",
              description: "Handle a business meeting in Mandarin.",
              exercises: [
                { type: "translate", prompt: "Hello (formal)", promptLang: "native", acceptedAnswers: ["您好", "nín hǎo"], explanation: "'您好' — the formal greeting. Use '您' not '你' with business contacts." },
                { type: "multiple-choice", question: "What is the correct way to exchange a business card?", options: ["One hand, face down", "Both hands, facing them", "Throw it across the table", "Put it in your pocket immediately"], correctIndex: 1, explanation: "In Chinese business culture, '名片' (business cards) are exchanged with both hands, face up toward the recipient." },
                { type: "fill-blank", sentence: "我们___吧。(Let's get started)", answer: "开始", options: ["开始", "结束", "休息", "等"], explanation: "'我们开始吧' = let's get started — opens a meeting." },
                { type: "scenario", situation: "You're meeting a Chinese business partner for the first time.", npcLine: "您好！欢迎来到我们公司。", npcLinePinyin: "nín hǎo! huān yíng lái dào wǒ men gōng sī.", npcLineTranslation: "Hello! Welcome to our company.", options: [{ text: "您好！幸会幸会。这是我的名片。", correct: true, feedback: "Excellent! Formal greeting + 'nice to meet you' + offering a card." }, { text: "你好！谢谢。", correct: false, feedback: "Grammatically fine but '您' is more appropriate in formal business settings." }] },
              ],
            },
          ],
        },
        {
          id: "zh-u8-l2",
          title: "Dining for Business",
          description: "Navigate a business dinner in China.",
          realWorldAbility: "You can handle a business dinner in Mandarin",
          parts: [
            {
              id: "zh-u8-l2-p1",
              title: "Business Dining Vocabulary",
              description: "Toasts, hosting, and dinner etiquette.",
              exercises: [
                { type: "vocab-card", word: "干杯", pinyin: "gān bēi", translation: "cheers! / bottoms up!", tip: "Literally 'dry cup' — drain your glass in formal toasts." },
                { type: "vocab-card", word: "请多关照", pinyin: "qǐng duō guān zhào", translation: "please take care of me", tip: "Said when starting a new relationship — deeply polite." },
                { type: "vocab-card", word: "来，吃菜", pinyin: "lái, chī cài", translation: "come, eat the dishes", tip: "Host urges guests to eat — very common." },
                { type: "vocab-card", word: "您先请", pinyin: "nín xiān qǐng", translation: "Please go first / After you", tip: "Deferring to others shows respect." },
                { type: "vocab-card", word: "这是我请客", pinyin: "zhè shì wǒ qǐng kè", translation: "This is my treat / I'm paying", tip: "In Chinese culture, the host always pays." },
                { type: "vocab-card", word: "吃好了", pinyin: "chī hǎo le", translation: "I'm full / I've eaten well", tip: "Polite way to say you've had enough." },
              ],
            },
            {
              id: "zh-u8-l2-p2",
              title: "Business Dinner Practice",
              description: "Navigate toasts and dinner etiquette.",
              exercises: [
                { type: "translate", prompt: "Cheers!", promptLang: "native", acceptedAnswers: ["干杯！", "干杯", "gān bēi"], explanation: "'干杯！' — the standard toast. Maintain eye contact." },
                { type: "multiple-choice", question: "What does '这是我请客' mean at the end of a dinner?", options: ["Let's share the bill", "This is my treat", "The food is delicious", "Let's order more"], correctIndex: 1, explanation: "'这是我请客' = this is my treat. In Chinese business culture, the host always pays." },
                { type: "scenario", situation: "At a business dinner, your host raises a glass.", npcLine: "为了我们的合作，干杯！", npcLinePinyin: "wèi le wǒ men de hé zuò, gān bēi!", npcLineTranslation: "To our cooperation, cheers!", options: [{ text: "干杯！合作愉快！", correct: true, feedback: "Perfect toast response! '合作愉快' = pleasant cooperation." }, { text: "谢谢，太贵了。", correct: false, feedback: "Irrelevant — they're toasting your partnership, not charging you!" }] },
                { type: "match-pairs", pairs: [{ left: "干杯", right: "Cheers!" }, { left: "请多关照", right: "Please take care of me" }, { left: "这是我请客", right: "This is my treat" }, { left: "吃好了", right: "I'm full" }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "hello (formal)", answer: "您好" }, { prompt: "cheers", answer: "干杯" }, { prompt: "meeting", answer: "会议" }, { prompt: "business card", answer: "名片" }, { prompt: "let's get started", answer: "我们开始吧" }, { prompt: "please sit", answer: "请坐" }, { prompt: "this is my treat", answer: "这是我请客" }, { prompt: "cooperation", answer: "合作" }] },
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 9: At the Hotel
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "zh-u9",
      title: "At the Hotel",
      description: "Check in, make requests, and handle stays in Mandarin.",
      lessons: [
        {
          id: "zh-u9-l1",
          title: "Hotel Check-in",
          description: "Handle check-in and room requests.",
          realWorldAbility: "You can check in to a hotel in Mandarin",
          parts: [
            {
              id: "zh-u9-l1-p1",
              title: "Hotel Vocabulary",
              description: "Essential hotel words and phrases.",
              exercises: [
                { type: "vocab-card", word: "酒店", pinyin: "jiǔ diàn", translation: "hotel", tip: "Literally 'wine shop' — used for all hotels in modern Chinese." },
                { type: "vocab-card", word: "房间", pinyin: "fáng jiān", translation: "room", tip: "2nd + 1st tone: rising then flat." },
                { type: "vocab-card", word: "钥匙", pinyin: "yào shi", translation: "key", tip: "The 'shi' is neutral tone." },
                { type: "vocab-card", word: "我预订了一个房间", pinyin: "wǒ yù dìng le yí gè fáng jiān", translation: "I reserved a room", tip: "'预订' = to reserve. The 'le' marks completion." },
                { type: "vocab-card", word: "退房", pinyin: "tuì fáng", translation: "check out", tip: "4th + 2nd tone. Literally 'return room'." },
                { type: "match-pairs", pairs: [{ left: "酒店", right: "hotel" }, { left: "房间", right: "room" }, { left: "钥匙", right: "key" }, { left: "退房", right: "check out" }] },
              ],
            },
            {
              id: "zh-u9-l1-p2",
              title: "Check-in Practice",
              description: "Navigate a real hotel check-in.",
              exercises: [
                { type: "translate", prompt: "I have a reservation", promptLang: "native", acceptedAnswers: ["我预订了一个房间", "我有预定", "wǒ yù dìng le yí gè fáng jiān"], explanation: "'我预订了一个房间' — formal and clear." },
                { type: "fill-blank", sentence: "请问，___ 在几楼？", answer: "电梯", explanation: "'电梯' = elevator. 'Excuse me, which floor is the elevator on?'" },
                { type: "multiple-choice", question: "What does '退房时间' mean?", options: ["Room service hours", "Check-out time", "Breakfast time", "Room number"], correctIndex: 1, explanation: "'退房时间' = check-out time. '退房' = check out, '时间' = time." },
                { type: "scenario", situation: "Checking in at a hotel in Beijing.", npcLine: "欢迎光临！请问您有预订吗？", npcLinePinyin: "huān yíng guāng lín! qǐng wèn nín yǒu yù dìng ma?", npcLineTranslation: "Welcome! Do you have a reservation?", options: [{ text: "有的，我预订了一间双人房。", correct: true, feedback: "Clear and confident — '双人房' = double room." }, { text: "没有，太贵了。", correct: false, feedback: "You're already here — might as well check in!" }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "hotel", answer: "酒店" }, { prompt: "room", answer: "房间" }, { prompt: "key", answer: "钥匙" }, { prompt: "check out", answer: "退房" }, { prompt: "elevator", answer: "电梯" }, { prompt: "reservation", answer: "预订" }, { prompt: "wifi password", answer: "wifi密码" }] },
        },
      ],
    },
  ],
};
