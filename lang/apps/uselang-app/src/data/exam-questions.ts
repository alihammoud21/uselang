// ── Unit Exam Question Bank ────────────────────────────────────────────────
// Each unit exam has:
//   • 10 multiple-choice questions
//   • 5 listening questions (TTS plays phrase, pick the meaning)
//   • 5 typing questions (English prompt → type in target language)
//   • 3–5 oral questions (hear phrase → speak it back)
// Pass threshold: 60% overall. Oral exam: >50% phrases correct.

export interface MCQuestion {
  type: "mc";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ListenQuestion {
  type: "listen";
  audioText: string;
  audioLang: string;
  options: string[];
  correctIndex: number;
}

export interface TypeQuestion {
  type: "type";
  prompt: string;
  acceptedAnswers: string[];
  hint: string;
}

export interface OralQuestion {
  type: "oral";
  phrase: string;
  phonetic: string;
  meaning: string;
}

export interface UnitExam {
  unitId: string;
  langCode: string;
  unitTitle: string;
  mc: MCQuestion[];
  listen: ListenQuestion[];
  type: TypeQuestion[];
  oral: OralQuestion[];
  cefrLevel: string;
  cefrLabel: string;
  certificateTitle: string;
}

// ── Mandarin Exams ────────────────────────────────────────────────────────

const ZH_U1_EXAM: UnitExam = {
  unitId: "zh-u1",
  langCode: "zh",
  unitTitle: "Sounds & Basics",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "Mandarin Foundations",
  mc: [
    { type: "mc", question: "Which tone rises from mid to high?", options: ["1st tone (flat)", "2nd tone (rising)", "3rd tone (dip)", "4th tone (falling)"], correctIndex: 1, explanation: "The 2nd tone rises — like asking a surprised 'What?'" },
    { type: "mc", question: "What does '你好' mean?", options: ["goodbye", "thank you", "hello", "sorry"], correctIndex: 2, explanation: "'你好' (nǐ hǎo) is the standard greeting." },
    { type: "mc", question: "How do you say 'thank you' in Mandarin?", options: ["你好", "再见", "谢谢", "对不起"], correctIndex: 2, explanation: "'谢谢' (xiè xie) means thank you." },
    { type: "mc", question: "What does '再见' mean?", options: ["hello", "please", "sorry", "goodbye"], correctIndex: 3, explanation: "'再见' (zài jiàn) means goodbye — literally 'see again'." },
    { type: "mc", question: "What does '对不起' mean?", options: ["thank you", "you're welcome", "sorry", "goodbye"], correctIndex: 2, explanation: "'对不起' means sorry/excuse me." },
    { type: "mc", question: "The tone mark ˉ (flat line over a vowel) represents which tone?", options: ["1st tone", "2nd tone", "3rd tone", "4th tone"], correctIndex: 0, explanation: "ˉ = 1st tone, held high and steady." },
    { type: "mc", question: "Which tone sounds like giving a sharp command?", options: ["1st (flat)", "2nd (rising)", "3rd (dip)", "4th (falling)"], correctIndex: 3, explanation: "The 4th tone falls sharply and decisively." },
    { type: "mc", question: "What does '没关系' mean?", options: ["no problem", "thank you", "goodbye", "sorry"], correctIndex: 0, explanation: "'没关系' (méi guān xi) = no problem / it's okay." },
    { type: "mc", question: "Which of these is the correct response when someone says '对不起'?", options: ["再见", "你好", "没关系", "谢谢"], correctIndex: 2, explanation: "When someone says sorry, reply '没关系' — it's okay." },
    { type: "mc", question: "The 3rd tone is best described as:", options: ["flat and high", "rising sharply", "dipping then rising", "falling sharply"], correctIndex: 2, explanation: "The 3rd tone dips down then rises back up — like a valley." },
  ],
  listen: [
    { type: "listen", audioText: "你好", audioLang: "zh-CN", options: ["hello", "goodbye", "sorry", "thank you"], correctIndex: 0 },
    { type: "listen", audioText: "谢谢", audioLang: "zh-CN", options: ["goodbye", "hello", "thank you", "sorry"], correctIndex: 2 },
    { type: "listen", audioText: "再见", audioLang: "zh-CN", options: ["hello", "goodbye", "you're welcome", "excuse me"], correctIndex: 1 },
    { type: "listen", audioText: "对不起", audioLang: "zh-CN", options: ["no problem", "hello", "thank you", "sorry"], correctIndex: 3 },
    { type: "listen", audioText: "没关系", audioLang: "zh-CN", options: ["sorry", "goodbye", "no problem", "thank you"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "hello", acceptedAnswers: ["你好", "ni hao", "nǐ hǎo"], hint: "nǐ hǎo" },
    { type: "type", prompt: "goodbye", acceptedAnswers: ["再见", "zai jian", "zài jiàn"], hint: "zài jiàn" },
    { type: "type", prompt: "thank you", acceptedAnswers: ["谢谢", "xie xie", "xiè xie"], hint: "xiè xie" },
    { type: "type", prompt: "sorry", acceptedAnswers: ["对不起", "dui bu qi", "duì bu qǐ"], hint: "duì bu qǐ" },
    { type: "type", prompt: "no problem / it's okay", acceptedAnswers: ["没关系", "mei guan xi", "méi guān xi"], hint: "méi guān xi" },
  ],
  oral: [
    { type: "oral", phrase: "你好", phonetic: "nǐ hǎo", meaning: "Hello" },
    { type: "oral", phrase: "谢谢", phonetic: "xiè xie", meaning: "Thank you" },
    { type: "oral", phrase: "再见", phonetic: "zài jiàn", meaning: "Goodbye" },
    { type: "oral", phrase: "对不起", phonetic: "duì bu qǐ", meaning: "Sorry" },
  ],
};

const ZH_U2_EXAM: UnitExam = {
  unitId: "zh-u2",
  langCode: "zh",
  unitTitle: "Introductions",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "Mandarin Introductions",
  mc: [
    { type: "mc", question: "How do you say 'My name is...' in Mandarin?", options: ["你叫什么名字", "我叫...", "我是...", "你好"], correctIndex: 1, explanation: "'我叫...' (wǒ jiào) = My name is..." },
    { type: "mc", question: "What does '你叫什么名字？' mean?", options: ["How are you?", "What is your name?", "Where are you from?", "How old are you?"], correctIndex: 1, explanation: "Literally: 'You called what name?' = What's your name?" },
    { type: "mc", question: "What does '我' mean?", options: ["you", "he/she", "I / me", "we"], correctIndex: 2, explanation: "'我' (wǒ) = I / me." },
    { type: "mc", question: "How do you say 'I am American'?", options: ["我是中国人", "我是美国人", "我来美国", "我叫美国"], correctIndex: 1, explanation: "'我是美国人' = I am American (person)." },
    { type: "mc", question: "What does '从' mean?", options: ["to go", "from", "name", "person"], correctIndex: 1, explanation: "'从' (cóng) = from. Used in '我从...来'." },
    { type: "mc", question: "Which sentence means 'I come from France'?", options: ["我是法国", "我来法国", "我从法国来", "法国是我"], correctIndex: 2, explanation: "'我从法国来' — I from France come. The 从…来 pattern." },
    { type: "mc", question: "What does '哪里' mean?", options: ["what", "when", "where", "how"], correctIndex: 2, explanation: "'哪里' (nǎ lǐ) = where." },
    { type: "mc", question: "'中国' means:", options: ["America", "Japan", "France", "China"], correctIndex: 3, explanation: "'中国' (zhōng guó) = China — literally 'Middle Kingdom'." },
    { type: "mc", question: "What does '是' mean?", options: ["have", "go", "am/is/are", "want"], correctIndex: 2, explanation: "'是' (shì) = am / is / are — the verb 'to be'." },
    { type: "mc", question: "To say someone's nationality, you add ___ after the country name:", options: ["的", "人", "是", "来"], correctIndex: 1, explanation: "Country + '人' = nationality. 中国人 = Chinese person." },
  ],
  listen: [
    { type: "listen", audioText: "我叫李伟", audioLang: "zh-CN", options: ["Where are you from?", "My name is Li Wei", "How are you?", "I am Chinese"], correctIndex: 1 },
    { type: "listen", audioText: "你叫什么名字", audioLang: "zh-CN", options: ["What do you want?", "How are you?", "What is your name?", "Where are you from?"], correctIndex: 2 },
    { type: "listen", audioText: "我是美国人", audioLang: "zh-CN", options: ["I'm from China", "I'm from Japan", "I am American", "I am a student"], correctIndex: 2 },
    { type: "listen", audioText: "我从法国来", audioLang: "zh-CN", options: ["I want to go to France", "I come from France", "I like France", "France is beautiful"], correctIndex: 1 },
    { type: "listen", audioText: "你是哪里人", audioLang: "zh-CN", options: ["What is your name?", "How old are you?", "Where are you from?", "Are you Chinese?"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "my name is (+ your name)", acceptedAnswers: ["我叫", "wǒ jiào", "wo jiao"], hint: "wǒ jiào..." },
    { type: "type", prompt: "I am Chinese", acceptedAnswers: ["我是中国人", "wǒ shì zhōng guó rén"], hint: "wǒ shì zhōng guó rén" },
    { type: "type", prompt: "I (pronoun)", acceptedAnswers: ["我", "wǒ", "wo"], hint: "wǒ" },
    { type: "type", prompt: "China", acceptedAnswers: ["中国", "zhōng guó", "zhong guo"], hint: "zhōng guó" },
    { type: "type", prompt: "What is your name?", acceptedAnswers: ["你叫什么名字", "nǐ jiào shén me míng zi"], hint: "nǐ jiào shén me míng zi?" },
  ],
  oral: [
    { type: "oral", phrase: "我叫大卫", phonetic: "wǒ jiào Dà wèi", meaning: "My name is David" },
    { type: "oral", phrase: "你叫什么名字", phonetic: "nǐ jiào shén me míng zi", meaning: "What is your name?" },
    { type: "oral", phrase: "我是美国人", phonetic: "wǒ shì měi guó rén", meaning: "I am American" },
    { type: "oral", phrase: "我从英国来", phonetic: "wǒ cóng yīng guó lái", meaning: "I come from the UK" },
  ],
};

const ZH_U3_EXAM: UnitExam = {
  unitId: "zh-u3",
  langCode: "zh",
  unitTitle: "Daily Essentials",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "Mandarin Daily Essentials",
  mc: [
    { type: "mc", question: "How do you say '37' in Chinese?", options: ["三七", "三十七", "七三十", "七十三"], correctIndex: 1, explanation: "37 = three-ten-seven = 三十七." },
    { type: "mc", question: "Which number is considered very lucky in China?", options: ["4", "6", "8", "10"], correctIndex: 2, explanation: "8 (八, bā) sounds like 发 (fā, prosperity) — very lucky!" },
    { type: "mc", question: "What does '多少钱？' mean?", options: ["What time is it?", "How much is it?", "Where is it?", "Is it good?"], correctIndex: 1, explanation: "'多少钱？' — the essential shopping phrase: how much?" },
    { type: "mc", question: "How do you negate '有' (have)?", options: ["不有", "没有", "不是有", "无有"], correctIndex: 1, explanation: "'有' is negated with '没', not '不'. 我没有 = I don't have." },
    { type: "mc", question: "What does '想' mean?", options: ["to go", "to eat", "to want / think", "to buy"], correctIndex: 2, explanation: "'想' (xiǎng) = to want / to think." },
    { type: "mc", question: "Which sentence means 'I want to eat'?", options: ["我去吃", "我想吃饭", "我有吃", "我吃想"], correctIndex: 1, explanation: "'我想吃饭' — I + want + eat + rice/food." },
    { type: "mc", question: "What does '去' mean?", options: ["to eat", "to drink", "to go", "to buy"], correctIndex: 2, explanation: "'去' (qù) = to go." },
    { type: "mc", question: "88 in Chinese is:", options: ["八十", "八百八", "八十八", "八八"], correctIndex: 2, explanation: "88 = eight-ten-eight = 八十八. The luckiest number!" },
    { type: "mc", question: "What does '买' mean?", options: ["to sell", "to want", "to have", "to buy"], correctIndex: 3, explanation: "'买' (mǎi) = to buy." },
    { type: "mc", question: "Complete: '我___去中国' (I want to go to China)", options: ["是", "有", "想", "去"], correctIndex: 2, explanation: "'我想去中国' — I want to go to China. 想 = want." },
  ],
  listen: [
    { type: "listen", audioText: "多少钱", audioLang: "zh-CN", options: ["Where is it?", "How much is it?", "I want this", "It's expensive"], correctIndex: 1 },
    { type: "listen", audioText: "我想吃饭", audioLang: "zh-CN", options: ["I want to drink water", "I want to eat", "I want to go home", "I'm hungry"], correctIndex: 1 },
    { type: "listen", audioText: "太贵了", audioLang: "zh-CN", options: ["very good", "too expensive", "no problem", "very cheap"], correctIndex: 1 },
    { type: "listen", audioText: "我没有", audioLang: "zh-CN", options: ["I have", "I want", "I don't have", "I don't know"], correctIndex: 2 },
    { type: "listen", audioText: "三十七", audioLang: "zh-CN", options: ["27", "37", "73", "307"], correctIndex: 1 },
  ],
  type: [
    { type: "type", prompt: "I want to drink water", acceptedAnswers: ["我想喝水", "wǒ xiǎng hē shuǐ", "我要喝水"], hint: "wǒ xiǎng hē shuǐ" },
    { type: "type", prompt: "how much is it?", acceptedAnswers: ["多少钱", "duō shǎo qián"], hint: "duō shǎo qián" },
    { type: "type", prompt: "I don't have", acceptedAnswers: ["我没有", "wǒ méi yǒu"], hint: "wǒ méi yǒu" },
    { type: "type", prompt: "to go", acceptedAnswers: ["去", "qù"], hint: "qù" },
    { type: "type", prompt: "88 (the number)", acceptedAnswers: ["八十八", "bā shí bā"], hint: "bā shí bā" },
  ],
  oral: [
    { type: "oral", phrase: "多少钱", phonetic: "duō shǎo qián", meaning: "How much is it?" },
    { type: "oral", phrase: "我想喝水", phonetic: "wǒ xiǎng hē shuǐ", meaning: "I want to drink water" },
    { type: "oral", phrase: "太贵了", phonetic: "tài guì le", meaning: "Too expensive!" },
  ],
};

const ZH_U4_EXAM: UnitExam = {
  unitId: "zh-u4",
  langCode: "zh",
  unitTitle: "Ordering Food",
  cefrLevel: "A1+",
  cefrLabel: "Elementary",
  certificateTitle: "Mandarin Food & Café",
  mc: [
    { type: "mc", question: "How do you say 'I would like...' when ordering?", options: ["我是...", "我去...", "我想要...", "我有..."], correctIndex: 2, explanation: "'我想要...' (wǒ xiǎng yào) = I would like... Polite ordering." },
    { type: "mc", question: "What is the measure word for drinks/cups?", options: ["份", "碗", "杯", "个"], correctIndex: 2, explanation: "'杯' (bēi) is the measure word for cups/glasses." },
    { type: "mc", question: "What does '菜单' mean?", options: ["food", "waiter", "menu", "bill"], correctIndex: 2, explanation: "'菜单' (cài dān) = menu." },
    { type: "mc", question: "What is the measure word for bowls (soup, noodles)?", options: ["杯", "份", "碗", "个"], correctIndex: 2, explanation: "'碗' (wǎn) = bowl. Use for soup, noodles, rice." },
    { type: "mc", question: "How do you say 'coffee' in Mandarin?", options: ["茶", "牛奶", "咖啡", "啤酒"], correctIndex: 2, explanation: "'咖啡' (kā fēi) = coffee — a loanword." },
    { type: "mc", question: "What does '不用了' mean?", options: ["more please", "no need, thank you", "it's delicious", "I want more"], correctIndex: 1, explanation: "'不用了' = no need — polite way to say no when offered more." },
    { type: "mc", question: "What does '饺子' mean?", options: ["noodles", "rice", "dumplings", "soup"], correctIndex: 2, explanation: "'饺子' (jiǎo zi) = dumplings — a quintessential Chinese dish." },
    { type: "mc", question: "Complete: '我想要一___咖啡' (one cup of coffee)", options: ["份", "杯", "碗", "个"], correctIndex: 1, explanation: "Coffee is served in a cup → '杯'." },
    { type: "mc", question: "How do you ask for the menu?", options: ["请给我菜单", "我想要菜单", "菜单在哪里", "All of the above"], correctIndex: 3, explanation: "Any of these work for asking for the menu." },
    { type: "mc", question: "'米饭' means:", options: ["noodles", "rice", "bread", "soup"], correctIndex: 1, explanation: "'米饭' (mǐ fàn) = cooked rice." },
  ],
  listen: [
    { type: "listen", audioText: "我想要一杯咖啡", audioLang: "zh-CN", options: ["I want a bowl of noodles", "I want one cup of coffee", "Please give me tea", "I want one serving of dumplings"], correctIndex: 1 },
    { type: "listen", audioText: "请给我一碗面条", audioLang: "zh-CN", options: ["Please give me a bowl of rice", "Please give me a bowl of noodles", "Please give me a cup of tea", "Please give me a bowl of soup"], correctIndex: 1 },
    { type: "listen", audioText: "饺子", audioLang: "zh-CN", options: ["rice", "noodles", "dumplings", "soup"], correctIndex: 2 },
    { type: "listen", audioText: "还要别的吗", audioLang: "zh-CN", options: ["Is it delicious?", "How much is it?", "Anything else?", "Are you done?"], correctIndex: 2 },
    { type: "listen", audioText: "不用了谢谢", audioLang: "zh-CN", options: ["Yes please", "More please", "No need, thank you", "I'm not hungry"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "I want one cup of coffee", acceptedAnswers: ["我想要一杯咖啡", "wǒ xiǎng yào yì bēi kā fēi"], hint: "wǒ xiǎng yào yì bēi kā fēi" },
    { type: "type", prompt: "dumplings", acceptedAnswers: ["饺子", "jiǎo zi", "jiao zi"], hint: "jiǎo zi" },
    { type: "type", prompt: "menu", acceptedAnswers: ["菜单", "cài dān", "cai dan"], hint: "cài dān" },
    { type: "type", prompt: "coffee", acceptedAnswers: ["咖啡", "kā fēi", "ka fei"], hint: "kā fēi" },
    { type: "type", prompt: "no need, thank you", acceptedAnswers: ["不用了谢谢", "不用了，谢谢", "bú yòng le xiè xie"], hint: "bú yòng le, xiè xie" },
  ],
  oral: [
    { type: "oral", phrase: "我想要一杯咖啡", phonetic: "wǒ xiǎng yào yì bēi kā fēi", meaning: "I'd like one cup of coffee" },
    { type: "oral", phrase: "请给我一碗面条", phonetic: "qǐng gěi wǒ yì wǎn miàn tiáo", meaning: "Please give me a bowl of noodles" },
    { type: "oral", phrase: "不用了谢谢", phonetic: "bú yòng le xiè xie", meaning: "No need, thank you" },
    { type: "oral", phrase: "好吃", phonetic: "hǎo chī", meaning: "Delicious!" },
  ],
};

const ZH_U5_EXAM: UnitExam = {
  unitId: "zh-u5",
  langCode: "zh",
  unitTitle: "Directions & Travel",
  cefrLevel: "A2",
  cefrLabel: "Elementary",
  certificateTitle: "Mandarin Travel Skills",
  mc: [
    { type: "mc", question: "How do you ask 'Where is the subway?'", options: ["地铁站在这里", "请问地铁站在哪里", "地铁站有吗", "地铁站是什么"], correctIndex: 1, explanation: "'请问，地铁站在哪里？' — Polite asking-for-directions." },
    { type: "mc", question: "What does '左' mean?", options: ["right", "straight", "left", "back"], correctIndex: 2, explanation: "'左' (zuǒ) = left." },
    { type: "mc", question: "What does '出租车' mean?", options: ["subway", "bus", "train", "taxi"], correctIndex: 3, explanation: "'出租车' (chū zū chē) = taxi — literally 'rent-out car'." },
    { type: "mc", question: "How do you say 'I want to go to the airport'?", options: ["我想去火车站", "我想去机场", "我想去酒店", "我想去地铁站"], correctIndex: 1, explanation: "'我想去机场' — I want to go to the airport." },
    { type: "mc", question: "A taxi driver asks '去哪里？'. This means:", options: ["Are you ready?", "How much do you want to pay?", "Where to?", "Do you have luggage?"], correctIndex: 2, explanation: "'去哪里？' — Where to? What the driver asks when you get in." },
    { type: "mc", question: "What does '前面' mean?", options: ["behind", "to the left", "ahead / in front", "to the right"], correctIndex: 2, explanation: "'前面' (qián miàn) = ahead / in front." },
    { type: "mc", question: "What does '飞机' mean?", options: ["train", "bus", "airplane", "taxi"], correctIndex: 2, explanation: "'飞机' (fēi jī) = airplane — literally 'flying machine'." },
    { type: "mc", question: "How do you say 'please take me to the train station'?", options: ["我想去火车站", "请带我去火车站", "请去火车站", "我在火车站"], correctIndex: 1, explanation: "'请带我去火车站' — polite instruction for a taxi driver." },
    { type: "mc", question: "What is '地铁站'?", options: ["bus stop", "train station", "subway station", "airport"], correctIndex: 2, explanation: "'地铁站' (dì tiě zhàn) = subway/metro station." },
    { type: "mc", question: "What does '到' mean?", options: ["from", "at", "to arrive / to", "near"], correctIndex: 2, explanation: "'到' (dào) = to arrive / to (a destination)." },
  ],
  listen: [
    { type: "listen", audioText: "请问地铁站在哪里", audioLang: "zh-CN", options: ["Where is the airport?", "Excuse me, where is the subway?", "How much is the taxi?", "Please go straight"], correctIndex: 1 },
    { type: "listen", audioText: "左转", audioLang: "zh-CN", options: ["go straight", "turn right", "turn left", "stop here"], correctIndex: 2 },
    { type: "listen", audioText: "请带我去火车站", audioLang: "zh-CN", options: ["Please take me to the airport", "Please take me to the hotel", "Please take me to the train station", "Please take me to the subway"], correctIndex: 2 },
    { type: "listen", audioText: "去哪里", audioLang: "zh-CN", options: ["How much?", "Are you ready?", "Where to?", "Turn left"], correctIndex: 2 },
    { type: "listen", audioText: "出租车多少钱", audioLang: "zh-CN", options: ["I need a taxi", "Where is the taxi?", "How much is the taxi?", "Call me a taxi"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "where is...? (the asking phrase)", acceptedAnswers: ["在哪里", "zài nǎ lǐ", "zai na li"], hint: "zài nǎ lǐ" },
    { type: "type", prompt: "taxi", acceptedAnswers: ["出租车", "chū zū chē", "chu zu che"], hint: "chū zū chē" },
    { type: "type", prompt: "airport", acceptedAnswers: ["机场", "jī chǎng", "ji chang"], hint: "jī chǎng" },
    { type: "type", prompt: "turn left", acceptedAnswers: ["左转", "zuǒ zhuǎn", "往左走"], hint: "zuǒ zhuǎn" },
    { type: "type", prompt: "please take me to the train station", acceptedAnswers: ["请带我去火车站", "qǐng dài wǒ qù huǒchēzhàn"], hint: "qǐng dài wǒ qù huǒchēzhàn" },
  ],
  oral: [
    { type: "oral", phrase: "请问地铁站在哪里", phonetic: "qǐng wèn dì tiě zhàn zài nǎ lǐ", meaning: "Excuse me, where is the subway?" },
    { type: "oral", phrase: "请带我去机场", phonetic: "qǐng dài wǒ qù jīchǎng", meaning: "Please take me to the airport" },
    { type: "oral", phrase: "左转", phonetic: "zuǒ zhuǎn", meaning: "Turn left" },
    { type: "oral", phrase: "我想去火车站", phonetic: "wǒ xiǎng qù huǒchēzhàn", meaning: "I want to go to the train station" },
  ],
};

const ZH_U6_EXAM: UnitExam = {
  unitId: "zh-u6",
  langCode: "zh",
  unitTitle: "Real Conversations",
  cefrLevel: "A2",
  cefrLabel: "Pre-Elementary",
  certificateTitle: "Mandarin Conversational",
  mc: [
    { type: "mc", question: "What does '我听不懂' mean?", options: ["I can't speak Chinese", "I don't understand (listening)", "I don't know", "Please repeat"], correctIndex: 1, explanation: "'我听不懂' = I don't understand — essential survival phrase." },
    { type: "mc", question: "What does '慢一点' mean?", options: ["speak louder", "a bit slower please", "repeat please", "stop please"], correctIndex: 1, explanation: "'慢一点' (màn yì diǎn) = a bit slower please." },
    { type: "mc", question: "What does '可以' mean?", options: ["must / have to", "want to", "can / may / okay", "cannot"], correctIndex: 2, explanation: "'可以' (kě yǐ) = can / may / okay." },
    { type: "mc", question: "What does '太好了' mean?", options: ["very bad", "too expensive", "great! / awesome!", "too slow"], correctIndex: 2, explanation: "'太好了' (tài hǎo le) = great! / awesome!" },
    { type: "mc", question: "What does '不好意思' mean?", options: ["thank you", "sorry/excuse me (softer)", "goodbye", "I don't know"], correctIndex: 1, explanation: "'不好意思' — softer than 对不起, like 'pardon me / sorry'." },
    { type: "mc", question: "'没问题' means:", options: ["there's a problem", "no problem", "what's the problem?", "solve the problem"], correctIndex: 1, explanation: "'没问题' (méi wèn tí) = no problem." },
    { type: "mc", question: "What does '等一下' mean?", options: ["come here", "go away", "wait a moment", "hurry up"], correctIndex: 2, explanation: "'等一下' (děng yí xià) = wait a moment." },
    { type: "mc", question: "How do you ask someone to speak slower?", options: ["慢一点", "大一点", "多一点", "好一点"], correctIndex: 0, explanation: "'慢一点' = a bit slower please. 慢 = slow." },
    { type: "mc", question: "Complete: '我听不懂，请___慢一点' (I don't understand, please speak slower)", options: ["去", "说", "走", "看"], correctIndex: 1, explanation: "'说' (shuō) = speak. 请说慢一点 = please speak slower." },
    { type: "mc", question: "'不好意思' is best used when:", options: ["someone owes you money", "you want to get someone's attention politely", "you want to order food", "you're saying goodbye"], correctIndex: 1, explanation: "'不好意思' is great for getting attention or mild apologies." },
  ],
  listen: [
    { type: "listen", audioText: "我听不懂", audioLang: "zh-CN", options: ["I don't want", "I don't understand", "I don't have", "I don't know"], correctIndex: 1 },
    { type: "listen", audioText: "慢一点", audioLang: "zh-CN", options: ["speak louder", "go faster", "a bit slower", "wait a moment"], correctIndex: 2 },
    { type: "listen", audioText: "没问题", audioLang: "zh-CN", options: ["there's a problem", "no problem", "I understand", "thank you"], correctIndex: 1 },
    { type: "listen", audioText: "太好了", audioLang: "zh-CN", options: ["too expensive", "very bad", "great / awesome", "not good"], correctIndex: 2 },
    { type: "listen", audioText: "等一下", audioLang: "zh-CN", options: ["go quickly", "come here", "wait a moment", "goodbye"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "I don't understand (listening)", acceptedAnswers: ["我听不懂", "wǒ tīng bù dǒng"], hint: "wǒ tīng bù dǒng" },
    { type: "type", prompt: "no problem", acceptedAnswers: ["没问题", "méi wèn tí", "mei wen ti"], hint: "méi wèn tí" },
    { type: "type", prompt: "a bit slower please", acceptedAnswers: ["慢一点", "màn yì diǎn", "man yi dian"], hint: "màn yì diǎn" },
    { type: "type", prompt: "great! / awesome!", acceptedAnswers: ["太好了", "tài hǎo le", "tai hao le"], hint: "tài hǎo le" },
    { type: "type", prompt: "wait a moment", acceptedAnswers: ["等一下", "děng yí xià", "deng yi xia"], hint: "děng yí xià" },
  ],
  oral: [
    { type: "oral", phrase: "我听不懂请说慢一点", phonetic: "wǒ tīng bù dǒng, qǐng shuō màn yì diǎn", meaning: "I don't understand, please speak slower" },
    { type: "oral", phrase: "没问题", phonetic: "méi wèn tí", meaning: "No problem" },
    { type: "oral", phrase: "太好了", phonetic: "tài hǎo le", meaning: "Great!" },
    { type: "oral", phrase: "等一下", phonetic: "děng yí xià", meaning: "Wait a moment" },
  ],
};

const ZH_U7_EXAM: UnitExam = {
  unitId: "zh-u7",
  langCode: "zh",
  unitTitle: "At the Market",
  cefrLevel: "A2",
  cefrLabel: "Elementary",
  certificateTitle: "Mandarin Market Skills",
  mc: [
    { type: "mc", question: "What does '太贵了' mean?", options: ["I'll buy it", "Too expensive!", "Can I have a discount?", "How much?"], correctIndex: 1, explanation: "'太贵了' (tài guì le) = too expensive." },
    { type: "mc", question: "What does '便宜一点' mean?", options: ["one more please", "a little cheaper, please", "very expensive", "I'll buy it"], correctIndex: 1, explanation: "'便宜一点' = a little cheaper. Key bargaining phrase." },
    { type: "mc", question: "How do you say 'I'll buy it'?", options: ["我买了", "我不要", "太贵了", "便宜一点"], correctIndex: 0, explanation: "'我买了' = I'll buy it / I bought it." },
    { type: "mc", question: "What does '好吃' mean?", options: ["too spicy", "not fresh", "delicious", "take away"], correctIndex: 2, explanation: "'好吃' (hǎo chī) = delicious." },
    { type: "mc", question: "What does '不要辣' mean?", options: ["very spicy", "no spice please", "I want spice", "delicious"], correctIndex: 1, explanation: "'不要辣' = don't want spice — essential for mild eaters!" },
    { type: "mc", question: "'能打折吗？' means:", options: ["Is this fresh?", "Can you give a discount?", "How much in total?", "Do you have WeChat Pay?"], correctIndex: 1, explanation: "'能打折吗？' = Can you give a discount?" },
    { type: "mc", question: "What does '打包' mean?", options: ["pay by card", "take away / to pack up", "bargain", "wrap as a gift"], correctIndex: 1, explanation: "'打包' (dǎ bāo) = take away / pack up." },
    { type: "mc", question: "'一斤' is approximately:", options: ["1 kilogram", "100 grams", "500 grams", "2 kilograms"], correctIndex: 2, explanation: "'一斤' (yì jīn) ≈ 500g (half a kilogram)." },
    { type: "mc", question: "What does '新鲜的' mean?", options: ["spicy", "fresh", "delicious", "cheap"], correctIndex: 1, explanation: "'新鲜的' (xīn xiān de) = fresh." },
    { type: "mc", question: "'微信支付' refers to:", options: ["cash payment", "credit card", "WeChat Pay", "bank transfer"], correctIndex: 2, explanation: "'微信支付' = WeChat Pay — dominant payment method in China." },
  ],
  listen: [
    { type: "listen", audioText: "太贵了便宜一点吧", audioLang: "zh-CN", options: ["I'll buy it", "Too expensive, a bit cheaper please", "I don't want it", "How much is it?"], correctIndex: 1 },
    { type: "listen", audioText: "我要这个", audioLang: "zh-CN", options: ["I don't want this", "How much is this?", "I want this one", "Is this fresh?"], correctIndex: 2 },
    { type: "listen", audioText: "好吃", audioLang: "zh-CN", options: ["fresh", "spicy", "expensive", "delicious"], correctIndex: 3 },
    { type: "listen", audioText: "不要辣", audioLang: "zh-CN", options: ["very spicy", "no spice", "more spice", "is it spicy?"], correctIndex: 1 },
    { type: "listen", audioText: "能打折吗", audioLang: "zh-CN", options: ["Do you have this?", "Can you give a discount?", "Is it fresh?", "How much in total?"], correctIndex: 1 },
  ],
  type: [
    { type: "type", prompt: "too expensive!", acceptedAnswers: ["太贵了", "tài guì le", "tai gui le"], hint: "tài guì le" },
    { type: "type", prompt: "a little cheaper please", acceptedAnswers: ["便宜一点", "pián yí yì diǎn", "pian yi yi dian"], hint: "pián yí yì diǎn" },
    { type: "type", prompt: "I want this one", acceptedAnswers: ["我要这个", "wǒ yào zhè ge", "wo yao zhe ge"], hint: "wǒ yào zhè ge" },
    { type: "type", prompt: "delicious", acceptedAnswers: ["好吃", "hǎo chī", "hao chi"], hint: "hǎo chī" },
    { type: "type", prompt: "take away / pack up", acceptedAnswers: ["打包", "dǎ bāo", "da bao"], hint: "dǎ bāo" },
  ],
  oral: [
    { type: "oral", phrase: "太贵了便宜一点吧", phonetic: "tài guì le, pián yí yì diǎn ba", meaning: "Too expensive, a bit cheaper please!" },
    { type: "oral", phrase: "我要这个", phonetic: "wǒ yào zhè ge", meaning: "I want this one" },
    { type: "oral", phrase: "好吃", phonetic: "hǎo chī", meaning: "Delicious!" },
  ],
};

const ZH_U8_EXAM: UnitExam = {
  unitId: "zh-u8",
  langCode: "zh",
  unitTitle: "Business & Formal",
  cefrLevel: "B1",
  cefrLabel: "Broken Fluency",
  certificateTitle: "Mandarin Professional",
  mc: [
    { type: "mc", question: "What is the formal version of '你好'?", options: ["您好", "你好啊", "你好吗", "大家好"], correctIndex: 0, explanation: "'您好' (nín hǎo) is the formal/respectful greeting. '您' is the polite 'you'." },
    { type: "mc", question: "What does '幸会' mean?", options: ["goodbye", "nice to meet you (formal)", "please sit", "let's start"], correctIndex: 1, explanation: "'幸会' (xìng huì) = It's an honour to meet you — formal." },
    { type: "mc", question: "How should business cards be exchanged in Chinese culture?", options: ["One hand, face down", "With both hands, facing them", "Email them instead", "Put it away immediately"], correctIndex: 1, explanation: "Exchange business cards (名片) with both hands — a sign of respect." },
    { type: "mc", question: "What does '干杯' mean?", options: ["let's eat", "cheers! / bottoms up!", "I'm full", "thank you for dining"], correctIndex: 1, explanation: "'干杯' (gān bēi) = cheers! — literally 'dry cup'." },
    { type: "mc", question: "What does '这是我请客' mean?", options: ["let's split the bill", "this is my treat", "the food is delicious", "let's order more"], correctIndex: 1, explanation: "'这是我请客' = this is my treat. Hosts always pay in Chinese culture." },
    { type: "mc", question: "'请坐' means:", options: ["please stand", "please speak", "please sit down", "please wait"], correctIndex: 2, explanation: "'请坐' (qǐng zuò) = please sit down." },
    { type: "mc", question: "How do you open a meeting in Mandarin?", options: ["我们结束吧", "我们开始吧", "我们出去吧", "我们等一下吧"], correctIndex: 1, explanation: "'我们开始吧' = let's get started." },
    { type: "mc", question: "What does '请多关照' mean?", options: ["please eat more", "please look at this", "please take care of me", "please come often"], correctIndex: 2, explanation: "'请多关照' = please take care of me — said when starting a new relationship." },
    { type: "mc", question: "'名片' means:", options: ["business card", "business meeting", "business dinner", "business partner"], correctIndex: 0, explanation: "'名片' (míng piàn) = business card." },
    { type: "mc", question: "What does '合作' mean?", options: ["competition", "cooperation / collaboration", "meeting", "contract"], correctIndex: 1, explanation: "'合作' (hé zuò) = cooperation / collaboration." },
  ],
  listen: [
    { type: "listen", audioText: "您好幸会", audioLang: "zh-CN", options: ["Hello, goodbye", "Hello, it's an honour to meet you", "Thank you, please sit", "Let's get started"], correctIndex: 1 },
    { type: "listen", audioText: "干杯", audioLang: "zh-CN", options: ["I'm full", "Let's eat", "Cheers!", "Thank you"], correctIndex: 2 },
    { type: "listen", audioText: "这是我请客", audioLang: "zh-CN", options: ["Let's split", "I'll have more", "This is my treat", "The food is great"], correctIndex: 2 },
    { type: "listen", audioText: "我们开始吧", audioLang: "zh-CN", options: ["Let's finish", "Let's eat", "Let's rest", "Let's get started"], correctIndex: 3 },
    { type: "listen", audioText: "请多关照", audioLang: "zh-CN", options: ["Please eat more", "Please look at me", "Please take care of me", "Please sit down"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "hello (formal)", acceptedAnswers: ["您好", "nín hǎo", "nin hao"], hint: "nín hǎo" },
    { type: "type", prompt: "cheers!", acceptedAnswers: ["干杯", "gān bēi", "gan bei"], hint: "gān bēi" },
    { type: "type", prompt: "business card", acceptedAnswers: ["名片", "míng piàn", "ming pian"], hint: "míng piàn" },
    { type: "type", prompt: "this is my treat", acceptedAnswers: ["这是我请客", "zhè shì wǒ qǐng kè"], hint: "zhè shì wǒ qǐng kè" },
    { type: "type", prompt: "let's get started", acceptedAnswers: ["我们开始吧", "wǒ men kāi shǐ ba"], hint: "wǒ men kāi shǐ ba" },
  ],
  oral: [
    { type: "oral", phrase: "您好幸会幸会", phonetic: "nín hǎo, xìng huì xìng huì", meaning: "Hello, it's a great honour to meet you" },
    { type: "oral", phrase: "为了我们的合作干杯", phonetic: "wèi le wǒ men de hé zuò, gān bēi", meaning: "To our cooperation, cheers!" },
    { type: "oral", phrase: "这是我请客", phonetic: "zhè shì wǒ qǐng kè", meaning: "This is my treat" },
    { type: "oral", phrase: "我们开始吧", phonetic: "wǒ men kāi shǐ ba", meaning: "Let's get started" },
  ],
};

// ── Spanish Exams ─────────────────────────────────────────────────────────

const ES_U1_EXAM: UnitExam = {
  unitId: "es-u1",
  langCode: "es",
  unitTitle: "Greetings & Basics",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "Spanish Foundations",
  mc: [
    { type: "mc", question: "How do you say 'hello' in Spanish?", options: ["Adiós", "Hola", "Gracias", "Por favor"], correctIndex: 1, explanation: "'Hola' is the standard Spanish greeting." },
    { type: "mc", question: "What does 'gracias' mean?", options: ["hello", "goodbye", "please", "thank you"], correctIndex: 3, explanation: "'Gracias' = thank you." },
    { type: "mc", question: "What does 'por favor' mean?", options: ["thank you", "please", "excuse me", "sorry"], correctIndex: 1, explanation: "'Por favor' = please." },
    { type: "mc", question: "How do you say 'goodbye'?", options: ["Hola", "Gracias", "Adiós", "Buenas"], correctIndex: 2, explanation: "'Adiós' = goodbye." },
    { type: "mc", question: "What does '¿Cómo estás?' mean?", options: ["What's your name?", "How are you?", "Where are you from?", "How much is it?"], correctIndex: 1, explanation: "'¿Cómo estás?' = How are you? (informal)." },
    { type: "mc", question: "How do you say 'excuse me' in Spanish?", options: ["Lo siento", "Perdón", "Gracias", "De nada"], correctIndex: 1, explanation: "'Perdón' = excuse me / sorry." },
    { type: "mc", question: "What does 'de nada' mean?", options: ["thank you", "goodbye", "you're welcome", "please"], correctIndex: 2, explanation: "'De nada' = you're welcome — literally 'of nothing'." },
    { type: "mc", question: "What does 'Lo siento' mean?", options: ["I love it", "I'm sorry", "I don't know", "I'm fine"], correctIndex: 1, explanation: "'Lo siento' = I'm sorry." },
    { type: "mc", question: "How do you say 'please' in Spanish?", options: ["gracias", "adiós", "por favor", "perdón"], correctIndex: 2, explanation: "'Por favor' = please." },
    { type: "mc", question: "'Buenas tardes' is used:", options: ["in the morning", "at noon", "in the afternoon/evening", "at night only"], correctIndex: 2, explanation: "'Buenas tardes' = good afternoon — used roughly noon to evening." },
  ],
  listen: [
    { type: "listen", audioText: "Hola", audioLang: "es-MX", options: ["goodbye", "thank you", "hello", "please"], correctIndex: 2 },
    { type: "listen", audioText: "Gracias", audioLang: "es-MX", options: ["sorry", "goodbye", "please", "thank you"], correctIndex: 3 },
    { type: "listen", audioText: "¿Cómo estás?", audioLang: "es-MX", options: ["What's your name?", "How are you?", "Where are you from?", "How much?"], correctIndex: 1 },
    { type: "listen", audioText: "Adiós", audioLang: "es-MX", options: ["hello", "thank you", "goodbye", "please"], correctIndex: 2 },
    { type: "listen", audioText: "Por favor", audioLang: "es-MX", options: ["thank you", "please", "sorry", "goodbye"], correctIndex: 1 },
  ],
  type: [
    { type: "type", prompt: "hello", acceptedAnswers: ["hola", "Hola"], hint: "Hola" },
    { type: "type", prompt: "thank you", acceptedAnswers: ["gracias", "Gracias"], hint: "Gracias" },
    { type: "type", prompt: "goodbye", acceptedAnswers: ["adiós", "adios", "Adiós"], hint: "Adiós" },
    { type: "type", prompt: "please", acceptedAnswers: ["por favor", "Por favor"], hint: "por favor" },
    { type: "type", prompt: "you're welcome", acceptedAnswers: ["de nada", "De nada"], hint: "De nada" },
  ],
  oral: [
    { type: "oral", phrase: "Hola, ¿cómo estás?", phonetic: "OH-lah, KOH-moh ehs-TAHS", meaning: "Hello, how are you?" },
    { type: "oral", phrase: "Gracias, de nada", phonetic: "GRAH-syahs, deh NAH-dah", meaning: "Thank you, you're welcome" },
    { type: "oral", phrase: "Por favor", phonetic: "pohr fah-VOR", meaning: "Please" },
  ],
};

const ES_U2_EXAM: UnitExam = {
  unitId: "es-u2",
  langCode: "es",
  unitTitle: "Introductions",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "Spanish Introductions",
  mc: [
    { type: "mc", question: "How do you say 'My name is...'?", options: ["Me llamo...", "Soy de...", "Tengo...", "Quiero..."], correctIndex: 0, explanation: "'Me llamo' = My name is... Literally: I call myself." },
    { type: "mc", question: "What does '¿De dónde eres?' mean?", options: ["How old are you?", "What do you do?", "Where are you from?", "What is your name?"], correctIndex: 2, explanation: "'¿De dónde eres?' = Where are you from?" },
    { type: "mc", question: "How do you say 'I am from Mexico'?", options: ["Soy Mexico", "Soy de México", "Yo México", "De México soy"], correctIndex: 1, explanation: "'Soy de México' — Soy = I am, de = from." },
    { type: "mc", question: "What does 'mucho gusto' mean?", options: ["How are you?", "Nice to meet you", "Thank you", "Where are you from?"], correctIndex: 1, explanation: "'Mucho gusto' = Nice to meet you — literally 'much pleasure'." },
    { type: "mc", question: "How do you say 'I am a student'?", options: ["Yo estudiante", "Soy estudiante", "Tengo estudiante", "Es estudiante"], correctIndex: 1, explanation: "'Soy estudiante' = I am a student." },
    { type: "mc", question: "What does '¿Cuántos años tienes?' mean?", options: ["What is your name?", "Where are you from?", "How old are you?", "What do you do?"], correctIndex: 2, explanation: "'¿Cuántos años tienes?' = How old are you?" },
    { type: "mc", question: "How do you say 'I am 25 years old'?", options: ["Tengo 25 años", "Soy 25 años", "Yo 25 años", "Hay 25 años"], correctIndex: 0, explanation: "'Tengo 25 años' — use 'tener' (to have) for age in Spanish." },
    { type: "mc", question: "'Encantado/a' means:", options: ["goodbye", "sorry", "pleased/delighted to meet you", "thank you"], correctIndex: 2, explanation: "'Encantado' (male) / 'Encantada' (female) = delighted to meet you." },
    { type: "mc", question: "What does 'hablar' mean?", options: ["to eat", "to go", "to speak", "to want"], correctIndex: 2, explanation: "'Hablar' = to speak." },
    { type: "mc", question: "How do you say 'Nice to meet you'?", options: ["Hasta luego", "Mucho gusto", "De nada", "Lo siento"], correctIndex: 1, explanation: "'Mucho gusto' = Nice to meet you." },
  ],
  listen: [
    { type: "listen", audioText: "Me llamo Carlos", audioLang: "es-MX", options: ["I am from Carlos", "My name is Carlos", "I like Carlos", "I want Carlos"], correctIndex: 1 },
    { type: "listen", audioText: "¿De dónde eres?", audioLang: "es-MX", options: ["How old are you?", "What's your name?", "Where are you from?", "What do you do?"], correctIndex: 2 },
    { type: "listen", audioText: "Mucho gusto", audioLang: "es-MX", options: ["Thank you very much", "Goodbye", "Nice to meet you", "How are you?"], correctIndex: 2 },
    { type: "listen", audioText: "Soy de España", audioLang: "es-MX", options: ["I'm going to Spain", "I love Spain", "I am from Spain", "I want to visit Spain"], correctIndex: 2 },
    { type: "listen", audioText: "Tengo veinte años", audioLang: "es-MX", options: ["I have 20 brothers", "I am 20 years old", "I want 20", "I need 20"], correctIndex: 1 },
  ],
  type: [
    { type: "type", prompt: "my name is...", acceptedAnswers: ["me llamo", "Me llamo"], hint: "Me llamo..." },
    { type: "type", prompt: "where are you from?", acceptedAnswers: ["¿de dónde eres?", "de donde eres", "¿De dónde eres?"], hint: "¿De dónde eres?" },
    { type: "type", prompt: "nice to meet you", acceptedAnswers: ["mucho gusto", "Mucho gusto"], hint: "Mucho gusto" },
    { type: "type", prompt: "I am a student", acceptedAnswers: ["soy estudiante", "Soy estudiante"], hint: "Soy estudiante" },
    { type: "type", prompt: "I am from Mexico", acceptedAnswers: ["soy de México", "soy de mexico", "Soy de México"], hint: "Soy de México" },
  ],
  oral: [
    { type: "oral", phrase: "Me llamo David, mucho gusto", phonetic: "meh YAH-moh Dah-veed, MOO-choh GOOS-toh", meaning: "My name is David, nice to meet you" },
    { type: "oral", phrase: "Soy de los Estados Unidos", phonetic: "soy deh lohs ehs-TAH-dohs oo-NEE-dohs", meaning: "I'm from the United States" },
    { type: "oral", phrase: "¿De dónde eres?", phonetic: "deh DOHN-deh EH-rehs", meaning: "Where are you from?" },
  ],
};

// ── French Exams ──────────────────────────────────────────────────────────

const FR_U1_EXAM: UnitExam = {
  unitId: "fr-u1",
  langCode: "fr",
  unitTitle: "Greetings & Basics",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "French Foundations",
  mc: [
    { type: "mc", question: "How do you say 'hello' in French?", options: ["Au revoir", "Bonjour", "Merci", "S'il vous plaît"], correctIndex: 1, explanation: "'Bonjour' = hello / good day — the standard French greeting." },
    { type: "mc", question: "What does 'merci' mean?", options: ["hello", "goodbye", "please", "thank you"], correctIndex: 3, explanation: "'Merci' = thank you." },
    { type: "mc", question: "What does 'au revoir' mean?", options: ["hello", "sorry", "goodbye", "please"], correctIndex: 2, explanation: "'Au revoir' = goodbye — literally 'until seeing (again)'." },
    { type: "mc", question: "How do you say 'please' formally in French?", options: ["Merci", "S'il vous plaît", "Pardon", "De rien"], correctIndex: 1, explanation: "'S'il vous plaît' = please (formal). 'S'il te plaît' = please (informal)." },
    { type: "mc", question: "What does 'de rien' mean?", options: ["thank you", "you're welcome", "sorry", "please"], correctIndex: 1, explanation: "'De rien' = you're welcome — literally 'of nothing'." },
    { type: "mc", question: "How do you say 'excuse me' in French?", options: ["Merci", "Bonjour", "Excusez-moi", "Au revoir"], correctIndex: 2, explanation: "'Excusez-moi' = excuse me (formal)." },
    { type: "mc", question: "What does 'bonsoir' mean?", options: ["good morning", "good day", "good evening", "good night"], correctIndex: 2, explanation: "'Bonsoir' = good evening." },
    { type: "mc", question: "How do you say 'I'm sorry' in French?", options: ["De rien", "Merci", "Je suis désolé(e)", "S'il vous plaît"], correctIndex: 2, explanation: "'Je suis désolé(e)' = I am sorry." },
    { type: "mc", question: "What does 'comment allez-vous?' mean?", options: ["Where are you from?", "What is your name?", "How are you? (formal)", "How much is it?"], correctIndex: 2, explanation: "'Comment allez-vous?' = How are you? (formal/plural)." },
    { type: "mc", question: "What is the informal way to say 'how are you'?", options: ["Comment allez-vous?", "Comment tu t'appelles?", "Comment ça va?", "Qu'est-ce que c'est?"], correctIndex: 2, explanation: "'Comment ça va?' or just 'Ça va?' = How are you? (informal)." },
  ],
  listen: [
    { type: "listen", audioText: "Bonjour", audioLang: "fr-FR", options: ["goodbye", "thank you", "hello", "please"], correctIndex: 2 },
    { type: "listen", audioText: "Merci beaucoup", audioLang: "fr-FR", options: ["sorry", "you're welcome", "thank you very much", "goodbye"], correctIndex: 2 },
    { type: "listen", audioText: "Au revoir", audioLang: "fr-FR", options: ["hello", "goodbye", "please", "sorry"], correctIndex: 1 },
    { type: "listen", audioText: "S'il vous plaît", audioLang: "fr-FR", options: ["thank you", "goodbye", "you're welcome", "please"], correctIndex: 3 },
    { type: "listen", audioText: "Comment ça va", audioLang: "fr-FR", options: ["What is your name?", "Where are you from?", "How are you?", "How much is it?"], correctIndex: 2 },
  ],
  type: [
    { type: "type", prompt: "hello / good day", acceptedAnswers: ["bonjour", "Bonjour"], hint: "Bonjour" },
    { type: "type", prompt: "thank you", acceptedAnswers: ["merci", "Merci"], hint: "Merci" },
    { type: "type", prompt: "goodbye", acceptedAnswers: ["au revoir", "Au revoir"], hint: "Au revoir" },
    { type: "type", prompt: "please (formal)", acceptedAnswers: ["s'il vous plaît", "S'il vous plaît"], hint: "S'il vous plaît" },
    { type: "type", prompt: "you're welcome", acceptedAnswers: ["de rien", "De rien"], hint: "De rien" },
  ],
  oral: [
    { type: "oral", phrase: "Bonjour, comment allez-vous ?", phonetic: "bon-ZHOOR, koh-MAWN tah-lay VOO", meaning: "Hello, how are you?" },
    { type: "oral", phrase: "Merci beaucoup", phonetic: "mehr-SEE boh-KOO", meaning: "Thank you very much" },
    { type: "oral", phrase: "Au revoir", phonetic: "oh ruh-VWAHR", meaning: "Goodbye" },
  ],
};

const FR_U2_EXAM: UnitExam = {
  unitId: "fr-u2",
  langCode: "fr",
  unitTitle: "Introductions",
  cefrLevel: "A1",
  cefrLabel: "Beginner",
  certificateTitle: "French Introductions",
  mc: [
    { type: "mc", question: "How do you say 'My name is...' in French?", options: ["J'ai...", "Je suis...", "Je m'appelle...", "Mon nom est..."], correctIndex: 2, explanation: "'Je m'appelle...' = My name is... (I call myself...)" },
    { type: "mc", question: "What does 'je suis' mean?", options: ["I have", "I go", "I am", "I want"], correctIndex: 2, explanation: "'Je suis' = I am. From the verb 'être'." },
    { type: "mc", question: "How do you ask 'Where are you from?'", options: ["Quel âge avez-vous?", "D'où venez-vous?", "Comment vous appelez-vous?", "Que faites-vous?"], correctIndex: 1, explanation: "'D'où venez-vous?' = Where are you from? (formal)." },
    { type: "mc", question: "What does 'enchanté(e)' mean?", options: ["goodbye", "sorry", "nice to meet you / enchanted", "please"], correctIndex: 2, explanation: "'Enchanté(e)' = nice to meet you / pleased to meet you." },
    { type: "mc", question: "How do you say 'I am French'?", options: ["J'ai français", "Je suis français(e)", "Je parle français", "Je viens France"], correctIndex: 1, explanation: "'Je suis français(e)' = I am French." },
    { type: "mc", question: "How do you say 'I am 30 years old'?", options: ["Je suis 30 ans", "J'ai 30 ans", "Je fais 30 ans", "J'habite 30 ans"], correctIndex: 1, explanation: "'J'ai 30 ans' — use 'avoir' (to have) for age in French." },
    { type: "mc", question: "What does 'parler' mean?", options: ["to eat", "to go", "to speak", "to live"], correctIndex: 2, explanation: "'Parler' = to speak." },
    { type: "mc", question: "'Je parle un peu français' means:", options: ["I don't speak French", "I speak French fluently", "I speak a little French", "I'm learning French"], correctIndex: 2, explanation: "'Je parle un peu français' = I speak a little French." },
    { type: "mc", question: "What does 'habiter' mean?", options: ["to eat", "to live/reside", "to work", "to travel"], correctIndex: 1, explanation: "'Habiter' = to live/reside." },
    { type: "mc", question: "'J'habite à Paris' means:", options: ["I love Paris", "I'm going to Paris", "I live in Paris", "I'm from Paris"], correctIndex: 2, explanation: "'J'habite à Paris' = I live in Paris." },
  ],
  listen: [
    { type: "listen", audioText: "Je m'appelle Marie", audioLang: "fr-FR", options: ["I am from Marie", "My name is Marie", "I love Marie", "I want to meet Marie"], correctIndex: 1 },
    { type: "listen", audioText: "D'où venez-vous?", audioLang: "fr-FR", options: ["How old are you?", "What's your name?", "Where are you from?", "What do you do?"], correctIndex: 2 },
    { type: "listen", audioText: "Enchanté", audioLang: "fr-FR", options: ["goodbye", "sorry", "nice to meet you", "thank you"], correctIndex: 2 },
    { type: "listen", audioText: "Je suis américain", audioLang: "fr-FR", options: ["I love America", "I am French", "I am American", "I'm going to America"], correctIndex: 2 },
    { type: "listen", audioText: "J'habite à Lyon", audioLang: "fr-FR", options: ["I love Lyon", "I live in Lyon", "I want to visit Lyon", "I'm going to Lyon"], correctIndex: 1 },
  ],
  type: [
    { type: "type", prompt: "my name is...", acceptedAnswers: ["je m'appelle", "Je m'appelle"], hint: "Je m'appelle..." },
    { type: "type", prompt: "nice to meet you", acceptedAnswers: ["enchanté", "enchanté(e)", "Enchanté"], hint: "Enchanté(e)" },
    { type: "type", prompt: "where are you from? (formal)", acceptedAnswers: ["d'où venez-vous", "D'où venez-vous?", "d'où viens-tu"], hint: "D'où venez-vous ?" },
    { type: "type", prompt: "I am French", acceptedAnswers: ["je suis français", "je suis française", "Je suis français(e)"], hint: "Je suis français(e)" },
    { type: "type", prompt: "I speak a little French", acceptedAnswers: ["je parle un peu français", "Je parle un peu français"], hint: "Je parle un peu français" },
  ],
  oral: [
    { type: "oral", phrase: "Je m'appelle David, enchanté", phonetic: "zhuh mah-PEL Dah-veed, ahn-shahn-TAY", meaning: "My name is David, nice to meet you" },
    { type: "oral", phrase: "Je suis américain", phonetic: "zhuh swee zah-may-ree-KAN", meaning: "I am American" },
    { type: "oral", phrase: "D'où venez-vous ?", phonetic: "doo vuh-NAY voo", meaning: "Where are you from?" },
  ],
};

// ── Registry ──────────────────────────────────────────────────────────────

const EXAM_REGISTRY: Record<string, UnitExam> = {
  "zh-u1": ZH_U1_EXAM,
  "zh-u2": ZH_U2_EXAM,
  "zh-u3": ZH_U3_EXAM,
  "zh-u4": ZH_U4_EXAM,
  "zh-u5": ZH_U5_EXAM,
  "zh-u6": ZH_U6_EXAM,
  "zh-u7": ZH_U7_EXAM,
  "zh-u8": ZH_U8_EXAM,
  "es-u1": ES_U1_EXAM,
  "es-u2": ES_U2_EXAM,
  "fr-u1": FR_U1_EXAM,
  "fr-u2": FR_U2_EXAM,
};

export function getUnitExam(unitId: string): UnitExam | null {
  return EXAM_REGISTRY[unitId] || null;
}

export function hasUnitExam(unitId: string): boolean {
  return !!EXAM_REGISTRY[unitId];
}

// ── Language-level final exam (one per language) ───────────────────────────
// Combines questions from all unit exams for that language.

function buildLanguageExam(
  langCode: string,
  unitTitle: string,
  certificateTitle: string,
  cefrLevel: string,
  cefrLabel: string,
): UnitExam {
  const unitExams = Object.values(EXAM_REGISTRY).filter((e) => e.langCode === langCode);
  const mc: MCQuestion[] = [];
  const listen: ListenQuestion[] = [];
  const type: TypeQuestion[] = [];
  const oral: OralQuestion[] = [];
  for (const ex of unitExams) {
    mc.push(...ex.mc);
    listen.push(...ex.listen);
    type.push(...ex.type);
    oral.push(...ex.oral);
  }
  return {
    unitId: langCode,
    langCode,
    unitTitle,
    cefrLevel,
    cefrLabel,
    certificateTitle,
    mc: mc.slice(0, 10),
    listen: listen.slice(0, 5),
    type: type.slice(0, 5),
    oral: oral.slice(0, 5),
  };
}

const LANG_EXAM_REGISTRY: Record<string, UnitExam> = {
  zh: buildLanguageExam("zh", "Mandarin Final Exam", "Mandarin Certified", "A2", "Elementary"),
  es: buildLanguageExam("es", "Spanish Final Exam",  "Spanish Certified",  "A2", "Elementary"),
  fr: buildLanguageExam("fr", "French Final Exam",   "French Certified",   "A2", "Elementary"),
};

export function getLanguageExam(langCode: string): UnitExam | null {
  return LANG_EXAM_REGISTRY[langCode] || null;
}

export function hasLanguageExam(langCode: string): boolean {
  return !!LANG_EXAM_REGISTRY[langCode];
}
