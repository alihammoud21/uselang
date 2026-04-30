function lower(value = '') {
  return String(value || '').trim().toLowerCase()
}

export function inferOcrContext({ text = '', sourceType = 'generic' }) {
  const normalized = lower(text)
  const explicit = lower(sourceType)

  if (explicit) {
    if (explicit.includes('menu')) return { kind: 'menu', note: 'Explain the dish or item and how to order it naturally.' }
    if (explicit.includes('sign')) return { kind: 'sign', note: 'Explain what the sign is telling the user to do.' }
    if (explicit.includes('chat') || explicit.includes('message')) return { kind: 'chat', note: 'Explain the message and suggest a natural reply if useful.' }
    if (explicit.includes('app') || explicit.includes('screen') || explicit.includes('ui')) return { kind: 'ui', note: 'Explain what the label or button means inside the interface.' }
    if (explicit.includes('document')) return { kind: 'document', note: 'Explain the text in practical plain language.' }
  }

  if (/\bmenu\b|\bentrée\b|\bdessert\b|\bprix\b|\bchef\b/.test(normalized)) {
    return { kind: 'menu', note: 'Explain the item and how to order it naturally.' }
  }
  if (/\bexit\b|\bpush\b|\bpull\b|\bwarning\b|\bno smoking\b|\bentrance\b/.test(normalized)) {
    return { kind: 'sign', note: 'Explain the sign and what action it implies.' }
  }
  if (/\bsettings\b|\bsave\b|\bcontinue\b|\bsubmit\b|\baccept\b/.test(normalized)) {
    return { kind: 'ui', note: 'Explain what the UI label or action means.' }
  }
  return { kind: 'generic', note: 'Explain what the text means in context, not as a literal dictionary entry.' }
}
