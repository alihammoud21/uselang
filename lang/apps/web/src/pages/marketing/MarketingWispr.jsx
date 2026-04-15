import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { AISphere } from '@/components/AISphere'
import { APP_ROUTES } from '@/lib/routes'

const LANGUAGE_ROTATION = ['Arabic', 'French', 'Mandarin', 'Spanish', 'Hindi']

export function WisprHero({ go, cta }) {
  const [languageIndex, setLanguageIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLanguageIndex((current) => (current + 1) % LANGUAGE_ROTATION.length)
    }, 2200)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="relative overflow-hidden bg-[#fbfaf8] pt-28 pb-18 sm:pt-32 lg:pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[28rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,169,122,0.12),transparent_58%)] blur-3xl" />
        <div className="absolute left-[18%] top-[58%] h-[12rem] w-[12rem] rounded-full bg-[radial-gradient(circle,rgba(201,169,122,0.08),transparent_65%)] blur-3xl" />
        <div className="absolute right-[16%] top-[56%] h-[12rem] w-[12rem] rounded-full bg-[radial-gradient(circle,rgba(245,237,224,0.7),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 lg:px-10">
        <div className="mx-auto max-w-[58rem] text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-[clamp(2.8rem,7vw,5.6rem)] font-extrabold leading-[0.94] tracking-[-0.06em] text-[#0f1419]"
          >
            Stop translating.
            <br />
            <span className="text-[#c9a97a]">Start speaking.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="mx-auto mt-8 max-w-[46rem] text-[clamp(1rem,1.8vw,1.18rem)] leading-[1.75] text-[#8f949a]"
          >
            Voice-first language coaching that fixes your pronunciation,
            <br className="hidden sm:block" />
            confidence, and flow in real time.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="mt-8 text-[1rem] text-[#b1b4b8]"
          >
            Speak like a pro in{' '}
            <AnimatePresence mode="wait">
              <motion.span
                key={LANGUAGE_ROTATION[languageIndex]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24 }}
                className="inline-block font-medium text-[#c9a97a]"
              >
                {LANGUAGE_ROTATION[languageIndex]}
              </motion.span>
            </AnimatePresence>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => go(cta)}
              className="inline-flex min-w-[17rem] items-center justify-center rounded-[1.25rem] bg-[#c9a97a] px-8 py-4 text-[0.95rem] font-semibold text-white shadow-[0_20px_48px_-24px_rgba(201,169,122,0.5)] transition hover:bg-[#b99667]"
            >
              Start speaking free
            </button>
            <button
              type="button"
              onClick={() => go(APP_ROUTES.demo)}
              className="inline-flex min-w-[15.5rem] items-center justify-center rounded-[1.25rem] bg-[#f1f0ee] px-8 py-4 text-[0.95rem] font-semibold text-[#1f252b] transition hover:bg-[#ebe9e6]"
            >
              Watch a real session
            </button>
          </motion.div>
        </div>

        <div className="relative mx-auto mt-20 flex max-w-[56rem] items-center justify-center">
          <div className="absolute left-[4%] top-[18%] hidden rounded-full bg-white px-5 py-3 text-[0.9rem] font-medium text-[#c9a97a] shadow-[0_18px_40px_-28px_rgba(15,20,25,0.22)] sm:block">
            Sounds natural
          </div>
          <div className="absolute right-[2%] top-[14%] hidden rounded-full bg-white px-5 py-3 text-[0.9rem] font-medium text-[#c9a97a] shadow-[0_18px_40px_-28px_rgba(15,20,25,0.22)] sm:block">
            Score: 84%
          </div>

          <div className="flex flex-col items-center">
            <div className="relative flex h-[18rem] w-[18rem] items-center justify-center sm:h-[22rem] sm:w-[22rem]">
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(201,169,122,0.14),transparent_62%)] blur-3xl" />
              <AISphere state="thinking" activityLevel={0.3} size={220} disabled />
              <div className="pointer-events-none absolute -right-18 top-8 hidden w-48 rounded-[1.3rem] bg-white/92 px-4 py-3 text-left shadow-[0_18px_40px_-28px_rgba(15,20,25,0.22)] lg:block">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#c9a97a]">Wispr flow</p>
                <div className="mt-2 space-y-1.5 text-[0.82rem] leading-snug text-[#1f252b]">
                  <p>How do I order at a cafe?</p>
                  <p>Make it sound more natural.</p>
                  <p>Now let me hear it slowly.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const SHOWCASE = [
  {
    title: 'Ask for directions',
    language: 'French',
    phrase: 'Excusez-moi, où est la gare ?',
    meaning: 'Excuse me, where is the train station?',
  },
  {
    title: 'Order confidently',
    language: 'Arabic',
    phrase: 'أريد قهوة من فضلك',
    meaning: 'I would like a coffee, please.',
  },
  {
    title: 'Use the right tone',
    language: 'Mandarin',
    phrase: '请问，洗手间在哪里？',
    meaning: 'Excuse me, where is the bathroom?',
  },
]

export function VideoShowcaseStrip() {
  return (
    <section className="border-t border-black/[0.04] bg-white py-20">
      <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
        <div className="grid gap-4 lg:grid-cols-3">
          {SHOWCASE.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="rounded-[1.75rem] border border-black/[0.06] bg-[#fbfaf8] p-6 shadow-[0_18px_50px_-36px_rgba(15,20,25,0.22)]"
            >
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#a5a9ae]">{item.language}</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.03em] text-[#0f1419]">{item.title}</h3>
              <p className="mt-5 text-[1rem] font-medium tracking-[-0.02em] text-[#0f1419]">{item.phrase}</p>
              <p className="mt-2 text-[0.84rem] leading-[1.7] text-[#8f949a]">{item.meaning}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function EditorialSplit({ go, cta }) {
  return (
    <section className="bg-[#fbfaf8] py-20">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
        <div className="rounded-[2rem] border border-black/[0.05] bg-white p-8 shadow-[0_24px_60px_-42px_rgba(15,20,25,0.22)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#a5a9ae]">What makes it different</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3.5vw,3rem)] font-bold tracking-[-0.05em] text-[#0f1419]">
            The fastest way to sound
            <br />
            natural in a new language.
          </h2>
          <p className="mt-5 max-w-[34rem] text-[0.96rem] leading-[1.8] text-[#8f949a]">
            UseLang is built around speaking. You tell it what you need to say, it builds the session, gives you the
            phrase in the target language, explains it in English, and fixes the sound until it feels right.
          </p>
          <button
            type="button"
            onClick={() => go(cta)}
            className="mt-8 inline-flex items-center justify-center rounded-[1.2rem] bg-[#c9a97a] px-6 py-3.5 text-[0.9rem] font-semibold text-white shadow-[0_18px_46px_-26px_rgba(201,169,122,0.42)] transition hover:bg-[#b99667]"
          >
            Open the coach
          </button>
        </div>

        <div className="space-y-4">
          {[
            'Tell the AI what you need to say today.',
            'Get the target-language phrase with English meaning.',
            'Practice until the sound is clean enough to move on.',
          ].map((line) => (
            <div key={line} className="rounded-[1.5rem] border border-black/[0.05] bg-white px-5 py-4 shadow-[0_16px_40px_-30px_rgba(15,20,25,0.18)]">
              <p className="text-[0.88rem] leading-[1.7] text-[#4c5258]">{line}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
