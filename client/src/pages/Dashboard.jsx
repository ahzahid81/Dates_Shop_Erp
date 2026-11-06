import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDate, formatMoney, formatNumber } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import ChartTooltip from '../components/ChartTooltip';
import { PageLoader, EmptyState } from '../components/States';

const shortDate = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const shortMonth = (value) => {
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString('en-GB', { month: 'short' });
};

export default function Dashboard() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/summary/dashboard');
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <PageLoader />;
  if (error) {
    return (
      <div className="card card-pad">
        <EmptyState title={error} />
      </div>
    );
  }

  const today = data.today;
  const weekly = data.weekly.map((row) => ({ ...row, label: shortDate(row.date) }));
  const monthly = data.monthly.map((row) => ({ ...row, label: shortMonth(row._id) }));
  const topMax = Math.max(...data.topProducts.map((p) => p.revenue), 1);

  return (
    <div>
      <PageHeader
        eyebrow={t('common.today')}
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        actions={
          <>
            <Link to="/sales/new" className="btn-primary">
              <ShoppingBag className="h-4 w-4" />
              {t('sales.newSale')}
            </Link>
            <Link to="/statements" className="btn-secondary hidden sm:inline-flex">
              {t('nav.statements')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.todaySales')}
          value={formatMoney(today.sales)}
          hint={`${today.salesCount} ${t('dashboard.salesCount')}${
            today.due ? ` • ${t('dashboard.due')} ${formatMoney(today.due)}` : ''
          }`}
          icon={ShoppingBag}
          tone="brand"
        />
        <StatCard
          label={t('dashboard.todayProfit')}
          value={formatMoney(today.profit)}
          hint={`${t('dashboard.netProfit')}: ${formatMoney(today.netProfit)}`}
          icon={TrendingUp}
          tone="emerald"
        />
        <StatCard
          label={t('dashboard.todayExpense')}
          value={formatMoney(today.expenses)}
          hint={`${today.expenseCount} ${t('dashboard.salesCount')}`}
          icon={Banknote}
          tone="rose"
        />
        <StatCard
          label={t('dashboard.cashInHand')}
          value={formatMoney(today.cashBalance)}
          hint={`${t('daily.cashIn')} ${formatMoney(today.cashIn)}`}
          icon={Wallet}
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="section-title">{t('dashboard.weeklyPerformance')}</h2>
              <p className="muted mt-0.5">{t('dashboard.salesLabel')} / {t('dashboard.expenseLabel')}</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-brand-500" /> {t('dashboard.salesLabel')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> {t('dashboard.expenseLabel')}
              </span>
            </div>
          </div>
          <div className="h-[260px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name={t('dashboard.salesLabel')}
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="url(#salesFill)"
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name={t('dashboard.expenseLabel')}
                  stroke="#fb7185"
                  strokeWidth={2}
                  fill="url(#expenseFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card card-pad">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{t('dashboard.monthlyTrend')}</h2>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="sales" name={t('dashboard.salesLabel')} radius={[6, 6, 0, 0]} maxBarSize={34}>
                  {monthly.map((entry, index) => (
                    <Cell key={entry._id} fill={index === monthly.length - 1 ? '#059669' : '#a7f3d0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('dashboard.products')}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{formatNumber(data.counts.products)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('dashboard.totalSales')}
              </p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{formatNumber(data.counts.sales)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <h2 className="section-title">{t('dashboard.topProducts')}</h2>
            <Link to="/profit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
              {t('dashboard.viewAll')}
            </Link>
          </div>
          {data.topProducts.length === 0 ? (
            <EmptyState title={t('common.noData')} />
          ) : (
            <div className="divide-y divide-slate-100">
              {data.topProducts.map((product, index) => (
                <div key={String(product._id)} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
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
                          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                          style={{ width: `${Math.max((product.revenue / topMax) * 100, 4)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {formatNumber(product.quantity)} {t('dashboard.units')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="section-title">{t('dashboard.lowStock')}</h2>
            </div>
            <span className="badge-amber">{data.lowStock.length}</span>
          </div>
          {data.lowStock.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Boxes} title={t('dashboard.noLowStock')} />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.lowStock.map((product) => (
                <div key={String(product._id)} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                    <p className="text-[11px] text-slate-400">{product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${product.stockQty === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {formatNumber(product.stockQty)} {product.unit}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {t('dashboard.stockLeft')} • {product.lowStockThreshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <h2 className="section-title">{t('dashboard.recentSales')}</h2>
          <Link to="/sales" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        {data.recentSales.length === 0 ? (
          <EmptyState title={t('sales.noSales')} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('sales.invoiceNo')}</th>
                  <th>{t('common.customer')}</th>
                  <th>{t('common.employee')}</th>
                  <th>{t('common.date')}</th>
                  <th className="text-right">{t('common.total')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale._id}>
                    <td className="font-semibold text-slate-800">{sale.invoiceNo}</td>
                    <td>{sale.customer?.name || t('sales.walkIn')}</td>
                    <td className="text-slate-500">{sale.employee?.name || '-'}</td>
                    <td className="text-slate-500">{formatDate(sale.date)}</td>
                    <td className="text-right font-bold text-slate-900">{formatMoney(sale.total)}</td>
                    <td className="text-right">
                      <Link
                        to={`/invoices/${sale._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        {t('common.view')}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <StatusBadge status="completed" />
          {t('dashboard.todaySales')}: {formatMoney(today.sales)}
        </span>
        <span className="hidden sm:inline">
          {t('daily.cashBalance')}: <strong className="text-slate-700">{formatMoney(today.cashBalance)}</strong>
        </span>
      </div>
    </div>
  );
}
