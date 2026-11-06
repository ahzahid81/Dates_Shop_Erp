import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  CreditCard,
  Package,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatMoney, formatNumber, monthInput, paymentLabel } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ChartTooltip from '../components/ChartTooltip';
import { EmptyState, PageLoader } from '../components/States';

const PIE_COLORS = ['#059669', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#64748b'];

const shortDay = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: '2-digit' });
};

export default function MonthlySummary() {
  const { t } = useI18n();
  const [month, setMonth] = useState(monthInput());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/summary/monthly', { params: { month } })
      .then(({ data: payload }) => active && setData(payload))
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [month]);

  if (loading || !data) {
    return (
      <div>
        <PageHeader title={t('monthly.title')} subtitle={t('monthly.subtitle')} />
        <PageLoader />
      </div>
    );
  }

  const s = data.summary;
  const chart = data.daily.map((row) => ({ ...row, label: shortDay(row.date) }));
  const pie = data.payments.map((p) => ({ name: paymentLabel(p._id), value: p.total }));
  const topMax = Math.max(...data.topProducts.map((p) => p.revenue), 1);
  const avgDaily = s.sales / Math.max(data.daily.length, 1);

  const Trend = ({ value }) => (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );

  return (
    <div>
      <PageHeader
        title={t('monthly.title')}
        subtitle={t('monthly.subtitle')}
        actions={<input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('monthly.sales')}
          value={formatMoney(s.sales)}
          hint={`${s.salesCount} ${t('daily.transactions')}`}
          icon={BarChart3}
          tone="brand"
          trend={s.change.sales}
        />
        <StatCard
          label={t('monthly.grossProfit')}
          value={formatMoney(s.grossProfit)}
          hint={`${t('monthly.margin')}: ${s.margin}%`}
          icon={TrendingUp}
          tone="emerald"
          trend={s.change.profit}
        />
        <StatCard
          label={t('monthly.expenses')}
          value={formatMoney(s.expenses)}
          hint={`${s.expenseCount} ${t('daily.transactions')}`}
          icon={Banknote}
          tone="rose"
          trend={s.change.expenses}
        />
        <StatCard
          label={t('monthly.netProfit')}
          value={formatMoney(s.netProfit)}
          hint={`${t('monthly.margin')}: ${s.margin}%`}
          icon={Wallet}
          tone="amber"
          trend={s.change.netProfit}
        />
      </div>

      <div className="card mb-4 grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('monthly.stockPurchases')}</p>
          <p className="mt-1 text-base font-bold text-slate-800">{formatMoney(s.stockPurchases)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('monthly.cashIn')}</p>
          <p className="mt-1 text-base font-bold text-emerald-600">{formatMoney(s.cashIn)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('monthly.cashOut')}</p>
          <p className="mt-1 text-base font-bold text-rose-600">{formatMoney(s.cashOut)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('monthly.cashBalance')}</p>
          <p className="mt-1 text-base font-bold text-slate-900">{formatMoney(s.cashBalance)}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">{t('monthly.dailyTrend')}</h2>
              <p className="muted mt-0.5">{data.month}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-500" /> {t('daily.sales')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> {t('daily.expenses')}</span>
            </div>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={56} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sales" name={t('daily.sales')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Line type="monotone" dataKey="expenses" name={t('daily.expenses')} stroke="#fb7185" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="section-title mb-1">{t('monthly.performance')}</h2>
          <p className="muted">{t('monthly.vsPrev')}</p>
          <div className="mt-4 space-y-3">
            {[
              { label: t('monthly.sales'), value: s.change.sales, current: s.sales, previous: s.previous.sales },
              { label: t('monthly.grossProfit'), value: s.change.profit, current: s.grossProfit, previous: s.previous.profit },
              { label: t('monthly.expenses'), value: s.change.expenses, current: s.expenses, previous: s.previous.expenses },
              { label: t('monthly.netProfit'), value: s.change.netProfit, current: s.netProfit, previous: s.previous.netProfit },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">{row.label}</p>
                  <Trend value={row.value} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{formatMoney(row.current)}</span>
                  <span>{formatMoney(row.previous)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3 text-white">
            <span className="text-[11px] font-medium text-slate-300">{t('monthly.avgDaily')}</span>
            <span className="text-sm font-bold">{formatMoney(avgDaily)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-600" />
              <h2 className="section-title">{t('monthly.topProducts')}</h2>
            </div>
            <span className="badge-slate">{data.topProducts.length}</span>
          </div>
          {data.topProducts.length === 0 ? (
            <EmptyState title={t('profit.noSales')} />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.topProducts.map((product, index) => (
                <div key={String(product._id)} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                      <p className="shrink-0 text-sm font-bold text-slate-900">{formatMoney(product.revenue)}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max((product.revenue / topMax) * 100, 4)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatNumber(product.quantity)} qty</span>
                      <span className="shrink-0 text-[10px] font-semibold text-emerald-600">{formatMoney(product.profit)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="mb-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <h2 className="section-title">{t('monthly.paymentBreakdown')}</h2>
          </div>
          {pie.length === 0 ? (
            <EmptyState title={t('common.noData')} />
          ) : (
            <>
              <div className="h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                      {pie.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={7}
                      formatter={(value) => <span className="text-[11px] text-slate-500">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <CalendarDays className="h-3.5 w-3.5" />
                {data.month}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
