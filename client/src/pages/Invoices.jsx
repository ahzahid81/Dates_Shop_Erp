import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, FileText, Printer, Search, ShoppingBag, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDate, formatMoney, startOfMonthInput, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import { EmptyState, SkeletonRows } from '../components/States';

const paymentStatus = (sale) => {
  if (sale.status === 'void') return 'void';
  if (sale.dueAmount <= 0) return 'paid';
  if (sale.paidAmount > 0) return 'partial';
  return 'unpaid';
};

export default function Invoices() {
  const { t } = useI18n();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: startOfMonthInput(), to: todayInput(), search: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', {
        params: {
          page,
          limit: 20,
          from: filters.from || undefined,
          to: filters.to || undefined,
          search: filters.search || undefined,
        },
      });
      setSales(data.sales);
      setSummary(data.summary);
      setPages(data.pages);
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
  }, [filters, page]);

  const setFilter = (key) => (event) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
  };

  return (
    <div>
      <PageHeader
        title={t('invoices.title')}
        subtitle={t('invoices.subtitle')}
        actions={
          <Link to="/sales/new" className="btn-primary">
            <ShoppingBag className="h-4 w-4" />
            {t('sales.newSale')}
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('invoices.invoiceNo')} value={summary?.count || 0} icon={FileText} tone="brand" />
        <StatCard label={t('invoices.total')} value={formatMoney(summary?.sales || 0)} icon={Printer} tone="violet" />
        <StatCard label={t('invoices.paid')} value={formatMoney(summary?.paid || 0)} icon={Wallet} tone="emerald" />
        <StatCard label={t('invoices.due')} value={formatMoney(summary?.due || 0)} icon={CreditCard} tone="amber" />
      </div>

      <div className="card">
        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('invoices.searchPlaceholder')}
              value={filters.search}
              onChange={setFilter('search')}
            />
          </div>
          <input type="date" className="input" value={filters.from} onChange={setFilter('from')} />
          <input type="date" className="input" value={filters.to} onChange={setFilter('to')} />
        </div>

        {loading ? (
          <SkeletonRows rows={8} />
        ) : sales.length === 0 ? (
          <EmptyState icon={FileText} title={t('invoices.noInvoices')} />
        ) : (
          <>
            <div className="table-wrap hidden lg:block">
              <table className="table min-w-[820px]">
                <thead>
                  <tr>
                    <th>{t('invoices.invoiceNo')}</th>
                    <th>{t('invoices.customer')}</th>
                    <th>{t('common.employee')}</th>
                    <th>{t('invoices.date')}</th>
                    <th className="text-right">{t('invoices.total')}</th>
                    <th className="text-right">{t('invoices.paid')}</th>
                    <th className="text-right">{t('invoices.due')}</th>
                    <th>{t('common.status')}</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id}>
                      <td className="font-semibold text-slate-800">{sale.invoiceNo}</td>
                      <td>
                        <p className="font-medium text-slate-700">{sale.customer?.name || t('sales.walkIn')}</p>
                        <p className="text-[11px] text-slate-400">{sale.customer?.phone || '-'}</p>
                      </td>
                      <td className="text-slate-500">{sale.employee?.name}</td>
                      <td className="text-slate-500">{formatDate(sale.date)}</td>
                      <td className="text-right font-bold text-slate-900">{formatMoney(sale.total)}</td>
                      <td className="text-right text-emerald-600">{formatMoney(sale.paidAmount)}</td>
                      <td className={`text-right ${sale.dueAmount ? 'text-rose-600' : 'text-slate-400'}`}>
                        {formatMoney(sale.dueAmount)}
                      </td>
                      <td>
                        <StatusBadge status={paymentStatus(sale)} />
                      </td>
                      <td className="text-right">
                        <Link to={`/invoices/${sale._id}`} className="btn-secondary btn-sm">
                          <FileText className="h-3.5 w-3.5" />
                          {t('common.view')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {sales.map((sale) => (
                <div key={sale._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{sale.invoiceNo}</p>
                      <p className="text-xs text-slate-500">{sale.customer?.name || t('sales.walkIn')}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(sale.date)} • {sale.employee?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900">{formatMoney(sale.total)}</p>
                      <StatusBadge status={paymentStatus(sale)} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{t('invoices.due')}: {formatMoney(sale.dueAmount)}</span>
                    <Link to={`/invoices/${sale._id}`} className="btn-secondary btn-sm">
                      {t('common.view')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pages={pages} onPage={setPage} total={summary?.count} />
          </>
        )}
      </div>
    </div>
  );
}
