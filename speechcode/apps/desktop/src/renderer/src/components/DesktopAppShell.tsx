import React, { useState } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0014 0" />
    <path d="M12 18v3" />
  </svg>
);

const ChartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: <HomeIcon /> },
  { id: "speak", label: "Speak", icon: <MicIcon /> },
  { id: "progress", label: "Progress", icon: <ChartIcon /> },
  { id: "library", label: "Library", icon: <BookIcon /> },
  { id: "settings", label: "Settings", icon: <GearIcon /> },
];

interface Props {
  activeRoute: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
  isOffline?: boolean;
}

export function DesktopAppShell({ activeRoute, onNavigate, children, isOffline }: Props) {
  const [hovered, setHovered] = useState(false);
  const sidebarWidth = hovered ? 200 : 56;

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        background: "#FAF8F5",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: "100%",
          background: "#F3EFE8",
          borderRight: "1px solid #E2DAD0",
          display: "flex",
          flexDirection: "column",
          paddingTop: 52, // clear traffic lights on macOS
          paddingBottom: 16,
          transition: "width 0.18s ease",
          overflow: "hidden",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            marginBottom: 24,
            height: 36,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 36%, #fff 0%, #f3efe8 40%, #e8c14a 100%)",
              boxShadow: "0 1px 4px rgba(212,168,32,0.3)",
              flexShrink: 0,
            }}
          />
          {hovered && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1C1917",
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              UseLang
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeRoute === item.id;
            const isSpeakPrimary = item.id === "speak";
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 8px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive
                    ? isSpeakPrimary
                      ? "linear-gradient(135deg, #E8C14A 0%, #D4A820 100%)"
                      : "rgba(232,193,74,0.18)"
                    : "transparent",
                  color: isActive
                    ? isSpeakPrimary
                      ? "#1C1917"
                      : "#B88A0A"
                    : "#57534E",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "background 0.12s ease, color 0.12s ease",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                {hovered && (
                  <span
                    style={{
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Offline banner */}
        {isOffline && (
          <div
            style={{
              height: 32,
              background: "#FDF3DC",
              borderBottom: "1px solid #F2D98A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#B88A0A",
              fontWeight: 500,
              letterSpacing: "0.01em",
              flexShrink: 0,
            }}
          >
            Offline — saved lessons and phrases available
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
