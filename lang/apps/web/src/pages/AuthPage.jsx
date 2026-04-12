import { useState } from 'react'
import { motion } from 'framer-motion'
import { APP_ROUTES } from '@/lib/routes'

export function AuthPage({ auth, mode, route }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isSignup = mode === 'signup'

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSignup) {
      await auth.signUp({ email, password })
      route.navigate(APP_ROUTES.onboarding)
      return
    }
    const result = await auth.signIn({ email, password })
    route.navigate(result.profile?.languageLearning ? APP_ROUTES.app : APP_ROUTES.onboarding)
  }

  async function handleGoogleAuth() {
    const result = await auth.signInWithGoogle()
    if (result?.redirecting) return
    route.navigate(result.profile?.languageLearning ? APP_ROUTES.app : APP_ROUTES.onboarding)
  }

  return (
    <div className="app-stage min-h-screen">
      <div className="phone-shell flex flex-col">
        <div className="relative z-10 flex-1 overflow-y-auto px-5 pt-[calc(env(safe-area-inset-top)+3rem)] pb-8">
          {/* logo */}
          <button type="button" onClick={() => route.navigate(APP_ROUTES.home)} className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0014 0" />
                <path d="M12 18v3" />
              </svg>
            </div>
            <span className="text-[1rem] font-bold tracking-[-0.02em] text-ink">UseLang</span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10"
          >
            <div
              className="relative overflow-hidden rounded-[1.9rem] bg-white/94 p-5"
              style={{ boxShadow: '0 18px 44px -24px rgba(15, 20, 25, 0.16)' }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(255,178,208,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(0,122,255,0.12),transparent_36%)]" />
              <h1 className="relative text-[1.95rem] font-bold leading-tight tracking-[-0.04em] text-ink">
                {isSignup ? 'Start speaking.' : 'Welcome back.'}
              </h1>
              <p className="relative mt-2 text-[0.88rem] leading-snug text-ink/45">
                {isSignup ? 'Create an account, set your language pair, and start your first guided session.' : 'Log in to continue your speaking plan, saved phrases, and progress.'}
              </p>
            </div>
          </motion.div>

          {/* google */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mt-8"
          >
            <button
              type="button"
              disabled={auth.busy}
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-3 rounded-[1rem] bg-white px-4 py-3.5 text-[0.88rem] font-medium text-ink transition active:scale-[0.98] disabled:opacity-40"
              style={{ boxShadow: '0 14px 34px -26px rgba(15, 20, 25, 0.18)' }}
            >
              <GoogleMark />
              {isSignup ? 'Continue with Google' : 'Log in with Google'}
            </button>
          </motion.div>

          {/* divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/[0.06]" />
            <span className="text-[0.68rem] uppercase tracking-[0.06em] text-ink/25">or</span>
            <div className="h-px flex-1 bg-ink/[0.06]" />
          </div>

          {/* email form */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="mt-6 space-y-3 rounded-[1.6rem] bg-white/86 p-4"
            style={{ boxShadow: '0 14px 34px -24px rgba(15, 20, 25, 0.14)' }}
          >
            <label className="block">
              <span className="text-[0.72rem] font-medium text-ink/35">Email</span>
              <input
                required type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl bg-ink/[0.03] px-4 py-3 text-[0.88rem] text-ink placeholder:text-ink/25"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-[0.72rem] font-medium text-ink/35">Password</span>
              <input
                required minLength={6} type="password" value={password}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl bg-ink/[0.03] px-4 py-3 text-[0.88rem] text-ink placeholder:text-ink/25"
                placeholder="At least 6 characters"
              />
            </label>

            {auth.error ? (
              <p className="rounded-xl bg-danger/8 px-4 py-3 text-[0.82rem] text-danger">{auth.error}</p>
            ) : null}

            <button type="submit" disabled={auth.busy} className="btn-primary mt-1 w-full">
              {auth.busy ? 'Working...' : isSignup ? 'Create account' : 'Log in'}
            </button>
          </motion.form>

          <p className="mt-6 text-center text-[0.82rem] text-ink/35">
            {isSignup ? 'Have an account?' : 'New here?'}{' '}
            <button
              type="button"
              className="font-medium text-accent"
              onClick={() => route.navigate(isSignup ? APP_ROUTES.login : APP_ROUTES.signup)}
            >
              {isSignup ? 'Log in' : 'Create account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.15 4.15 0 01-1.8 2.72v2.26h2.92c1.71-1.58 2.68-3.9 2.68-6.62Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 009 18Z" fill="#34A853" />
      <path d="M3.97 10.72a5.41 5.41 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33Z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.33l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  )
}
