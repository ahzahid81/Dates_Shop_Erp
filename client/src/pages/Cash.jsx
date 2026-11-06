import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Plus,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDateTime, formatMoney, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import ChartTooltip from '../components/ChartTooltip';
import { EmptyState, PageLoader } from '../components/States';

const shortDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const sourceLabel = {
  sale: 'Sale',
  expense: 'Expense',
  stock: 'Stock purchase',
  adjustment: 'Adjustment',
  invoice_payment: 'Due payment',
  refund: 'Refund',
};

export default function Cash() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState({
    open: false,
    type: 'in',
    amount: '',
    description: '',
    date: todayInput(),
    saving: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data: payload } = await api.get('/summary/cash', { params: { page, limit: 30 } });
      setData(payload);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAdjustment = async () => {
    setModal((prev) => ({ ...prev, saving: true }));
    try {
      await api.post('/summary/cash/adjustment', {
        type: modal.type,
        amount: Number(modal.amount),
        description: modal.description,
        date: modal.date ? new Date(`${modal.date}T12:00:00`).toISOString() : undefined,
      });
      toast.success(t('cash.balanceUpdated'));
      setModal({ open: false, type: 'in', amount: '', description: '', date: todayInput(), saving: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setModal((prev) => ({ ...prev, saving: false }));
    }
  };

  if (loading && !data) return <PageLoader />;

  const chart = data.series.map((row) => ({ ...row, label: shortDate(row.date) }));

  return (
    <div>
      <PageHeader
        title={t('cash.title')}
        subtitle={t('cash.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={() => setModal((prev) => ({ ...prev, open: true }))}>
            <Plus className="h-4 w-4" />
            {t('cash.adjustment')}
          </button>
        }
      />

      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-950 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300">
              <Wallet className="h-4 w-4" />
              {t('cash.currentBalance')}
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{formatMoney(data.balance)}</p>
            <p className="mt-1 text-xs text-slate-400">{t('cash.subtitle')}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[340px]">
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <ArrowDownLeft className="mx-auto h-4 w-4 text-emerald-400" />
              <p className="mt-1 text-[10px] text-slate-400">{t('cash.todayIn')}</p>
              <p className="text-xs font-bold text-emerald-300">{formatMoney(data.today.cashIn)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <ArrowUpRight className="mx-auto h-4 w-4 text-rose-400" />
              <p className="mt-1 text-[10px] text-slate-400">{t('cash.todayOut')}</p>
              <p className="text-xs font-bold text-rose-300">{formatMoney(data.today.cashOut)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <Banknote className="mx-auto h-4 w-4 text-amber-400" />
              <p className="mt-1 text-[10px] text-slate-400">{t('cash.todayNet')}</p>
              <p className="text-xs font-bold text-amber-300">{formatMoney(data.today.net)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('cash.allTimeIn')} value={formatMoney(data.allTime.cashIn)} icon={ArrowDownLeft} tone="emerald" />
        <StatCard label={t('cash.allTimeOut')} value={formatMoney(data.allTime.cashOut)} icon={ArrowUpRight} tone="rose" />
        <StatCard label={t('cash.transactions')} value={data.total} icon={Banknote} tone="brand" />
        <StatCard label={t('cash.todayNet')} value={formatMoney(data.today.net)} icon={Wallet} tone="amber" />
      </div>

      <div className="card mb-4 card-pad">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title">{t('cash.last14')}</h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> In</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Out</span>
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="in" name="Cash in" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="out" name="Cash out" fill="#fb7185" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <h2 className="section-title">{t('cash.transactions')}</h2>
          <span className="badge-slate">{data.total} {t('common.records')}</span>
        </div>
        {data.transactions.length === 0 ? (
          <EmptyState icon={Wallet} title={t('cash.noTransactions')} />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table min-w-[760px]">
                <thead>
                  <tr>
                    <th>{t('common.date')}</th>
                    <th>{t('common.details')}</th>
                    <th>{t('common.method')}</th>
                    <th>{t('common.employee')}</th>
                    <th className="text-right">{t('common.amount')}</th>
                    <th className="text-right">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td className="whitespace-nowrap text-slate-500">{formatDateTime(tx.date)}</td>
                      <td>
                        <p className="font-medium text-slate-800">{tx.description}</p>
                        <p className="text-[11px] text-slate-400">{sourceLabel[tx.source] || tx.source}</p>
                      </td>
                      <td className="capitalize text-slate-500">{tx.paymentMethod}</td>
                      <td className="text-slate-500">{tx.employee?.name || '-'}</td>
                      <td className={`text-right font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'in' ? '+' : '-'}
                        {formatMoney(tx.amount)}
                      </td>
                      <td className="text-right">
                        <span className={tx.type === 'in' ? 'badge-green' : 'badge-red'}>
                          {tx.type === 'in' ? t('statements.in') : t('statements.out')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-slate-100 md:hidden">
              {data.transactions.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{tx.description}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatDateTime(tx.date)} • {tx.employee?.name}
                    </p>
                  </div>
                  <p className={`shrink-0 text-sm font-bold ${tx.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'in' ? '+' : '-'}
                    {formatMoney(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
            <Pagination page={data.page} pages={data.pages} onPage={setPage} total={data.total} />
          </>
        )}
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, type: 'in', amount: '', description: '', date: todayInput(), saving: false })}
        title={t('cash.addAdjustment')}
        subtitle={t('cash.adjustHint')}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setModal({ open: false, type: 'in', amount: '', description: '', date: todayInput(), saving: false })}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={handleAdjustment} disabled={modal.saving}>
              {modal.saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'in', label: t('cash.cashIn'), icon: ArrowDownLeft },
              { value: 'out', label: t('cash.cashOut'), icon: ArrowUpRight },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setModal((prev) => ({ ...prev, type: option.value }))}
                className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition ${
                  modal.type === option.value
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
          <div>
            <label className="label">{t('common.amount')}</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="input"
              value={modal.amount}
              onChange={(e) => setModal((prev) => ({ ...prev, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">{t('cash.description')}</label>
            <input
              className="input"
              value={modal.description}
              onChange={(e) => setModal((prev) => ({ ...prev, description: e.target.value }))}
              placeholder={t('cash.manual')}
            />
          </div>
          <div>
            <label className="label">{t('common.date')}</label>
            <input
              type="date"
              className="input"
              value={modal.date}
              onChange={(e) => setModal((prev) => ({ ...prev, date: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
