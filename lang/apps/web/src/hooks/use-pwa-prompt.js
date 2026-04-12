import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'lang.pwa.dismissed'

function shouldShowIosPrompt() {
  if (typeof window === 'undefined') {
    return false
  }

  const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  return !dismissed && !standalone && isIos
}

export function usePwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(() => shouldShowIosPrompt())

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone

    const handlePrompt = (event) => {
      event.preventDefault()

      if (!dismissed && !standalone) {
        setDeferredPrompt(event)
        setVisible(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handlePrompt)

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

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
