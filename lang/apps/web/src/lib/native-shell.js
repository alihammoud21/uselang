export function isNativeShell() {
  if (typeof window === 'undefined') return false
  return Boolean(window.__USELANG_NATIVE_APP__)
}

export function hasNativeGemmaBridge() {
  if (typeof window === 'undefined') return false
  return Boolean(window.UseLangNative?.gemma)
}

export async function getNativeGemmaStatus() {
  if (!hasNativeGemmaBridge()) {
    throw new Error('Native Gemma bridge is unavailable.')
  }
  return window.UseLangNative.gemma.status()
}

export async function downloadNativeGemmaModel() {
  if (!hasNativeGemmaBridge()) {
    throw new Error('Native Gemma bridge is unavailable.')
  }
  return window.UseLangNative.gemma.download()
}

export async function loadNativeGemmaModel() {
  if (!hasNativeGemmaBridge()) {
    throw new Error('Native Gemma bridge is unavailable.')
  }
  return window.UseLangNative.gemma.load()
}

export async function generateWithNativeGemma(prompt) {
  if (!hasNativeGemmaBridge()) {
    throw new Error('Native Gemma bridge is unavailable.')
  }
  return window.UseLangNative.gemma.generate(prompt)
}
