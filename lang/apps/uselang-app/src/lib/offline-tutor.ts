import { SUPPORTED_LANGUAGES } from "./constants";
import type { TutorRequest, TutorResponse } from "./tutor-api";

type PhraseSeed = {
  phrase: string;
  phonetic: string;
  meaning: string;
  tip: string;
  tongue: string;
  lips: string;
};

const STARTERS: Record<string, PhraseSeed> = {
  es: {
    phrase: "Hola, quiero practicar.",
    phonetic: "OH-lah, KYEH-roh prak-tee-KAR",
    meaning: "Hi, I want to practice.",
    tip: "Keep the vowels clean and open. Let the r in quiero stay light.",
    tongue: "Tap the tongue quickly near the ridge behind your top teeth for the r.",
    lips: "Relax the lips; Spanish vowels stay steady instead of sliding.",
  },
  fr: {
    phrase: "Bonjour, je voudrais pratiquer.",
    phonetic: "bohn-ZHOOR, zhuh voo-DREH prak-tee-KAY",
    meaning: "Hello, I would like to practice.",
    tip: "Soften the j sound like the middle of measure.",
    tongue: "Keep the tongue relaxed and slightly back for the French r.",
    lips: "Round the lips gently on bon and vous.",
  },
  de: {
    phrase: "Hallo, ich mochte uben.",
    phonetic: "HAH-loh, ikh MURKH-tuh OO-ben",
    meaning: "Hello, I would like to practice.",
    tip: "For ich, keep the tongue high and let air brush over it.",
    tongue: "Lift the middle of the tongue close to the roof of the mouth for ich.",
    lips: "Round the lips on uben, then release cleanly.",
  },
  it: {
    phrase: "Ciao, voglio esercitarmi.",
    phonetic: "CHOW, VOH-lyoh eh-zer-chee-TAR-mee",
    meaning: "Hi, I want to practice.",
    tip: "Italian rhythm is even and musical. Do not swallow the final vowel.",
    tongue: "Touch the tongue lightly behind the teeth for l and t sounds.",
    lips: "Open the mouth more than English on a and o vowels.",
  },
  ja: {
    phrase: "こんにちは、練習したいです。",
    phonetic: "kohn-nee-chee-wah, ren-SHOO she-tie dess",
    meaning: "Hello, I want to practice.",
    tip: "Keep each beat short and even.",
    tongue: "For r, tap between an English r and l, with the tongue briefly touching behind the teeth.",
    lips: "Keep the lips small and controlled; avoid wide English vowels.",
  },
  zh: {
    phrase: "你好，我想练习。",
    phonetic: "nee how, woh shyahng lyen-shee",
    meaning: "Hello, I want to practice.",
    tip: "Let the tone shape carry the meaning: ni rises, hao dips then rises.",
    tongue: "For xiang, lift the front of the tongue close to the roof of the mouth and let air pass narrowly.",
    lips: "Keep the mouth relaxed; do not over-round the vowels.",
  },
  nl: {
    phrase: "Hallo, ik wil oefenen.",
    phonetic: "HAH-loh, ik vil OO-fuh-nun",
    meaning: "Hello, I want to practice.",
    tip: "Keep the rhythm direct and clear.",
    tongue: "For ik, lift the back of the tongue and release a soft scraping sound.",
    lips: "Round the lips for oe like the vowel in food.",
  },
  hi: {
    phrase: "नमस्ते, मैं अभ्यास करना चाहता हूँ।",
    phonetic: "nuh-muh-STAY, main ubh-YAAS kur-naa CHAAH-taa hoon",
    meaning: "Hello, I want to practice.",
    tip: "Let the dental sounds happen with the tongue at the teeth, not behind them.",
    tongue: "Touch the tongue to the back of the upper teeth for t and d sounds.",
    lips: "Keep the jaw relaxed and the vowels full.",
  },
};

const DEFAULT_SEED: PhraseSeed = {
  phrase: "Hello, I want to practice.",
  phonetic: "heh-LOH, eye want to PRAK-tiss",
  meaning: "Hello, I want to practice.",
  tip: "Say it slowly first, then connect the words once it feels easy.",
  tongue: "Keep the tongue relaxed behind the lower teeth between sounds.",
  lips: "Open the mouth enough that each vowel is clear.",
};

export function buildOfflineTutorFallback(req: TutorRequest): TutorResponse {
  const target = languageLabel(req.languageCode);
  const native = req.nativeLanguageCode || "en";
  const seed = selectSeed(req);
  const userText = (req.attemptTranscript || req.text || "").trim();
  const isCorrection = !!req.attemptTranscript;
  const intro =
    req.mode === "train" || req.mode === "conversation"
      ? `Offline lesson mode is on. Here is a useful ${target} line.`
      : `Offline quick mode is on. Here is the natural ${target} version.`;
  const correctionLine = isCorrection
    ? `Good start. Focus on this: ${seed.tip}`
    : "";
  const repeatPrompt = `Now say it back: ${seed.phrase}`;
  const audioText = `${intro} ${seed.phrase}. It means: ${seed.meaning}. Say it bit by bit: ${seed.phonetic}. ${seed.tip}`;

  return {
    naturalPhrase: seed.phrase,
    phonetic: seed.phonetic,
    literalMeaning: seed.meaning,
    context: userText
      ? `Based on "${userText}", practice this offline phrase now.`
      : `Practice this phrase until it feels automatic.`,
    pronunciationTip: seed.tip,
    articulation: {
      tonguePlacement: seed.tongue,
      lipShape: seed.lips,
      airflow: "Use steady airflow and avoid clipping the final sound.",
      stress: "Say the stressed syllable a little longer, not louder.",
    },
    correctionLine,
    correctedVersion: "",
    errorTypes: [],
    fixDrill: "",
    repeatPrompt,
    homework: [
      `Record yourself saying "${seed.phrase}" three times.`,
      `Use it once in a tiny roleplay before your next lesson.`,
    ],
    localReply: req.mode === "conversation" ? seed.phrase : "",
    shouldRepeat: true,
    audioText,
    audioSegments: [
      { lang: native, text: intro },
      { lang: req.languageCode, text: seed.phrase },
      { lang: native, text: `It means: ${seed.meaning}. Say it bit by bit: ${seed.phonetic}. ${seed.tip}` },
    ],
    provider: "offline",
    providerModel: "local-device-fallback",
  };
}

function selectSeed(req: TutorRequest): PhraseSeed {
  const languageSeed = STARTERS[req.languageCode] || DEFAULT_SEED;
  const text = (req.text || "").trim();
  if (!text || req.mode !== "quick-ask") return languageSeed;

  const lower = text.toLowerCase();
  if (lower.includes("thank")) {
    return {
      ...languageSeed,
      phrase: phraseFor(req.languageCode, {
        es: "Gracias.",
        fr: "Merci.",
        de: "Danke.",
        it: "Grazie.",
        ja: "ありがとうございます。",
        zh: "谢谢。",
        nl: "Dank je.",
        hi: "धन्यवाद।",
      }),
      meaning: "Thank you.",
      phonetic: phraseFor(req.languageCode, {
        es: "GRAH-syahs",
        fr: "mehr-SEE",
        de: "DAHN-kuh",
        it: "GRAHT-syeh",
        ja: "ah-ree-gah-toh goh-zah-ee-mahss",
        zh: "shyeh-shyeh",
        nl: "dahnk yuh",
        hi: "dhun-yuh-VAAD",
      }),
    };
  }
  if (lower.includes("restaurant") || lower.includes("order") || lower.includes("coffee")) {
    return {
      ...languageSeed,
      phrase: phraseFor(req.languageCode, {
        es: "Quisiera pedir un cafe.",
        fr: "Je voudrais commander un cafe.",
        de: "Ich mochte einen Kaffee bestellen.",
        it: "Vorrei ordinare un caffe.",
        ja: "コーヒーを注文したいです。",
        zh: "我想点一杯咖啡。",
        nl: "Ik wil graag een koffie bestellen.",
        hi: "मैं एक कॉफी ऑर्डर करना चाहता हूँ।",
      }),
      meaning: "I would like to order a coffee.",
      phonetic: phraseFor(req.languageCode, {
        es: "kee-SYEH-rah peh-DEER oon kah-FEH",
        fr: "zhuh voo-DREH koh-mahn-DAY un kah-FAY",
        de: "ikh MURKH-tuh EYE-nen KAH-fay buh-SHTEL-en",
        it: "vor-RAY or-dee-NAH-reh oon kah-FEH",
        ja: "KOH-hee oh choo-mon she-tie dess",
        zh: "woh shyahng dyen ee bay kah-fay",
        nl: "ik vil khrahkh un KOH-fee buh-STEL-un",
        hi: "main ek KOH-fee order kur-naa CHAAH-taa hoon",
      }),
    };
  }
  return languageSeed;
}

function phraseFor(languageCode: string, values: Record<string, string>) {
  return values[languageCode] || values.en || DEFAULT_SEED.phrase;
}

function languageLabel(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label || code;
}
