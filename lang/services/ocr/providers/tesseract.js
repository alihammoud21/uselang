export function validateTesseractEnv() {
  return true
}

export function createTesseractProvider() {
  return {
    name: 'tesseract',
    async extractText() {
      const error = new Error('Local Tesseract OCR is not wired in this repo yet. Add a local OCR runtime before enabling camera text extraction.')
      error.code = 'OCR_UNAVAILABLE'
      throw error
    },
  }
}
