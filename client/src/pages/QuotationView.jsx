import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Edit3,
  FileSpreadsheet,
  Mail,
  MapPin,
  Phone,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { SHOP } from '../config';
import { formatDate, formatMoney } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { PageLoader } from '../components/States';

export default function QuotationView() {
  const { id } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef(null);

  useEffect(() => {
    api
      .get(`/quotations/${id}`)
      .then(({ data }) => setQuotation(data.quotation))
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatus = async (event) => {
    const status = event.target.value;
    try {
      const { data } = await api.put(`/quotations/${id}`, { status });
      setQuotation(data.quotation);
      toast.success(t('quotations.statusUpdated'));
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDownload = async () => {
    if (!documentRef.current || !quotation) return;
    setDownloading(true);
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: `${quotation.quotationNo}.pdf`,
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

  if (loading) return <PageLoader />;
  if (!quotation) return null;

  return (
    <div>
      <div className="no-print">
        <PageHeader
          title={`${t('quotations.quotation')} ${quotation.quotationNo}`}
          subtitle={quotation.customer?.name}
          actions={
            <>
              <Link to="/quotations" className="btn-secondary">
                <ArrowLeft className="h-4 w-4" />
                {t('quotations.back')}
              </Link>
              <Link to={`/quotations/${quotation._id}/edit`} className="btn-secondary">
                <Edit3 className="h-4 w-4" />
                {t('common.edit')}
              </Link>
              <button type="button" className="btn-secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                {t('quotations.print')}
              </button>
              <button type="button" className="btn-primary" onClick={handleDownload} disabled={downloading}>
                <Download className="h-4 w-4" />
                {downloading ? t('common.loading') : t('quotations.downloadPdf')}
              </button>
            </>
          }
        />
      </div>

      <div className="no-print mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-xs font-semibold text-slate-500">{t('quotations.changeStatus')}</span>
        <select className="select w-auto py-1.5 text-xs" value={quotation.status} onChange={handleStatus}>
          {['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
            <option key={status} value={status}>
              {t(`quotations.${status}`)}
            </option>
          ))}
        </select>
        <StatusBadge status={quotation.status} />
        <span className="ml-auto text-[11px] text-slate-400">{formatDate(quotation.createdAt)}</span>
      </div>

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
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">{t('quotations.quotation')}</p>
              <p className="mt-1 text-sm font-bold text-brand-600">{quotation.quotationNo}</p>
              <div className="mt-1 flex sm:justify-end">
                <StatusBadge status={quotation.status} />
              </div>
              <div className="mt-3 space-y-0.5 text-[11px] text-slate-500">
                <p>
                  {t('common.date')}: <strong className="text-slate-700">{formatDate(quotation.createdAt)}</strong>
                </p>
                <p>
                  {t('quotations.validity')}:{' '}
                  <strong className="text-slate-700">{quotation.validUntil ? formatDate(quotation.validUntil) : '-'}</strong>
                </p>
                <p>
                  {t('quotations.preparedBy')}: <strong className="text-slate-700">{quotation.employee?.name || '-'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('quotations.preparedFor')}</p>
            <p className="mt-1.5 text-base font-bold text-slate-900">{quotation.customer?.name}</p>
            <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-500">
              {quotation.customer?.phone && <span>{quotation.customer.phone}</span>}
              {quotation.customer?.email && <span>{quotation.customer.email}</span>}
              {quotation.customer?.address && <span>{quotation.customer.address}</span>}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="bg-ink-900 text-white">
                  <th className="hidden px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider sm:table-cell sm:px-4 sm:py-3">#</th>
                  <th className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('invoices.item')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('quotations.price')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('quotations.qty')}</th>
                  <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider sm:px-4 sm:py-3">{t('quotations.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
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
            <div className="space-y-3 text-xs text-slate-500">
              {quotation.note && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('quotations.noteTitle')}</p>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">{quotation.note}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('quotations.termsTitle')}</p>
                <p className="mt-1 whitespace-pre-line leading-relaxed">{quotation.terms || t('quotations.quotationNote')}</p>
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('quotations.subtotal')}</span>
                <span className="font-semibold text-slate-800">{formatMoney(quotation.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('quotations.discount')}</span>
                <span className="font-semibold text-slate-800">-{formatMoney(quotation.discount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5">
                <span className="font-bold text-slate-700">{t('quotations.grandTotal')}</span>
                <span className="text-lg font-extrabold text-slate-900">{formatMoney(quotation.total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-6 border-t border-dashed border-slate-200 pt-6 sm:flex-row sm:items-end">
            <div className="flex items-center gap-2 text-brand-700">
              <FileSpreadsheet className="h-4 w-4" />
              <p className="text-sm font-semibold">{t('quotations.quotationNote')}</p>
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

      <div className="no-print mt-4 flex justify-end">
        <button type="button" className="btn-secondary" onClick={() => navigate('/quotations')}>
          <ArrowLeft className="h-4 w-4" />
          {t('quotations.back')}
        </button>
      </div>
    </div>
  );
}
