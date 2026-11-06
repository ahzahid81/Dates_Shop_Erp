import { useEffect, useState } from 'react';
import { Activity, Search, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDateTime } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { EmptyState, SkeletonRows } from '../components/States';

const ACTIONS = [
  'LOGIN',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'PASSWORD_CHANGE',
  'SALE_CREATE',
  'PAYMENT_COLLECT',
  'SALE_VOID',
  'STOCK_IN',
  'EXPENSE_CREATE',
  'EXPENSE_DELETE',
  'CASH_ADJUST',
  'QUOTATION_CREATE',
  'QUOTATION_UPDATE',
  'QUOTATION_DELETE',
];

const ENTITIES = ['Auth', 'User', 'Product', 'Sale', 'StockEntry', 'Expense', 'CashTransaction', 'Quotation'];

const actionTone = (action) => {
  if (action.includes('DELETE') || action.includes('VOID')) return 'badge-red';
  if (action.includes('CREATE') || action === 'STOCK_IN' || action === 'LOGIN') return 'badge-green';
  if (action.includes('UPDATE') || action === 'CASH_ADJUST') return 'badge-amber';
  return 'badge-blue';
};

const entityLabel = (entity) => entity?.replace(/([a-z])([A-Z])/g, '$1 $2');

export default function AuditLogs() {
  const { t } = useI18n();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ search: '', action: '', entity: '', from: '', to: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit-logs', {
        params: {
          page,
          limit: 30,
          search: filters.search || undefined,
          action: filters.action || undefined,
          entity: filters.entity || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
        },
      });
      setLogs(data.logs);
      setPages(data.pages);
      setTotal(data.total);
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
  }, [page, filters]);

  const setFilter = (key) => (event) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const reset = () => {
    setPage(1);
    setFilters({ search: '', action: '', entity: '', from: '', to: '' });
  };

  return (
    <div>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle')} />

      <div className="card">
        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('audit.searchPlaceholder')}
              value={filters.search}
              onChange={setFilter('search')}
            />
          </div>
          <select className="select" value={filters.action} onChange={setFilter('action')}>
            <option value="">{t('audit.allActions')}</option>
            {ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select className="select" value={filters.entity} onChange={setFilter('entity')}>
            <option value="">{t('audit.entity')}</option>
            {ENTITIES.map((entity) => (
              <option key={entity} value={entity}>
                {entityLabel(entity)}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondary" onClick={reset}>
            {t('common.reset')}
          </button>
          <div className="sm:col-span-2 xl:col-span-2">
            <input type="date" className="input" value={filters.from} onChange={setFilter('from')} />
          </div>
          <div className="sm:col-span-2 xl:col-span-2">
            <input type="date" className="input" value={filters.to} onChange={setFilter('to')} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">{t('audit.title')}</p>
              <p className="text-[11px] text-slate-400">
                {total} {t('common.records')}
              </p>
            </div>
          </div>
          <span className="badge-slate">
            <Activity className="h-3 w-3" />
            {filters.action || t('audit.allActions')}
          </span>
        </div>

        {loading ? (
          <SkeletonRows rows={8} />
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t('audit.noLogs')} />
        ) : (
          <>
            <div className="table-wrap hidden lg:block">
              <table className="table min-w-[980px]">
                <thead>
                  <tr>
                    <th>{t('audit.time')}</th>
                    <th>{t('audit.user')}</th>
                    <th>{t('audit.action')}</th>
                    <th>{t('audit.entity')}</th>
                    <th>{t('audit.description')}</th>
                    <th>{t('audit.ip')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="whitespace-nowrap text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                      <td>
                        <p className="font-semibold text-slate-800">{log.user?.name || log.userName || '-'}</p>
                        <p className="text-[10px] capitalize text-slate-400">{log.role || log.user?.role || '-'}</p>
                      </td>
                      <td>
                        <span className={actionTone(log.action)}>{log.action.replace(/_/g, ' ')}</span>
                      </td>
                      <td>
                        <span className="text-xs font-medium text-slate-600">{entityLabel(log.entity)}</span>
                      </td>
                      <td className="max-w-sm text-xs text-slate-500">{log.description || '-'}</td>
                      <td className="text-[11px] text-slate-400">{log.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {logs.map((log) => (
                <div key={log._id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{log.user?.name || log.userName || '-'}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <span className={actionTone(log.action)}>{log.action.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{log.description || '-'}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{entityLabel(log.entity)}</span>
                    <span>{log.ip || '-'}</span>
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={page} pages={pages} onPage={setPage} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
