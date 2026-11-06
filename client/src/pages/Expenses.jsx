import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Plus, Receipt, Search, Trash2, TrendingDown, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { EXPENSE_CATEGORIES } from '../config';
import { formatDate, formatMoney, paymentLabel, startOfMonthInput, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, SkeletonRows } from '../components/States';

const INITIAL = {
  title: '',
  category: 'General',
  amount: '',
  paymentMethod: 'cash',
  note: '',
  receiptNo: '',
  date: todayInput(),
};

export default function Expenses() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [form, setForm] = useState(INITIAL);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ amount: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    from: startOfMonthInput(),
    to: todayInput(),
    search: '',
    category: '',
  });
  const [confirm, setConfirm] = useState({ open: false, expense: null, loading: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/expenses', {
        params: {
          limit: 200,
          from: filters.from || undefined,
          to: filters.to || undefined,
          search: filters.search || undefined,
          category: filters.category || undefined,
        },
      });
      setExpenses(data.expenses);
      setSummary(data.summary);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const setFilter = (key) => (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/expenses', {
        ...form,
        amount: Number(form.amount),
      });
      toast.success(t('expenses.added'));
      setForm({ ...INITIAL, date: todayInput() });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/expenses/${confirm.expense._id}`);
      toast.success(t('expenses.deleted'));
      setConfirm({ open: false, expense: null, loading: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  const topCategory = useMemo(() => {
    const totals = {};
    expenses.forEach((expense) => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '-';
  }, [expenses]);

  return (
    <div>
      <PageHeader title={t('expenses.title')} subtitle={t('expenses.subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('expenses.todayTotal')} value={formatMoney(summary.amount)} icon={Wallet} tone="rose" />
        <StatCard label={t('daily.transactions')} value={summary.count} icon={Receipt} tone="brand" />
        <StatCard label={t('common.category')} value={topCategory} icon={TrendingDown} tone="amber" />
        <StatCard
          label={t('common.summary')}
          value={formatMoney(expenses.length ? summary.amount / expenses.length : 0)}
          icon={BookOpenCheck}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Plus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="section-title">{t('expenses.addExpense')}</h2>
              <p className="text-[11px] text-slate-400">{t('expenses.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="label">{t('expenses.expenseTitle')}</label>
              <input className="input" value={form.title} onChange={set('title')} required minLength={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('common.amount')}</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="input font-semibold"
                  value={form.amount}
                  onChange={set('amount')}
                  required
                />
              </div>
              <div>
                <label className="label">{t('expenses.date')}</label>
                <input type="date" className="input" value={form.date} onChange={set('date')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('common.category')}</label>
                <select className="select" value={form.category} onChange={set('category')}>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t('expenses.paymentMethod')}</label>
                <div className="input flex items-center font-semibold text-slate-600">{paymentLabel('cash')}</div>
              </div>
            </div>
            <div>
              <label className="label">
                {t('expenses.receiptNo')} <span className="font-normal normal-case text-slate-400">({t('common.optional')})</span>
              </label>
              <input className="input" value={form.receiptNo} onChange={set('receiptNo')} />
            </div>
            <div>
              <label className="label">
                {t('expenses.note')} <span className="font-normal normal-case text-slate-400">({t('common.optional')})</span>
              </label>
              <textarea className="textarea" rows={3} value={form.note} onChange={set('note')} />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              <Plus className="h-4 w-4" />
              {saving ? t('common.saving') : t('expenses.addExpense')}
            </button>
          </form>
        </div>

        <div className="card xl:col-span-3">
          <div className="border-b border-slate-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-title">{t('expenses.list')}</h2>
              <span className="badge-slate">{expenses.length} {t('common.records')}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder={t('common.search')}
                  value={filters.search}
                  onChange={setFilter('search')}
                />
              </div>
              <input type="date" className="input" value={filters.from} onChange={setFilter('from')} />
              <input type="date" className="input" value={filters.to} onChange={setFilter('to')} />
              <select className="select" value={filters.category} onChange={setFilter('category')}>
                <option value="">{t('common.all')}</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonRows rows={7} />
          ) : expenses.length === 0 ? (
            <EmptyState icon={Receipt} title={t('expenses.empty')} />
          ) : (
            <>
              <div className="table-wrap hidden md:block">
                <table className="table min-w-[760px]">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('expenses.expenseTitle')}</th>
                      <th>{t('common.category')}</th>
                      <th>{t('common.employee')}</th>
                      <th>{t('common.method')}</th>
                      <th className="text-right">{t('common.amount')}</th>
                      {isAdmin && <th className="text-right">{t('common.actions')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense._id}>
                        <td className="whitespace-nowrap text-slate-500">{formatDate(expense.date)}</td>
                        <td>
                          <p className="font-semibold text-slate-800">{expense.title}</p>
                          <p className="text-[11px] text-slate-400">{expense.receiptNo || expense.note || '-'}</p>
                        </td>
                        <td>
                          <span className="badge-slate">{expense.category}</span>
                        </td>
                        <td className="text-slate-500">{expense.employee?.name || '-'}</td>
                        <td className="text-slate-500">{paymentLabel(expense.paymentMethod)}</td>
                        <td className="text-right font-bold text-rose-600">{formatMoney(expense.amount)}</td>
                        {isAdmin && (
                          <td className="text-right">
                            <button
                              type="button"
                              className="icon-btn text-rose-500 hover:bg-rose-50"
                              onClick={() => setConfirm({ open: true, expense, loading: false })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {expenses.map((expense) => (
                  <div key={expense._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{expense.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatDate(expense.date)} • {expense.category} • {expense.employee?.name}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-rose-600">{formatMoney(expense.amount)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{paymentLabel(expense.paymentMethod)}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          className="font-semibold text-rose-600"
                          onClick={() => setConfirm({ open: true, expense, loading: false })}
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, expense: null, loading: false })}
        onConfirm={handleDelete}
        loading={confirm.loading}
        title={t('common.delete')}
        message={t('expenses.confirmDelete')}
      />
    </div>
  );
}
