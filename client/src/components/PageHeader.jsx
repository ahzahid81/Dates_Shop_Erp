import { Printer } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

export default function PageHeader({ title, subtitle, actions, eyebrow, printable }) {
  const { t } = useI18n();
  const hasActions = actions || printable;
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
        )}
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {hasActions && (
        <div className="no-print flex flex-wrap items-center gap-2">
          {actions}
          {printable && (
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('common.print')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
