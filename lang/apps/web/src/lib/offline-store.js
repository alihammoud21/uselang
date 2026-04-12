// Lightweight IndexedDB wrapper for storing downloaded practice items.
// One database, one object store keyed by an `id` field.
//
// Schema for each record:
//   {
//     id: string,                  // stable id (lessonStepId or generated)
//     sentence: string,            // target sentence
//     phonetic: string,            // phonetic / syllable cue
//     translation: string,         // native-language gloss
//     language: string,            // BCP-47 / lesson language code
//     scenarioLabel: string,       // e.g. "Order food"
//     audioBlob: Blob,             // raw TTS bytes
//     audioMimeType: string,       // e.g. 'audio/mpeg'
//     userAudioBlob?: Blob,        // raw user recording bytes
//     userAudioMimeType?: string,  // e.g. 'audio/webm'
//     synced: boolean,             // whether this has been pushed to Firestore
//     createdAt: number,           // ms since epoch
//   }

const DB_NAME = 'lang-offline'
const DB_VERSION = 1
const STORE = 'practice'

let dbPromise = null

function openDb() {
  if (dbPromise) return dbPromise
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'))
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt')
        store.createIndex('synced', 'synced')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Unable to open IndexedDB.'))
  })
  return dbPromise
}

function tx(mode = 'readonly') {
  return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE))
}

function awaitRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePracticeItem(item) {
  const store = await tx('readwrite')
  const record = {
    synced: false,
    createdAt: Date.now(),
    ...item,
  }
  await awaitRequest(store.put(record))
  return record
}

export async function listPracticeItems() {
  const store = await tx('readonly')
  const items = await awaitRequest(store.getAll())
  return items.sort((left, right) => right.createdAt - left.createdAt)
}

export async function getPracticeItem(id) {
  const store = await tx('readonly')
  return awaitRequest(store.get(id))
}

export async function deletePracticeItem(id) {
  const store = await tx('readwrite')
  await awaitRequest(store.delete(id))
}

export async function markSynced(id) {
  const store = await tx('readwrite')
  const record = await awaitRequest(store.get(id))
  if (!record) return null
  record.synced = true
  await awaitRequest(store.put(record))
  return record
}

export async function listUnsyncedItems() {
  const items = await listPracticeItems()
  return items.filter((item) => !item.synced)
}

// --- Helpers ---------------------------------------------------------------

export function base64ToBlob(base64, mimeType = 'audio/mpeg') {
  if (!base64) return null
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: mimeType })
  } catch {
    return null
  }
}

export function createObjectUrl(blob) {
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export function revokeObjectUrl(url) {
  if (url) URL.revokeObjectURL(url)
}
