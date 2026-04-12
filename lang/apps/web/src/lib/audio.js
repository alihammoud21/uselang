export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result.split(',')[1] : ''
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function buildAudioSource(audioBase64, audioMimeType) {
  return `data:${audioMimeType};base64,${audioBase64}`
}
