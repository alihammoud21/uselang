import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { APP_ROUTES } from '@/lib/routes'

/* ─── Language data ──────────────────────────────────────────────────── */
const LANGUAGES = [
  {
    code: 'en', name: 'English', native: 'English', flag: '🇺🇸',
    color: '#4c7fd8', countries: 67,
    regions: ['United States', 'United Kingdom', 'Canada', 'Australia', 'New Zealand', 'Ireland', 'South Africa', 'India', 'Nigeria', 'Kenya', 'Ghana', 'Singapore', 'Philippines', 'Jamaica', 'Barbados', 'Trinidad', 'Belize', 'Guyana', 'Malta'],
  },
  {
    code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸',
    color: '#e05a2b', countries: 21,
    regions: ['Spain', 'Mexico', 'Colombia', 'Argentina', 'Chile', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay', 'Uruguay', 'Panama', 'Costa Rica', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Cuba', 'Dominican Republic', 'Puerto Rico', 'Equatorial Guinea'],
  },
  {
    code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷',
    color: '#2563eb', countries: 29,
    regions: ['France', 'Belgium', 'Switzerland', 'Canada', 'Senegal', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso', 'Niger', 'Cameroon', 'Congo', 'Madagascar', 'Rwanda', 'Burundi', 'Haiti', 'Luxembourg', 'Monaco', 'Andorra'],
  },
  {
    code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦',
    color: '#16a34a', countries: 22,
    regions: ['Saudi Arabia', 'Egypt', 'Iraq', 'Syria', 'Jordan', 'Lebanon', 'Kuwait', 'UAE', 'Qatar', 'Bahrain', 'Oman', 'Yemen', 'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Sudan', 'Mauritania', 'Somalia', 'Djibouti', 'Comoros', 'Palestine'],
  },
  {
    code: 'zh', name: 'Mandarin', native: '普通话', flag: '🇨🇳',
    color: '#dc2626', countries: 3,
    regions: ['China', 'Taiwan', 'Singapore'],
  },
  {
    code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇵🇹',
    color: '#059669', countries: 9,
    regions: ['Portugal', 'Brazil', 'Angola', 'Mozambique', 'Cape Verde', 'Guinea-Bissau', 'São Tomé', 'Equatorial Guinea', 'Timor-Leste'],
  },
  {
    code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪',
    color: '#7c3aed', countries: 6,
    regions: ['Germany', 'Austria', 'Switzerland', 'Belgium', 'Luxembourg', 'Liechtenstein'],
  },
  {
    code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹',
    color: '#d97706', countries: 4,
    regions: ['Italy', 'Switzerland', 'San Marino', 'Vatican City'],
  },
  {
    code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵',
    color: '#db2777', countries: 1,
    regions: ['Japan'],
  },
  {
    code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷',
    color: '#0891b2', countries: 2,
    regions: ['South Korea', 'North Korea'],
  },
  {
    code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳',
    color: '#ea580c', countries: 2,
    regions: ['India', 'Fiji'],
  },
  {
    code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺',
    color: '#6366f1', countries: 4,
    regions: ['Russia', 'Belarus', 'Kazakhstan', 'Kyrgyzstan'],
  },
]

const ALL_COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Bolivia', 'Bosnia', 'Brazil', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Guatemala', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'India', 'Indonesia', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
  'Kenya', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Lebanon', 'Libya', 'Liechtenstein', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Mali', 'Malta', 'Mauritania', 'Mexico', 'Monaco', 'Mongolia', 'Morocco', 'Mozambique',
  'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Norway', 'Oman',
  'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Puerto Rico',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'São Tomé', 'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore',
  'Slovakia', 'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Trinidad', 'Tunisia', 'Turkey',
  'Turkmenistan', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe',
]

/* ─── Fake leaderboard ───────────────────────────────────────────────── */
const LEADERBOARD_DATA = [
  { rank: 1, name: 'Sofia R.', flag: '🇧🇷', countries: 47, languages: 8, streak: 124, badge: '🏆' },
  { rank: 2, name: 'Kenji T.', flag: '🇯🇵', countries: 38, languages: 6, streak: 91, badge: '🥈' },
  { rank: 3, name: 'Amira S.', flag: '🇸🇦', countries: 31, languages: 5, streak: 77, badge: '🥉' },
  { rank: 4, name: 'Luca B.', flag: '🇮🇹', countries: 25, languages: 4, streak: 55, badge: null },
  { rank: 5, name: 'Emma W.', flag: '🇺🇸', countries: 20, languages: 3, streak: 42, badge: null },
  { rank: 6, name: 'Carlos M.', flag: '🇲🇽', countries: 18, languages: 3, streak: 38, badge: null },
  { rank: 7, name: 'Nadia K.', flag: '🇩🇿', countries: 14, languages: 2, streak: 29, badge: null },
]

/* ─── Globe visual ───────────────────────────────────────────────────── */
const GLOBE_DOTS = [
  { lat: 46, lng: 2, label: 'FR', code: 'fr' },
  { lat: 40, lng: -3, label: 'ES', code: 'es' },
  { lat: 51, lng: -0.1, label: 'UK', code: 'en' },
  { lat: 38, lng: 35, label: 'TR', code: null },
  { lat: 30, lng: 31, label: 'EG', code: 'ar' },
  { lat: 24, lng: 45, label: 'SA', code: 'ar' },
  { lat: 35, lng: 105, label: 'CN', code: 'zh' },
  { lat: 36, lng: 138, label: 'JP', code: 'ja' },
  { lat: 37, lng: 127, label: 'KR', code: 'ko' },
  { lat: 20, lng: 77, label: 'IN', code: 'hi' },
  { lat: -15, lng: -47, label: 'BR', code: 'pt' },
  { lat: -38, lng: -63, label: 'AR', code: 'es' },
  { lat: 55, lng: 37, label: 'RU', code: 'ru' },
  { lat: 52, lng: 13, label: 'DE', code: 'de' },
  { lat: 41, lng: 12, label: 'IT', code: 'it' },
  { lat: 4, lng: -2, label: 'GH', code: 'en' },
  { lat: -26, lng: 28, label: 'ZA', code: 'en' },
  { lat: 44, lng: 26, label: 'RO', code: null },
  { lat: 48, lng: 2, label: 'BE', code: 'fr' },
  { lat: 14, lng: -14, label: 'SN', code: 'fr' },
  { lat: 18, lng: -93, label: 'MX', code: 'es' },
  { lat: 39, lng: -8, label: 'PT', code: 'pt' },
  { lat: 47, lng: 8, label: 'CH', code: 'fr' },
  { lat: 45, lng: -75, label: 'CA', code: 'fr' },
  { lat: 38, lng: -97, label: 'US', code: 'en' },
  { lat: -8, lng: -75, label: 'PE', code: 'es' },
  { lat: 1, lng: 103, label: 'SG', code: 'zh' },
  { lat: -6, lng: 35, label: 'TZ', code: null },
  { lat: 9, lng: 8, label: 'NG', code: 'en' },
  { lat: -1, lng: 29, label: 'RW', code: 'fr' },
]

function GlobeViz({ userLangs, learnLang }) {
  const rotateRef = useRef(0)
  const [rotation, setRotation] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    let last = null
    function step(ts) {
      if (last !== null) {
        rotateRef.current = (rotateRef.current + (ts - last) * 0.01) % 360
        setRotation(rotateRef.current)
      }
      last = ts
      animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  const size = 260
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.42

  const activeLangs = new Set([...userLangs, learnLang].filter(Boolean))

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-30"
        style={{ background: 'radial-gradient(circle, #c9a97a 0%, transparent 70%)' }}
      />

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="sphere-grad" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fffef8" />
            <stop offset="40%" stopColor="#f5efe5" />
            <stop offset="100%" stopColor="#d8cfc0" />
          </radialGradient>
          <radialGradient id="sphere-shadow" cx="60%" cy="65%" r="55%">
            <stop offset="0%" stopColor="rgba(80,60,30,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <clipPath id="globe-clip">
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
        </defs>

        {/* Sphere base */}
        <circle cx={cx} cy={cy} r={R} fill="url(#sphere-grad)" />
        <circle cx={cx} cy={cy} r={R} fill="url(#sphere-shadow)" />

        {/* Meridians (vertical lines, rotating) */}
        <g clipPath="url(#globe-clip)" opacity="0.18">
          {[-120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng, i) => {
            const angle = ((lng + rotation) % 180) * (Math.PI / 180)
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={cy}
                rx={Math.abs(R * Math.cos(angle))}
                ry={R}
                fill="none"
                stroke="#8a7055"
                strokeWidth="0.8"
              />
            )
          })}
          {/* Parallels (horizontal lines) */}
          {[-60, -30, 0, 30, 60].map((lat, i) => {
            const y = cy - R * Math.sin((lat * Math.PI) / 180)
            const r = R * Math.cos((lat * Math.PI) / 180)
            return (
              <ellipse
                key={i}
                cx={cx}
                cy={y}
                rx={r}
                ry={r * 0.12}
                fill="none"
                stroke="#8a7055"
                strokeWidth="0.8"
              />
            )
          })}
        </g>

        {/* Country dots */}
        {GLOBE_DOTS.map((dot, i) => {
          // Project lat/lng to 2D with rotation
          const lat = dot.lat
          const lng = (dot.lng + rotation) % 360
          const phi = ((90 - lat) * Math.PI) / 180
          const theta = (lng * Math.PI) / 180
          // Only show front hemisphere
          const z = Math.sin(phi) * Math.cos(theta)
          if (z < -0.1) return null

          const x = cx + R * Math.sin(phi) * Math.cos(theta)
          const y = cy - R * Math.cos(phi)
          const opacity = Math.max(0, z + 0.2)

          const lang = LANGUAGES.find((l) => l.code === dot.code)
          const isActive = activeLangs.has(dot.code)
          const isLearn = dot.code === learnLang
          const color = isLearn ? '#c9a97a' : (lang?.color || '#888')

          return (
            <g key={i} opacity={opacity}>
              {isActive && (
                <circle cx={x} cy={y} r={5} fill={color} opacity={0.25} />
              )}
              <circle
                cx={x}
                cy={y}
                r={isActive ? 3.5 : 2}
                fill={isActive ? color : 'rgba(120,100,70,0.35)'}
              />
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={2.5}
                  fill="white"
                  opacity={0.5}
                />
              )}
            </g>
          )
        })}

        {/* Shine */}
        <ellipse cx={cx * 0.75} cy={cy * 0.62} rx={R * 0.3} ry={R * 0.18} fill="white" opacity={0.18} />

        {/* Border */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(180,155,110,0.25)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/* ─── Onboarding steps ───────────────────────────────────────────────── */
function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(0) // 0: country, 1: languages, 2: result
  const [homeCountry, setHomeCountry] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [spokenLangs, setSpokenLangs] = useState([])
  const [learnLang, setLearnLang] = useState('')

  const filtered = ALL_COUNTRIES.filter((c) =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  ).slice(0, 20)

  function toggleLang(code) {
    setSpokenLangs((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    )
  }

  function computeCoverage() {
    const coveredCountries = new Set()
    spokenLangs.forEach((code) => {
      const lang = LANGUAGES.find((l) => l.code === code)
      lang?.regions.forEach((r) => coveredCountries.add(r))
    })
    return coveredCountries
  }

  function computeLearnBonus() {
    if (!learnLang) return new Set()
    const lang = LANGUAGES.find((l) => l.code === learnLang)
    return new Set(lang?.regions || [])
  }

  const coverage = computeCoverage()
  const learnBonus = computeLearnBonus()
  const newCountries = [...learnBonus].filter((c) => !coverage.has(c))

  const steps = [
    {
      title: "Where are you from?",
      subtitle: "We'll use this to personalize your globe.",
    },
    {
      title: "What languages can you speak?",
      subtitle: "Select all that you're comfortable with.",
    },
    {
      title: "Your language reach",
      subtitle: "Here's how many countries you can communicate in.",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
            i === step ? 'w-6 bg-[#c9a97a]' : i < step ? 'w-2 bg-[#c9a97a]/50' : 'w-2 bg-black/10'
          }`} />
        ))}
      </div>

      <h2 className="text-[1.5rem] font-semibold tracking-[-0.04em] text-[#1a1510] text-center">
        {steps[step].title}
      </h2>
      <p className="mt-1 text-[0.84rem] text-center text-[#8a8078] mb-5">
        {steps[step].subtitle}
      </p>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <input
              type="text"
              placeholder="Search countries…"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              className="w-full rounded-[1.2rem] bg-white/70 px-4 py-3 text-[0.9rem] outline-none shadow-sm placeholder:text-[#a09888] mb-3"
            />
            <div className="space-y-2 max-h-[28vh] overflow-y-auto pb-1">
              {filtered.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => setHomeCountry(country)}
                  className={`w-full rounded-[1.1rem] px-4 py-3 text-left text-[0.9rem] font-medium transition-all active:scale-[0.98] ${
                    homeCountry === country
                      ? 'bg-[#1a1510] text-white'
                      : 'bg-white/80 text-[#2a2218] shadow-sm'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={!homeCountry}
              onClick={() => setStep(1)}
              className="mt-5 w-full rounded-[1.3rem] bg-[#1a1510] py-3.5 text-[0.9rem] font-semibold text-white disabled:opacity-40 active:scale-[0.98]"
            >
              Continue →
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-2 gap-2.5 max-h-[32vh] overflow-y-auto pb-1">
              {LANGUAGES.map((lang) => {
                const active = spokenLangs.includes(lang.code)
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLang(lang.code)}
                    className={`flex items-center gap-2.5 rounded-[1.2rem] px-3.5 py-3 text-left transition-all active:scale-[0.97] ${
                      active
                        ? 'bg-[#1a1510] text-white shadow-md'
                        : 'bg-white/80 text-[#2a2218] shadow-sm'
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <div className="min-w-0">
                      <p className="text-[0.82rem] font-semibold leading-tight truncate">{lang.name}</p>
                      <p className={`text-[0.68rem] leading-tight ${active ? 'text-white/60' : 'text-[#a09888]'}`}>{lang.countries} countries</p>
                    </div>
                    {active && (
                      <svg className="ml-auto shrink-0" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2.5">
              <button type="button" onClick={() => setStep(0)} className="rounded-[1.2rem] bg-white/80 px-5 py-3 text-[0.88rem] font-medium text-[#5a5048] shadow-sm active:scale-[0.98]">
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-[1.2rem] bg-[#1a1510] py-3 text-[0.9rem] font-semibold text-white active:scale-[0.98]"
              >
                See my reach →
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="rounded-[1.3rem] bg-white/80 px-4 py-4 text-center shadow-sm">
                <p className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1a1510]">{spokenLangs.length}</p>
                <p className="text-[0.72rem] text-[#8a8078] mt-0.5">Languages spoken</p>
              </div>
              <div className="rounded-[1.3rem] bg-white/80 px-4 py-4 text-center shadow-sm">
                <p className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1a1510]">{coverage.size}</p>
                <p className="text-[0.72rem] text-[#8a8078] mt-0.5">Countries reachable</p>
              </div>
            </div>

            {/* Language choose to learn */}
            <div className="mb-4">
              <p className="text-[0.8rem] font-semibold text-[#5a5048] mb-2">Pick a language to learn next:</p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.filter((l) => !spokenLangs.includes(l.code)).map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLearnLang(lang.code === learnLang ? '' : lang.code)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.78rem] font-medium transition-all active:scale-[0.97] ${
                      learnLang === lang.code
                        ? 'bg-[#c9a97a] text-white'
                        : 'bg-white/80 text-[#5a5048] shadow-sm'
                    }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Learn bonus */}
            {learnLang && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-[1.2rem] bg-[#fff8ec] px-4 py-3.5"
              >
                <p className="text-[0.84rem] font-semibold text-[#c9a97a]">
                  After 7 days you'll unlock {newCountries.length} new countries! 🎉
                </p>
                <p className="mt-1 text-[0.76rem] text-[#8a8078]">
                  Including: {newCountries.slice(0, 4).join(', ')}{newCountries.length > 4 ? ` and ${newCountries.length - 4} more` : ''}
                </p>
              </motion.div>
            )}

            <button
              type="button"
              onClick={() => onComplete({ homeCountry, spokenLangs, learnLang, coverage })}
              className="w-full rounded-[1.3rem] bg-[#1a1510] py-3.5 text-[0.9rem] font-semibold text-white active:scale-[0.98]"
            >
              Start my journey →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Leaderboard tab ────────────────────────────────────────────────── */
function LeaderboardTab({ userProfile }) {
  const myRank = 8 // mock
  const myData = {
    rank: myRank,
    name: 'You',
    flag: '🏅',
    countries: userProfile?.coverage?.size || 3,
    languages: userProfile?.spokenLangs?.length || 1,
    streak: 1,
    badge: null,
    isMe: true,
  }

  const entries = [
    ...LEADERBOARD_DATA,
    myData,
  ].sort((a, b) => b.countries - a.countries)

  return (
    <div className="space-y-2.5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[#1a1510]">Global Rankings</h3>
        <span className="rounded-full bg-[#c9a97a]/15 px-3 py-1 text-[0.72rem] font-semibold text-[#c9a97a]">This week</span>
      </div>

      {entries.map((entry, i) => (
        <motion.div
          key={entry.name}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 rounded-[1.3rem] px-4 py-3.5 ${
            entry.isMe
              ? 'bg-[#1a1510] text-white shadow-md'
              : 'bg-white/80 shadow-sm'
          }`}
        >
          <span className={`w-7 text-center text-[0.8rem] font-bold ${
            i === 0 ? 'text-[#fbbf24]' : i === 1 ? 'text-[#9ca3af]' : i === 2 ? 'text-[#c9a97a]' : entry.isMe ? 'text-white/60' : 'text-[#a09888]'
          }`}>
            {entry.badge || `#${i + 1}`}
          </span>
          <span className="text-xl">{entry.flag}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-[0.88rem] font-semibold leading-tight ${entry.isMe ? 'text-white' : 'text-[#1a1510]'}`}>
              {entry.name}
            </p>
            <p className={`text-[0.7rem] ${entry.isMe ? 'text-white/50' : 'text-[#a09888]'}`}>
              {entry.languages} language{entry.languages !== 1 ? 's' : ''} · {entry.streak} day streak
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[1.1rem] font-bold tracking-[-0.03em] ${entry.isMe ? 'text-[#c9a97a]' : 'text-[#1a1510]'}`}>
              {entry.countries}
            </p>
            <p className={`text-[0.64rem] ${entry.isMe ? 'text-white/50' : 'text-[#a09888]'}`}>countries</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ─── Main GlobePage ─────────────────────────────────────────────────── */
export function GlobePage({ auth, route }) {
  const [tab, setTab] = useState('globe') // 'globe' | 'leaderboard'
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('uselang_globe_profile')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }) // null = needs onboarding
  const [showOnboarding, setShowOnboarding] = useState(false)

  function handleOnboardingComplete(data) {
    setUserProfile(data)
    setShowOnboarding(false)
    try {
      localStorage.setItem('uselang_globe_profile', JSON.stringify(data))
    } catch { /* ignore */ }
  }

  const spokenLangs = userProfile?.spokenLangs || []
  const learnLang = userProfile?.learnLang || ''
  const coverage = userProfile?.coverage || new Set()

  return (
    <AppShell auth={auth} route={route} section="globe">
      <div
        className="relative min-h-full flex flex-col"
        style={{ background: 'linear-gradient(180deg, #faf8f5 0%, #f5efe7 60%, #f0ebe4 100%)' }}
      >
        {/* ── Onboarding modal ── */}
        <AnimatePresence>
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
              onClick={(e) => e.target === e.currentTarget && setShowOnboarding(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="w-full rounded-t-[2rem] bg-[#faf8f5] px-5 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <button type="button" onClick={() => setShowOnboarding(false)} className="text-[#a09888] text-sm">✕</button>
                </div>
                <OnboardingFlow onComplete={handleOnboardingComplete} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-[1.4rem] font-semibold tracking-[-0.04em] text-[#1a1510]">Your Globe</h1>
              <p className="text-[0.75rem] text-[#8a8078]">
                {userProfile
                  ? `${coverage.size || 0} countries · ${spokenLangs.length} languages`
                  : 'Set up your language profile'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOnboarding(true)}
              className="rounded-full bg-white/80 px-4 py-2 text-[0.78rem] font-medium text-[#5a5048] shadow-sm active:scale-[0.97]"
            >
              {userProfile ? 'Edit' : 'Set up'}
            </button>
          </div>

          {/* Tab toggle */}
          <div className="flex rounded-full bg-black/[0.06] p-1 mb-4">
            {['globe', 'leaderboard'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full py-2 text-[0.8rem] font-semibold capitalize transition-all duration-200 ${
                  tab === t ? 'bg-white text-[#1a1510] shadow-sm' : 'text-[#8a8078]'
                }`}
              >
                {t === 'globe' ? '🌍 Globe' : '🏆 Leaderboard'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            {tab === 'globe' && (
              <motion.div key="globe-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Globe */}
                <div className="flex justify-center my-4">
                  <GlobeViz userLangs={spokenLangs} learnLang={learnLang} />
                </div>

                {/* Stats row */}
                {userProfile ? (
                  <>
                    <div className="grid grid-cols-3 gap-2.5 mb-5">
                      <div className="rounded-[1.2rem] bg-white/80 px-3 py-3.5 text-center shadow-sm">
                        <p className="text-[1.6rem] font-bold tracking-[-0.05em] text-[#1a1510]">{coverage.size || 0}</p>
                        <p className="text-[0.64rem] text-[#a09888] mt-0.5">Countries</p>
                      </div>
                      <div className="rounded-[1.2rem] bg-white/80 px-3 py-3.5 text-center shadow-sm">
                        <p className="text-[1.6rem] font-bold tracking-[-0.05em] text-[#1a1510]">{spokenLangs.length}</p>
                        <p className="text-[0.64rem] text-[#a09888] mt-0.5">Languages</p>
                      </div>
                      <div className="rounded-[1.2rem] bg-white/80 px-3 py-3.5 text-center shadow-sm">
                        <p className="text-[1.6rem] font-bold tracking-[-0.05em] text-[#1a1510]">{learnLang ? '7d' : '—'}</p>
                        <p className="text-[0.64rem] text-[#a09888] mt-0.5">To unlock</p>
                      </div>
                    </div>

                    {/* Languages you speak */}
                    <div className="mb-4">
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#a09888] mb-2.5">Languages you speak</p>
                      <div className="space-y-2">
                        {spokenLangs.length === 0 && (
                          <p className="text-[0.84rem] text-[#a09888]">None yet — tap Edit to add languages.</p>
                        )}
                        {spokenLangs.map((code) => {
                          const lang = LANGUAGES.find((l) => l.code === code)
                          if (!lang) return null
                          return (
                            <div key={code} className="flex items-center gap-3 rounded-[1.2rem] bg-white/80 px-4 py-3 shadow-sm">
                              <span className="text-2xl">{lang.flag}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[0.88rem] font-semibold text-[#1a1510]">{lang.name}</p>
                                <div className="mt-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: '72%', background: lang.color }}
                                  />
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[0.86rem] font-bold text-[#1a1510]">{lang.countries}</p>
                                <p className="text-[0.62rem] text-[#a09888]">countries</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Learning target */}
                    {learnLang && (() => {
                      const lang = LANGUAGES.find((l) => l.code === learnLang)
                      const bonus = lang?.regions.filter((r) => !(coverage instanceof Set ? coverage.has(r) : false)) || []
                      return (
                        <div className="rounded-[1.3rem] bg-[#fff8ec] px-4 py-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{lang?.flag}</span>
                            <div className="flex-1">
                              <p className="text-[0.82rem] font-semibold text-[#c9a97a]">Learning: {lang?.name}</p>
                              <p className="text-[0.76rem] text-[#8a8078] mt-0.5">
                                Unlocks {bonus.length} new countries in 7 days
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => route.navigate(APP_ROUTES.train)}
                            className="mt-3 w-full rounded-[1.1rem] bg-[#c9a97a] py-2.5 text-[0.84rem] font-semibold text-white active:scale-[0.98]"
                          >
                            Continue learning →
                          </button>
                        </div>
                      )
                    })()}
                  </>
                ) : (
                  /* No profile state */
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-[1rem] font-semibold text-[#2a2218] mb-1">Set up your language profile</p>
                    <p className="text-[0.84rem] text-[#8a8078] mb-5 max-w-[17rem] mx-auto">
                      Tell us where you're from and what languages you speak. We'll show how many countries you can already reach.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowOnboarding(true)}
                      className="rounded-[1.3rem] bg-[#1a1510] px-8 py-3.5 text-[0.9rem] font-semibold text-white active:scale-[0.97]"
                    >
                      Get started →
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {tab === 'leaderboard' && (
              <motion.div key="lb-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <LeaderboardTab userProfile={userProfile} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  )
}
