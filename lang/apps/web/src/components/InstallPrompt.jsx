import { motion, AnimatePresence } from 'framer-motion'

export function InstallPrompt({ pwa }) {
  return (
    <AnimatePresence>
      {pwa.visible ? (
        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm"
        >
          <div className="glass-strong rounded-[2rem] p-5 shadow-[0_40px_90px_-46px_rgba(67,97,146,0.38)]">
            <div className="flex items-start gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.96),rgba(211,239,255,0.9)_22%,rgba(94,170,255,0.92)_62%,rgba(39,120,255,1)_100%)] shadow-[0_20px_34px_-18px_rgba(47,123,255,0.42)]">
                <div className="absolute inset-[22%] rounded-full bg-white/36 blur-md" />
                <div className="absolute inset-x-[22%] bottom-[18%] top-[56%] rounded-full bg-white/20 blur-lg" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[1rem] font-semibold tracking-[-0.02em] text-ink">Add Lang to your home screen</p>
                <p className="mt-1 text-[0.8rem] leading-snug text-ink/58">
                  Open Lang full screen, like a focused app, with your voice tutor one tap away.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <button type="button" onClick={pwa.install} className="btn-primary w-full">
                {pwa.canInstall ? 'Install Lang' : 'How to add it'}
              </button>
              <button
                type="button"
                onClick={pwa.dismiss}
                className="btn-ghost w-full"
              >
                Later
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  )
}
