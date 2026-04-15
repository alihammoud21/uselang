import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useCallback, useState } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'
import { MarketingNav, MarketingFooter } from '@/pages/MarketingShared'

const LANGUAGES = [
  {
    name: 'French',
    native: 'Français',
    flag: '🇫🇷',
    phrase: "Une table pour deux, s'il vous plaît.",
    phonetic: 'ewn tah-BLUH poor DUH seel voo PLEH',
    translation: 'A table for two, please.',
    accent: 'Parisian · Québécois · Belgian',
    color: '#007aff',
    difficulty: 'Popular',
    tips: ['Nasal vowels: air through nose', 'The French R is in the throat', 'Silent final consonants'],
  },
  {
    name: 'Spanish',
    native: 'Español',
    flag: '🇪🇸',
    phrase: '¿Dónde está la estación?',
    phonetic: 'DON-deh es-TAH lah es-tah-SYON',
    translation: 'Where is the station?',
    accent: 'Castilian · Latin American · Mexican',
    color: '#ff6b9d',
    difficulty: 'Popular',
    tips: ['The rolled R requires tongue vibration', '"ción" sounds like "syon"', 'Stress on the second-to-last syllable'],
  },
  {
    name: 'Arabic',
    native: 'العربية',
    flag: '🇸🇦',
    phrase: 'شكراً جزيلاً',
    phonetic: 'SHUK-ran ja-ZEE-lan',
    translation: 'Thank you very much.',
    accent: 'Modern Standard · Egyptian · Levantine',
    color: '#30d158',
    difficulty: 'Advanced',
    tips: ['Deep sounds come from the throat', 'Emphatic consonants change vowel quality', 'Long vs. short vowels matter entirely'],
  },
  {
    name: 'Mandarin',
    native: '中文',
    flag: '🇨🇳',
    phrase: '请问这个多少钱',
    phonetic: 'qǐng wèn zhè ge duō shǎo qián',
    translation: 'How much is this?',
    accent: 'Standard · Taiwanese · Cantonese',
    color: '#ff9f0a',
    difficulty: 'Advanced',
    tips: ['4 tones — pitch changes meaning completely', 'The X and Q sounds don\'t exist in English', 'Measure words are required before nouns'],
  },
  {
    name: 'Italian',
    native: 'Italiano',
    flag: '🇮🇹',
    phrase: "Mi scusi, dov'è il bagno?",
    phonetic: 'mee SKOO-zee doh-VEH eel BAH-nyoh',
    translation: 'Excuse me, where is the bathroom?',
    accent: 'Standard Italian · Roman · Sicilian',
    color: '#5856d6',
    difficulty: 'Popular',
    tips: ['Every letter is pronounced — no silent endings', 'Double consonants are held longer', 'Stress is key — same word, different stress = different meaning'],
  },
  {
    name: 'English',
    native: 'English',
    flag: '🇬🇧',
    phrase: 'Could you speak more slowly, please?',
    phonetic: 'kud yoo speek mor SLOH-lee pleez',
    translation: 'For non-native English speakers.',
    accent: 'British RP · American · Australian',
    color: '#af52de',
    difficulty: 'Popular',
    tips: ['Schwa is the most common English sound', 'Stress makes words intelligible', 'Linking: words flow together in speech'],
  },
]

const COMING_SOON = [
  { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { name: 'Russian', native: 'Русский', flag: '🇷🇺' },
]

function LanguageCard({ lang, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [open, setOpen] = useState(false)

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className={`group relative flex flex-col rounded-2xl bg-white border transition-all duration-300 overflow-hidden cursor-pointer ${
        open
          ? 'border-ink/[0.1] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.1)]'
          : 'border-ink/[0.06] shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.08)]'
      }`}
      onClick={() => setOpen(!open)}>

      {/* color accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${lang.color}, ${lang.color}55)` }} />

      <div className="p-5">
        {/* header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{lang.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[0.95rem] font-bold leading-tight">{lang.name}</h3>
                <span className="rounded-full px-2 py-0.5 text-[0.58rem] font-semibold"
                  style={{ background: lang.color + '14', color: lang.color }}>
                  {lang.difficulty}
                </span>
              </div>
              <p className="text-[0.7rem] text-ink/30">{lang.native}</p>
            </div>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink/[0.04]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-ink/30">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </motion.div>
        </div>

        {/* phrase card */}
        <div className="mt-4 rounded-xl p-3.5" style={{ background: lang.color + '08' }}>
          <p className="text-[0.9rem] font-medium text-ink/70 leading-snug">&ldquo;{lang.phrase}&rdquo;</p>
          <p className="mt-0.5 font-mono text-[0.64rem] text-ink/30">{lang.phonetic}</p>
          <p className="mt-1 text-[0.72rem] text-ink/35 italic">{lang.translation}</p>
        </div>

        {/* accent line */}
        <p className="mt-3 text-[0.68rem] text-ink/25">
          <span className="font-medium text-ink/35">Accents: </span>{lang.accent}
        </p>

        {/* expanded tips */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }} className="overflow-hidden">
              <div className="mt-4 border-t border-ink/[0.05] pt-4 space-y-2">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.07em] text-ink/25">Key pronunciation tips</p>
                {lang.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: lang.color }} />
                    <p className="text-[0.76rem] text-ink/50 leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-px bg-ink/[0.04]" />
              <p className="mt-3 text-[0.68rem] text-ink/30">
                Tap the mic in the app to start practicing {lang.name} right now.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function LanguagesPage({ auth, route }) {
  const go = useCallback((path) => route.navigate(path), [route])
  const cta = auth.session ? APP_ROUTES.app : APP_ROUTES.signup

  return (
    <div className="min-h-screen bg-white text-ink overflow-x-hidden">
      <MarketingNav auth={auth} go={go} />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #ffffff 100%)' }} />
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[700px] h-[400px] opacity-[0.06]"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, #22c55e, transparent 60%)' }} />
        </div>
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="eyebrow mb-3">Languages</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="text-[clamp(2.2rem,5.5vw,3.4rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Six languages.<br />
            <span className="gradient-text">One AI coach.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-[1.7] text-ink/40">
            Each language comes with accent-specific coaching, regional pronunciation options, and real scenarios you'll actually use.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mt-8 flex justify-center">
            <div className="flex -space-x-2">
              {LANGUAGES.map((l) => (
                <span key={l.name} title={l.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xl shadow-sm"
                  style={{ background: l.color + '18' }}>
                  {l.flag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Language cards */}
      <section className="pb-16 px-5">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-center text-[0.68rem] font-semibold uppercase tracking-[0.07em] text-ink/25">Tap a card to see pronunciation tips</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANGUAGES.map((lang, i) => <LanguageCard key={lang.name} lang={lang} index={i} />)}
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section className="py-16 px-5" style={{ background: 'linear-gradient(180deg, #f9f7f4 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <p className="eyebrow mb-2">Coming next</p>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-extrabold tracking-[-0.03em]">More languages in the pipeline</h2>
            <p className="mt-2 text-[0.85rem] text-ink/40">Join the waitlist to get early access when your language launches.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON.map((lang, i) => (
              <motion.div key={lang.name} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-ink/[0.1] bg-white/60 px-5 py-4">
                <span className="text-2xl">{lang.flag}</span>
                <div>
                  <p className="text-[0.88rem] font-semibold text-ink/50">{lang.name}</p>
                  <p className="text-[0.7rem] text-ink/25">{lang.native}</p>
                </div>
                <span className="ml-auto rounded-full bg-ink/[0.04] px-2.5 py-0.5 text-[0.6rem] font-medium text-ink/25">Soon</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-5">
        <div className="mx-auto max-w-xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
            className="rounded-3xl bg-white border border-ink/[0.07] p-10"
            style={{ boxShadow: '0 16px 56px -16px rgba(0,0,0,0.08)' }}>
            <div className="mb-5 flex justify-center">
              <AISphere state="idle" activityLevel={0.3} size={72} disabled />
            </div>
            <h2 className="text-[1.6rem] font-extrabold tracking-[-0.03em]">
              Pick a language.<br />Start speaking.
            </h2>
            <p className="mt-2 text-[0.84rem] text-ink/40">Free to try. No credit card. First session in under a minute.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button type="button" onClick={() => go(cta)}
                className="btn-primary !px-8 !py-3.5 !text-[0.88rem]"
                style={{ boxShadow: '0 8px 28px -6px rgba(34,197,94,0.38)' }}>
                Start speaking free
              </button>
              <button type="button" onClick={() => go(APP_ROUTES.howItWorks)}
                className="btn-ghost !px-6 !py-3.5 !text-[0.85rem]">
                See how it works
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      <MarketingFooter go={go} />
    </div>
  )
}
