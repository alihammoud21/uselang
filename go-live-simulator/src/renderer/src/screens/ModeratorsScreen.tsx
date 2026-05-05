import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { items } from "../game/items";
import type { SaveState } from "../game/types";

export function ModeratorsScreen({ save, updateSave, back }: { save: SaveState; updateSave: (save: SaveState) => void; back: () => void }) {
  const moderators = items.filter((item) => item.category === "moderator" && save.purchasedItems.includes(item.id));

  return (
    <main className="screen-stack">
      <header className="screen-header">
        <div>
          <span className="section-label">Moderators</span>
          <h1>Pick who keeps chat under control</h1>
        </div>
        <Button onClick={back}>Back</Button>
      </header>
      <Card>
        <div className="item-grid">
          <div className="item-card">
            <h3>No Moderator</h3>
            <p>Maximum chaos, no cost.</p>
            <Button variant={save.activeModerator === null ? "primary" : "secondary"} onClick={() => updateSave({ ...save, activeModerator: null })}>
              {save.activeModerator === null ? "Active" : "Activate"}
            </Button>
          </div>
          {moderators.map((item) => (
            <div key={item.id} className={`item-card rarity-${item.rarity}`}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span>{item.bonus}</span>
              <Button variant={save.activeModerator === item.id ? "primary" : "secondary"} onClick={() => updateSave({ ...save, activeModerator: item.id })}>
                {save.activeModerator === item.id ? "Active" : "Activate"}
              </Button>
            </div>
          ))}
          {moderators.length === 0 ? <p className="muted-copy">Buy or pull a moderator from packs to unlock moderation bonuses.</p> : null}
        </div>
      </Card>
    </main>
  );
}
