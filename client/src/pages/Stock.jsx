import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackagePlus, Plus, Search, Truck, Warehouse, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatDate, formatMoney, formatNumber, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { EmptyState, SkeletonRows } from '../components/States';

const INITIAL = {
  product: '',
  quantity: '',
  unitCost: '',
  supplier: '',
  note: '',
  paid: true,
  paymentMethod: 'cash',
  date: todayInput(),
};

export default function Stock() {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [productRes, stockRes] = await Promise.all([
        api.get('/products', { params: { limit: 500 } }),
        api.get('/stock', { params: { limit: 100 } }),
      ]);
      setProducts(productRes.data.products);
      setEntries(stockRes.data.entries);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = products.find((p) => p._id === form.product);
  const totalCost = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);
  const stockAfter = (selected?.stockQty || 0) + (Number(form.quantity) || 0);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const value = products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
    const low = products.filter((p) => p.stockQty <= p.lowStockThreshold).length;
    return { value, low };
  }, [products]);

  const handleSelect = (event) => {
    const productId = event.target.value;
    const product = products.find((p) => p._id === productId);
    setForm((prev) => ({
      ...prev,
      product: productId,
      unitCost: product ? product.costPrice : '',
    }));
  };

  const set = (key) => (event) =>
    setForm((prev) => ({
      ...prev,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.product) {
      toast.error(t('stock.selectProduct'));
      return;
    }
    setSaving(true);
    try {
      await api.post('/stock', {
        ...form,
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
      });
      toast.success(t('stock.added'));
      setForm({ ...INITIAL, date: todayInput() });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('stock.title')} subtitle={t('stock.subtitle')} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t('stock.totalProducts')} value={formatNumber(products.length)} icon={Boxes} tone="brand" />
        <StatCard label={t('stock.stockValue')} value={formatMoney(stats.value)} icon={Wallet} tone="emerald" />
        <StatCard label={t('stock.lowStockCount')} value={formatNumber(stats.low)} icon={Warehouse} tone="amber" />
        <StatCard
          label={t('stock.recentPurchases')}
          value={formatMoney(entries.reduce((sum, e) => sum + e.totalCost, 0))}
          icon={Truck}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="card card-pad xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <PackagePlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="section-title">{t('stock.addStock')}</h2>
              <p className="text-[11px] text-slate-400">{t('stock.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="label">{t('stock.selectProduct')}</label>
              <select className="select" value={form.product} onChange={handleSelect} required>
                <option value="">{t('sales.selectProductPlaceholder')}</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} ({product.stockQty} {product.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('stock.quantity')}</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={form.quantity}
                  onChange={set('quantity')}
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="label">{t('stock.unitCost')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={form.unitCost}
                  onChange={set('unitCost')}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t('stock.supplier')}</label>
                <input className="input" value={form.supplier} onChange={set('supplier')} />
              </div>
              <div>
                <label className="label">{t('stock.date')}</label>
                <input type="date" className="input" value={form.date} onChange={set('date')} />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t('stock.totalCost')}</span>
                <span className="text-base font-extrabold text-slate-900">{formatMoney(totalCost)}</span>
              </div>
              {selected && (
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {t('stock.stockAfter')}: <strong className="text-slate-700">{formatNumber(stockAfter)} {selected.unit}</strong>
                  </span>
                  <span>
                    {t('stock.currentStock')}: {formatNumber(selected.stockQty)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={form.paid}
                  onChange={set('paid')}
                />
                {t('stock.payNow')}
              </label>
              <span className="badge-slate">Cash</span>
            </div>

            <div>
              <label className="label">
                {t('stock.note')} <span className="font-normal normal-case text-slate-400">({t('common.optional')})</span>
              </label>
              <input className="input" value={form.note} onChange={set('note')} />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving || !form.product}>
              <Plus className="h-4 w-4" />
              {saving ? t('common.saving') : t('stock.addStock')}
            </button>
          </form>
        </div>

        <div className="card xl:col-span-3">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-title">{t('stock.entries')}</h2>
            <span className="badge-slate">{entries.length} {t('common.records')}</span>
          </div>
          {loading ? (
            <SkeletonRows rows={6} />
          ) : entries.length === 0 ? (
            <EmptyState icon={Truck} title={t('stock.noEntries')} />
          ) : (
            <>
              <div className="table-wrap hidden md:block">
                <table className="table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>{t('common.date')}</th>
                      <th>{t('common.product')}</th>
                      <th className="text-right">{t('common.quantity')}</th>
                      <th className="text-right">{t('stock.unitCost')}</th>
                      <th className="text-right">{t('stock.totalCost')}</th>
                      <th>{t('stock.supplier')}</th>
                      <th>{t('common.employee')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry._id}>
                        <td className="whitespace-nowrap text-slate-500">{formatDate(entry.date)}</td>
                        <td>
                          <p className="font-semibold text-slate-800">{entry.productName}</p>
                          <p className="text-[11px] text-slate-400">{entry.note || entry.paymentMethod}</p>
                        </td>
                        <td className="text-right font-medium">{formatNumber(entry.quantity)}</td>
                        <td className="text-right">{formatMoney(entry.unitCost)}</td>
                        <td className="text-right font-bold text-slate-900">{formatMoney(entry.totalCost)}</td>
                        <td className="text-slate-500">{entry.supplier || '-'}</td>
                        <td className="text-slate-500">{entry.employee?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {entries.map((entry) => (
                  <div key={entry._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{entry.productName}</p>
                        <p className="text-[11px] text-slate-400">{formatDate(entry.date)} • {entry.supplier || 'Supplier'}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-900">{formatMoney(entry.totalCost)}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span className="badge-slate">{formatNumber(entry.quantity)} units</span>
                      <span>{formatMoney(entry.unitCost)} each</span>
                      <span className="ml-auto">{entry.employee?.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
