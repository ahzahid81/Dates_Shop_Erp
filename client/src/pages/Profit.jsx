import { useEffect, useState } from 'react';
import { BarChart3, Banknote, Package, Percent, RefreshCw, TrendingUp, Wallet } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatMoney, formatNumber, startOfMonthInput, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import ChartTooltip from '../components/ChartTooltip';
import { EmptyState, PageLoader } from '../components/States';

export default function Profit() {
  const { t } = useI18n();
  const [range, setRange] = useState({ from: startOfMonthInput(), to: todayInput() });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (current = range) => {
    setLoading(true);
    try {
      const { data: payload } = await api.get('/summary/profit', {
        params: { from: current.from || undefined, to: current.to || undefined },
      });
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
  }, []);

  if (loading && !data) return <PageLoader />;

  const overall = data.overall;
  const top = data.products.slice(0, 8).map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name,
    profit: p.profit,
    revenue: p.revenue,
  }));

  return (
    <div>
      <PageHeader
        title={t('profit.title')}
        subtitle={t('profit.subtitle')}
        actions={
          <>
            <input
              type="date"
              className="input w-auto"
              value={range.from}
              onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
            />
            <input
              type="date"
              className="input w-auto"
              value={range.to}
              onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
            />
            <button type="button" className="btn-primary" onClick={() => load()}>
              <RefreshCw className="h-4 w-4" />
              {t('profit.apply')}
            </button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('profit.revenue')} value={formatMoney(overall.revenue)} hint={`${overall.salesCount} ${t('daily.transactions')}`} icon={BarChart3} tone="brand" />
        <StatCard label={t('profit.grossProfit')} value={formatMoney(overall.grossProfit)} hint={`${t('profit.margin')}: ${overall.margin}%`} icon={TrendingUp} tone="emerald" />
        <StatCard label={t('profit.expenses')} value={formatMoney(overall.expenses)} hint={t('daily.expenses')} icon={Banknote} tone="rose" />
        <StatCard label={t('profit.netProfit')} value={formatMoney(overall.netProfit)} hint={`${t('profit.netMargin')}: ${overall.netMargin}%`} icon={Wallet} tone="amber" />
      </div>

      <div className="card mb-4 grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('profit.cost')}</p>
          <p className="mt-1 text-base font-bold text-slate-800">{formatMoney(overall.cost)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('profit.margin')}</p>
          <p className="mt-1 text-base font-bold text-emerald-600">{overall.margin}%</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('profit.itemsSold')}</p>
          <p className="mt-1 text-base font-bold text-slate-800">{formatNumber(overall.itemsSold)}</p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('profit.netMargin')}</p>
          <p className="mt-1 text-base font-bold text-slate-900">{overall.netMargin}%</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Percent className="h-4 w-4 text-brand-600" />
            <h2 className="section-title">{t('profit.topProfit')}</h2>
          </div>
          {top.length === 0 ? (
            <EmptyState title={t('profit.noSales')} />
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top} layout="vertical" margin={{ top: 0, right: 10, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="profit" name={t('common.profit')} radius={[0, 5, 5, 0]} maxBarSize={18}>
                    {top.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? '#059669' : '#6ee7b7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card xl:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <h2 className="section-title">{t('profit.productMargins')}</h2>
            </div>
            <span className="badge-slate">{data.products.length}</span>
          </div>
          {data.products.length === 0 ? (
            <EmptyState title={t('profit.noSales')} />
          ) : (
            <div className="table-wrap">
              <table className="table min-w-[640px]">
                <thead>
                  <tr>
                    <th>{t('profit.product')}</th>
                    <th className="text-right">{t('profit.qty')}</th>
                    <th className="text-right">{t('profit.revenue')}</th>
                    <th className="text-right">{t('profit.profitCol')}</th>
                    <th className="text-right">{t('profit.marginCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={`${product.productId}-${product.name}`}>
                      <td>
                        <p className="font-semibold text-slate-800">{product.name}</p>
                        <p className="text-[11px] text-slate-400">{product.sku}</p>
                      </td>
                      <td className="text-right">{formatNumber(product.quantity)}</td>
                      <td className="text-right">{formatMoney(product.revenue)}</td>
                      <td className="text-right font-semibold text-emerald-600">{formatMoney(product.profit)}</td>
                      <td className="text-right">
                        <span
                          className={`badge ${
                            product.margin >= 30
                              ? 'badge-green'
                              : product.margin >= 15
                              ? 'badge-amber'
                              : 'badge-red'
                          }`}
                        >
                          {product.margin}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
