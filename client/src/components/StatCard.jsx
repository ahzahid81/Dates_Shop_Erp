const tones = {
  brand: { icon: 'bg-brand-50 text-brand-700', ring: 'ring-brand-500/10', dot: 'bg-brand-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-500/10', dot: 'bg-emerald-500' },
  amber: { icon: 'bg-amber-50 text-amber-700', ring: 'ring-amber-500/10', dot: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'ring-rose-500/10', dot: 'bg-rose-500' },
  sky: { icon: 'bg-sky-50 text-sky-700', ring: 'ring-sky-500/10', dot: 'bg-sky-500' },
  violet: { icon: 'bg-violet-50 text-violet-700', ring: 'ring-violet-500/10', dot: 'bg-violet-500' },
  slate: { icon: 'bg-slate-100 text-slate-700', ring: 'ring-slate-500/10', dot: 'bg-slate-500' },
};

export default function StatCard({ label, value, icon: Icon, tone = 'brand', hint, trend, className = '' }) {
  const style = tones[tone] || tones.brand;
  return (
    <div className={`stat-card ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 break-words text-lg font-extrabold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={`stat-icon ${style.icon} ring-1 ${style.ring}`}>
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${trend >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className={trend >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
          <span className="text-slate-400">vs previous month</span>
        </div>
      )}
    </div>
  );
}
