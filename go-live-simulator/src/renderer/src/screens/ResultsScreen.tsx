import { Button } from "../components/Button";
import { ScreenTitle } from "../components/AppShell";
import { Card } from "../components/Card";
import { StatCard } from "../components/StatCard";
import { nextMilestone } from "../game/save";
import type { SaveState, StreamStats } from "../game/types";

export function ResultsScreen({ save, results, back }: { save: SaveState; results: StreamStats | null; back: () => void }) {
  if (!results) {
    return (
      <main className="center-screen">
        <Card>
          <h1>No stream results yet</h1>
          <Button onClick={back}>Back</Button>
        </Card>
      </main>
    );
  }

  const length = Math.max(1, Math.round((results.endedAt - results.startedAt) / 1000));
  const milestone = nextMilestone(save.subscribers);

  return (
    <main className="screen-stack">
      <header className="screen-header">
        <div>
          <ScreenTitle number="4" title="STREAM RESULTS" />
          <h1 className="complete-title">Stream Complete!</h1>
          <p>Great stream! Your community loved it.</p>
        </div>
        <Button variant="primary" onClick={back}>Return to Dashboard</Button>
      </header>
      <section className="stats-grid">
        <StatCard label="Stream Length" value={`${length}s`} />
        <StatCard label="Peak Viewers" value={results.peakViewers.toLocaleString()} />
        <StatCard label="New Subscribers" value={results.newSubscribers.toLocaleString()} />
        <StatCard label="Money Earned" value={`$${results.moneyEarned}`} />
        <StatCard label="Donations" value={results.donationsReceived} />
        <StatCard label="Tasks Completed" value={results.tasksCompleted} />
      </section>
      <Card>
        <div className="setup-row">
          <span>Best Moment</span>
          <strong>{results.bestMoment}</strong>
        </div>
        <div className="setup-row">
          <span>Chat Mood</span>
          <strong>{Math.round(results.chatMood)}%</strong>
        </div>
        <div className="setup-row">
          <span>Subscribers Needed For Next Milestone</span>
          <strong>{Math.max(0, milestone - save.subscribers).toLocaleString()}</strong>
        </div>
      </Card>
    </main>
  );
}
