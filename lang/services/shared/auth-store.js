// Simple self-hosted auth store. Persists users + profiles to a JSON file
// next to the repo so dev work survives across restarts. This is intentionally
// minimal — no Firebase project required, no external service. When the team
// wires up real Firebase Auth later, just swap the verify/sign helpers.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const STORE_PATH =
  process.env.LANG_AUTH_STORE_PATH ||
  path.join(process.cwd(), '.lang-users.json')

const SECRET =
  process.env.LANG_AUTH_SECRET ||
  // Stable per-machine fallback so tokens survive netlify dev restarts during
  // local development. Production MUST set LANG_AUTH_SECRET.
  'lang-dev-secret-change-me-in-production'

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

// ── File helpers ─────────────────────────────────────────────────────────────

async function readStore() {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      users: parsed.users || {},
      profiles: parsed.profiles || {},
    }
  } catch (err) {
    if (err.code === 'ENOENT') return { users: {}, profiles: {} }
    throw err
  }
}

async function writeStore(store) {
  const tmp = STORE_PATH + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), 'utf8')
  await fs.rename(tmp, STORE_PATH)
}

// ── Password hashing (PBKDF2, no extra deps) ────────────────────────────────

function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex')
  const derived = crypto
    .pbkdf2Sync(password, useSalt, 100_000, 32, 'sha256')
    .toString('hex')
  return { salt: useSalt, hash: derived }
}

function verifyPassword(password, storedSalt, storedHash) {
  const { hash } = hashPassword(password, storedSalt)
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex'),
  )
}

// ── JWT (HS256) ──────────────────────────────────────────────────────────────

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signToken({ uid, email }) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url(
    JSON.stringify({
      sub: uid,
      email,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
  )
  const sig = base64url(
    crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest(),
  )
  return `${header}.${payload}.${sig}`
}

export function verifyToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) throw new Error('Malformed token.')
  const [header, payload, sig] = parts
  const expected = base64url(
    crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest(),
  )
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error('Invalid signature.')
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'))
  if (decoded.exp && decoded.exp * 1000 < Date.now()) {
    throw new Error('Token expired.')
  }
  return decoded
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function signup({ email, password, profile }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email address.')
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.')
  }

  const store = await readStore()
  if (store.users[normalizedEmail]) {
    const err = new Error('An account with this email already exists.')
    err.code = 'EMAIL_TAKEN'
    throw err
  }

  const uid = crypto.randomBytes(12).toString('hex')
  const { salt, hash } = hashPassword(password)
  store.users[normalizedEmail] = {
    uid,
    email: normalizedEmail,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  }
  if (profile) {
    store.profiles[uid] = {
      ...profile,
      uid,
      email: normalizedEmail,
      updatedAt: new Date().toISOString(),
    }
  }
  await writeStore(store)
  const token = signToken({ uid, email: normalizedEmail })
  return { token, uid, email: normalizedEmail }
}

export async function signin({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const store = await readStore()
  const user = store.users[normalizedEmail]
  if (!user) throw new Error('No account found for that email.')
  if (!verifyPassword(password, user.salt, user.hash)) {
    throw new Error('Wrong password.')
  }
  const token = signToken({ uid: user.uid, email: user.email })
  return { token, uid: user.uid, email: user.email }
}

export async function saveProfile(uid, profile) {
  const store = await readStore()
  store.profiles[uid] = {
    ...(store.profiles[uid] || {}),
    ...profile,
    uid,
    updatedAt: new Date().toISOString(),
  }
  await writeStore(store)
  return store.profiles[uid]
}

export async function loadProfile(uid) {
  const store = await readStore()
  return store.profiles[uid] || null
}
