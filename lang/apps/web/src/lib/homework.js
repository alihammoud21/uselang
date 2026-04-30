function pickHomeworkPrompt(kind, phrase, translation, focusWord) {
  if (kind === 'fill') {
    return {
      label: 'Fill the gap',
      prompt: `Complete the key word in: ${translation || phrase}`,
      answer: focusWord || phrase.split(/\s+/)[0] || phrase,
    }
  }

  if (kind === 'recall') {
    return {
      label: 'Recall',
      prompt: `Write or say the target phrase for: ${translation || phrase}`,
      answer: phrase,
    }
  }

  if (kind === 'sound') {
    return {
      label: 'Sound it out',
      prompt: `Repeat the focus sound cleanly three times: ${focusWord || phrase}`,
      answer: focusWord || phrase,
    }
  }

  return {
    label: 'Speak it',
    prompt: `Say this out loud once slowly, then once naturally: ${phrase}`,
    answer: phrase,
  }
}

export function buildHomeworkBlock({
  phrase = '',
  translation = '',
  focusWord = '',
  accuracy = 0,
  scenarioTitle = '',
}) {
  const kinds = accuracy >= 0.88 ? ['recall', 'speak', 'fill'] : ['sound', 'fill', 'speak']
  const tasks = kinds.map((kind) => pickHomeworkPrompt(kind, phrase, translation, focusWord))
  const title = scenarioTitle ? `Homework · ${scenarioTitle}` : 'Homework'
  const summary =
    accuracy >= 0.88
      ? 'You understood the phrase. Lock it in with one short recall pass.'
      : 'You are close. Sharpen the weak sound once more before the next lesson.'

  return {
    title,
    summary,
    tasks,
    completionLine:
      accuracy >= 0.88
        ? 'You can now use this phrase in a real conversation.'
        : 'Clean this sound up once and the phrase will feel much more natural.',
  }
}
