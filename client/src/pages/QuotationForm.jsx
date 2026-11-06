import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { dateInput, formatMoney } from '../lib/format';
import PageHeader from '../components/PageHeader';
import { PageLoader } from '../components/States';

const blankRow = () => ({
  key: `${Date.now()}-${Math.random()}`,
  product: '',
  name: '',
  sku: '',
  quantity: 1,
  unitPrice: '',
});

const futureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return dateInput(date);
};

export default function QuotationForm() {
  const { id } = useParams();
  const navigating = Boolean(id);
  const { t } = useI18n();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(navigating);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer: { name: '', phone: '', email: '', address: '' },
    items: [blankRow()],
    discount: '',
    validUntil: futureDate(),
    note: '',
    terms: 'Prices are valid until the stated date. Delivery subject to stock availability.',
    status: 'draft',
  });

  useEffect(() => {
    api
      .get('/products', { params: { limit: 500 } })
      .then(({ data }) => setProducts(data.products))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/quotations/${id}`)
      .then(({ data }) => {
        const quotation = data.quotation;
        setForm({
          customer: {
            name: quotation.customer?.name || '',
            phone: quotation.customer?.phone || '',
            email: quotation.customer?.email || '',
            address: quotation.customer?.address || '',
          },
          items: quotation.items.map((item) => ({
            key: item._id,
            product: item.product || '',
            name: item.name,
            sku: item.sku || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          discount: quotation.discount || '',
          validUntil: quotation.validUntil ? quotation.validUntil.slice(0, 10) : futureDate(),
          note: quotation.note || '',
          terms: quotation.terms || '',
          status: quotation.status || 'draft',
        });
      })
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [id]);

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0),
    [form.items]
  );
  const discount = Math.min(Math.max(Number(form.discount) || 0, 0), subtotal);
  const total = Math.max(subtotal - discount, 0);

  const updateCustomer = (key, value) =>
    setForm((prev) => ({ ...prev, customer: { ...prev.customer, [key]: value } }));

  const updateItem = (key, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    }));
  };

  const selectProduct = (key, productId) => {
    const product = products.find((p) => p._id === productId);
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.key === key
          ? {
              ...item,
              product: productId,
              name: product ? product.name : '',
              sku: product ? product.sku : '',
              unitPrice: product ? product.sellPrice : item.unitPrice,
            }
          : item
      ),
    }));
  };

  const addRow = () => setForm((prev) => ({ ...prev, items: [...prev.items, blankRow()] }));
  const removeRow = (key) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.key !== key) : prev.items,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.customer.name.trim()) {
      toast.error(t('quotations.customerName'));
      return;
    }
    if (form.items.some((item) => !item.name.trim())) {
      toast.error(t('quotations.itemName'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        customer: form.customer,
        items: form.items.map((item) => ({
          product: item.product || undefined,
          name: item.name,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        discount,
        validUntil: form.validUntil || undefined,
        note: form.note,
        terms: form.terms,
        status: form.status,
      };
      const { data } = navigating
        ? await api.put(`/quotations/${id}`, payload)
        : await api.post('/quotations', payload);
      toast.success(navigating ? t('quotations.updated') : t('quotations.created'));
      navigate(`/quotations/${data.quotation._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title={navigating ? t('quotations.edit') : t('quotations.newQuotation')}
        subtitle={t('quotations.subtitle')}
        actions={
          <button type="button" className="btn-secondary" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="h-4 w-4" />
            {t('quotations.back')}
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="card card-pad">
            <h2 className="section-title mb-3">{t('quotations.customerInfo')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('quotations.customerName')}</label>
                <input
                  className="input"
                  value={form.customer.name}
                  onChange={(e) => updateCustomer('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">{t('quotations.customerPhone')}</label>
                <input className="input" value={form.customer.phone} onChange={(e) => updateCustomer('phone', e.target.value)} />
              </div>
              <div>
                <label className="label">{t('quotations.customerEmail')}</label>
                <input
                  type="email"
                  className="input"
                  value={form.customer.email}
                  onChange={(e) => updateCustomer('email', e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('quotations.customerAddress')}</label>
                <input
                  className="input"
                  value={form.customer.address}
                  onChange={(e) => updateCustomer('address', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <h2 className="section-title">{t('quotations.items')}</h2>
              <button type="button" className="btn-secondary btn-sm" onClick={addRow}>
                <Plus className="h-3.5 w-3.5" />
                {t('quotations.addItem')}
              </button>
            </div>
            <div className="space-y-3 p-4">
              {form.items.map((item, index) => (
                <div key={item.key} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t('quotations.itemName')} {index + 1}
                    </span>
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => removeRow(item.key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select className="select" value={item.product} onChange={(e) => selectProduct(item.key, e.target.value)}>
                      <option value="">{t('quotations.itemName')} (custom)</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.stockQty} {product.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder={t('quotations.itemName')}
                      value={item.name}
                      onChange={(e) => updateItem(item.key, 'name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="label">{t('quotations.qty')}</label>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.key, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">{t('quotations.price')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.key, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="input flex items-center justify-between bg-slate-50 text-sm font-bold text-slate-800">
                        <span className="text-[10px] font-medium text-slate-400">{t('quotations.lineTotal')}</span>
                        {formatMoney((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-pad grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">{t('quotations.note')}</label>
              <textarea className="textarea" rows={4} value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} />
            </div>
            <div>
              <label className="label">{t('quotations.terms')}</label>
              <textarea className="textarea" rows={4} value={form.terms} onChange={(e) => setForm((prev) => ({ ...prev, terms: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card card-pad space-y-3">
            <h2 className="section-title">{t('quotations.total')}</h2>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t('quotations.subtotal')}</span>
              <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
            </div>
            <div>
              <label className="label">{t('quotations.discount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={form.discount}
                onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="font-bold text-slate-700">{t('quotations.grandTotal')}</span>
              <span className="text-xl font-extrabold text-brand-700">{formatMoney(total)}</span>
            </div>
          </div>

          <div className="card card-pad space-y-3">
            <div>
              <label className="label">{t('quotations.validity')}</label>
              <input
                type="date"
                className="input"
                value={form.validUntil}
                onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">{t('quotations.statusLabel')}</label>
              <select className="select" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                {['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
                  <option key={status} value={status}>
                    {t(`quotations.${status}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('quotations.saveQuotation')}
          </button>
        </div>
      </form>
    </div>
  );
}
