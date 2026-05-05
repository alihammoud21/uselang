import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { items } from "../game/items";
import type { SaveState } from "../game/types";

export function WardrobeScreen({ save, updateSave, back }: { save: SaveState; updateSave: (save: SaveState) => void; back: () => void }) {
  const overlays = items.filter((item) => item.category === "overlay" && save.purchasedItems.includes(item.id));

  return (
    <main className="screen-stack">
      <header className="screen-header">
        <div>
          <span className="section-label">Wardrobe</span>
          <h1>Camera overlays and frames</h1>
        </div>
        <Button onClick={back}>Back</Button>
      </header>
      <Card>
        <p className="muted-copy">Cosmetics are overlays around your camera feed. The game never pretends to physically dress you.</p>
        <div className="item-grid">
          <div className="item-card">
            <h3>Clean Default Frame</h3>
            <p>A simple local-only stream frame.</p>
            <Button variant={save.equippedOverlay === null ? "primary" : "secondary"} onClick={() => updateSave({ ...save, equippedOverlay: null })}>
              {save.equippedOverlay === null ? "Equipped" : "Equip"}
            </Button>
          </div>
          {overlays.map((item) => (
            <div key={item.id} className={`item-card rarity-${item.rarity}`}>
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span>{item.bonus}</span>
              <Button variant={save.equippedOverlay === item.id ? "primary" : "secondary"} onClick={() => updateSave({ ...save, equippedOverlay: item.id })}>
                {save.equippedOverlay === item.id ? "Equipped" : "Equip"}
              </Button>
            </div>
          ))}
          {overlays.length === 0 ? <p className="muted-copy">Open packs or buy overlays in the shop to unlock more frames.</p> : null}
        </div>
      </Card>
    </main>
  );
}
