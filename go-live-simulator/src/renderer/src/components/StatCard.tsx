export function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: accent } : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
