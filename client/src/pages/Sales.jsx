import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  CreditCard,
  FileText,
  Search,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDateTime, formatMoney, startOfMonthInput, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { EmptyState, SkeletonRows } from '../components/States';

export default function Sales() {
  const { t } = useI18n();
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    from: startOfMonthInput(),
    to: todayInput(),
    status: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [paymentModal, setPaymentModal] = useState({ open: false, sale: null, amount: '', method: 'cash', saving: false });
  const [voidModal, setVoidModal] = useState({ open: false, sale: null, loading: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', {
        params: {
          page,
          limit: 20,
          from: filters.from || undefined,
          to: filters.to || undefined,
          status: filters.status || undefined,
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

  const openPayment = (sale) => {
    setPaymentModal({ open: true, sale, amount: sale.dueAmount, method: 'cash', saving: false });
  };

  const handlePayment = async () => {
    setPaymentModal((prev) => ({ ...prev, saving: true }));
    try {
      await api.post(`/sales/${paymentModal.sale._id}/payments`, {
        amount: Number(paymentModal.amount),
        paymentMethod: paymentModal.method,
      });
      toast.success(t('sales.paymentCollected'));
      setPaymentModal({ open: false, sale: null, amount: '', method: 'cash', saving: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setPaymentModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleVoid = async () => {
    setVoidModal((prev) => ({ ...prev, loading: true }));
    try {
      await api.post(`/sales/${voidModal.sale._id}/void`);
      toast.success(t('sales.saleVoided'));
      setVoidModal({ open: false, sale: null, loading: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setVoidModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('sales.title')}
        subtitle={t('sales.subtitle')}
        actions={
          <Link to="/sales/new" className="btn-primary">
            <ShoppingBag className="h-4 w-4" />
            {t('sales.newSale')}
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('sales.summary')} value={formatMoney(summary?.sales || 0)} icon={ShoppingBag} tone="brand" hint={`${summary?.count || 0} ${t('daily.transactions')}`} />
        <StatCard label={t('invoices.paid')} value={formatMoney(summary?.paid || 0)} icon={Wallet} tone="emerald" />
        <StatCard label={t('sales.outstanding')} value={formatMoney(summary?.due || 0)} icon={CreditCard} tone="amber" />
        <StatCard label={t('common.profit')} value={formatMoney(summary?.profit || 0)} icon={TrendingUp} tone="violet" />
      </div>

      <div className="card">
        <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <select className="select" value={filters.status} onChange={setFilter('status')}>
            <option value="">{t('sales.allStatus')}</option>
            <option value="completed">{t('sales.statusCompleted')}</option>
            <option value="void">{t('sales.statusVoid')}</option>
          </select>
        </div>

        {loading ? (
          <SkeletonRows rows={8} />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t('sales.noSales')}
            action={
              <Link to="/sales/new" className="btn-primary btn-sm">
                {t('sales.newSale')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="table-wrap hidden lg:block">
              <table className="table min-w-[900px]">
                <thead>
                  <tr>
                    <th>{t('sales.invoiceNo')}</th>
                    <th>{t('common.customer')}</th>
                    <th>{t('common.employee')}</th>
                    <th>{t('common.date')}</th>
                    <th className="text-right">{t('common.total')}</th>
                    <th className="text-right">{t('invoices.paid')}</th>
                    <th className="text-right">{t('invoices.due')}</th>
                    <th>{t('common.status')}</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>
                        <Link to={`/invoices/${sale._id}`} className="font-semibold text-brand-700 hover:underline">
                          {sale.invoiceNo}
                        </Link>
                        <p className="text-[10px] capitalize text-slate-400">{paymentLabel(sale.paymentMethod)}</p>
                      </td>
                      <td>
                        <p className="font-medium text-slate-700">{sale.customer?.name || t('sales.walkIn')}</p>
                        <p className="text-[11px] text-slate-400">{sale.customer?.phone || '-'}</p>
                      </td>
                      <td className="text-slate-500">{sale.employee?.name || '-'}</td>
                      <td className="whitespace-nowrap text-slate-500">{formatDateTime(sale.date)}</td>
                      <td className="text-right font-bold text-slate-900">{formatMoney(sale.total)}</td>
                      <td className="text-right text-emerald-600">{formatMoney(sale.paidAmount)}</td>
                      <td className={`text-right ${sale.dueAmount > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}`}>
                        {formatMoney(sale.dueAmount)}
                      </td>
                      <td>
                        <StatusBadge status={sale.status} />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/invoices/${sale._id}`} className="icon-btn" title={t('sales.viewInvoice')}>
                            <FileText className="h-4 w-4" />
                          </Link>
                          {sale.status === 'completed' && sale.dueAmount > 0 && (
                            <button
                              type="button"
                              className="icon-btn text-emerald-600 hover:bg-emerald-50"
                              onClick={() => openPayment(sale)}
                              title={t('sales.collectPayment')}
                            >
                              <Banknote className="h-4 w-4" />
                            </button>
                          )}
                          {sale.status === 'completed' && (
                            <button
                              type="button"
                              className="icon-btn text-rose-500 hover:bg-rose-50"
                              onClick={() => setVoidModal({ open: true, sale, loading: false })}
                              title={t('sales.void')}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {sales.map((sale) => (
                <div key={sale._id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/invoices/${sale._id}`} className="text-sm font-bold text-brand-700">
                        {sale.invoiceNo}
                      </Link>
                      <p className="text-xs text-slate-500">{sale.customer?.name || t('sales.walkIn')}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(sale.date)} • {sale.employee?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-slate-900">{formatMoney(sale.total)}</p>
                      <StatusBadge status={sale.status} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{t('invoices.paid')}: {formatMoney(sale.paidAmount)}</span>
                    {sale.dueAmount > 0 && <span className="text-rose-600">{t('invoices.due')}: {formatMoney(sale.dueAmount)}</span>}
                    <div className="ml-auto flex gap-1">
                      {sale.status === 'completed' && sale.dueAmount > 0 && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => openPayment(sale)}>
                          {t('sales.payment')}
                        </button>
                      )}
                      <Link to={`/invoices/${sale._id}`} className="btn-secondary btn-sm">
                        {t('common.view')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </div>

      <Modal
        open={paymentModal.open}
        onClose={() => setPaymentModal({ open: false, sale: null, amount: '', method: 'cash', saving: false })}
        title={t('sales.collectPayment')}
        subtitle={paymentModal.sale?.invoiceNo}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPaymentModal({ open: false, sale: null, amount: '', method: 'cash', saving: false })}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={handlePayment} disabled={paymentModal.saving}>
              {paymentModal.saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">{t('invoices.total')}</span>
              <span className="font-semibold">{formatMoney(paymentModal.sale?.total)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">{t('invoices.due')}</span>
              <span className="font-bold text-rose-600">{formatMoney(paymentModal.sale?.dueAmount)}</span>
            </div>
          </div>
          <div>
            <label className="label">{t('common.amount')}</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={paymentModal.sale?.dueAmount}
              className="input"
              value={paymentModal.amount}
              onChange={(e) => setPaymentModal((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">{t('common.method')}</label>
            <div className="input flex items-center font-semibold text-slate-600">Cash</div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={voidModal.open}
        onClose={() => setVoidModal({ open: false, sale: null, loading: false })}
        onConfirm={handleVoid}
        loading={voidModal.loading}
        title={t('sales.void')}
        message={t('sales.confirmVoid')}
      />
    </div>
  );
}
