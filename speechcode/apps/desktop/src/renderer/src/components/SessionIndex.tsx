import type { DashboardSession } from "@speechcode/types";

interface SessionIndexProps {
  heading: string;
  sessions: DashboardSession[];
  selectedSessionId: string | null;
  onSelect: (sessionId: string) => void;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function SessionIndex({
  heading,
  sessions,
  selectedSessionId,
  onSelect
}: SessionIndexProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="session-index">
      <div className="session-index-header">
        <p className="section-label">{heading}</p>
      </div>
      <div className="session-index-list">
        {sessions.map((session) => (
          <button
            key={session.id}
            className={session.id === selectedSessionId ? "session-row active" : "session-row"}
            onClick={() => onSelect(session.id)}
          >
            <div>
              <strong>{session.rawInput}</strong>
              <span>{session.status.replace("-", " ")}</span>
            </div>
            <small>{formatTime(session.updatedAt)}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
