import { getGoalById, getLanguageByCode } from './languages.js'

// Each scenario is a 4-step arc with a clear "you can now do X" milestone.
// Steps carry articulation notes for the visual pronunciation panel.

const SCENARIO_LIBRARY = {
  travel: {
    id: 'travel',
    title: 'Order at a restaurant abroad',
    tagline: 'From greeting the host to paying the bill.',
    completionSkill: 'order a meal at a restaurant',
    completionLine: 'You can now order at a restaurant.',
    estimatedMinutes: 4,
    difficulty: 'beginner',
    steps: [
      {
        id: 'hotel-checkin',
        focus: 'Check in smoothly',
        scenario: 'You just arrived at the hotel. The host is waiting. One clean opening sentence.',
        coachTip: 'Lead with a warm greeting, then let the request land at the end.',
        soundHint: 'Break "reservation" into four even beats: re · ser · va · tion.',
        tonguePosition: 'Tip of the tongue lightly touches behind the top teeth on the R and T.',
        lipShape: 'Lips relaxed and slightly rounded on "re-ser".',
        airflow: 'Steady air through the whole word — do not trail off at the end.',
        pronunciationDrill: 'Say "reservation" slowly once, then the full sentence at natural speed.',
        challengePrompt: 'After this phrase, add a short follow-up about breakfast time.',
        lines: {
          en: 'Hello, I have a reservation under my name.',
          es: 'Hola, tengo una reserva a mi nombre.',
          fr: "Bonjour, j'ai une réservation à mon nom.",
          de: 'Hallo, ich habe eine Reservierung auf meinen Namen.',
          it: 'Buongiorno, ho una prenotazione a mio nome.',
          ja: 'こんにちは、名前で予約しています。',
          nl: 'Hallo, ik heb een reservering op mijn naam.',
          zh: '你好，我用我的名字预订了房间。',
        },
      },
      {
        id: 'directions',
        focus: 'Ask for directions',
        scenario: 'You step outside and need one clear question without hesitation.',
        coachTip: 'Keep the question light until the final destination word.',
        soundHint: 'Let the final noun carry the sentence — do not fade out early.',
        tonguePosition: 'Relax the tongue flat for the vowels, lift slightly on the S sound.',
        lipShape: 'Open the mouth a little wider on the destination word.',
        airflow: 'Keep a steady breath — questions need energy to the last syllable.',
        pronunciationDrill: 'Say the destination alone first, then repeat the whole question once.',
        challengePrompt: 'After this, ask how long the walk takes.',
        lines: {
          en: 'Excuse me, where is the train station?',
          es: 'Perdón, ¿dónde está la estación de tren?',
          fr: 'Excusez-moi, où est la gare ?',
          de: 'Entschuldigung, wo ist der Bahnhof?',
          it: "Mi scusi, dov'è la stazione?",
          ja: 'すみません、駅はどこですか。',
          nl: 'Pardon, waar is het treinstation?',
          zh: '请问，火车站在哪里？',
        },
      },
      {
        id: 'restaurant',
        focus: 'Ask for a table',
        scenario: 'You reach the host at a restaurant. Sound relaxed, not rehearsed.',
        coachTip: 'Keep the pace even through the request.',
        soundHint: 'The number at the end carries the sentence — land it cleanly.',
        tonguePosition: 'Keep the tongue low on the vowels, just tap the teeth on T sounds.',
        lipShape: 'Smile slightly through the polite ending.',
        airflow: 'Let the breath support the full phrase without clipping "please".',
        pronunciationDrill: 'Say the table request once with a pause before the number, then once without.',
        challengePrompt: 'Add a quick request for a quiet table or one near a window.',
        lines: {
          en: 'I would like a table for two, please.',
          es: 'Quisiera una mesa para dos, por favor.',
          fr: "Je voudrais une table pour deux, s'il vous plaît.",
          de: 'Ich möchte bitte einen Tisch für zwei.',
          it: 'Vorrei un tavolo per due, per favore.',
          ja: '二人用のテーブルをお願いします。',
          nl: 'Ik wil graag een tafel voor twee, alstublieft.',
          zh: '我想要一张两人的桌子，谢谢。',
        },
      },
      {
        id: 'transport',
        focus: 'Order and close the bill',
        scenario: 'You ordered, ate, and now you are ready to pay — one smooth sentence.',
        coachTip: 'Stress the key word at the end of the request.',
        soundHint: 'A clean ending makes you sound fluent, not rehearsed.',
        tonguePosition: 'Tongue resting, teeth lightly apart for polite endings.',
        lipShape: 'Lips soft — the ending should not feel clipped.',
        airflow: 'Finish the breath through the last vowel.',
        pronunciationDrill: 'Say the last three words twice, then the whole sentence.',
        challengePrompt: 'Add whether you want to split the bill.',
        lines: {
          en: 'Could we get the check, please?',
          es: '¿Nos trae la cuenta, por favor?',
          fr: "L'addition, s'il vous plaît.",
          de: 'Könnten wir bitte die Rechnung haben?',
          it: 'Potremmo avere il conto, per favore?',
          ja: 'お会計をお願いします。',
          nl: 'Mogen we de rekening, alstublieft?',
          zh: '可以买单吗，谢谢。',
        },
      },
    ],
  },
  work: {
    id: 'work',
    title: 'Run a work meeting',
    tagline: 'Introduce, update, align, and close.',
    completionSkill: 'run a short work meeting',
    completionLine: 'You can now run a short work meeting.',
    estimatedMinutes: 5,
    difficulty: 'basics',
    steps: [
      {
        id: 'intro',
        focus: 'Introduce your role',
        scenario: 'You are meeting someone new. Keep it composed and clear.',
        coachTip: 'Pause slightly before your role so it lands deliberate.',
        soundHint: 'Let the role word stay crisp instead of flattening it.',
        tonguePosition: 'Tongue relaxed, light contact on D and T in "design".',
        lipShape: 'Keep the lips neutral — do not over-round vowels.',
        airflow: 'Steady air supports the full introduction.',
        pronunciationDrill: 'Say your role by itself once, then the full introduction twice.',
        challengePrompt: 'Add one sentence about what you are working on right now.',
        lines: {
          en: 'Hi, I work on product design and user research.',
          es: 'Hola, trabajo en diseño de producto e investigación de usuarios.',
          fr: 'Bonjour, je travaille dans le design produit et la recherche utilisateur.',
          de: 'Hallo, ich arbeite in Produktdesign und Nutzerforschung.',
          it: 'Ciao, lavoro nel design di prodotto e nella ricerca utenti.',
          ja: 'こんにちは、プロダクトデザインとユーザー調査を担当しています。',
          nl: 'Hoi, ik werk aan productontwerp en gebruikersonderzoek.',
          zh: '你好，我负责产品设计和用户研究。',
        },
      },
      {
        id: 'meeting',
        focus: 'Ask for an update',
        scenario: 'The meeting starts. You need a direct, professional question.',
        coachTip: 'Lift the tone lightly only at the very end.',
        soundHint: 'Keep "latest update" tight so the middle does not drag.',
        tonguePosition: 'Flat for open vowels, small tap for the T in "latest".',
        lipShape: 'Keep a slight smile through the final noun.',
        airflow: 'Do not let the air fade before the last word.',
        pronunciationDrill: 'Say the update phrase once slowly, once at meeting pace.',
        challengePrompt: 'Add what part of the project you need the update on.',
        lines: {
          en: 'Can you share the latest update on the project?',
          es: '¿Puedes compartir la última actualización del proyecto?',
          fr: 'Pouvez-vous partager la dernière mise à jour du projet ?',
          de: 'Kannst du das neueste Update zum Projekt teilen?',
          it: "Puoi condividere l'ultimo aggiornamento sul progetto?",
          ja: 'プロジェクトの最新状況を共有してもらえますか。',
          nl: 'Kun je de laatste update over het project delen?',
          zh: '你能分享一下项目的最新进展吗？',
        },
      },
      {
        id: 'deadline',
        focus: 'Set a deadline',
        scenario: 'You need the deadline to be unmistakable. Short and clear.',
        coachTip: 'Land the day clearly.',
        soundHint: 'Do not swallow the final time expression.',
        tonguePosition: 'Lightly tap the teeth on the D in "deadline".',
        lipShape: 'Keep lips firm on "Friday".',
        airflow: 'Short, direct breath — no trailing softness.',
        pronunciationDrill: 'Say only the deadline part first, then the full sentence.',
        challengePrompt: 'Add why the deadline matters.',
        lines: {
          en: 'We need to finish this by Friday afternoon.',
          es: 'Necesitamos terminar esto para el viernes por la tarde.',
          fr: "Nous devons finir cela d'ici vendredi après-midi.",
          de: 'Wir müssen das bis Freitag Nachmittag fertig machen.',
          it: 'Dobbiamo finire tutto entro venerdì pomeriggio.',
          ja: '金曜日の午後までにこれを終える必要があります。',
          nl: 'We moeten dit uiterlijk vrijdagmiddag afronden.',
          zh: '我们需要在周五下午之前完成。',
        },
      },
      {
        id: 'clarify',
        focus: 'Close with clarity',
        scenario: 'You wrap the meeting by confirming the next step. Sound decisive.',
        coachTip: 'Keep the polite ending confident, not apologetic.',
        soundHint: 'The closing phrase should feel precise.',
        tonguePosition: 'Tongue rests low — keep a clean S in "step".',
        lipShape: 'Soft lips through the final syllable.',
        airflow: 'Finish the breath on the last word.',
        pronunciationDrill: 'Say the last two words twice, then the whole sentence once.',
        challengePrompt: 'Add who is responsible for the next step.',
        lines: {
          en: "Let us confirm the next step and wrap up.",
          es: 'Vamos a confirmar el siguiente paso y cerramos.',
          fr: 'Confirmons la prochaine étape et concluons.',
          de: 'Lass uns den nächsten Schritt bestätigen und abschließen.',
          it: 'Confermiamo il prossimo passo e chiudiamo.',
          ja: '次のステップを確認して終わりにしましょう。',
          nl: 'Laten we de volgende stap bevestigen en afronden.',
          zh: '让我们确认下一步然后结束。',
        },
      },
    ],
  },
  family: {
    id: 'family',
    title: 'Talk with family',
    tagline: 'Warm, everyday conversations with relatives.',
    completionSkill: 'have a warm chat with family',
    completionLine: 'You can now have a warm chat with family.',
    estimatedMinutes: 4,
    difficulty: 'beginner',
    steps: [
      {
        id: 'visit-family',
        focus: 'Share a plan',
        scenario: 'You want to tell a relative your weekend plans. Keep it natural.',
        coachTip: 'Keep the weekend phrase smooth; do not rush the family word.',
        soundHint: 'Let the family noun stay open and warm.',
        tonguePosition: 'Tongue relaxed for open vowels.',
        lipShape: 'Keep the smile through "family".',
        airflow: 'Unhurried air supports the whole phrase.',
        pronunciationDrill: 'Say the weekend phrase alone, then the full sentence twice.',
        challengePrompt: 'Add who you are most excited to see.',
        lines: {
          en: 'I am visiting my family this weekend.',
          es: 'Voy a visitar a mi familia este fin de semana.',
          fr: 'Je rends visite à ma famille ce week-end.',
          de: 'Ich besuche meine Familie dieses Wochenende.',
          it: 'Vado a trovare la mia famiglia questo fine settimana.',
          ja: '今週末、家族に会いに行きます。',
          nl: 'Ik ga dit weekend mijn familie bezoeken.',
          zh: '这个周末我要去看望家人。',
        },
      },
      {
        id: 'call-sister',
        focus: 'Make a short request',
        scenario: 'You need one short request that sounds clear and polite.',
        coachTip: 'Let the family word land clearly.',
        soundHint: 'Short requests live or die by the last word.',
        tonguePosition: 'Soft tongue tap on the polite ending.',
        lipShape: 'Lips neutral, not forced.',
        airflow: 'Steady breath through the short phrase.',
        pronunciationDrill: 'Say the family word twice, then the full request once.',
        challengePrompt: 'Add whether it should happen now or later.',
        lines: {
          en: 'Can you call my sister, please?',
          es: '¿Puedes llamar a mi hermana, por favor?',
          fr: "Peux-tu appeler ma sœur, s'il te plaît ?",
          de: 'Kannst du bitte meine Schwester anrufen?',
          it: 'Puoi chiamare mia sorella, per favore?',
          ja: '姉に電話してもらえますか。',
          nl: 'Kun je mijn zus bellen, alsjeblieft?',
          zh: '你能给我姐姐打个电话吗？',
        },
      },
      {
        id: 'family-dinner',
        focus: 'Describe a dinner plan',
        scenario: 'You describe a simple family dinner. Let the sentence flow.',
        coachTip: 'Keep the meal phrase connected.',
        soundHint: 'The location phrase should stay smooth.',
        tonguePosition: 'Low tongue, open vowels.',
        lipShape: 'Relaxed, conversational.',
        airflow: 'One breath, one sentence.',
        pronunciationDrill: 'Say the dinner phrase once slowly, then once in a single breath.',
        challengePrompt: 'Add what time dinner starts.',
        lines: {
          en: 'We are having dinner at my parents house.',
          es: 'Vamos a cenar en la casa de mis padres.',
          fr: 'Nous dînons chez mes parents.',
          de: 'Wir essen bei meinen Eltern zu Abend.',
          it: 'Ceniamo a casa dei miei genitori.',
          ja: '両親の家で夕食を食べます。',
          nl: 'We eten bij mijn ouders thuis.',
          zh: '我们在父母家吃晚饭。',
        },
      },
      {
        id: 'talk-more',
        focus: 'Express a family goal',
        scenario: 'You explain why the language matters to you personally.',
        coachTip: 'Keep the sentence personal and steady to the end.',
        soundHint: 'The final time phrase should stay confident.',
        tonguePosition: 'Tongue relaxed, soft G sounds.',
        lipShape: 'Lips soft — warm not sharp.',
        airflow: 'Full breath supports the whole idea.',
        pronunciationDrill: 'Say the final two words twice, then the whole sentence.',
        challengePrompt: 'Add which relative you want to speak with most.',
        lines: {
          en: 'I want to speak with my grandmother more often.',
          es: 'Quiero hablar con mi abuela más seguido.',
          fr: 'Je veux parler avec ma grand-mère plus souvent.',
          de: 'Ich möchte öfter mit meiner Großmutter sprechen.',
          it: 'Voglio parlare con mia nonna più spesso.',
          ja: '祖母ともっとよく話せるようになりたいです。',
          nl: 'Ik wil vaker met mijn oma praten.',
          zh: '我想更经常地和奶奶说话。',
        },
      },
    ],
  },
  school: {
    id: 'school',
    title: 'Speak up in class',
    tagline: 'Ask, clarify, answer, and practice.',
    completionSkill: 'participate confidently in class',
    completionLine: 'You can now participate confidently in class.',
    estimatedMinutes: 4,
    difficulty: 'basics',
    steps: [
      {
        id: 'classroom',
        focus: 'Open a discussion',
        scenario: 'You want to speak up without sounding rehearsed.',
        coachTip: 'Keep the first clause light, then land the noun.',
        soundHint: 'The last word makes the sentence feel complete.',
        tonguePosition: 'Flat tongue for open vowels.',
        lipShape: 'Slight smile, neutral jaw.',
        airflow: 'Even breath through the whole line.',
        pronunciationDrill: 'Repeat the last three words, then the full sentence once.',
        challengePrompt: 'Add the topic you are confused about.',
        lines: {
          en: "I have a question about today's lesson.",
          es: 'Tengo una pregunta sobre la lección de hoy.',
          fr: "J'ai une question sur la leçon d'aujourd'hui.",
          de: 'Ich habe eine Frage zur heutigen Stunde.',
          it: 'Ho una domanda sulla lezione di oggi.',
          ja: '今日の授業について質問があります。',
          nl: 'Ik heb een vraag over de les van vandaag.',
          zh: '我对今天的课有一个问题。',
        },
      },
      {
        id: 'repeat',
        focus: 'Ask for repetition',
        scenario: 'You need the teacher to slow down, without sounding apologetic.',
        coachTip: 'Keep the polite ending clean.',
        soundHint: 'The word "slowly" hinges the request.',
        tonguePosition: 'Soft tongue tap on S and L.',
        lipShape: 'Lips relaxed; do not round too early.',
        airflow: 'Steady breath, polite energy.',
        pronunciationDrill: 'Say the pace phrase alone, then the full sentence.',
        challengePrompt: 'Add which word or sentence you want repeated.',
        lines: {
          en: 'Could you repeat that more slowly, please?',
          es: '¿Podrías repetir eso más despacio, por favor?',
          fr: "Pourriez-vous répéter cela plus lentement, s'il vous plaît ?",
          de: 'Könnten Sie das bitte langsamer wiederholen?',
          it: 'Potresti ripeterlo più lentamente, per favore?',
          ja: 'もう少しゆっくり繰り返してもらえますか。',
          nl: 'Kunt u dat alstublieft langzamer herhalen?',
          zh: '您能说慢一点再重复一遍吗？',
        },
      },
      {
        id: 'answer',
        focus: 'Explain your answer',
        scenario: 'You are giving a reason. It should sound connected, not broken.',
        coachTip: 'Keep the reason clause tied to the opening.',
        soundHint: 'The reason should feel like one idea.',
        tonguePosition: 'Low tongue, connected vowels.',
        lipShape: 'Relaxed — explanation mode.',
        airflow: 'One breath, one thought.',
        pronunciationDrill: 'Repeat the reason clause twice, then say the whole sentence.',
        challengePrompt: 'Add one more reason for your answer.',
        lines: {
          en: 'I chose that answer because it sounds more natural.',
          es: 'Elegí esa respuesta porque suena más natural.',
          fr: "J'ai choisi cette réponse parce qu'elle sonne plus naturellement.",
          de: 'Ich habe diese Antwort gewählt, weil sie natürlicher klingt.',
          it: 'Ho scelto quella risposta perché suona più naturale.',
          ja: 'その答えを選んだのは、より自然に聞こえるからです。',
          nl: 'Ik koos dat antwoord omdat het natuurlijker klinkt.',
          zh: '我选了那个答案，因为听起来更自然。',
        },
      },
      {
        id: 'practice',
        focus: 'Ask for more practice',
        scenario: 'You want to stay engaged and ask for another attempt.',
        coachTip: 'Sound motivated, not rushed.',
        soundHint: 'The second half should stay smooth.',
        tonguePosition: 'Neutral tongue, no tension.',
        lipShape: 'Neutral, open on the vowels.',
        airflow: 'Calm steady breath.',
        pronunciationDrill: 'Say the final phrase twice, then repeat the full sentence once.',
        challengePrompt: 'Add which sentence you want to practice again.',
        lines: {
          en: 'I want to practice this sentence again.',
          es: 'Quiero practicar esta frase otra vez.',
          fr: 'Je veux pratiquer cette phrase encore une fois.',
          de: 'Ich möchte diesen Satz noch einmal üben.',
          it: 'Voglio praticare di nuovo questa frase.',
          ja: 'この文をもう一度練習したいです。',
          nl: 'Ik wil deze zin nog een keer oefenen.',
          zh: '我想再练习一遍这个句子。',
        },
      },
    ],
  },
  general_interest: {
    id: 'general_interest',
    title: 'Everyday conversations',
    tagline: 'Greet, order, chat, and close naturally.',
    completionSkill: 'hold a casual everyday conversation',
    completionLine: 'You can now hold a casual everyday conversation.',
    estimatedMinutes: 4,
    difficulty: 'beginner',
    steps: [
      {
        id: 'greeting',
        focus: 'Start warm',
        scenario: 'You are meeting someone casually. Sound open from the first word.',
        coachTip: 'Smile into the first two words.',
        soundHint: 'The opening sets the tone for everything that follows.',
        tonguePosition: 'Neutral, relaxed.',
        lipShape: 'Slight smile, open on the vowels.',
        airflow: 'Easy breath, no tension.',
        pronunciationDrill: 'Say the greeting alone once, then the full line twice.',
        challengePrompt: 'Add one simple follow-up question.',
        lines: {
          en: "Hi, it's nice to meet you.",
          es: 'Hola, mucho gusto en conocerte.',
          fr: 'Salut, ravi de te rencontrer.',
          de: 'Hallo, es freut mich, dich kennenzulernen.',
          it: 'Ciao, piacere di conoscerti.',
          ja: 'こんにちは、お会いできてうれしいです。',
          nl: 'Hoi, leuk je te ontmoeten.',
          zh: '你好，很高兴认识你。',
        },
      },
      {
        id: 'coffee',
        focus: 'Order casually',
        scenario: 'You are at a café ordering something simple.',
        coachTip: 'Keep the drink phrase crisp and the ending polite.',
        soundHint: 'Drink and modifier should stay connected.',
        tonguePosition: 'Soft T on "latte" or "oat".',
        lipShape: 'Rounded for "coffee", soft for the ending.',
        airflow: 'Short confident breath.',
        pronunciationDrill: 'Say the drink order in slow beats, then at normal speed.',
        challengePrompt: 'Add whether you want it hot or iced.',
        lines: {
          en: 'Can I get a coffee with oat milk?',
          es: '¿Puedo pedir un café con leche de avena?',
          fr: "Est-ce que je peux prendre un café avec du lait d'avoine ?",
          de: 'Kann ich einen Kaffee mit Hafermilch bekommen?',
          it: "Posso prendere un caffè con latte d'avena?",
          ja: 'オーツミルク入りのコーヒーをいただけますか。',
          nl: 'Mag ik een koffie met havermelk?',
          zh: '我可以来一杯燕麦奶咖啡吗？',
        },
      },
      {
        id: 'small-talk',
        focus: 'Keep small talk going',
        scenario: 'You move beyond one-word answers and keep the exchange alive.',
        coachTip: 'Lift the tone lightly at the end.',
        soundHint: 'The invitation phrase stays airy.',
        tonguePosition: 'Tongue relaxed for open vowels.',
        lipShape: 'Neutral, conversational.',
        airflow: 'Unhurried breath.',
        pronunciationDrill: 'Say the last four words twice, then the full question once.',
        challengePrompt: 'Add a short answer about your own weekends.',
        lines: {
          en: 'What do you usually do on weekends?',
          es: '¿Qué sueles hacer los fines de semana?',
          fr: "Qu'est-ce que tu fais d'habitude le week-end ?",
          de: 'Was machst du normalerweise am Wochenende?',
          it: 'Cosa fai di solito nel fine settimana?',
          ja: '週末はふだん何をしますか。',
          nl: 'Wat doe je meestal in het weekend?',
          zh: '你周末一般做什么？',
        },
      },
      {
        id: 'goodbye',
        focus: 'Close naturally',
        scenario: 'You end the exchange. Warm, not abrupt.',
        coachTip: 'Let the final wish breathe.',
        soundHint: 'The closing softens slightly.',
        tonguePosition: 'Tongue rests for the soft ending.',
        lipShape: 'Soft smile on the wish.',
        airflow: 'Tapered breath, gentle close.',
        pronunciationDrill: 'Say the goodbye once, then add the final wish.',
        challengePrompt: 'Add when you expect to see the person again.',
        lines: {
          en: 'See you soon, and have a great evening.',
          es: 'Hasta pronto y que tengas una gran noche.',
          fr: 'À bientôt, et passe une excellente soirée.',
          de: 'Bis bald und hab einen schönen Abend.',
          it: 'A presto e buona serata.',
          ja: 'またね、よい夜を過ごしてください。',
          nl: 'Tot snel en een fijne avond.',
          zh: '回头见，祝你有个愉快的晚上。',
        },
      },
    ],
  },
}

export const QUICK_SCENARIOS = [
  { id: 'travel', title: 'Order at a restaurant', icon: 'restaurant', duration: '4 min', difficulty: 'Beginner' },
  { id: 'work', title: 'Run a work meeting', icon: 'briefcase', duration: '5 min', difficulty: 'Basics' },
  { id: 'family', title: 'Talk with family', icon: 'home', duration: '4 min', difficulty: 'Beginner' },
  { id: 'school', title: 'Speak up in class', icon: 'book', duration: '4 min', difficulty: 'Basics' },
  { id: 'general_interest', title: 'Everyday conversations', icon: 'chat', duration: '4 min', difficulty: 'Beginner' },
]

const CUSTOM_REQUEST_LIBRARY = [
  {
    id: 'bathroom',
    keywords: ['bathroom', 'washroom', 'restroom', 'toilet'],
    title: 'Ask where the bathroom is',
    tagline: 'Find it fast and follow up politely.',
    completionSkill: 'ask where the bathroom is',
    completionLine: 'You can now ask where the bathroom is clearly.',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    steps: [
      {
        id: 'bathroom-main',
        focus: 'Ask the main question',
        scenario: 'You need the bathroom right now. Keep the request short and clear.',
        coachTip: 'Lead with excuse me, then land the bathroom word cleanly.',
        soundHint: 'The final noun should stay light, not heavy.',
        tonguePosition: 'Keep the tongue relaxed and forward on the question words.',
        lipShape: 'Open lightly for the question and relax on the final word.',
        airflow: 'Use one clean breath all the way through the question.',
        pronunciationDrill: 'Say the bathroom word once, then the full question at natural speed.',
        challengePrompt: 'Add a polite thank-you after they answer.',
        lines: {
          en: 'Excuse me, where is the bathroom?',
          es: 'Perdón, ¿dónde está el baño?',
          fr: 'Excusez-moi, où sont les toilettes ?',
          de: 'Entschuldigung, wo ist die Toilette?',
          it: "Mi scusi, dov'è il bagno?",
          ja: 'すみません、お手洗いはどこですか。',
          nl: 'Pardon, waar is het toilet?',
          zh: '请问，洗手间在哪里？',
        },
      },
      {
        id: 'bathroom-followup',
        focus: 'Clarify the direction',
        scenario: 'You heard the answer but need the direction repeated more clearly.',
        coachTip: 'Keep the up/down contrast sharp.',
        soundHint: 'The direction words should sound lighter than the request itself.',
        tonguePosition: 'Lift lightly on the direction words and keep the middle loose.',
        lipShape: 'Keep the mouth relaxed and the endings short.',
        airflow: 'Short, calm breath. This is a quick follow-up.',
        pronunciationDrill: 'Say downstairs and upstairs once each, then the full question.',
        challengePrompt: 'Ask if there is a code or key needed.',
        lines: {
          en: 'Is it upstairs or downstairs?',
          es: '¿Está arriba o abajo?',
          fr: "C'est en haut ou en bas ?",
          de: 'Ist es oben oder unten?',
          it: 'È sopra o sotto?',
          ja: '上ですか、それとも下ですか。',
          nl: 'Is het boven of beneden?',
          zh: '是在楼上还是楼下？',
        },
      },
      {
        id: 'bathroom-close',
        focus: 'Close politely',
        scenario: 'You got the answer. Close the exchange smoothly.',
        coachTip: 'Keep the thank-you short and light.',
        soundHint: 'Do not over-stress the final word.',
        tonguePosition: 'Rest the tongue lightly and avoid extra tension.',
        lipShape: 'Soft smile through the thank-you.',
        airflow: 'Gentle release on the closing phrase.',
        pronunciationDrill: 'Say the thank-you once slowly, then once naturally.',
        challengePrompt: 'Add “I found it” to close the moment.',
        lines: {
          en: 'Thank you, I found it.',
          es: 'Gracias, ya lo encontré.',
          fr: "Merci, je l'ai trouvé.",
          de: 'Danke, ich habe es gefunden.',
          it: "Grazie, l'ho trovato.",
          ja: 'ありがとうございます、見つかりました。',
          nl: 'Dank je, ik heb het gevonden.',
          zh: '谢谢，我找到了。',
        },
      },
    ],
  },
  {
    id: 'cafe',
    keywords: ['cafe', 'coffee', 'latte', 'espresso', 'oat milk'],
    title: 'Order at a cafe',
    tagline: 'Place a simple coffee order like a local.',
    completionSkill: 'order naturally at a cafe',
    completionLine: 'You can now order at a cafe naturally.',
    estimatedMinutes: 4,
    difficulty: 'beginner',
    steps: [
      {
        id: 'cafe-order',
        focus: 'Place the order',
        scenario: 'You are at the counter ordering one drink.',
        coachTip: 'Keep the drink order in one smooth line.',
        soundHint: 'Do not pause between coffee and the milk choice.',
        tonguePosition: 'Keep the tongue light through the middle of the phrase.',
        lipShape: 'Round slightly on the coffee word, then relax again.',
        airflow: 'Steady breath so the order sounds casual, not rehearsed.',
        pronunciationDrill: 'Say the drink phrase alone, then the whole line once naturally.',
        challengePrompt: 'Add a size or one extra detail.',
        lines: {
          en: 'Hi, can I get a coffee with oat milk?',
          es: 'Hola, ¿me das un café con leche de avena?',
          fr: "Bonjour, je peux prendre un café avec du lait d'avoine ?",
          de: 'Hallo, kann ich einen Kaffee mit Hafermilch bekommen?',
          it: "Ciao, posso prendere un caffè con latte d'avena?",
          ja: 'こんにちは、オーツミルク入りのコーヒーをください。',
          nl: 'Hoi, mag ik een koffie met havermelk?',
          zh: '你好，我想要一杯燕麦奶咖啡。',
        },
      },
      {
        id: 'cafe-temperature',
        focus: 'Add one preference',
        scenario: 'You want to change the drink style without sounding stiff.',
        coachTip: 'Keep the hot or iced word short and clean.',
        soundHint: 'The preference word should land at the end.',
        tonguePosition: 'Stay relaxed and keep the preference word crisp.',
        lipShape: 'Do not over-open on the final word.',
        airflow: 'One short breath. This is a quick add-on.',
        pronunciationDrill: 'Say the preference word twice, then the full request.',
        challengePrompt: 'Ask for it to go.',
        lines: {
          en: 'Can I have it iced?',
          es: '¿Lo puedo tomar frío?',
          fr: 'Je peux le prendre glacé ?',
          de: 'Kann ich ihn kalt haben?',
          it: 'Posso prenderlo freddo?',
          ja: 'アイスにできますか。',
          nl: 'Mag ik hem koud krijgen?',
          zh: '我可以要冰的吗？',
        },
      },
      {
        id: 'cafe-close',
        focus: 'Close the order',
        scenario: 'You finish the order in a natural way.',
        coachTip: 'Keep the closing phrase soft.',
        soundHint: 'Do not punch the final thank-you.',
        tonguePosition: 'Rest the tongue and let the ending flow out.',
        lipShape: 'Soft smile for the close.',
        airflow: 'Let the air taper gently at the end.',
        pronunciationDrill: 'Say the close once slowly, then once at counter speed.',
        challengePrompt: 'Add “that’s all for me.”',
        lines: {
          en: 'That is all, thank you.',
          es: 'Eso es todo, gracias.',
          fr: "C'est tout, merci.",
          de: 'Das ist alles, danke.',
          it: 'Basta così, grazie.',
          ja: '以上です、ありがとうございます。',
          nl: 'Dat is alles, dank je.',
          zh: '就这些，谢谢。',
        },
      },
    ],
  },
  {
    id: 'intro',
    keywords: ['introduce myself', 'introduce me', 'my name is', 'meet someone', 'introduce'],
    title: 'Introduce yourself',
    tagline: 'Start the conversation clearly and sound natural.',
    completionSkill: 'introduce yourself naturally',
    completionLine: 'You can now introduce yourself naturally.',
    estimatedMinutes: 3,
    difficulty: 'beginner',
    steps: [
      {
        id: 'intro-name',
        focus: 'Say your name',
        scenario: 'You are meeting someone for the first time. Open with a clean name line.',
        coachTip: 'Keep the greeting short, then let your name land clearly.',
        soundHint: 'Do not over-stress the last syllable of your name.',
        tonguePosition: 'Keep the tongue relaxed and forward through the greeting.',
        lipShape: 'Soft smile and relaxed jaw.',
        airflow: 'One calm breath through the whole sentence.',
        pronunciationDrill: "Bonjour, je m'appelle Ali.",
        challengePrompt: 'Add where you are from next.',
        lines: {
          en: 'Hi, my name is Ali.',
          es: 'Hola, me llamo Ali.',
          fr: "Bonjour, je m'appelle Ali.",
          de: 'Hallo, ich heiße Ali.',
          it: 'Ciao, mi chiamo Ali.',
          ja: 'こんにちは、アリです。',
          nl: 'Hoi, ik heet Ali.',
          zh: '你好，我叫阿里。',
        },
      },
      {
        id: 'intro-pleasure',
        focus: 'Add a friendly follow-up',
        scenario: 'You want to sound warm, not robotic.',
        coachTip: 'Keep the phrase connected and polite.',
        soundHint: 'The final word should stay soft.',
        tonguePosition: 'Let the tongue stay light on the middle consonants.',
        lipShape: 'Stay relaxed and keep the ending open.',
        airflow: 'Do not clip the final syllable.',
        pronunciationDrill: 'Enchanté de vous rencontrer.',
        challengePrompt: 'Add one sentence about why you are here.',
        lines: {
          en: 'Nice to meet you.',
          es: 'Mucho gusto.',
          fr: 'Enchanté de vous rencontrer.',
          de: 'Freut mich, Sie kennenzulernen.',
          it: 'Piacere di conoscerti.',
          ja: 'お会いできてうれしいです。',
          nl: 'Leuk je te ontmoeten.',
          zh: '很高兴认识你。',
        },
      },
      {
        id: 'intro-language',
        focus: 'Say one personal detail',
        scenario: 'You add one simple detail to keep the conversation going.',
        coachTip: 'Keep the sentence easy and natural.',
        soundHint: 'Do not drag the language word out.',
        tonguePosition: 'Stay forward and light through the middle of the line.',
        lipShape: 'Keep the mouth shape small and relaxed.',
        airflow: 'Let the breath taper gently at the end.',
        pronunciationDrill: "J'apprends le français en ce moment.",
        challengePrompt: 'Add why you are learning.',
        lines: {
          en: 'I am learning French right now.',
          es: 'Estoy aprendiendo francés ahora mismo.',
          fr: "J'apprends le français en ce moment.",
          de: 'Ich lerne gerade Französisch.',
          it: 'Sto imparando il francese in questo momento.',
          ja: '今フランス語を勉強しています。',
          nl: 'Ik leer nu Frans.',
          zh: '我现在在学法语。',
        },
      },
    ],
  },
]

const REQUEST_MATCHERS = [
  { scenarioId: 'travel', stepId: 'directions', keywords: ['cab', 'taxi', 'uber', 'ride', 'directions', 'station', 'train'] },
  { scenarioId: 'travel', stepId: 'restaurant', keywords: ['food', 'restaurant', 'cafe', 'coffee', 'table', 'menu', 'order'] },
  { scenarioId: 'travel', stepId: 'transport', keywords: ['bill', 'check', 'pay', 'payment', 'receipt'] },
  { scenarioId: 'travel', stepId: 'hotel-checkin', keywords: ['hotel', 'reservation', 'check in', 'room'] },
  { scenarioId: 'work', stepId: 'intro', keywords: ['introduce', 'introduction', 'my role', 'who i am', 'meeting'] },
  { scenarioId: 'work', stepId: 'meeting', keywords: ['update', 'project', 'work', 'deadline'] },
  { scenarioId: 'family', stepId: 'talk-more', keywords: ['family', 'grandmother', 'grandma', 'parents', 'mother', 'father'] },
  { scenarioId: 'school', stepId: 'classroom', keywords: ['class', 'teacher', 'lesson', 'study', 'school'] },
  { scenarioId: 'general_interest', stepId: 'greeting', keywords: ['hello', 'introduce myself', 'thank you', 'polite', 'meet you'] },
  { scenarioId: 'general_interest', stepId: 'small-talk', keywords: ['small talk', 'conversation', 'chat', 'weekend'] },
]

function toSentenceCase(value = '') {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function deriveRequestTitle(requestText = '') {
  const normalized = String(requestText || '')
    .replace(/^how\s+(do\s+i|to)\s+/i, '')
    .replace(/^learn\s+to\s+/i, '')
    .trim()

  if (!normalized) return 'Custom lesson'
  return toSentenceCase(normalized)
}

function rotateSteps(steps, startStepId) {
  if (!startStepId) return steps
  const startIndex = steps.findIndex((step) => step.id === startStepId)
  if (startIndex <= 0) return steps
  return [...steps.slice(startIndex), ...steps.slice(0, startIndex)]
}

function materializeLessonBundle(languageCode, scenarioId, options = {}) {
  const {
    goalId = scenarioId,
    startStepId = null,
    requestText = '',
    customTitle = '',
    customTagline = '',
    customSkill = '',
    customCompletionLine = '',
  } = options

  const goal = getGoalById(goalId)
  const language = getLanguageByCode(languageCode)
  const scenario = SCENARIO_LIBRARY[scenarioId] ?? SCENARIO_LIBRARY.travel

  const orderedScenarioSteps = rotateSteps(scenario.steps, startStepId)
  const steps = orderedScenarioSteps.map((step, index) => ({
    id: step.id,
    index,
    focus: step.focus,
    scenario: step.scenario,
    coachTip: step.coachTip,
    soundHint: step.soundHint,
    tonguePosition: step.tonguePosition,
    lipShape: step.lipShape,
    airflow: step.airflow,
    pronunciationDrill: step.pronunciationDrill,
    challengePrompt: step.challengePrompt,
    expectedPhrase: step.lines[language.code] ?? step.lines.en,
    translation: step.lines.en,
  }))

  return {
    goal,
    language,
    scenarioMeta: {
      id: customTitle ? `custom-${scenario.id}` : scenario.id,
      title: customTitle || scenario.title,
      tagline: customTagline || scenario.tagline,
      completionSkill: customSkill || scenario.completionSkill,
      completionLine: customCompletionLine || scenario.completionLine,
      estimatedMinutes: scenario.estimatedMinutes,
      difficulty: scenario.difficulty,
      totalSteps: steps.length,
      requestText: requestText || '',
      sourceScenario: scenario.title,
    },
    steps,
  }
}

function materializeTemplateBundle(languageCode, template, requestText = '') {
  const language = getLanguageByCode(languageCode)
  const steps = template.steps.map((step, index) => ({
    id: step.id,
    index,
    focus: step.focus,
    scenario: step.scenario,
    coachTip: step.coachTip,
    soundHint: step.soundHint,
    tonguePosition: step.tonguePosition,
    lipShape: step.lipShape,
    airflow: step.airflow,
    pronunciationDrill: step.pronunciationDrill,
    challengePrompt: step.challengePrompt,
    expectedPhrase: step.lines[language.code] ?? step.lines.en,
    translation: step.lines.en,
  }))

  return {
    goal: getGoalById('general_interest'),
    language,
    scenarioMeta: {
      id: `custom-${template.id}`,
      title: template.title,
      tagline: template.tagline,
      completionSkill: template.completionSkill,
      completionLine: template.completionLine,
      estimatedMinutes: template.estimatedMinutes,
      difficulty: template.difficulty,
      totalSteps: steps.length,
      requestText,
      sourceScenario: template.title,
    },
    steps,
  }
}

function findCustomRequestTemplate(requestText = '') {
  const normalized = String(requestText || '').toLowerCase()
  return (
    CUSTOM_REQUEST_LIBRARY.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(keyword)),
    ) || null
  )
}

export function buildGeneratedLessonBundle(languageCode, requestText, generatedLesson = {}) {
  const language = getLanguageByCode(languageCode)
  const phrases = Array.isArray(generatedLesson.phrases) ? generatedLesson.phrases : []
  const tips = Array.isArray(generatedLesson.pronunciationTips) ? generatedLesson.pronunciationTips : []
  const coachLines = Array.isArray(generatedLesson.coachLines) ? generatedLesson.coachLines : []

  const steps = phrases
    .map((phrase, index) => {
      const target = String(phrase?.target || '').trim()
      const english = String(phrase?.english || '').trim()
      if (!target) return null
      return {
        id: `generated-${index + 1}`,
        index,
        focus: index === 0 ? 'Open clearly' : index === phrases.length - 1 ? 'Close naturally' : 'Keep it moving',
        scenario: coachLines[index] || generatedLesson.goal || 'Say the line the way you would in real life.',
        coachTip: coachLines[index] || 'Keep the phrase relaxed and useful.',
        soundHint: tips[index] || tips[0] || 'Keep the sounds short and clean.',
        tonguePosition: tips[0] || 'Keep the tongue relaxed and avoid heavy English stress.',
        lipShape: tips[1] || 'Keep the mouth shape light and natural.',
        airflow: tips[2] || 'Use one steady breath through the whole phrase.',
        pronunciationDrill: generatedLesson.ttsLines?.[index] || target,
        challengePrompt: generatedLesson.challenge || 'Add one short follow-up once this line feels easy.',
        expectedPhrase: target,
        translation: english,
        englishMeaning: english,
        pronunciationFocus: tips[index] || tips[0] || '',
      }
    })
    .filter(Boolean)

  return {
    goal: getGoalById('general_interest'),
    language,
    scenarioMeta: {
      id: `generated-${Date.now()}`,
      title: generatedLesson.title || deriveRequestTitle(requestText),
      tagline: generatedLesson.goal || `Built around your request: "${requestText}".`,
      completionSkill: (generatedLesson.title || deriveRequestTitle(requestText)).toLowerCase(),
      completionLine: generatedLesson.challenge || `You can now say ${deriveRequestTitle(requestText).toLowerCase()} more confidently.`,
      estimatedMinutes: Math.max(2, Math.min(6, steps.length)),
      difficulty: generatedLesson.difficulty || 'beginner',
      totalSteps: steps.length,
      requestText,
      sourceScenario: 'Generated lesson',
    },
    steps: steps.length ? steps : materializeLessonBundle(languageCode, 'general_interest').steps,
  }
}

export function buildLessonBrief(lesson) {
  const steps = Array.isArray(lesson?.steps) ? lesson.steps : []
  const firstStep = steps[0] || null
  return {
    title: lesson?.scenarioMeta?.title || 'Speaking plan',
    estimatedMinutes: Number(lesson?.scenarioMeta?.estimatedMinutes || Math.max(2, steps.length || 1)),
    sessionFocus: lesson?.scenarioMeta?.tagline || firstStep?.scenario || '',
    outcome:
      lesson?.scenarioMeta?.completionLine ||
      `You can now say ${String(lesson?.scenarioMeta?.title || 'this').toLowerCase()} more naturally.`,
    soundToWatch: firstStep?.soundHint || '',
    pronunciationFocus:
      firstStep?.pronunciationFocus ||
      firstStep?.coachTip ||
      firstStep?.focus ||
      '',
    lines: steps.slice(0, 5).map((step, index) => ({
      id: step.id || `line-${index + 1}`,
      order: index + 1,
      focus: step.focus,
      targetText: step.expectedPhrase,
      englishMeaning: step.englishMeaning || step.translation || '',
      whenToUseIt: step.scenario || '',
      drill: step.pronunciationDrill || '',
      soundToWatch: step.soundHint || '',
      pronunciationFocus: step.pronunciationFocus || step.coachTip || '',
    })),
  }
}

export function getPracticePhraseEntries(languageCode) {
  const collectEntries = (steps = []) =>
    steps.map((step) => ({
      sourceText: step.translation || step.englishMeaning || '',
      targetText: step.expectedPhrase || '',
      phonetic: step.pronunciationDrill || step.expectedPhrase || '',
      translation: step.translation || step.englishMeaning || '',
      focus: step.focus || '',
      scenario: step.scenario || '',
    }))

  const goalEntries = Object.keys(SCENARIO_LIBRARY).flatMap((goalId) =>
    collectEntries(materializeLessonBundle(languageCode, goalId, { goalId }).steps),
  )

  const customEntries = CUSTOM_REQUEST_LIBRARY.flatMap((template) =>
    collectEntries(materializeTemplateBundle(languageCode, template, template.title).steps),
  )

  const deduped = new Map()
  ;[...goalEntries, ...customEntries].forEach((entry) => {
    const sourceKey = String(entry.sourceText || '').trim().toLowerCase()
    const targetKey = String(entry.targetText || '').trim().toLowerCase()
    if (!sourceKey || !targetKey) return
    const key = `${sourceKey}::${targetKey}`
    if (!deduped.has(key)) {
      deduped.set(key, entry)
    }
  })

  return [...deduped.values()]
}

export function getDailyChallengeBundle(languageCode, goalId = 'general_interest', now = new Date()) {
  const lesson = getLessonBundle(languageCode, goalId)
  const dayIndex = now.getDate() % lesson.steps.length
  const challengeStep = lesson.steps[dayIndex]

  return {
    ...lesson,
    scenarioMeta: {
      ...lesson.scenarioMeta,
      id: `daily-${lesson.scenarioMeta.id}`,
      title: 'Daily speaking challenge',
      tagline: `One sharp phrase for today: ${challengeStep.focus}.`,
      estimatedMinutes: 1,
      difficulty: 'quick win',
    },
    steps: [challengeStep],
  }
}

export function getLessonBundle(languageCode, goalId) {
  const goal = getGoalById(goalId)
  return materializeLessonBundle(languageCode, goal.id, { goalId: goal.id })
}

export function getLessonStep(languageCode, goalId, stepIndex = 0) {
  const lesson = getLessonBundle(languageCode, goalId)
  return lesson.steps[stepIndex % lesson.steps.length]
}

export function buildCustomLessonBundle(languageCode, requestText, fallbackGoalId = 'travel') {
  const request = String(requestText || '').trim()
  if (!request) {
    return getLessonBundle(languageCode, fallbackGoalId)
  }

  const template = findCustomRequestTemplate(request)
  if (template) {
    return materializeTemplateBundle(languageCode, template, request)
  }

  const normalized = request.toLowerCase()
  const match =
    REQUEST_MATCHERS.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(keyword)),
    ) || null

  if (!match) {
    return null
  }

  const title = deriveRequestTitle(request)

  return materializeLessonBundle(languageCode, match.scenarioId, {
    goalId: match.scenarioId,
    startStepId: match.stepId,
    requestText: request,
    customTitle: title,
    customTagline: `Built around your request: "${request}".`,
    customSkill: title.toLowerCase(),
    customCompletionLine: `You can now say ${title.toLowerCase()} more confidently.`,
  })
}
