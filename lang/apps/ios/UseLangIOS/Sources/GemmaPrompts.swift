import Foundation

struct GemmaPrompts {

    // MARK: - Lesson Plan Builder

    static func buildLessonPlan(request: String, targetLanguage: String, nativeLanguage: String, level: String, goal: String) -> String {
        return """
        You are UseLang, a premium voice-first language learning tutor.
        Build a short lesson plan for a user who wants to: "\(request)"

        Target language: \(targetLanguage)
        Native language: \(nativeLanguage)
        Level: \(level)
        Goal: \(goal)

        Return ONLY valid JSON in this exact format:
        {
          "title": "Short title for this lesson",
          "tagline": "One-line description of what the user will learn",
          "estimatedMinutes": 3,
          "pronunciationFocus": "What sound to watch for",
          "soundToWatch": "Specific sound that English speakers get wrong",
          "outcome": "What the user will be able to say by the end",
          "lines": [
            {
              "id": "1",
              "order": 1,
              "focus": "What this line teaches",
              "targetText": "The phrase in \(targetLanguage)",
              "englishMeaning": "What it means in English",
              "whenToUseIt": "When to say this in real life",
              "pronunciationFocus": "Mouth/tongue tip for this line",
              "soundToWatch": "Specific sound to watch"
            }
          ]
        }

        Rules:
        - 3-5 lines only, practical and immediately useful
        - targetText must be natural \(targetLanguage), not textbook translation
        - pronunciationFocus should mention tongue/lip/airflow for English speakers
        - For Chinese: include pinyin in pronunciationFocus, mention tone contour
        - Do NOT wrap in markdown. Return raw JSON only.
        """
    }

    // MARK: - Translate English Request into Target-Language Lesson

    static func translateRequest(request: String, targetLanguage: String, nativeLanguage: String, sayLikeLocal: Bool) -> String {
        let style = sayLikeLocal ? "the most natural, locally-used phrasing — not textbook" : "a clear, standard phrasing that is widely understood"
        return """
        You are UseLang, a premium language tutor.
        The user said in English: "\(request)"

        Translate this into \(targetLanguage) using \(style).
        Native language: \(nativeLanguage)

        Return ONLY valid JSON:
        {
          "sourceText": "What the user said in English",
          "targetText": "The \(targetLanguage) phrase",
          "translation": "English meaning of the \(targetLanguage) phrase",
          "phonetic": "Pronunciation guide for English speakers",
          "coachNote": "One specific pronunciation tip for English speakers",
          "articulationGuide": {
            "word": "The hardest word to pronounce",
            "tonguePosition": "Where to put the tongue",
            "lipShape": "What to do with the lips",
            "airflow": "How the air should flow",
            "listenFor": "What sound to listen for",
            "commonMistake": "What English speakers get wrong"
          }
        }

        For Chinese specifically:
        - phonetic must include pinyin with tone marks (e.g. nǐ hǎo)
        - articulationGuide must mention tone contour (high-flat, rising, dip-rise, falling)
        - coachNote should mention tone number and what English speakers substitute

        Rules:
        - Return raw JSON only, no markdown
        - Make the phrase sound like something a local would actually say
        """
    }

    // MARK: - Explain Phrases in English

    static func explainPhrase(phrase: String, targetLanguage: String, context: String) -> String {
        return """
        You are UseLang, a premium language tutor.
        Explain this \(targetLanguage) phrase to an English speaker: "\(phrase)"
        Context: \(context)

        Return ONLY valid JSON:
        {
          "phrase": "\(phrase)",
          "literalTranslation": "Word-by-word translation",
          "naturalMeaning": "What it actually means in context",
          "whyThisWay": "Why locals say it this way instead of the textbook version",
          "culturalNote": "One thing about when or how this is used in real life",
          "alternatives": ["Other natural ways to say the same thing"],
          "pronunciationTip": "One specific sound to get right"
        }

        For Chinese: include tone information in pronunciationTip.
        Return raw JSON only, no markdown.
        """
    }

    // MARK: - Generate Pronunciation Drill Copy

    static func generateDrill(targetLanguage: String, focusWord: String, focusSound: String, level: String) -> String {
        return """
        You are UseLang, a premium pronunciation coach.
        Generate a pronunciation drill for \(targetLanguage).

        Focus word: "\(focusWord)"
        Focus sound: "\(focusSound)"
        Level: \(level)

        Return ONLY valid JSON:
        {
          "focusWord": "\(focusWord)",
          "focusSound": "\(focusSound)",
          "slowBreakdown": "Break the word into syllables with pronunciation hints",
          "minimalPairs": [
            { "target": "Correct sound", "contrast": "Common English mistake", "tip": "How to tell them apart" }
          ],
          "drillPhrases": [
            "A short phrase using the focus word",
            "Another phrase with the same sound",
            "A phrase where the sound appears in a different position"
          ],
          "tonguePlacement": "Exactly where the tongue goes",
          "lipShape": "What the lips should do",
          "airflow": "How the air moves",
          "listenFor": "What the correct version sounds like to an English ear",
          "commonMistake": "What English speakers substitute and why it sounds wrong",
          "sayNaturally": "How to make it sound local, not rehearsed"
        }

        For Chinese drills:
        - Include tone number and contour description
        - Mention tone sandhi rules if relevant (e.g. 3+3 → 2+3)
        - Include "what to listen for" specific to the tone
        Return raw JSON only, no markdown.
        """
    }

    // MARK: - Chinese-Specific Lesson Builder

    static func buildChineseLesson(request: String, level: String, goal: String) -> String {
        return """
        You are UseLang, a premium Mandarin Chinese tutor specializing in helping English speakers sound natural.
        The user wants to: "\(request)"

        Level: \(level)
        Goal: \(goal)

        Build a short lesson (3-5 lines) with full Chinese learning support.

        Return ONLY valid JSON:
        {
          "title": "Short lesson title",
          "tagline": "What the user will learn",
          "estimatedMinutes": 3,
          "pronunciationFocus": "Main sound challenge for English speakers",
          "soundToWatch": "Specific Mandarin sound to watch",
          "outcome": "What the user can say after this lesson",
          "lines": [
            {
              "id": "1",
              "order": 1,
              "focus": "What this line teaches",
              "targetText": "Simplified Chinese characters",
              "pinyin": "Pinyin with tone marks (e.g. nǐ hǎo)",
              "toneNumbers": "Tone numbers for each syllable (e.g. ni3 hao3)",
              "englishMeaning": "English meaning",
              "whenToUseIt": "When to say this in real life",
              "pronunciationFocus": "Mouth/tongue/airflow tip",
              "toneNote": "Which tones appear and their contour (e.g. '3rd tone dips then rises')",
              "soundToWatch": "Specific sound English speakers get wrong",
              "toneSandhi": "Any tone change rules that apply (e.g. 3+3→2+3)"
            }
          ]
        }

        Rules:
        - Use simplified Chinese characters
        - Pinyin MUST include tone marks (ā á ǎ à)
        - Every line must have toneNumbers and toneNote
        - Mention tone sandhi when two third tones are adjacent
        - pronunciationFocus should mention initial consonant type (e.g. retroflex, aspirated)
        - Make phrases sound like what a local Beijinger or Shanghai resident would actually say
        - Return raw JSON only, no markdown
        """
    }
}
