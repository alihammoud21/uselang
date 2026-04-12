interface AppSidebarProps {
  activeView: "home" | "sessions" | "history";
  onChangeView: (view: "home" | "sessions" | "history") => void;
  onOpenSettings: () => void;
}

const ITEMS = [
  { id: "home", icon: "⌂", label: "Home" },
  { id: "sessions", icon: "◫", label: "Sessions" },
  { id: "history", icon: "◷", label: "History" }
] as const;

export function AppSidebar({
  activeView,
  onChangeView,
  onOpenSettings
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-stack">
        <button className="sidebar-logo" aria-label="SpeechCode">
          S
        </button>
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className={item.id === activeView ? "sidebar-icon active" : "sidebar-icon"}
            onClick={() => onChangeView(item.id)}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <button
        className="sidebar-icon"
        onClick={onOpenSettings}
        aria-label="Settings"
        title="Settings"
      >
        ⚙
      </button>
    </aside>
  );
}
