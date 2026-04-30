// ── French Curriculum ────────────────────────────────────────────────────────

import type { LanguageCurriculum } from "@/lib/lesson-types";

export const FRENCH_CURRICULUM: LanguageCurriculum = {
  languageCode: "fr",
  languageLabel: "French",
  units: [
    {
      id: "fr-u1",
      title: "Basics & Greetings",
      description: "Start speaking French from day one.",
      lessons: [
        {
          id: "fr-u1-l1",
          title: "Greetings",
          description: "Say hello, goodbye, and be polite in French.",
          realWorldAbility: "You can greet people in French",
          mapLocationId: "fr-map-street-paris",
          parts: [
            {
              id: "fr-u1-l1-p1",
              title: "Essential Greetings",
              description: "Core vocabulary.",
              exercises: [
                { type: "vocab-card", word: "Bonjour", translation: "Hello / Good morning", tip: "The essential greeting — use it everywhere." },
                { type: "vocab-card", word: "Bonsoir", translation: "Good evening" },
                { type: "vocab-card", word: "Au revoir", translation: "Goodbye" },
                { type: "vocab-card", word: "Merci", translation: "Thank you" },
                { type: "vocab-card", word: "Merci beaucoup", translation: "Thank you very much" },
                { type: "vocab-card", word: "De rien", translation: "You're welcome", tip: "Literally 'of nothing'." },
                { type: "vocab-card", word: "S'il vous plaît", translation: "Please (formal)", tip: "Essential in French — politeness matters a lot." },
                { type: "vocab-card", word: "Excusez-moi", translation: "Excuse me" },
                { type: "vocab-card", word: "Pardon", translation: "Sorry / pardon" },
              ],
            },
            {
              id: "fr-u1-l1-p2",
              title: "Practice",
              description: "Use greetings.",
              exercises: [
                { type: "translate", prompt: "Hello", promptLang: "native", acceptedAnswers: ["Bonjour", "bonjour"], explanation: "'Bonjour' is THE French greeting." },
                { type: "match-pairs", pairs: [{ left: "Bonjour", right: "Hello" }, { left: "Au revoir", right: "Goodbye" }, { left: "Merci", right: "Thank you" }, { left: "Pardon", right: "Sorry" }] },
                { type: "fill-blank", sentence: "A: Merci! B: ___", answer: "De rien", options: ["De rien", "Au revoir", "Pardon"], explanation: "Reply to thanks with 'de rien'." },
                { type: "scenario", situation: "You enter a bakery in Paris.", npcLine: "Bonjour!", npcLineTranslation: "Hello!", options: [{ text: "Bonjour!", correct: true, feedback: "Always greet back in France — it's considered very rude not to." }, { text: "Un croissant.", correct: false, feedback: "In France, you MUST say bonjour first before ordering!" }] },
              ],
            },
          ],
        },
        {
          id: "fr-u1-l2",
          title: "Introductions",
          description: "Introduce yourself in French.",
          realWorldAbility: "You can introduce yourself in French",
          mapLocationId: "fr-map-hotel-paris",
          parts: [
            {
              id: "fr-u1-l2-p1",
              title: "Introduction Phrases",
              description: "Names and origin.",
              exercises: [
                { type: "vocab-card", word: "Je m'appelle…", translation: "My name is…", tip: "Literally 'I call myself…'" },
                { type: "vocab-card", word: "Comment vous appelez-vous?", translation: "What is your name? (formal)" },
                { type: "vocab-card", word: "Enchanté(e)", translation: "Nice to meet you" },
                { type: "vocab-card", word: "Je suis de…", translation: "I am from…" },
                { type: "vocab-card", word: "D'où venez-vous?", translation: "Where do you come from?" },
              ],
            },
            {
              id: "fr-u1-l2-p2",
              title: "Practice",
              description: "Build introduction sentences.",
              exercises: [
                { type: "reorder", words: ["m'appelle", "Je", "Sophie"], correctOrder: ["Je", "m'appelle", "Sophie"], translation: "My name is Sophie", explanation: "'Je m'appelle' + name." },
                { type: "build-sentence", translation: "I am from Canada", wordBank: ["Je", "suis", "de", "du", "Canada"], correctOrder: ["Je", "suis", "du", "Canada"], explanation: "'Je suis du Canada' — 'du' for masculine countries." },
                { type: "scenario", situation: "At a hotel reception in Paris.", npcLine: "Bonsoir! Votre nom, s'il vous plaît?", npcLineTranslation: "Good evening! Your name, please?", options: [{ text: "Je m'appelle David. Enchanté.", correct: true, feedback: "Perfectly polite French introduction!" }, { text: "Bonjour!", correct: false, feedback: "They asked your name — answer it." }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fr-u2",
      title: "Ordering Food",
      description: "Navigate French cafés and restaurants.",
      lessons: [
        {
          id: "fr-u2-l1",
          title: "At a Café",
          description: "Order food and drinks at a French café.",
          realWorldAbility: "You can order at a café in French",
          mapLocationId: "fr-map-cafe-paris",
          parts: [
            {
              id: "fr-u2-l1-p1",
              title: "Food & Drink Vocabulary",
              description: "Café essentials.",
              exercises: [
                { type: "vocab-card", word: "un café", translation: "a coffee" },
                { type: "vocab-card", word: "un thé", translation: "a tea" },
                { type: "vocab-card", word: "un croissant", translation: "a croissant" },
                { type: "vocab-card", word: "de l'eau", translation: "water" },
                { type: "vocab-card", word: "du vin", translation: "wine" },
                { type: "vocab-card", word: "une baguette", translation: "a baguette" },
                { type: "vocab-card", word: "l'addition", translation: "the bill/check" },
                { type: "vocab-card", word: "Je voudrais…", translation: "I would like…", tip: "The polite ordering phrase." },
              ],
            },
            {
              id: "fr-u2-l1-p2",
              title: "Ordering Practice",
              description: "Order at a real café.",
              exercises: [
                { type: "build-sentence", translation: "I would like a coffee, please", wordBank: ["Je", "voudrais", "un", "café", "s'il", "vous", "plaît"], correctOrder: ["Je", "voudrais", "un", "café", "s'il", "vous", "plaît"], explanation: "The gold-standard ordering phrase." },
                { type: "translate", prompt: "The check, please", promptLang: "native", acceptedAnswers: ["L'addition, s'il vous plaît", "l'addition s'il vous plaît", "l'addition svp"], explanation: "'L'addition, s'il vous plaît' — how to ask for the bill." },
                { type: "scenario", situation: "Sitting at a Parisian café terrace.", npcLine: "Bonjour, vous désirez?", npcLineTranslation: "Hello, what would you like?", options: [{ text: "Bonjour! Je voudrais un café, s'il vous plaît.", correct: true, feedback: "Perfect! Greeting + polite order + please." }, { text: "Café.", correct: false, feedback: "Way too blunt for France. Say bonjour and use 'je voudrais'." }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "hello", answer: "bonjour" }, { prompt: "thank you", answer: "merci" }, { prompt: "please", answer: "s'il vous plaît" }, { prompt: "coffee", answer: "café" }, { prompt: "I would like", answer: "je voudrais" }, { prompt: "the bill", answer: "l'addition" }, { prompt: "goodbye", answer: "au revoir" }, { prompt: "water", answer: "eau" }] },
        },
      ],
    },
    {
      id: "fr-u3",
      title: "Getting Around",
      description: "Navigate French cities.",
      lessons: [
        {
          id: "fr-u3-l1",
          title: "Directions",
          description: "Ask for and understand directions.",
          realWorldAbility: "You can ask for directions in French",
          mapLocationId: "fr-map-station-paris",
          parts: [
            {
              id: "fr-u3-l1-p1",
              title: "Direction Words",
              description: "Navigation vocabulary.",
              exercises: [
                { type: "vocab-card", word: "à gauche", translation: "to the left" },
                { type: "vocab-card", word: "à droite", translation: "to the right" },
                { type: "vocab-card", word: "tout droit", translation: "straight ahead" },
                { type: "vocab-card", word: "Où est…?", translation: "Where is…?" },
                { type: "vocab-card", word: "la gare", translation: "the train station" },
                { type: "vocab-card", word: "le métro", translation: "the metro/subway" },
                { type: "build-sentence", translation: "Where is the metro?", wordBank: ["Où", "est", "le", "métro", "la", "?"], correctOrder: ["Où", "est", "le", "métro", "?"], explanation: "'Où est le métro?' — essential Parisian question." },
              ],
            },
            {
              id: "fr-u3-l1-p2",
              title: "Transport Practice",
              description: "Buy tickets and take transport.",
              exercises: [
                { type: "vocab-card", word: "un billet", translation: "a ticket" },
                { type: "vocab-card", word: "le bus", translation: "the bus" },
                { type: "vocab-card", word: "le train", translation: "the train" },
                { type: "vocab-card", word: "À quelle heure part…?", translation: "What time does … leave?", tip: "Essential for train travel." },
                { type: "translate", prompt: "A ticket to Lyon, please", promptLang: "native", acceptedAnswers: ["Un billet pour Lyon, s'il vous plaît", "un billet pour lyon s'il vous plaît"], explanation: "'Un billet pour + destination + s'il vous plaît'." },
                { type: "multiple-choice", question: "What does 'tout droit' mean?", options: ["turn right", "turn left", "straight ahead", "behind you"], correctIndex: 2, explanation: "'Tout droit' = straight ahead — keep walking." },
                { type: "scenario", situation: "You're lost on a Paris street.", npcLine: "Bonjour, je peux vous aider?", npcLineTranslation: "Hello, can I help you?", options: [{ text: "Bonjour! Où est le métro, s'il vous plaît?", correct: true, feedback: "Polite and clear — always say bonjour first in France!" }, { text: "Métro!", correct: false, feedback: "Too abrupt for France — start with 'bonjour'." }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "left", answer: "à gauche" }, { prompt: "right", answer: "à droite" }, { prompt: "straight", answer: "tout droit" }, { prompt: "where is", answer: "où est" }, { prompt: "ticket", answer: "billet" }, { prompt: "station", answer: "gare" }, { prompt: "metro", answer: "métro" }, { prompt: "bus", answer: "bus" }] },
        },
      ],
    },
    {
      id: "fr-u4",
      title: "Shopping & Fashion",
      description: "Shop in French boutiques and markets.",
      lessons: [
        {
          id: "fr-u4-l1",
          title: "At the Boutique",
          description: "Buy clothes and ask about prices.",
          realWorldAbility: "You can shop for clothes in French",
          parts: [
            {
              id: "fr-u4-l1-p1",
              title: "Shopping Vocabulary",
              description: "Clothes, prices, and sizes.",
              exercises: [
                { type: "vocab-card", word: "C'est combien?", translation: "How much is it?", tip: "Direct price question — very common." },
                { type: "vocab-card", word: "C'est trop cher", translation: "It's too expensive" },
                { type: "vocab-card", word: "Vous avez ça en…?", translation: "Do you have this in…?", tip: "Ask for a different size or colour." },
                { type: "vocab-card", word: "la taille", translation: "the size" },
                { type: "vocab-card", word: "la couleur", translation: "the colour" },
                { type: "vocab-card", word: "Je le prends", translation: "I'll take it" },
                { type: "vocab-card", word: "Puis-je l'essayer?", translation: "May I try it on?" },
                { type: "vocab-card", word: "la caisse", translation: "the cash register / checkout" },
              ],
            },
            {
              id: "fr-u4-l1-p2",
              title: "Shopping Practice",
              description: "Navigate a boutique in France.",
              exercises: [
                { type: "translate", prompt: "How much is it?", promptLang: "native", acceptedAnswers: ["C'est combien?", "c'est combien", "Combien ça coûte?"], explanation: "'C'est combien?' — quick, everyday price question." },
                { type: "multiple-choice", question: "What does 'Je le prends' mean?", options: ["It's too expensive", "May I try it on?", "I'll take it", "Do you have my size?"], correctIndex: 2, explanation: "'Je le prends' = I'll take it — the purchase confirmation." },
                { type: "fill-blank", sentence: "Puis-je l'___?", answer: "essayer", options: ["essayer", "prendre", "payer", "chercher"], explanation: "'Essayer' = to try on. 'Puis-je l'essayer?' = May I try it on?" },
                { type: "scenario", situation: "In a Parisian clothing boutique.", npcLine: "Bonjour, je peux vous aider?", npcLineTranslation: "Hello, can I help you?", options: [{ text: "Bonjour! Je cherche une veste. Vous avez ça en noir?", correct: true, feedback: "Perfect — greeting + describing what you want!" }, { text: "C'est combien?", correct: false, feedback: "Always greet first in France! Then ask the price." }] },
                { type: "match-pairs", pairs: [{ left: "C'est combien?", right: "How much is it?" }, { left: "Je le prends", right: "I'll take it" }, { left: "la taille", right: "the size" }, { left: "la caisse", right: "the checkout" }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fr-u5",
      title: "Social & Emotions",
      description: "Express feelings and have real conversations.",
      lessons: [
        {
          id: "fr-u5-l1",
          title: "How Are You?",
          description: "Express how you feel in French.",
          realWorldAbility: "You can express emotions and do small talk in French",
          parts: [
            {
              id: "fr-u5-l1-p1",
              title: "Feelings Vocabulary",
              description: "Emotions and well-being.",
              exercises: [
                { type: "vocab-card", word: "Comment allez-vous?", translation: "How are you? (formal)", tip: "Use 'allez-vous' with strangers, bosses, elders." },
                { type: "vocab-card", word: "Comment vas-tu?", translation: "How are you? (informal)", tip: "Use 'vas-tu' or 'ça va?' with friends." },
                { type: "vocab-card", word: "Je vais bien", translation: "I am doing well" },
                { type: "vocab-card", word: "Je suis fatigué(e)", translation: "I am tired" },
                { type: "vocab-card", word: "Je suis content(e)", translation: "I am happy" },
                { type: "vocab-card", word: "J'ai faim", translation: "I am hungry", tip: "Literally 'I have hunger'." },
                { type: "vocab-card", word: "J'ai soif", translation: "I am thirsty" },
                { type: "vocab-card", word: "C'est super!", translation: "That's great!" },
                { type: "vocab-card", word: "C'est dommage", translation: "That's a shame / Too bad" },
              ],
            },
            {
              id: "fr-u5-l1-p2",
              title: "Small Talk Practice",
              description: "Hold a conversation about how you feel.",
              exercises: [
                { type: "match-pairs", pairs: [{ left: "Je vais bien", right: "I am doing well" }, { left: "J'ai faim", right: "I am hungry" }, { left: "Je suis fatigué", right: "I am tired" }, { left: "C'est super", right: "That's great" }] },
                { type: "multiple-choice", question: "A colleague says 'Je suis très fatigué'. What do they mean?", options: ["I am very happy", "I am very hungry", "I am very tired", "I am very busy"], correctIndex: 2, explanation: "'Fatigué(e)' = tired. 'Très' = very." },
                { type: "fill-blank", sentence: "A: Comment allez-vous? B: ___ bien, merci.", answer: "Je vais", options: ["Je vais", "J'ai", "Je suis", "C'est"], explanation: "'Comment allez-vous?' is answered with 'Je vais bien' (formal)." },
                { type: "translate", prompt: "I am happy today", promptLang: "native", acceptedAnswers: ["Je suis content aujourd'hui", "Je suis contente aujourd'hui", "je suis content aujourd'hui"], explanation: "'Je suis content(e) aujourd'hui' — 'être' for emotional states." },
                { type: "scenario", situation: "Seeing your French colleague Monday morning.", npcLine: "Bonjour! Comment vas-tu?", npcLineTranslation: "Morning! How are you?", options: [{ text: "Bonjour! Je vais bien, merci. Et toi?", correct: true, feedback: "Polite, positive, and asking back — parfait!" }, { text: "Bonjour.", correct: false, feedback: "They asked how you are — answer it!" }] },
              ],
            },
          ],
        },
        {
          id: "fr-u5-l2",
          title: "Making Plans",
          description: "Invite people and make plans in French.",
          realWorldAbility: "You can make social plans in French",
          parts: [
            {
              id: "fr-u5-l2-p1",
              title: "Invitation Phrases",
              description: "Invite, accept, and decline.",
              exercises: [
                { type: "vocab-card", word: "Tu veux…?", translation: "Do you want to…? (informal)", tip: "'Voulez-vous…?' for formal." },
                { type: "vocab-card", word: "On se retrouve où?", translation: "Where shall we meet?", tip: "'On' = informal 'we'." },
                { type: "vocab-card", word: "Avec plaisir!", translation: "With pleasure! / I'd love to!" },
                { type: "vocab-card", word: "Je suis désolé(e), je ne peux pas", translation: "I'm sorry, I can't" },
                { type: "vocab-card", word: "À quelle heure?", translation: "At what time?" },
                { type: "vocab-card", word: "À tout à l'heure!", translation: "See you soon! / See you later!" },
              ],
            },
            {
              id: "fr-u5-l2-p2",
              title: "Plans Practice",
              description: "Make real arrangements in French.",
              exercises: [
                { type: "translate", prompt: "Do you want to have dinner?", promptLang: "native", acceptedAnswers: ["Tu veux dîner?", "tu veux dîner", "Vous voulez dîner?"], explanation: "'Tu veux dîner?' — casual dinner invitation." },
                { type: "multiple-choice", question: "What does 'Avec plaisir' mean?", options: ["I can't come", "With pleasure", "Where shall we meet?", "See you soon"], correctIndex: 1, explanation: "'Avec plaisir' = with pleasure — an enthusiastic yes." },
                { type: "scenario", situation: "A French friend invites you to see a film.", npcLine: "Tu veux aller au cinéma ce soir?", npcLineTranslation: "Do you want to go to the cinema tonight?", options: [{ text: "Avec plaisir! À quelle heure?", correct: true, feedback: "Enthusiastic yes and asking for details — très bien!" }, { text: "Non.", correct: false, feedback: "Clear, but a little harsh. Try 'Je suis désolé, je ne peux pas'." }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "fr-u6",
      title: "Health & Emergencies",
      description: "Handle medical and urgent situations in French.",
      lessons: [
        {
          id: "fr-u6-l1",
          title: "At the Pharmacy",
          description: "Describe symptoms and get medicine.",
          realWorldAbility: "You can handle health situations in French",
          parts: [
            {
              id: "fr-u6-l1-p1",
              title: "Health Vocabulary",
              description: "Body parts and symptoms.",
              exercises: [
                { type: "vocab-card", word: "J'ai mal à…", translation: "I have pain in… / My … hurts", tip: "'J'ai mal à la tête' = I have a headache." },
                { type: "vocab-card", word: "la tête", translation: "the head" },
                { type: "vocab-card", word: "le ventre", translation: "the stomach / belly" },
                { type: "vocab-card", word: "le dos", translation: "the back" },
                { type: "vocab-card", word: "la fièvre", translation: "the fever" },
                { type: "vocab-card", word: "J'ai besoin d'un médecin", translation: "I need a doctor", tip: "Use this clearly in any health emergency." },
                { type: "vocab-card", word: "Appelez une ambulance!", translation: "Call an ambulance!", tip: "Emergency phrase." },
                { type: "vocab-card", word: "la pharmacie", translation: "the pharmacy" },
                { type: "vocab-card", word: "l'hôpital", translation: "the hospital" },
              ],
            },
            {
              id: "fr-u6-l1-p2",
              title: "Emergency Practice",
              description: "Navigate health emergencies in French.",
              exercises: [
                { type: "translate", prompt: "I have a headache", promptLang: "native", acceptedAnswers: ["J'ai mal à la tête", "j'ai mal à la tête"], explanation: "'J'ai mal à la tête' — 'avoir mal à' + body part." },
                { type: "multiple-choice", question: "What does 'la fièvre' mean?", options: ["headache", "cough", "fever", "back pain"], correctIndex: 2, explanation: "'La fièvre' = fever. Common at a French pharmacy." },
                { type: "fill-blank", sentence: "J'ai besoin ___ médecin.", answer: "d'un", options: ["d'un", "de la", "du", "des"], explanation: "'Besoin de + indefinite article': 'besoin d'un médecin'." },
                { type: "scenario", situation: "Feeling ill at your hotel in Paris.", npcLine: "Ça va? Vous avez l'air malade.", npcLineTranslation: "Are you okay? You look sick.", options: [{ text: "Non, j'ai de la fièvre. J'ai besoin d'un médecin.", correct: true, feedback: "Clear and precise — exactly what to say!" }, { text: "Je vais bien, merci.", correct: false, feedback: "Don't hide it — you need help!" }] },
                { type: "match-pairs", pairs: [{ left: "J'ai mal à la tête", right: "I have a headache" }, { left: "la fièvre", right: "fever" }, { left: "la pharmacie", right: "pharmacy" }, { left: "l'hôpital", right: "hospital" }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "head", answer: "tête" }, { prompt: "stomach", answer: "ventre" }, { prompt: "fever", answer: "fièvre" }, { prompt: "I have a headache", answer: "j'ai mal à la tête" }, { prompt: "pharmacy", answer: "pharmacie" }, { prompt: "hospital", answer: "hôpital" }, { prompt: "I need a doctor", answer: "j'ai besoin d'un médecin" }, { prompt: "call an ambulance", answer: "appelez une ambulance" }] },
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 7: Numbers & Time
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "fr-u7",
      title: "Numbers & Time",
      description: "Count, tell time, and handle prices in French.",
      lessons: [
        {
          id: "fr-u7-l1",
          title: "Numbers 1–100",
          description: "Master French numbers for everyday situations.",
          realWorldAbility: "You can count and discuss prices in French",
          parts: [
            {
              id: "fr-u7-l1-p1",
              title: "Numbers 1–20",
              description: "Foundation numbers in French.",
              exercises: [
                { type: "vocab-card", word: "un", pinyin: "œ̃", translation: "one", tip: "Nasal vowel — don't pronounce the 'n'." },
                { type: "vocab-card", word: "deux", pinyin: "dø", translation: "two", tip: "'eu' sounds like the vowel in 'blur'." },
                { type: "vocab-card", word: "dix", pinyin: "dis", translation: "ten", tip: "Pronounce the 'x' as 's' when alone." },
                { type: "vocab-card", word: "quinze", pinyin: "kɛ̃z", translation: "fifteen", tip: "Silent 'u' after 'q' — just 'kenz'." },
                { type: "vocab-card", word: "vingt", pinyin: "vɛ̃", translation: "twenty", tip: "The 'gt' is silent — just a nasal 'van'." },
                { type: "match-pairs", pairs: [{ left: "trois", right: "3" }, { left: "sept", right: "7" }, { left: "douze", right: "12" }, { left: "vingt", right: "20" }] },
              ],
            },
            {
              id: "fr-u7-l1-p2",
              title: "Practice & Prices",
              description: "Use numbers in real contexts.",
              exercises: [
                { type: "multiple-choice", question: "How do you say 17 in French?", options: ["dix-sept", "dix-six", "sept-dix", "dix-huit"], correctIndex: 0, explanation: "17 = dix-sept (literally ten-seven)." },
                { type: "fill-blank", sentence: "Ça coûte ___ euros.", answer: "quinze", explanation: "It costs 15 euros." },
                { type: "translate", prompt: "How much does it cost?", promptLang: "native", acceptedAnswers: ["Combien ça coûte?", "Combien ça coûte ?", "C'est combien?"], explanation: "'Combien ça coûte?' — the essential shopping phrase." },
                { type: "scenario", situation: "At a French market buying fruit.", npcLine: "Ça fait huit euros cinquante.", npcLineTranslation: "That's 8.50 euros.", options: [{ text: "D'accord, voilà.", correct: true, feedback: "Simple and polite — perfect market French!" }, { text: "C'est trop cher!", correct: false, feedback: "You could haggle, but this isn't a flea market!" }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "one", answer: "un" }, { prompt: "five", answer: "cinq" }, { prompt: "ten", answer: "dix" }, { prompt: "twenty", answer: "vingt" }, { prompt: "fifteen", answer: "quinze" }, { prompt: "how much?", answer: "combien" }] },
        },
        {
          id: "fr-u7-l2",
          title: "Telling Time",
          description: "Ask and tell time in French.",
          realWorldAbility: "You can tell time in French",
          parts: [
            {
              id: "fr-u7-l2-p1",
              title: "Time Vocabulary",
              description: "Hours, minutes, and time expressions.",
              exercises: [
                { type: "vocab-card", word: "Quelle heure est-il?", pinyin: "kɛ.l‿œʁ ɛ.til", translation: "What time is it?", tip: "The core time-asking phrase — memorize it as a unit." },
                { type: "vocab-card", word: "Il est trois heures", pinyin: "il ɛ tʁwa.z‿œʁ", translation: "It's 3 o'clock", tip: "'Heures' links to the number — liaison with 'z' sound." },
                { type: "vocab-card", word: "midi", pinyin: "midi", translation: "noon", tip: "Not 'douze heures' — French say 'midi' for noon." },
                { type: "vocab-card", word: "minuit", pinyin: "minɥi", translation: "midnight", tip: "Like 'midi' but for midnight." },
                { type: "fill-blank", sentence: "Il est ___ heures et demie.", answer: "six", explanation: "It's 6:30 — 'et demie' = and a half." },
                { type: "match-pairs", pairs: [{ left: "midi", right: "noon" }, { left: "minuit", right: "midnight" }, { left: "et quart", right: "quarter past" }, { left: "moins le quart", right: "quarter to" }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "What time is it?", answer: "Quelle heure est-il?" }, { prompt: "noon", answer: "midi" }, { prompt: "midnight", answer: "minuit" }, { prompt: "half past", answer: "et demie" }, { prompt: "quarter past", answer: "et quart" }] },
        },
      ],
    },
    // ════════════════════════════════════════════════════════════════════════
    // UNIT 8: At the Hotel
    // ════════════════════════════════════════════════════════════════════════
    {
      id: "fr-u8",
      title: "At the Hotel",
      description: "Check in, make requests, and navigate French hotels.",
      lessons: [
        {
          id: "fr-u8-l1",
          title: "Checking In",
          description: "Handle hotel check-in conversations.",
          realWorldAbility: "You can check in to a hotel in French",
          parts: [
            {
              id: "fr-u8-l1-p1",
              title: "Hotel Vocabulary",
              description: "Essential hotel phrases.",
              exercises: [
                { type: "vocab-card", word: "J'ai une réservation", pinyin: "ʒe yn ʁe.zɛʁ.va.sjɔ̃", translation: "I have a reservation", tip: "The 'r' is guttural — from the throat, not the tongue." },
                { type: "vocab-card", word: "la clé", pinyin: "la kle", translation: "the key", tip: "Modern hotels use 'la carte' (keycard) too." },
                { type: "vocab-card", word: "la chambre", pinyin: "la ʃɑ̃bʁ", translation: "the room", tip: "'Ch' in French = 'sh' sound, not 'ch'." },
                { type: "vocab-card", word: "le petit déjeuner", pinyin: "lə pəti deʒøne", translation: "breakfast", tip: "Literally 'the little lunch' — breakfast is included in many French hotels." },
                { type: "match-pairs", pairs: [{ left: "la chambre", right: "room" }, { left: "la clé", right: "key" }, { left: "l'ascenseur", right: "elevator" }, { left: "le petit déjeuner", right: "breakfast" }] },
              ],
            },
            {
              id: "fr-u8-l1-p2",
              title: "Check-in Practice",
              description: "Handle a real hotel check-in.",
              exercises: [
                { type: "translate", prompt: "I have a reservation under the name…", promptLang: "native", acceptedAnswers: ["J'ai une réservation au nom de…", "j'ai une réservation au nom de"], explanation: "'Au nom de' = under the name of." },
                { type: "fill-blank", sentence: "La chambre est au ___ étage.", answer: "troisième", options: ["troisième", "trois", "premier", "deuxième"], explanation: "'Troisième étage' = third floor. Ordinal numbers use -ième." },
                { type: "scenario", situation: "Arriving at a hotel in Paris.", npcLine: "Bonsoir! Vous avez une réservation?", npcLineTranslation: "Good evening! Do you have a reservation?", options: [{ text: "Oui, j'ai une réservation au nom de Smith.", correct: true, feedback: "Parfait! Clear and polite." }, { text: "Non, je veux une chambre.", correct: false, feedback: "This works, but having a reservation is always better in Paris!" }] },
                { type: "multiple-choice", question: "What does 'l'ascenseur' mean?", options: ["staircase", "elevator", "lobby", "bathroom"], correctIndex: 1, explanation: "'L'ascenseur' = the elevator. Stairs = 'l'escalier'." },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "room", answer: "chambre" }, { prompt: "key", answer: "clé" }, { prompt: "reservation", answer: "réservation" }, { prompt: "breakfast", answer: "petit déjeuner" }, { prompt: "elevator", answer: "ascenseur" }, { prompt: "floor", answer: "étage" }] },
        },
      ],
    },
  ],
};
