import { APP_ROUTES } from '@/lib/routes'

const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: APP_ROUTES.app,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.2L12 3l9 7.2" />
        <path d="M5 9.4V19a1 1 0 001 1h3.5v-5a1.5 1.5 0 011.5-1.5h2a1.5 1.5 0 011.5 1.5v5H18a1 1 0 001-1V9.4" />
      </svg>
    ),
    iconFilled: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12.6 2.4a1 1 0 00-1.2 0l-9 7.2A1 1 0 003 11v8a2 2 0 002 2h4v-5.5a1.5 1.5 0 011.5-1.5h3a1.5 1.5 0 011.5 1.5V21h4a2 2 0 002-2v-8a1 1 0 00.6-1.4l-9-7.2z" />
      </svg>
    ),
  },
  {
    id: 'trainer',
    label: 'Speak',
    path: APP_ROUTES.trainer,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0014 0" />
        <path d="M12 18v3" />
      </svg>
    ),
    iconFilled: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a1 1 0 012 0 5 5 0 0010 0 1 1 0 012 0 7 7 0 01-6 6.93V20a1 1 0 01-2 0v-2.07A7 7 0 015 11z" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    path: APP_ROUTES.history,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10" />
        <path d="M9 20V6" />
        <path d="M14 20v-8" />
        <path d="M19 20v-4" />
      </svg>
    ),
    iconFilled: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="3" y="10" width="3" height="10" rx="1.5" />
        <rect x="8" y="6" width="3" height="14" rx="1.5" />
        <rect x="13" y="12" width="3" height="8" rx="1.5" />
        <rect x="18" y="16" width="3" height="4" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'downloads',
    label: 'Library',
    path: APP_ROUTES.downloads,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    iconFilled: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a1 1 0 012 0v4h14v-4a1 1 0 012 0z" />
        <path d="M12 3a1 1 0 011 1v8.59l2.29-2.3a1 1 0 111.42 1.42l-4 4a1 1 0 01-1.42 0l-4-4a1 1 0 111.42-1.42L11 12.59V4a1 1 0 011-1z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    path: APP_ROUTES.settings,
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.5 15.1a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-.9 1.5v.2a2 2 0 11-4 0v-.2a1.6 1.6 0 00-.9-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-.9H3a2 2 0 110-4h.2a1.6 1.6 0 001.5-.9 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3 1.6 1.6 0 00.9-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 00.9 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5.9h.2a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5.9z" />
      </svg>
    ),
    iconFilled: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.5 15.1a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-.9 1.5v.2a2 2 0 11-4 0v-.2a1.6 1.6 0 00-.9-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-.9H3a2 2 0 110-4h.2a1.6 1.6 0 001.5-.9 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3 1.6 1.6 0 00.9-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 00.9 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8 1.6 1.6 0 001.5.9h.2a2 2 0 110 4h-.2a1.6 1.6 0 00-1.5.9z" />
      </svg>
    ),
  },
]

export function AppShell({
  auth: _auth,
  route,
  section,
  children,
  showNav = true,
  header = null,
  contentClassName = '',
}) {
  return (
    <div className="app-stage min-h-screen">
      <div className="phone-shell flex flex-col">
        {header}

        <div className={`relative z-10 flex-1 overflow-y-auto pb-[calc(6.75rem+env(safe-area-inset-bottom))] ${contentClassName}`}>
          {children}
        </div>

        {showNav ? (
          <nav className="absolute inset-x-0 bottom-0 z-40 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
            <div className="nav-float mx-auto grid grid-cols-5 items-center rounded-[1.9rem] px-1.5 py-2">
              {NAV_ITEMS.map((item) => {
                const active = section === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => route.navigate(item.path)}
                    className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.1rem] px-1 py-1.5 transition ${
                      item.id === 'trainer'
                        ? `rounded-[1.35rem] px-2 py-2.5 shadow-[0_12px_28px_-20px_rgba(60,45,25,0.18)] ${active ? 'bg-[#1a1714] text-white' : 'bg-white'}`
                        : active
                          ? 'bg-[#c9a97a]/[0.10]'
                          : ''
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={`transition-colors duration-150 ${
                      item.id === 'trainer'
                        ? active ? 'text-white' : 'text-[#c9a97a]'
                        : active ? 'text-[#c9a97a]' : 'text-ink/30'
                    }`}>
                      {active ? item.iconFilled : item.icon}
                    </span>
                    <span className={`truncate text-[0.54rem] font-medium leading-none transition-colors duration-150 ${
                      item.id === 'trainer'
                        ? active ? 'text-white/82' : 'text-ink/34'
                        : active ? 'text-[#c9a97a]' : 'text-ink/30'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  )
}

export function AppHeader({ title, subtitle, right = null, compact = false }) {
  return (
    <header className={`relative z-10 px-5 ${compact ? 'pt-[calc(env(safe-area-inset-top)+1.4rem)] pb-2' : 'pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-3'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[1.65rem] font-bold leading-tight tracking-[-0.03em] text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[0.82rem] leading-snug text-ink/45">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  )
}
