import { readProvider } from '../shared/env.js'
import { createTesseractProvider, validateTesseractEnv } from './providers/tesseract.js'

export function getOcrService(env = process.env) {
  const provider = readProvider(env.OCR_PROVIDER, 'tesseract')
  if (provider === 'tesseract') return createTesseractProvider(env)
  throw new Error(`Unsupported OCR provider: ${provider}`)
}

export function validateOcrEnv(env = process.env) {
  const provider = readProvider(env.OCR_PROVIDER, 'tesseract')
  if (provider === 'tesseract') return validateTesseractEnv(env)
  throw new Error(`Unsupported OCR provider: ${provider}`)
}
