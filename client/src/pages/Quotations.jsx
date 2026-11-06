import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, FileSpreadsheet, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDate, formatMoney } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, SkeletonRows } from '../components/States';

export default function Quotations() {
  const { t } = useI18n();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [confirm, setConfirm] = useState({ open: false, quotation: null, loading: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quotations', {
        params: { limit: 100, search: filters.search || undefined, status: filters.status || undefined },
      });
      setQuotations(data.quotations);
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

  const handleDelete = async () => {
    setConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await api.delete(`/quotations/${confirm.quotation._id}`);
      toast.success(t('quotations.deleted'));
      setConfirm({ open: false, quotation: null, loading: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('quotations.title')}
        subtitle={t('quotations.subtitle')}
        actions={
          <Link to="/quotations/new" className="btn-primary">
            <Plus className="h-4 w-4" />
            {t('quotations.create')}
          </Link>
        }
      />

      <div className="card">
        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('quotations.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <select
            className="select"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">{t('quotations.allStatus')}</option>
            {['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
              <option key={status} value={status}>
                {t(`quotations.${status}`)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title={t('quotations.noQuotations')}
            action={
              <Link to="/quotations/new" className="btn-primary btn-sm">
                <Plus className="h-4 w-4" />
                {t('quotations.create')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table min-w-[860px]">
                <thead>
                  <tr>
                    <th>{t('quotations.quotationNo')}</th>
                    <th>{t('quotations.customer')}</th>
                    <th>{t('quotations.validUntil')}</th>
                    <th className="text-right">{t('quotations.total')}</th>
                    <th>{t('quotations.statusLabel')}</th>
                    <th className="text-right">{t('quotations.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation) => (
                    <tr key={quotation._id}>
                      <td>
                        <Link to={`/quotations/${quotation._id}`} className="font-semibold text-brand-700 hover:underline">
                          {quotation.quotationNo}
                        </Link>
                        <p className="text-[10px] text-slate-400">{formatDate(quotation.createdAt)}</p>
                      </td>
                      <td>
                        <p className="font-medium text-slate-700">{quotation.customer?.name}</p>
                        <p className="text-[11px] text-slate-400">{quotation.customer?.phone || '-'}</p>
                      </td>
                      <td className="text-slate-500">{quotation.validUntil ? formatDate(quotation.validUntil) : '-'}</td>
                      <td className="text-right font-bold text-slate-900">{formatMoney(quotation.total)}</td>
                      <td>
                        <StatusBadge status={quotation.status} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/quotations/${quotation._id}/edit`} className="icon-btn" title={t('common.edit')}>
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn text-rose-500 hover:bg-rose-50"
                            onClick={() => setConfirm({ open: true, quotation, loading: false })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {quotations.map((quotation) => (
                <div key={quotation._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/quotations/${quotation._id}`} className="text-sm font-bold text-brand-700">
                        {quotation.quotationNo}
                      </Link>
                      <p className="text-xs text-slate-500">{quotation.customer?.name}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(quotation.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900">{formatMoney(quotation.total)}</p>
                      <StatusBadge status={quotation.status} />
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <Link to={`/quotations/${quotation._id}/edit`} className="btn-secondary btn-sm">
                      <Edit3 className="h-3.5 w-3.5" />
                      {t('common.edit')}
                    </Link>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => setConfirm({ open: true, quotation, loading: false })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, quotation: null, loading: false })}
        onConfirm={handleDelete}
        loading={confirm.loading}
        title={t('common.delete')}
        message={t('quotations.confirmDelete')}
      />
    </div>
  );
}
