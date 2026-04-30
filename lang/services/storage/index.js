import { readProvider } from '../shared/env.js'
import { createS3StorageProvider, validateS3StorageEnv } from './providers/s3.js'

export function getStorageService(env = process.env) {
  const provider = readProvider(env.STORAGE_PROVIDER, 's3')
  if (provider === 's3' || provider === 'r2') return createS3StorageProvider(env)
  throw new Error(`Unsupported storage provider: ${provider}`)
}

export function validateStorageEnv(env = process.env) {
  const provider = readProvider(env.STORAGE_PROVIDER, 's3')
  if (provider === 's3' || provider === 'r2') return validateS3StorageEnv(env)
  throw new Error(`Unsupported storage provider: ${provider}`)
}
