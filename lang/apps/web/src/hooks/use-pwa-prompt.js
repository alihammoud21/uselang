import { useEffect, useMemo, useState } from 'react'
import { isNativeShell } from '@/lib/native-shell'

const STORAGE_KEY = 'lang.pwa.dismissed'

function shouldShowIosPrompt() {
  if (typeof window === 'undefined') {
    return false
  }

  if (isNativeShell()) {
    return false
  }

  const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  return !dismissed && !standalone && isIos
}

export function usePwaPrompt() {
  const nativeShell = isNativeShell()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(() => (nativeShell ? false : shouldShowIosPrompt()))

  useEffect(() => {
    if (nativeShell) {
      return undefined
    }

    const handlePrompt = (event) => {
      const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

      if (dismissed || standalone) {
        return
      }

      event.preventDefault()

      // Keep a reference so install() can call prompt() from user action.
      setDeferredPrompt(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [nativeShell])

  return useMemo(
    () => ({
      visible,
      canInstall: Boolean(deferredPrompt),
      dismiss() {
        localStorage.setItem(STORAGE_KEY, 'true')
        setVisible(false)
      },
      async install() {
        if (!deferredPrompt) {
          return false
        }

        deferredPrompt.prompt()
        await deferredPrompt.userChoice.catch(() => undefined)
        setDeferredPrompt(null)
        setVisible(false)
        return true
      },
    }),
    [deferredPrompt, visible],
  )
}
