import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { SUPER_ADMIN_EMAIL } from '../config';
import { formatNumber } from '../lib/format';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/States';

const DELETE_LABELS = {
  sales: 'Sales & invoices',
  quotations: 'Quotations',
  products: 'Products',
  stockEntries: 'Stock entries',
  expenses: 'Expenses',
  cashTransactions: 'Cash transactions',
  coldStorageEntries: 'Cold storage entries',
  coldStorageTransfers: 'Cold storage transfers',
  counters: 'Sequence counters',
  auditLogs: 'Audit logs',
};

export default function ResetDatabase() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ phrase: '', password: '', submitting: false });

  const allowed =
    user?.role === 'admin' &&
    String(user?.email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/system/reset-preview');
      setPreview(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed, load]);

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card card-pad flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="section-title">Restricted area</h1>
          <p className="muted">
            Database reset is available only to the designated super admin
            (<span className="font-semibold">{SUPER_ADMIN_EMAIL}</span>).
          </p>
        </div>
      </div>
    );
  }

  if (loading || !preview) {
    return (
      <div>
        <PageHeader title="Reset Database" subtitle="Permanently clear business data" />
        <PageLoader />
      </div>
    );
  }

  const phraseOk = form.phrase.trim().toUpperCase() === 'RESET DATABASE';

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!phraseOk || !form.password) return;

    setForm((prev) => ({ ...prev, submitting: true }));
    try {
      const { data } = await api.post('/system/reset', {
        confirmation: form.phrase,
        password: form.password,
      });
      toast.success(data.message || 'Database reset complete');
      setForm({ phrase: '', password: '', submitting: false });
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const deletedEntries = Object.entries(preview.counts || {});

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Reset Database"
        subtitle="Wipe all business records while keeping every admin and employee account."
        actions={
          <button type="button" className="btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-bold">Danger: this cannot be undone</p>
          <p className="mt-1 text-rose-700">
            Every sale, product, stock entry, expense, quotation, cash transaction, cold storage
            record, sequence counter and audit log will be permanently deleted. User accounts
            (admin and employee logins) are kept.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
            <Trash2 className="h-4 w-4 text-rose-600" />
            <h2 className="section-title">Data that will be deleted</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {deletedEntries.map(([key, count]) => (
              <li key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-slate-600">{DELETE_LABELS[key] || key}</span>
                <span className="font-bold tabular-nums text-slate-900">{formatNumber(count)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="card card-pad">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              <Users className="h-3.5 w-3.5" />
              Accounts kept
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Admins</span>
                <span className="font-bold text-slate-900">{formatNumber(preview.retained.admins)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employees</span>
                <span className="font-bold text-slate-900">{formatNumber(preview.retained.employees)}</span>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Database className="h-3.5 w-3.5" />
              Allowed account
            </p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-800">
              {preview.superAdminEmail}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card card-pad space-y-4">
        <div>
          <h2 className="section-title">Confirm reset</h2>
          <p className="muted mt-1">
            Type <span className="font-mono font-bold text-slate-800">RESET DATABASE</span> and enter
            your password to continue.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="reset-phrase">
              Confirmation phrase
            </label>
            <input
              id="reset-phrase"
              className="input font-mono uppercase"
              value={form.phrase}
              onChange={(e) => setForm((prev) => ({ ...prev, phrase: e.target.value }))}
              placeholder="RESET DATABASE"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="reset-password">
              Your password
            </label>
            <input
              id="reset-password"
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{user?.email}</span>
          </p>
          <button
            type="submit"
            className="btn-danger"
            disabled={!phraseOk || !form.password || form.submitting}
          >
            {form.submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {form.submitting ? t('common.saving') : 'Reset database permanently'}
          </button>
        </div>
      </form>
    </div>
  );
}
