import type { DashboardSession } from "@speechcode/types";

interface ContextPanelProps {
  session?: DashboardSession;
  statusText: string;
  errorMessage: string | null;
  previewText: string;
}

function formatDate(value?: string): string {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ContextPanel({
  session,
  statusText,
  errorMessage,
  previewText
}: ContextPanelProps) {
  return (
    <aside className="context-panel">
      <section className="context-section">
        <p className="section-label">Background Status</p>
        <dl className="context-list">
          <div>
            <dt>State</dt>
            <dd>{errorMessage ?? statusText}</dd>
          </div>
          <div>
            <dt>Target</dt>
            <dd>
              {session?.target === "cursor"
                ? "Cursor"
                : session?.target === "browser"
                  ? "Browser target"
                  : "VS Code"}
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDate(session?.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="context-section">
        <p className="section-label">Latest Prompt</p>
        <div className="preview-copy">
          {previewText || "SpeechCode will show the cleaned prompt here after your next voice request."}
        </div>
      </section>
    </aside>
  );
}
