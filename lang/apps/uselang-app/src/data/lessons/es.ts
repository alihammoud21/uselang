// ── Spanish Curriculum ───────────────────────────────────────────────────────

import type { LanguageCurriculum } from "@/lib/lesson-types";

export const SPANISH_CURRICULUM: LanguageCurriculum = {
  languageCode: "es",
  languageLabel: "Spanish",
  units: [
    {
      id: "es-u1",
      title: "Basics & Greetings",
      description: "Start speaking Spanish from day one.",
      lessons: [
        {
          id: "es-u1-l1",
          title: "Greetings",
          description: "Say hello, goodbye, and basic pleasantries in Spanish.",
          realWorldAbility: "You can greet people in Spanish",
          mapLocationId: "es-map-street-madrid",
          parts: [
            {
              id: "es-u1-l1-p1",
              title: "Essential Greetings",
              description: "Core greeting vocabulary.",
              exercises: [
                { type: "vocab-card", word: "Hola", translation: "Hello", tip: "The universal greeting — works everywhere." },
                { type: "vocab-card", word: "Buenos días", translation: "Good morning", tip: "Used until roughly noon." },
                { type: "vocab-card", word: "Buenas tardes", translation: "Good afternoon" },
                { type: "vocab-card", word: "Buenas noches", translation: "Good evening / night" },
                { type: "vocab-card", word: "Adiós", translation: "Goodbye" },
                { type: "vocab-card", word: "Hasta luego", translation: "See you later" },
                { type: "vocab-card", word: "Por favor", translation: "Please" },
                { type: "vocab-card", word: "Gracias", translation: "Thank you" },
                { type: "vocab-card", word: "De nada", translation: "You're welcome", tip: "Literally 'of nothing'." },
                { type: "vocab-card", word: "Lo siento", translation: "I'm sorry" },
              ],
            },
            {
              id: "es-u1-l1-p2",
              title: "Practice",
              description: "Use greetings in context.",
              exercises: [
                { type: "translate", prompt: "Hello", promptLang: "native", acceptedAnswers: ["Hola", "hola"], explanation: "'Hola' is the universal Spanish greeting." },
                { type: "translate", prompt: "Thank you", promptLang: "native", acceptedAnswers: ["Gracias", "gracias"], explanation: "'Gracias' — always appreciated." },
                { type: "match-pairs", pairs: [{ left: "Hola", right: "Hello" }, { left: "Adiós", right: "Goodbye" }, { left: "Gracias", right: "Thank you" }, { left: "Lo siento", right: "I'm sorry" }] },
                { type: "multiple-choice", question: "What do you say in the morning?", options: ["Buenas noches", "Buenos días", "Buenas tardes", "Hola"], correctIndex: 1, explanation: "'Buenos días' is used until about noon." },
                { type: "fill-blank", sentence: "A: Gracias. B: ___", answer: "De nada", options: ["De nada", "Adiós", "Lo siento"], explanation: "Reply to 'thank you' with 'de nada' (you're welcome)." },
              ],
            },
            {
              id: "es-u1-l1-p3",
              title: "Street Scene",
              description: "Use greetings in a real scenario.",
              exercises: [
                { type: "scenario", situation: "You bump into someone at a market in Madrid.", npcLine: "¡Ay!", npcLineTranslation: "Ouch!", options: [{ text: "¡Lo siento!", correct: true, feedback: "Perfect — apologizing is the right move." }, { text: "¡Hola!", correct: false, feedback: "That's hello — you need to apologize." }, { text: "¡Adiós!", correct: false, feedback: "Don't just walk away!" }] },
                { type: "scenario", situation: "A shopkeeper hands you your purchase.", npcLine: "Aquí tiene.", npcLineTranslation: "Here you go.", options: [{ text: "Gracias", correct: true, feedback: "Always say thank you!" }, { text: "Lo siento", correct: false, feedback: "'Lo siento' means sorry — say thanks instead." }] },
              ],
            },
          ],
        },
        {
          id: "es-u1-l2",
          title: "Introductions",
          description: "Tell people your name and ask theirs.",
          realWorldAbility: "You can introduce yourself in Spanish",
          mapLocationId: "es-map-hotel-madrid",
          parts: [
            {
              id: "es-u1-l2-p1",
              title: "Key Phrases",
              description: "Introduction vocabulary.",
              exercises: [
                { type: "vocab-card", word: "Me llamo…", translation: "My name is…", tip: "Literally 'I call myself…'" },
                { type: "vocab-card", word: "¿Cómo te llamas?", translation: "What is your name?", tip: "Informal — for people your age or younger." },
                { type: "vocab-card", word: "Mucho gusto", translation: "Nice to meet you", tip: "Literally 'much pleasure'." },
                { type: "vocab-card", word: "¿De dónde eres?", translation: "Where are you from?", tip: "Informal 'tú' form." },
                { type: "vocab-card", word: "Soy de…", translation: "I am from…" },
              ],
            },
            {
              id: "es-u1-l2-p2",
              title: "Practice Introductions",
              description: "Build introduction sentences.",
              exercises: [
                { type: "reorder", words: ["llamo", "Me", "María"], correctOrder: ["Me", "llamo", "María"], translation: "My name is María", explanation: "'Me llamo' + name — the standard pattern." },
                { type: "translate", prompt: "Nice to meet you", promptLang: "native", acceptedAnswers: ["Mucho gusto", "mucho gusto", "Encantado", "Encantada"], explanation: "'Mucho gusto' or 'Encantado/a' both work." },
                { type: "build-sentence", translation: "I am from Mexico", wordBank: ["Soy", "de", "México", "Me", "llamo"], correctOrder: ["Soy", "de", "México"], explanation: "'Soy de México' — I am from Mexico." },
                { type: "scenario", situation: "Checking into a hotel in Madrid.", npcLine: "¡Bienvenido! ¿Cómo se llama?", npcLineTranslation: "Welcome! What is your name?", options: [{ text: "Me llamo David. Mucho gusto.", correct: true, feedback: "Perfect formal introduction!" }, { text: "Hola.", correct: false, feedback: "They asked your name — answer the question." }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "es-u2",
      title: "Daily Life",
      description: "Numbers, time, and essential verbs.",
      lessons: [
        {
          id: "es-u2-l1",
          title: "Numbers & Money",
          description: "Count and handle money in Spanish.",
          realWorldAbility: "You can count and discuss prices in Spanish",
          parts: [
            {
              id: "es-u2-l1-p1",
              title: "Numbers 1–20",
              description: "Foundation numbers.",
              exercises: [
                { type: "vocab-card", word: "uno", translation: "1" },
                { type: "vocab-card", word: "dos", translation: "2" },
                { type: "vocab-card", word: "tres", translation: "3" },
                { type: "vocab-card", word: "cuatro", translation: "4" },
                { type: "vocab-card", word: "cinco", translation: "5" },
                { type: "vocab-card", word: "diez", translation: "10" },
                { type: "vocab-card", word: "veinte", translation: "20" },
                { type: "multiple-choice", question: "What is 'quince' in English?", options: ["14", "15", "16", "50"], correctIndex: 1, explanation: "'Quince' = 15." },
                { type: "translate", prompt: "How much does it cost?", promptLang: "native", acceptedAnswers: ["¿Cuánto cuesta?", "Cuánto cuesta", "cuanto cuesta"], explanation: "'¿Cuánto cuesta?' — the shopping essential." },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "es-u3",
      title: "Ordering Food",
      description: "Order meals and drinks at a restaurant.",
      lessons: [
        {
          id: "es-u3-l1",
          title: "At a Restaurant",
          description: "Order food, ask for the check, and be polite.",
          realWorldAbility: "You can order food at a restaurant in Spanish",
          mapLocationId: "es-map-cafe-madrid",
          parts: [
            {
              id: "es-u3-l1-p1",
              title: "Food Vocabulary",
              description: "Common foods and drinks.",
              exercises: [
                { type: "vocab-card", word: "agua", translation: "water" },
                { type: "vocab-card", word: "café", translation: "coffee" },
                { type: "vocab-card", word: "cerveza", translation: "beer" },
                { type: "vocab-card", word: "pan", translation: "bread" },
                { type: "vocab-card", word: "pollo", translation: "chicken" },
                { type: "vocab-card", word: "arroz", translation: "rice" },
                { type: "vocab-card", word: "la cuenta", translation: "the bill/check" },
                { type: "vocab-card", word: "Quiero…", translation: "I want…", tip: "Direct way to order." },
                { type: "vocab-card", word: "Me gustaría…", translation: "I would like…", tip: "More polite than 'quiero'." },
              ],
            },
            {
              id: "es-u3-l1-p2",
              title: "Ordering Practice",
              description: "Build real ordering sentences.",
              exercises: [
                { type: "build-sentence", translation: "I would like a coffee, please", wordBank: ["Me", "gustaría", "un", "café", "por", "favor"], correctOrder: ["Me", "gustaría", "un", "café", "por", "favor"], explanation: "Polite ordering: 'Me gustaría + item + por favor'." },
                { type: "translate", prompt: "The check, please", promptLang: "native", acceptedAnswers: ["La cuenta, por favor", "la cuenta por favor"], explanation: "'La cuenta, por favor' — essential for leaving a restaurant." },
                { type: "scenario", situation: "At a tapas bar in Madrid.", npcLine: "¿Qué desea?", npcLineTranslation: "What would you like?", options: [{ text: "Me gustaría una cerveza, por favor.", correct: true, feedback: "Polite and clear!" }, { text: "Cerveza.", correct: false, feedback: "Too blunt — add 'me gustaría' and 'por favor'." }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "hello", answer: "hola" }, { prompt: "thank you", answer: "gracias" }, { prompt: "water", answer: "agua" }, { prompt: "coffee", answer: "café" }, { prompt: "I would like", answer: "me gustaría" }, { prompt: "the check", answer: "la cuenta" }, { prompt: "please", answer: "por favor" }, { prompt: "goodbye", answer: "adiós" }] },
        },
      ],
    },
    {
      id: "es-u4",
      title: "Getting Around",
      description: "Navigate cities and take transportation.",
      lessons: [
        {
          id: "es-u4-l1",
          title: "Directions & Transport",
          description: "Ask for directions and use public transport.",
          realWorldAbility: "You can navigate a Spanish-speaking city",
          mapLocationId: "es-map-station-barcelona",
          parts: [
            {
              id: "es-u4-l1-p1",
              title: "Direction Words",
              description: "Left, right, straight, and more.",
              exercises: [
                { type: "vocab-card", word: "izquierda", translation: "left" },
                { type: "vocab-card", word: "derecha", translation: "right" },
                { type: "vocab-card", word: "recto / derecho", translation: "straight ahead" },
                { type: "vocab-card", word: "¿Dónde está…?", translation: "Where is…?" },
                { type: "vocab-card", word: "la estación", translation: "the station" },
                { type: "vocab-card", word: "el aeropuerto", translation: "the airport" },
                { type: "build-sentence", translation: "Where is the station?", wordBank: ["¿Dónde", "está", "la", "estación?", "el"], correctOrder: ["¿Dónde", "está", "la", "estación?"], explanation: "'¿Dónde está la estación?' — standard direction question." },
                { type: "translate", prompt: "Turn left", promptLang: "native", acceptedAnswers: ["Gira a la izquierda", "gira a la izquierda", "Dobla a la izquierda"], explanation: "'Gira a la izquierda' — turn left." },
              ],
            },
            {
              id: "es-u4-l1-p2",
              title: "At the Station",
              description: "Buy tickets and find your train.",
              exercises: [
                { type: "vocab-card", word: "un billete", translation: "a ticket" },
                { type: "vocab-card", word: "el andén", translation: "the platform" },
                { type: "vocab-card", word: "¿A qué hora sale?", translation: "What time does it leave?", tip: "Essential for catching trains." },
                { type: "vocab-card", word: "el autobús", translation: "the bus" },
                { type: "vocab-card", word: "el metro", translation: "the metro / subway" },
                { type: "translate", prompt: "One ticket to Barcelona, please", promptLang: "native", acceptedAnswers: ["Un billete a Barcelona, por favor", "un billete a barcelona por favor"], explanation: "'Un billete a Barcelona, por favor' — the ticket-buying formula." },
                { type: "multiple-choice", question: "How do you say 'platform' in Spanish?", options: ["el billete", "el metro", "el andén", "la salida"], correctIndex: 2, explanation: "'El andén' is the platform where trains stop." },
                { type: "scenario", situation: "At the ticket counter in a Spanish train station.", npcLine: "¿Adónde va?", npcLineTranslation: "Where are you going?", options: [{ text: "Quiero un billete a Madrid, por favor.", correct: true, feedback: "Clear and polite — perfect!" }, { text: "¿Dónde está el baño?", correct: false, feedback: "They asked your destination — answer that first." }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "es-u5",
      title: "Shopping",
      description: "Buy clothes, haggle, and understand prices.",
      lessons: [
        {
          id: "es-u5-l1",
          title: "At the Market",
          description: "Shop at a Spanish market and discuss prices.",
          realWorldAbility: "You can shop and negotiate prices in Spanish",
          parts: [
            {
              id: "es-u5-l1-p1",
              title: "Shopping Vocabulary",
              description: "Clothes, prices, and sizes.",
              exercises: [
                { type: "vocab-card", word: "¿Cuánto cuesta?", translation: "How much does it cost?", tip: "The most important shopping question." },
                { type: "vocab-card", word: "Es muy caro", translation: "It's too expensive", tip: "Useful when bargaining." },
                { type: "vocab-card", word: "¿Tiene algo más barato?", translation: "Do you have anything cheaper?", tip: "Polite way to ask for a lower price." },
                { type: "vocab-card", word: "la ropa", translation: "clothing" },
                { type: "vocab-card", word: "la talla", translation: "the size" },
                { type: "vocab-card", word: "Me lo llevo", translation: "I'll take it" },
                { type: "vocab-card", word: "¿Puedo probármelo?", translation: "Can I try it on?", tip: "'Probarse' = to try on." },
                { type: "vocab-card", word: "el descuento", translation: "the discount" },
              ],
            },
            {
              id: "es-u5-l1-p2",
              title: "Bargaining Practice",
              description: "Handle real shopping conversations.",
              exercises: [
                { type: "translate", prompt: "How much does it cost?", promptLang: "native", acceptedAnswers: ["¿Cuánto cuesta?", "Cuánto cuesta", "cuanto cuesta"], explanation: "'¿Cuánto cuesta?' — the universal shopping question." },
                { type: "multiple-choice", question: "What does 'Me lo llevo' mean?", options: ["It's too expensive", "I'll take it", "Can I try it on?", "Do you have a discount?"], correctIndex: 1, explanation: "'Me lo llevo' = I'll take it — the phrase that closes a deal." },
                { type: "fill-blank", sentence: "This shirt is too ___. (expensive)", answer: "cara", options: ["cara", "barata", "grande", "pequeña"], explanation: "'Cara' = expensive. 'Barata' = cheap." },
                { type: "scenario", situation: "At a street market in Mexico City.", npcLine: "¿Le gusta algo?", npcLineTranslation: "Do you like anything?", options: [{ text: "Sí, ¿cuánto cuesta este sombrero?", correct: true, feedback: "Great — showing interest and asking the price!" }, { text: "No, gracias.", correct: false, feedback: "Nothing wrong, but you're here to shop!" }] },
                { type: "build-sentence", translation: "Do you have anything cheaper?", wordBank: ["¿Tiene", "algo", "más", "barato?", "caro?"], correctOrder: ["¿Tiene", "algo", "más", "barato?"], explanation: "'¿Tiene algo más barato?' — politely ask for a lower price." },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "how much?", answer: "cuánto cuesta" }, { prompt: "too expensive", answer: "muy caro" }, { prompt: "I'll take it", answer: "me lo llevo" }, { prompt: "size", answer: "talla" }, { prompt: "clothing", answer: "ropa" }, { prompt: "discount", answer: "descuento" }, { prompt: "cheaper", answer: "más barato" }, { prompt: "can I try it on?", answer: "puedo probármelo" }] },
        },
      ],
    },
    {
      id: "es-u6",
      title: "Social & Emotions",
      description: "Express feelings and connect with people.",
      lessons: [
        {
          id: "es-u6-l1",
          title: "How Are You?",
          description: "Express feelings, emotions, and small talk.",
          realWorldAbility: "You can do small talk in Spanish",
          parts: [
            {
              id: "es-u6-l1-p1",
              title: "Feelings Vocabulary",
              description: "Emotions and states of being.",
              exercises: [
                { type: "vocab-card", word: "¿Cómo estás?", translation: "How are you? (informal)", tip: "'Estás' for friends; '¿Cómo está usted?' for formal." },
                { type: "vocab-card", word: "Estoy bien", translation: "I am well/fine", tip: "The standard positive response." },
                { type: "vocab-card", word: "Estoy cansado/a", translation: "I am tired" },
                { type: "vocab-card", word: "Estoy feliz", translation: "I am happy" },
                { type: "vocab-card", word: "Estoy triste", translation: "I am sad" },
                { type: "vocab-card", word: "Tengo hambre", translation: "I am hungry", tip: "Literally 'I have hunger'." },
                { type: "vocab-card", word: "Tengo sed", translation: "I am thirsty", tip: "Literally 'I have thirst'." },
                { type: "vocab-card", word: "¡Qué bueno!", translation: "How great! / That's great!" },
                { type: "vocab-card", word: "¡Qué lástima!", translation: "What a shame! / Too bad!" },
              ],
            },
            {
              id: "es-u6-l1-p2",
              title: "Small Talk Practice",
              description: "Hold a basic conversation in Spanish.",
              exercises: [
                { type: "match-pairs", pairs: [{ left: "Estoy bien", right: "I am fine" }, { left: "Tengo hambre", right: "I am hungry" }, { left: "Estoy triste", right: "I am sad" }, { left: "¡Qué bueno!", right: "How great!" }] },
                { type: "multiple-choice", question: "Your friend says 'Estoy muy cansado'. What does that mean?", options: ["I am very happy", "I am very hungry", "I am very tired", "I am very sad"], correctIndex: 2, explanation: "'Cansado/a' = tired. 'Muy' intensifies it." },
                { type: "fill-blank", sentence: "A: ¿Cómo estás? B: ___ bien, gracias.", answer: "Estoy", options: ["Estoy", "Tengo", "Soy", "Hay"], explanation: "Use 'estar' for temporary states like 'bien' (fine)." },
                { type: "translate", prompt: "I am happy today", promptLang: "native", acceptedAnswers: ["Estoy feliz hoy", "estoy feliz hoy"], explanation: "'Estoy feliz hoy' — 'estar' for emotional states." },
                { type: "scenario", situation: "Running into an old friend on the street.", npcLine: "¡Oye! ¿Cómo estás?", npcLineTranslation: "Hey! How are you?", options: [{ text: "¡Muy bien! ¿Y tú?", correct: true, feedback: "Perfect — enthusiastic and asking back!" }, { text: "Estoy triste.", correct: false, feedback: "Valid Spanish, but a bit of a conversation stopper!" }] },
              ],
            },
          ],
        },
        {
          id: "es-u6-l2",
          title: "Making Plans",
          description: "Invite friends and make arrangements.",
          realWorldAbility: "You can make plans and social arrangements in Spanish",
          parts: [
            {
              id: "es-u6-l2-p1",
              title: "Invitation Phrases",
              description: "Invite, accept, and decline in Spanish.",
              exercises: [
                { type: "vocab-card", word: "¿Quieres…?", translation: "Do you want to…?", tip: "Start an invitation with '¿Quieres + infinitive?'" },
                { type: "vocab-card", word: "¿Puedes venir?", translation: "Can you come?" },
                { type: "vocab-card", word: "Claro que sí", translation: "Of course! / Sure!" },
                { type: "vocab-card", word: "Lo siento, no puedo", translation: "Sorry, I can't" },
                { type: "vocab-card", word: "¿A qué hora?", translation: "At what time?" },
                { type: "vocab-card", word: "nos vemos", translation: "see you / we'll meet", tip: "Casual goodbye when you've made plans." },
              ],
            },
            {
              id: "es-u6-l2-p2",
              title: "Plans Practice",
              description: "Make real social arrangements.",
              exercises: [
                { type: "translate", prompt: "Do you want to eat together?", promptLang: "native", acceptedAnswers: ["¿Quieres comer juntos?", "quieres comer juntos", "¿Quieres comer juntas?"], explanation: "'¿Quieres comer juntos?' — a simple invitation to eat together." },
                { type: "multiple-choice", question: "How do you politely decline an invitation?", options: ["Claro que sí", "¡Nos vemos!", "Lo siento, no puedo", "¿A qué hora?"], correctIndex: 2, explanation: "'Lo siento, no puedo' — a polite 'I can't make it'." },
                { type: "scenario", situation: "A friend texts you asking to hang out.", npcLine: "¿Quieres tomar un café hoy?", npcLineTranslation: "Do you want to grab a coffee today?", options: [{ text: "¡Claro! ¿A qué hora?", correct: true, feedback: "Enthusiastic yes and asking for the time — perfect!" }, { text: "Sí, gracias.", correct: false, feedback: "A bit flat — add 'claro' and ask when!" }] },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "es-u7",
      title: "Health & Emergencies",
      description: "Handle medical situations and emergencies.",
      lessons: [
        {
          id: "es-u7-l1",
          title: "At the Doctor",
          description: "Describe symptoms and get help.",
          realWorldAbility: "You can describe health issues in Spanish",
          parts: [
            {
              id: "es-u7-l1-p1",
              title: "Body & Symptoms",
              description: "Health vocabulary.",
              exercises: [
                { type: "vocab-card", word: "Me duele…", translation: "My … hurts", tip: "Point to the body part — 'Me duele la cabeza' = I have a headache." },
                { type: "vocab-card", word: "la cabeza", translation: "head" },
                { type: "vocab-card", word: "el estómago", translation: "stomach" },
                { type: "vocab-card", word: "la espalda", translation: "back" },
                { type: "vocab-card", word: "la fiebre", translation: "fever" },
                { type: "vocab-card", word: "Necesito un médico", translation: "I need a doctor", tip: "Say this clearly in any emergency." },
                { type: "vocab-card", word: "¡Llame a una ambulancia!", translation: "Call an ambulance!", tip: "Emergency phrase." },
                { type: "vocab-card", word: "la farmacia", translation: "the pharmacy" },
                { type: "vocab-card", word: "el hospital", translation: "the hospital" },
              ],
            },
            {
              id: "es-u7-l1-p2",
              title: "Emergency Practice",
              description: "Handle health situations confidently.",
              exercises: [
                { type: "translate", prompt: "I have a headache", promptLang: "native", acceptedAnswers: ["Me duele la cabeza", "me duele la cabeza", "Tengo dolor de cabeza"], explanation: "'Me duele la cabeza' — literally 'my head hurts me'." },
                { type: "multiple-choice", question: "What does 'la fiebre' mean?", options: ["headache", "fever", "stomachache", "cough"], correctIndex: 1, explanation: "'La fiebre' = fever. Common symptom to describe at a doctor's." },
                { type: "fill-blank", sentence: "Necesito ___ médico.", answer: "un", options: ["un", "una", "el", "la"], explanation: "'Médico' is masculine, so 'un médico'." },
                { type: "scenario", situation: "You feel very sick at your hotel in Barcelona.", npcLine: "¿Se encuentra bien?", npcLineTranslation: "Are you feeling okay?", options: [{ text: "No, me siento muy mal. Necesito un médico.", correct: true, feedback: "Clear and direct — exactly what to say!" }, { text: "Estoy bien, gracias.", correct: false, feedback: "Don't minimize it — tell them you need help." }] },
              ],
            },
          ],
          speedRound: { type: "speed-round", timeLimitSeconds: 60, questions: [{ prompt: "head", answer: "cabeza" }, { prompt: "stomach", answer: "estómago" }, { prompt: "my head hurts", answer: "me duele la cabeza" }, { prompt: "fever", answer: "fiebre" }, { prompt: "pharmacy", answer: "farmacia" }, { prompt: "I need a doctor", answer: "necesito un médico" }, { prompt: "hospital", answer: "hospital" }, { prompt: "call an ambulance", answer: "llame a una ambulancia" }] },
        },
      ],
    },
    {
      id: "es-u8",
      title: "Real Conversations",
      description: "Advanced everyday Spanish for real life.",
      lessons: [
        {
          id: "es-u8-l1",
          title: "At the Hotel",
          description: "Check in, make requests, and handle issues.",
          realWorldAbility: "You can handle hotel stays in Spanish",
          parts: [
            {
              id: "es-u8-l1-p1",
              title: "Hotel Vocabulary",
              description: "Checking in and making requests.",
              exercises: [
                { type: "vocab-card", word: "Tengo una reserva", translation: "I have a reservation" },
                { type: "vocab-card", word: "la habitación", translation: "the room" },
                { type: "vocab-card", word: "la llave", translation: "the key" },
                { type: "vocab-card", word: "¿Tiene habitaciones disponibles?", translation: "Do you have rooms available?", tip: "'Disponibles' = available." },
                { type: "vocab-card", word: "el desayuno está incluido", translation: "breakfast is included" },
                { type: "vocab-card", word: "¿A qué hora es el check-out?", translation: "What time is check-out?" },
              ],
            },
            {
              id: "es-u8-l1-p2",
              title: "Hotel Practice",
              description: "Navigate a full hotel check-in.",
              exercises: [
                { type: "translate", prompt: "I have a reservation", promptLang: "native", acceptedAnswers: ["Tengo una reserva", "tengo una reserva", "Tengo una reservación"], explanation: "'Tengo una reserva' — how to announce your booking." },
                { type: "build-sentence", translation: "Do you have rooms available?", wordBank: ["¿Tiene", "habitaciones", "disponibles?", "reserva"], correctOrder: ["¿Tiene", "habitaciones", "disponibles?"], explanation: "'¿Tiene habitaciones disponibles?' — asking for availability." },
                { type: "scenario", situation: "Arriving at a hotel in Buenos Aires.", npcLine: "Buenas noches, ¿en qué le puedo ayudar?", npcLineTranslation: "Good evening, how can I help you?", options: [{ text: "Buenas noches. Tengo una reserva a nombre de García.", correct: true, feedback: "Perfect check-in phrase!" }, { text: "Hola. Quiero dormir aquí.", correct: false, feedback: "Too casual — use 'tengo una reserva'." }] },
              ],
            },
          ],
        },
        {
          id: "es-u8-l2",
          title: "Work & Office",
          description: "Professional Spanish for work environments.",
          realWorldAbility: "You can communicate in a Spanish work environment",
          parts: [
            {
              id: "es-u8-l2-p1",
              title: "Work Vocabulary",
              description: "Jobs, meetings, and office language.",
              exercises: [
                { type: "vocab-card", word: "la reunión", translation: "the meeting" },
                { type: "vocab-card", word: "el jefe / la jefa", translation: "the boss" },
                { type: "vocab-card", word: "el correo electrónico", translation: "the email" },
                { type: "vocab-card", word: "el informe", translation: "the report" },
                { type: "vocab-card", word: "Tengo una pregunta", translation: "I have a question" },
                { type: "vocab-card", word: "¿Cuándo es la reunión?", translation: "When is the meeting?", tip: "Great for professional settings." },
                { type: "vocab-card", word: "Necesito más tiempo", translation: "I need more time" },
              ],
            },
            {
              id: "es-u8-l2-p2",
              title: "Office Practice",
              description: "Handle professional conversations.",
              exercises: [
                { type: "multiple-choice", question: "What does 'la reunión' mean?", options: ["the report", "the email", "the meeting", "the boss"], correctIndex: 2, explanation: "'La reunión' = the meeting." },
                { type: "translate", prompt: "When is the meeting?", promptLang: "native", acceptedAnswers: ["¿Cuándo es la reunión?", "Cuándo es la reunión", "cuándo es la reunión"], explanation: "'¿Cuándo es la reunión?' — professional schedule question." },
                { type: "scenario", situation: "Your Spanish colleague asks if you're ready for the presentation.", npcLine: "¿Estás listo para la presentación?", npcLineTranslation: "Are you ready for the presentation?", options: [{ text: "Sí, estoy listo. ¿Empezamos?", correct: true, feedback: "Confident and ready — great!" }, { text: "No sé.", correct: false, feedback: "'I don't know' isn't reassuring before a presentation!" }] },
              ],
            },
          ],
        },
      ],
    },
  ],
};
