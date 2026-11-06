import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { SHOP } from '../config';
import { formatDate, formatMoney, paymentLabel } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { PageLoader } from '../components/States';

export default function InvoiceView() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [payment, setPayment] = useState({ open: false, amount: '', method: 'cash', saving: false });
  const documentRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get(`/sales/${id}`);
      setSale(data.sale);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownload = async () => {
    if (!documentRef.current || !sale) return;
    setDownloading(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${sale.invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(documentRef.current)
        .save();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  const handlePayment = async () => {
    setPayment((prev) => ({ ...prev, saving: true }));
    try {
      await api.post(`/sales/${id}/payments`, {
        amount: Number(payment.amount),
        paymentMethod: payment.method,
      });
      toast.success(t('sales.paymentCollected'));
      setPayment({ open: false, amount: '', method: 'cash', saving: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setPayment((prev) => ({ ...prev, saving: false }));
    }
  };

  if (loading) return <PageLoader />;
  if (!sale) return null;

  const paymentStatus =
    sale.status === 'void' ? 'void' : sale.dueAmount <= 0 ? 'paid' : sale.paidAmount > 0 ? 'partial' : 'unpaid';

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`${t('invoices.invoice')} ${sale.invoiceNo}`}
          subtitle={sale.customer?.name}
          actions={
            <>
              <Link to={isAdmin ? '/invoices' : '/employee'} className="btn-secondary">
                <ArrowLeft className="h-4 w-4" />
                {isAdmin ? t('invoices.backToInvoices') : t('common.back')}
              </Link>
              {isAdmin && sale.dueAmount > 0 && sale.status === 'completed' && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPayment({ open: true, amount: sale.dueAmount, method: 'cash', saving: false })}
                >
                  <CreditCard className="h-4 w-4" />
                  {t('sales.collectPayment')}
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('invoices.print')}
              </button>
              <button type="button" className="btn-primary" onClick={handleDownload} disabled={downloading}>
                <Download className="h-4 w-4" />
                {downloading ? t('common.loading') : t('invoices.downloadPdf')}
              </button>
            </>
          }
        />
      </div>

      {sale.status === 'void' && (
        <div className="no-print mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {t('sales.statusVoid')}
        </div>
      )}

      <div
        ref={documentRef}
        className="print-area mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-500 via-brand-600 to-teal-700" />
        <div className="p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-teal-700 text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                  <path
                    d="M12 3c-1.2 2.2-3.4 3-5.5 3.4C5.2 6.6 5 8.1 5 9.5 5 15.3 8.1 20 12 21c3.9-1 7-5.7 7-11.5 0-1.4-.2-2.9-1.5-3.1C15.4 6 13.2 5.2 12 3Z"
                    fill="currentColor"
                  />
                  <path d="M12 7v13" stroke="#065f46" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{SHOP.name}</h1>
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-600">{SHOP.legalName}</p>
                <div className="mt-2 space-y-0.5 break-words text-[11px] text-slate-500">
                  <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {SHOP.address}</p>
                  <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" /> {SHOP.phone}</p>
                  <p className="flex items-center gap-1.5"><Mail className="h-3 w-3 shrink-0" /> {SHOP.email}</p>
                </div>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">{t('invoices.invoice')}</p>
              <p className="mt-1 text-sm font-bold text-brand-600">{sale.invoiceNo}</p>
              <span
                className={`badge mt-2 ${
                  paymentStatus === 'paid'
                    ? 'badge-green'
                    : paymentStatus === 'void'
                    ? 'badge-red'
                    : paymentStatus === 'partial'
                    ? 'badge-amber'
                    : 'badge-slate'
                }`}
              >
                {t(
                  paymentStatus === 'paid'
                    ? 'invoices.paidStatus'
                    : paymentStatus === 'partial'
                    ? 'invoices.partialStatus'
                    : paymentStatus === 'unpaid'
                    ? 'invoices.unpaidStatus'
                    : 'sales.statusVoid'
                )}
              </span>
              <div className="mt-3 space-y-0.5 text-[11px] text-slate-500">
                <p>
                  {t('invoices.invoiceDate')}: <strong className="text-slate-700">{formatDate(sale.date)}</strong>
                </p>
                <p>
                  {t('invoices.paymentMethod')}: <strong className="text-slate-700">{paymentLabel(sale.paymentMethod)}</strong>
                </p>
                <p>
                  {t('invoices.soldBy')}: <strong className="text-slate-700">{sale.employee?.name || '-'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <Building2 className="h-3 w-3" />
                {t('invoices.billTo')}
              </p>
              <p className="mt-1.5 text-base font-bold text-slate-900">{sale.customer?.name || t('sales.walkIn')}</p>
              {sale.customer?.phone && <p className="text-xs text-slate-500">{sale.customer.phone}</p>}
              {sale.customer?.address && <p className="text-xs text-slate-500">{sale.customer.address}</p>}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('common.details')}</p>
              <div className="mt-1.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('sales.itemCount')}</span>
                  <span className="font-semibold text-slate-700">{sale.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('common.employee')}</span>
                  <span className="font-semibold text-slate-700">{sale.employee?.name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('invoices.total')}</span>
                  <span className="font-semibold text-slate-700">{formatMoney(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="bg-ink-900 text-white">
                  <th className="hidden px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider sm:table-cell sm:px-4 sm:py-3">#</th>
                  <th className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('invoices.item')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('invoices.price')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('invoices.qty')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('invoices.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, index) => (
                  <tr key={item._id || index} className="border-b border-slate-100 last:border-0">
                    <td className="hidden px-2 py-2.5 text-xs text-slate-400 sm:table-cell sm:px-4 sm:py-3">{index + 1}</td>
                    <td className="px-2 py-2.5 sm:px-4 sm:py-3">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-[10px] text-slate-400">{item.sku}</p>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right text-slate-600 sm:px-4 sm:py-3">{formatMoney(item.unitPrice)}</td>
                    <td className="px-2 py-2.5 text-right text-slate-600 sm:px-4 sm:py-3">{item.quantity}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-right font-semibold text-slate-800 sm:px-4 sm:py-3">{formatMoney(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="text-xs text-slate-500">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('invoices.terms')}</p>
              <p className="mt-1.5 leading-relaxed">{sale.note || t('invoices.invoiceNote')}</p>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Wallet className="h-3.5 w-3.5" />
                {t('invoices.paymentMethod')}: {paymentLabel(sale.paymentMethod)}
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('invoices.subtotal')}</span>
                <span className="font-semibold text-slate-800">{formatMoney(sale.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('invoices.discount')}</span>
                <span className="font-semibold text-slate-800">-{formatMoney(sale.discount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-bold text-slate-700">{t('invoices.totalLabel')}</span>
                <span className="text-lg font-extrabold text-slate-900">{formatMoney(sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('invoices.paidLabel')}</span>
                <span className="font-semibold text-emerald-600">{formatMoney(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('invoices.dueLabel')}</span>
                <span className={`font-bold ${sale.dueAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {formatMoney(sale.dueAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-6 border-t border-dashed border-slate-200 pt-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-brand-700">{t('invoices.thanks')}</p>
              <p className="mt-1 text-[11px] text-slate-400">{SHOP.website}</p>
            </div>
            <div className="text-center sm:text-right">
              <div className="mx-auto h-10 w-40 border-b border-slate-300 sm:ml-auto" />
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t('invoices.signature')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={payment.open}
        onClose={() => setPayment({ open: false, amount: '', method: 'cash', saving: false })}
        title={t('sales.collectPayment')}
        subtitle={sale.invoiceNo}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPayment({ open: false, amount: '', method: 'cash', saving: false })}
            >
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-primary" onClick={handlePayment} disabled={payment.saving}>
              {payment.saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">{t('invoices.due')}</span>
            <span className="font-bold text-rose-600">{formatMoney(sale.dueAmount)}</span>
          </div>
          <div>
            <label className="label">{t('common.amount')}</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={sale.dueAmount}
              className="input"
              value={payment.amount}
              onChange={(e) => setPayment((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">{t('common.method')}</label>
            <div className="input flex items-center font-semibold text-slate-600">{paymentLabel('cash')}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
