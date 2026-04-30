const COMPOSITIONS = {
  uvular: {
    compositionId: 'FrenchUvularR',
    title: 'Back-of-throat French R',
    detail: 'Short Remotion clip showing the tongue low and the friction point near the throat.',
  },
  nasal: {
    compositionId: 'FrenchNasalVowel',
    title: 'French nasal vowel',
    detail: 'Short Remotion clip showing mouth plus nose airflow for nasal vowels.',
  },
  alveolar: {
    compositionId: 'TapRidge',
    title: 'Tap the ridge',
    detail: 'Short Remotion clip showing a quick tongue tap behind the upper teeth.',
  },
  front: {
    compositionId: 'FrontVowel',
    title: 'Front vowel shape',
    detail: 'Short Remotion clip for a flatter front-vowel mouth shape.',
  },
  rounded: {
    compositionId: 'RoundedVowel',
    title: 'Rounded lips',
    detail: 'Short Remotion clip showing a small lip circle and relaxed jaw.',
  },
  mandarin: {
    compositionId: 'MandarinToneShape',
    title: 'Tone and mouth shape',
    detail: 'Short Remotion clip showing a stable tone contour with a clean mouth position.',
  },
  neutral: {
    compositionId: 'NeutralArticulation',
    title: 'General articulation',
    detail: 'Short Remotion clip showing a clean tongue release and steady airflow.',
  },
}

export function getArticulationMedia(guide = {}) {
  const key = guide?.diagramMode && COMPOSITIONS[guide.diagramMode] ? guide.diagramMode : 'neutral'
  const asset = COMPOSITIONS[key]
  return {
    ...asset,
    readyForRender: true,
    word: guide?.word || '',
    phonetic: guide?.phonetic || '',
  }
}
