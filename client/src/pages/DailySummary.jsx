import { useEffect, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  Package,
  Printer,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDate, formatMoney, formatNumber, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { EmptyState, PageLoader } from '../components/States';

export default function DailySummary() {
  const { t } = useI18n();
  const [date, setDate] = useState(todayInput());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get('/summary/daily', { params: { date } })
      .then(({ data: payload }) => {
        if (active) setData(payload);
      })
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date]);

  const summary = data?.summary;

  return (
    <div className="print-area">
      <PageHeader
        title={t('daily.title')}
        subtitle={t('daily.subtitle')}
        actions={
          <>
            <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('daily.print')}
            </button>
          </>
        }
      />

      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label={t('daily.sales')}
              value={formatMoney(summary.sales)}
              hint={`${summary.salesCount} ${t('daily.transactions')}`}
              icon={ShoppingBag}
              tone="brand"
            />
            <StatCard
              label={t('daily.expenses')}
              value={formatMoney(summary.expenses)}
              hint={`${summary.expenseCount} ${t('daily.transactions')}`}
              icon={Banknote}
              tone="rose"
            />
            <StatCard
              label={t('daily.netProfit')}
              value={formatMoney(summary.netProfit)}
              hint={`${t('daily.grossProfit')}: ${formatMoney(summary.grossProfit)}`}
              icon={TrendingUp}
              tone="emerald"
            />
            <StatCard
              label={t('daily.cashBalance')}
              value={formatMoney(summary.cashBalance)}
              hint={`${t('daily.cashIn')}: ${formatMoney(summary.cashIn)}`}
              icon={Wallet}
              tone="amber"
            />
          </div>

          <div className="card mb-4 grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('daily.cashIn')}</p>
              <p className="mt-1 text-lg font-bold text-emerald-600">{formatMoney(summary.cashIn)}</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('daily.cashOut')}</p>
              <p className="mt-1 text-lg font-bold text-rose-600">{formatMoney(summary.cashOut)}</p>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('daily.dayNet')}</p>
              <p className={`mt-1 text-lg font-bold ${summary.dayCashNet >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatMoney(summary.dayCashNet)}
              </p>
            </div>
            <div className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('daily.stockPurchases')}</p>
              <p className="mt-1 text-lg font-bold text-slate-800">{formatMoney(summary.stockPurchases)}</p>
            </div>
          </div>

          <div className="card mb-4">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <h2 className="section-title">{t('daily.salesList')}</h2>
              <span className="badge-slate">{data.sales.length}</span>
            </div>
            {data.sales.length === 0 ? (
              <EmptyState icon={ShoppingBag} title={t('sales.noSales')} />
            ) : (
              <div className="table-wrap">
                <table className="table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>{t('sales.invoiceNo')}</th>
                      <th>{t('common.customer')}</th>
                      <th>{t('common.employee')}</th>
                      <th>{t('common.date')}</th>
                      <th className="text-right">{t('common.total')}</th>
                      <th className="text-right">{t('invoices.paid')}</th>
                      <th className="text-right">{t('invoices.due')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map((sale) => (
                      <tr key={sale._id}>
                        <td className="font-semibold text-slate-800">{sale.invoiceNo}</td>
                        <td>{sale.customer?.name || t('sales.walkIn')}</td>
                        <td className="text-slate-500">{sale.employee?.name}</td>
                        <td className="text-slate-500">{formatDate(sale.date)}</td>
                        <td className="text-right font-semibold">{formatMoney(sale.total)}</td>
                        <td className="text-right text-emerald-600">{formatMoney(sale.paidAmount)}</td>
                        <td className={`text-right ${sale.dueAmount ? 'text-rose-600' : 'text-slate-400'}`}>
                          {formatMoney(sale.dueAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <h2 className="section-title">{t('daily.expenseList')}</h2>
                <span className="badge-slate">{data.expenses.length}</span>
              </div>
              {data.expenses.length === 0 ? (
                <EmptyState icon={Banknote} title={t('expenses.empty')} />
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.expenses.map((expense) => (
                    <div key={expense._id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{expense.title}</p>
                        <p className="text-[11px] text-slate-400">
                          {expense.category} • {expense.employee?.name}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-rose-600">{formatMoney(expense.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <h2 className="section-title">{t('daily.stockList')}</h2>
                <span className="badge-slate">{data.stockEntries.length}</span>
              </div>
              {data.stockEntries.length === 0 ? (
                <EmptyState icon={Package} title={t('stock.noEntries')} />
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.stockEntries.map((entry) => (
                    <div key={entry._id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{entry.productName}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatNumber(entry.quantity)} × {formatMoney(entry.unitCost)} • {entry.supplier || 'Supplier'}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{formatMoney(entry.totalCost)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(data.date)}
          </div>
        </>
      )}
    </div>
  );
}
