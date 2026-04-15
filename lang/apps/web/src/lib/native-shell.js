export function isNativeShell() {
  if (typeof window === 'undefined') return false
  return Boolean(window.__USELANG_NATIVE_APP__)
}
