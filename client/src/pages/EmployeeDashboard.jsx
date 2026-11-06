import { Link } from 'react-router-dom';
import { ArrowUpRight, NotebookPen, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { TIME_ZONE } from '../lib/format';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { t, lang } = useI18n();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-7 animate-fadeIn">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
          {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
            timeZone: TIME_ZONE,
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {t('employee.hello')}, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">{t('employee.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <Link
          to="/sales/new"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-teal-700 p-6 text-white shadow-xl shadow-brand-600/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:bg-white/20" />
          <div className="absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex min-h-[230px] flex-col justify-between sm:min-h-[280px]">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <ShoppingBag className="h-8 w-8" strokeWidth={1.8} />
            </span>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('employee.sell')}</h2>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white group-hover:text-brand-700">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </div>
              <p className="max-w-[85%] text-sm text-brand-50/90">{t('employee.sellDesc')}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/expenses"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-6 text-white shadow-xl shadow-amber-500/25 transition duration-200 hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
        >
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl transition group-hover:bg-white/25" />
          <div className="absolute -bottom-14 -left-10 h-44 w-44 rounded-full bg-black/10 blur-2xl" />
          <div className="relative flex min-h-[230px] flex-col justify-between sm:min-h-[280px]">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25 backdrop-blur">
              <NotebookPen className="h-8 w-8" strokeWidth={1.8} />
            </span>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('employee.debit')}</h2>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white group-hover:text-amber-600">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </div>
              <p className="max-w-[85%] text-sm text-amber-50/90">{t('employee.debitDesc')}</p>
            </div>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">{t('employee.tapToStart')}</p>
    </div>
  );
}
