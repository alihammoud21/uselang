export function Meter({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "green" | "red" | "purple" }) {
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <strong>{Math.round(value)}%</strong>
      </div>
      <div className="meter-track">
        <div className={`meter-fill meter-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
