import { formatMoney } from '../lib/format';

export default function ChartTooltip({ active, payload, label, money = true }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-soft">
      {label && <p className="mb-1.5 font-bold text-slate-700">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            <span className="capitalize text-slate-500">{entry.name}</span>
            <span className="ml-auto font-semibold text-slate-800">
              {money ? formatMoney(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
