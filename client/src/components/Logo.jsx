import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';

export default function Logo({ dark = false, compact = false }) {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  return (
    <Link to={isAdmin ? '/dashboard' : '/employee'} className="flex items-center gap-2.5">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 via-brand-600 to-teal-700 text-white shadow-lg shadow-brand-900/30">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 3c-1.2 2.2-3.4 3-5.5 3.4C5.2 6.6 5 8.1 5 9.5 5 15.3 8.1 20 12 21c3.9-1 7-5.7 7-11.5 0-1.4-.2-2.9-1.5-3.1C15.4 6 13.2 5.2 12 3Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path d="M12 7v13" stroke="#065f46" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className={`block text-sm font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
            {t('common.appName')}
          </span>
          <span className={`block text-[10px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('common.tagline')}
          </span>
        </span>
      )}
    </Link>
  );
}
