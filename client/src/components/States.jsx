import { Loader2, Inbox } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function PageLoader({ label }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      <p className="text-sm font-medium">{label || t('common.loading')}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  const { t } = useI18n();
  return (
    <div className="empty-state">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title || t('common.noData')}</p>
      {text && <p className="max-w-sm text-xs text-slate-500">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-11 w-full" />
      ))}
    </div>
  );
}
