import { CreditCard, PackageOpen, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { items } from "../game/items";
import { openPack, packs, type PackReward } from "../game/packs";
import type { SaveState } from "../game/types";

export function ShopScreen({ save, updateSave, back }: { save: SaveState; updateSave: (save: SaveState) => void; back: () => void }) {
  const [rewards, setRewards] = useState<PackReward[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function buyItem(itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || save.purchasedItems.includes(item.id) || save.money < item.cost) return;
    updateSave({ ...save, money: save.money - item.cost, purchasedItems: [...save.purchasedItems, item.id] });
  }

  function buyPack(packId: string, currency: "money" | "credits") {
    const pack = packs.find((candidate) => candidate.id === packId);
    if (!pack) return;
    if (currency === "money" && save.money < pack.cost) return;
    if (currency === "credits" && save.streamCredits < pack.creditCost) return;
    const paid = currency === "money" ? { ...save, money: save.money - pack.cost } : { ...save, streamCredits: save.streamCredits - pack.creditCost };
    const result = openPack(pack, paid);
    updateSave(result.save);
    setRewards(result.rewards);
  }

  function redeem() {
    if (code.trim().toUpperCase() !== "GO-LIVE-MVP") {
      setMessage("Invalid test code.");
      return;
    }
    updateSave({ ...save, streamCredits: save.streamCredits + 500 });
    setMessage("Redeemed 500 Stream Credits locally.");
    setCode("");
  }

  return (
    <main className="screen-stack">
      <header className="screen-header">
        <div>
          <span className="section-label">Shop</span>
          <h1>Packs, upgrades, and Stream Credits</h1>
        </div>
        <Button onClick={back}>Back</Button>
      </header>

      <section className="shop-layout">
        <Card title="Open Packs" className="pack-column">
          {packs.map((pack) => (
            <div className="pack-card" key={pack.id}>
              <PackageOpen />
              <div>
                <h3>{pack.name}</h3>
                <p>{pack.description}</p>
                <div className="pack-actions">
                  <Button disabled={save.money < pack.cost} onClick={() => buyPack(pack.id, "money")}>${pack.cost}</Button>
                  <Button disabled={save.streamCredits < pack.creditCost} variant="primary" onClick={() => buyPack(pack.id, "credits")}>{pack.creditCost} Credits</Button>
                </div>
              </div>
            </div>
          ))}
          {rewards.length > 0 ? (
            <div className="reward-reveal">
              {rewards.map((reward) => (
                <div key={reward.id} className={`reward-card rarity-${reward.rarity}`}>
                  <span>{reward.rarity}</span>
                  <strong>{reward.label}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Mock Credit Purchase">
          <div className="credit-panel">
            <CreditCard size={36} />
            <p>Real purchases are not enabled in this MVP. No Stripe, Steam, card entry, or payment is used.</p>
            <div className="credit-bundles">
              <span>500 Credits - Future $4.99</span>
              <span>1,200 Credits - Future $9.99</span>
              <span>3,000 Credits - Future $19.99</span>
            </div>
            <div className="redeem-row">
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter test code" />
              <Button variant="primary" onClick={redeem}>Redeem</Button>
            </div>
            <small>Use code GO-LIVE-MVP</small>
            {message ? <strong className="save-message">{message}</strong> : null}
          </div>
        </Card>
      </section>

      <Card title="Buy Individually">
        <div className="item-grid">
          {items.map((item) => {
            const owned = save.purchasedItems.includes(item.id);
            return (
              <div key={item.id} className={`item-card rarity-${item.rarity}`}>
                <ShoppingBag size={18} />
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <span>{item.bonus}</span>
                <Button disabled={owned || save.money < item.cost} onClick={() => buyItem(item.id)}>{owned ? "Owned" : `$${item.cost}`}</Button>
              </div>
            );
          })}
        </div>
      </Card>
    </main>
  );
}
