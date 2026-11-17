import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  Edit3,
  Package,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { formatMoney, formatNumber } from '../lib/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatCard from '../components/StatCard';
import { EmptyState, SkeletonRows } from '../components/States';

const EMPTY_FORM = {
  name: '',
  sku: '',
  category: 'Dates',
  unit: 'pcs',
  costPrice: '',
  lowStockThreshold: 5,
  description: '',
};

function ProductForm({ open, onClose, product, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        product
          ? {
              name: product.name || '',
              sku: product.sku || '',
              category: product.category || 'General',
              unit: product.unit || 'pcs',
              costPrice: product.costPrice ?? '',
              lowStockThreshold: product.lowStockThreshold ?? 5,
              description: product.description || '',
            }
          : EMPTY_FORM
      );
    }
  }, [open, product]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        costPrice: Number(form.costPrice) || 0,
        lowStockThreshold: form.lowStockThreshold === '' ? 5 : Number(form.lowStockThreshold),
      };
      if (product) {
        await api.put(`/products/${product._id}`, payload);
        toast.success(t('common.updated'));
      } else {
        await api.post('/products', payload);
        toast.success(t('common.created'));
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? t('products.editProduct') : t('products.addProduct')}
      subtitle={t('products.englishNames')}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="product-form" className="btn-primary" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">{t('products.productName')}</label>
          <input className="input" value={form.name} onChange={set('name')} required minLength={2} />
        </div>
        <div>
          <label className="label">{t('products.sku')}</label>
          <input className="input" value={form.sku} onChange={set('sku')} placeholder="PRD-0001" />
          <p className="mt-1 text-[10px] text-slate-400">{t('products.skuHint')}</p>
        </div>
        <div>
          <label className="label">{t('products.category')}</label>
          <input className="input" value={form.category} onChange={set('category')} required />
        </div>
        <div>
          <label className="label">{t('products.unit')}</label>
          <select className="select" value={form.unit} onChange={set('unit')}>
            {['pcs', 'box', 'jar', 'pack', 'kg', 'gram', 'litre'].map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Low stock alert at</label>
          <input
            type="number"
            min="0"
            className="input"
            value={form.lowStockThreshold}
            onChange={set('lowStockThreshold')}
          />
        </div>
        {product && (
          <div className="sm:col-span-2">
            <label className="label">Cost price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.costPrice}
              onChange={set('costPrice')}
            />
            <p className="mt-1 text-[10px] text-slate-400">Updated automatically when stock is added</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <label className="label">
            Description (optional)
          </label>
          <textarea className="textarea" value={form.description} onChange={set('description')} rows={3} />
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const { t } = useI18n();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [modal, setModal] = useState({ open: false, product: null });
  const [confirm, setConfirm] = useState({ open: false, product: null, loading: false });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: { limit: 500, search: search || undefined, category: category || undefined, lowStock: lowOnly || undefined },
      });
      setProducts(data.products);
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
  }, [search, category, lowOnly]);

  useEffect(() => {
    api
      .get('/products/categories/meta')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => {});
  }, [products.length]);

  const stats = useMemo(() => {
    const stockValue = products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
    const low = products.filter((p) => p.stockQty <= (p.lowStockThreshold ?? 5));
    return { stockValue, low };
  }, [products]);

  const handleDelete = async () => {
    setConfirm((prev) => ({ ...prev, loading: true }));
    try {
      const { data } = await api.delete(`/products/${confirm.product._id}`);
      toast.success(data.archived ? t('products.archived') : t('products.deleted'));
      setConfirm({ open: false, product: null, loading: false });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setConfirm((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div>
      <PageHeader
        title={t('products.title')}
        subtitle={t('products.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={() => setModal({ open: true, product: null })}>
            <Plus className="h-4 w-4" />
            {t('products.addProduct')}
          </button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label={t('products.total') || 'Products'} value={formatNumber(products.length)} icon={Package} tone="brand" />
        <StatCard label={t('products.stockValue')} value={formatMoney(stats.stockValue)} icon={Wallet} tone="emerald" />
        <StatCard label={t('stock.lowStockCount')} value={formatNumber(stats.low.length)} icon={Boxes} tone="amber" />
      </div>

      <div className="card">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder={t('products.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="select w-auto min-w-[150px]" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t('products.allCategories')}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />
              {t('products.lowStockOnly')}
            </label>
          </div>
        </div>

        {loading ? (
          <SkeletonRows rows={6} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title={t('products.empty')}
            text={t('products.addFirst')}
            action={
              <button type="button" className="btn-primary btn-sm" onClick={() => setModal({ open: true, product: null })}>
                <Plus className="h-4 w-4" />
                {t('products.addProduct')}
              </button>
            }
          />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('common.product')}</th>
                    <th>{t('common.category')}</th>
                    <th className="text-right">Cost price</th>
                    <th className="text-right">{t('common.stock')}</th>
                    <th className="text-right">Low stock alert at</th>
                    <th className="text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const low = product.stockQty <= (product.lowStockThreshold ?? 5);
                    return (
                      <tr key={product._id}>
                        <td>
                          <p className="font-semibold text-slate-800">{product.name}</p>
                          <p className="text-[11px] text-slate-400">{product.sku}</p>
                        </td>
                        <td>
                          <span className="badge-slate">{product.category}</span>
                        </td>
                        <td className="text-right">{formatMoney(product.costPrice)}</td>
                        <td className="text-right">
                          <span className={low ? 'badge-amber' : 'badge-green'}>
                            {formatNumber(product.stockQty)} {product.unit}
                          </span>
                        </td>
                        <td className="text-right">{formatNumber(product.lowStockThreshold ?? 5)}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="icon-btn"
                              onClick={() => setModal({ open: true, product })}
                              title={t('common.edit')}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="icon-btn text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setConfirm({ open: true, product, loading: false })}
                              title={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 md:hidden">
              {products.map((product) => {
                const low = product.stockQty <= (product.lowStockThreshold ?? 5);
                return (
                  <div key={product._id} className="rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">{product.name}</p>
                        <p className="text-[11px] text-slate-400">{product.sku} · {product.category}</p>
                      </div>
                      <span className={low ? 'badge-amber' : 'badge-green'}>
                        {formatNumber(product.stockQty)} {product.unit}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-center text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400">Cost price</p>
                        <p className="font-semibold text-slate-700">{formatMoney(product.costPrice)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Low stock alert at</p>
                        <p className="font-semibold text-slate-700">{formatNumber(product.lowStockThreshold ?? 5)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => setModal({ open: true, product })}>
                        <Edit3 className="h-3.5 w-3.5" />
                        {t('common.edit')}
                      </button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => setConfirm({ open: true, product, loading: false })}>
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ProductForm
        open={modal.open}
        product={modal.product}
        onClose={() => setModal({ open: false, product: null })}
        onSaved={load}
      />
      <ConfirmDialog
        open={confirm.open}
        onClose={() => setConfirm({ open: false, product: null, loading: false })}
        onConfirm={handleDelete}
        loading={confirm.loading}
        title={t('common.delete')}
        message={t('products.confirmDelete')}
      />
    </div>
  );
}
