export default function StatBox({ label, value, sub }) {
  return (
    <div className="card">
      <div className="text-zinc-400 text-sm">{label}</div>
      <div className="text-3xl font-extrabold mt-1">{value}</div>
      {sub ? <div className="text-zinc-500 text-xs mt-1">{sub}</div> : null}
    </div>
  );
}
