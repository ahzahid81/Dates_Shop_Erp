import { useEffect, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { downloadBlob, formatDate, formatMoney, todayInput, startOfMonthInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { EmptyState, PageLoader } from '../components/States';

const categoryClass = {
  Sale: 'badge-green',
  Expense: 'badge-red',
  'Stock Purchase': 'badge-amber',
  'Cash Adjustment': 'badge-blue',
};

export default function Statements() {
  const { t } = useI18n();
  const [filters, setFilters] = useState({ from: startOfMonthInput(), to: todayInput(), type: 'all' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async (current = filters) => {
    setLoading(true);
    try {
      const { data: payload } = await api.get('/summary/statement', {
        params: {
          from: current.from || undefined,
          to: current.to || undefined,
          type: current.type || 'all',
        },
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

  const setFilter = (key) => (event) => setFilters((prev) => ({ ...prev, [key]: event.target.value }));

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/summary/statement', {
        params: {
          from: filters.from || undefined,
          to: filters.to || undefined,
          type: filters.type || 'all',
          format: 'csv',
        },
        responseType: 'blob',
      });
      downloadBlob(response.data, `statement-${filters.from || 'start'}-${filters.to || 'today'}.csv`);
      toast.success('CSV exported');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="print-area">
      <PageHeader
        title={t('statements.title')}
        subtitle={t('statements.subtitle')}
        actions={
          <>
            <button type="button" className="btn-secondary no-print" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" />
              {exporting ? t('common.loading') : t('statements.exportCsv')}
            </button>
            <button type="button" className="btn-secondary no-print" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {t('statements.print')}
            </button>
          </>
        }
      />

      <div className="card mb-4 grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">{t('statements.from')}</label>
          <input type="date" className="input" value={filters.from} onChange={setFilter('from')} />
        </div>
        <div>
          <label className="label">{t('statements.to')}</label>
          <input type="date" className="input" value={filters.to} onChange={setFilter('to')} />
        </div>
        <div>
          <label className="label">{t('statements.type')}</label>
          <select className="select" value={filters.type} onChange={setFilter('type')}>
            <option value="all">{t('statements.allTypes')}</option>
            <option value="sales">{t('statements.sales')}</option>
            <option value="expenses">{t('statements.expenses')}</option>
            <option value="stock">{t('statements.stock')}</option>
            <option value="adjustments">{t('statements.adjustments')}</option>
          </select>
        </div>
        <div className="flex items-end sm:col-span-2">
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => load()}>
            <Search className="h-4 w-4" />
            {t('common.filter')}
          </button>
        </div>
      </div>

      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label={t('statements.income')} value={formatMoney(data.totals.income)} icon={ArrowDownLeft} tone="emerald" />
            <StatCard label={t('statements.totalExpense')} value={formatMoney(data.totals.expense)} icon={ArrowUpRight} tone="rose" />
            <StatCard label={t('statements.net')} value={formatMoney(data.totals.net)} icon={Wallet} tone="brand" />
            <StatCard label={t('statements.transactions')} value={data.totals.count} icon={ClipboardList} tone="amber" />
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-brand-600" />
                <h2 className="section-title">{t('statements.transactions')}</h2>
              </div>
              <span className="badge-slate">{data.totals.count} {t('statements.recordCount')}</span>
            </div>
            {data.rows.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t('statements.noData')} />
            ) : (
              <>
                <div className="table-wrap hidden md:block">
                  <table className="table min-w-[820px]">
                    <thead>
                      <tr>
                        <th>{t('common.date')}</th>
                        <th>{t('common.category')}</th>
                        <th>{t('statements.reference')}</th>
                        <th>{t('statements.description')}</th>
                        <th>{t('statements.employee')}</th>
                        <th className="text-right">{t('common.amount')}</th>
                        <th className="text-right">{t('statements.direction')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row, index) => (
                        <tr key={`${row.category}-${row._id}-${index}`}>
                          <td className="whitespace-nowrap text-slate-500">{formatDate(row.date)}</td>
                          <td>
                            <span className={categoryClass[row.category] || 'badge-slate'}>{row.category}</span>
                          </td>
                          <td className="text-slate-600">{row.reference || '-'}</td>
                          <td className="max-w-[240px] truncate text-slate-600">{row.description}</td>
                          <td className="text-slate-500">{row.employee}</td>
                          <td className={`text-right font-bold ${row.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.direction === 'in' ? '+' : '-'}
                            {formatMoney(row.amount)}
                          </td>
                          <td className="text-right">
                            <span className={row.direction === 'in' ? 'badge-green' : 'badge-red'}>
                              {row.direction === 'in' ? t('statements.in') : t('statements.out')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50">
                        <td colSpan={5} className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                          {t('statements.net')}
                        </td>
                        <td
                          className={`px-4 py-3 text-right text-sm font-extrabold ${
                            data.totals.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatMoney(data.totals.net)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="divide-y divide-slate-100 md:hidden">
                  {data.rows.map((row, index) => (
                    <div key={`${row.category}-${row._id}-${index}`} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className={categoryClass[row.category] || 'badge-slate'}>{row.category}</span>
                          <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">{row.description}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(row.date)} • {row.reference} • {row.employee}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${row.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {row.direction === 'in' ? '+' : '-'}
                          {formatMoney(row.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
