import { assertEnv } from '../../shared/env.js'

export function validateS3StorageEnv(env = process.env) {
  assertEnv(
    ['STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY', 'STORAGE_BUCKET', 'STORAGE_REGION'],
    env,
    'S3-compatible storage',
  )
}

export function createS3StorageProvider(env = process.env) {
  validateS3StorageEnv(env)
  return {
    name: 's3',
    async storeObject() {
      const error = new Error('S3-compatible storage is configured but not yet wired for direct server uploads in this repo.')
      error.code = 'STORAGE_NOT_IMPLEMENTED'
      throw error
    },
  }
}
