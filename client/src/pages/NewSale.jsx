import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { formatMoney, formatNumber, paymentLabel, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import { EmptyState, PageLoader } from '../components/States';

export default function NewSale() {
  const { t } = useI18n();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '', address: '' });
  const [discount, setDiscount] = useState('');
  const [paidInput, setPaidInput] = useState('');
  const [note, setNote] = useState('');
  const [showCustomer, setShowCustomer] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/products', { params: { limit: 500 } });
        setProducts(data.products);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term);
      const matchesCategory = !category || product.category === category;
      return matchesTerm && matchesCategory;
    });
  }, [products, search, category]);

  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountValue = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = Math.max(subtotal - discountValue, 0);
  const paidValue = paidInput === '' ? total : Math.max(Number(paidInput) || 0, 0);
  const effectivePaid = Math.min(paidValue, total);
  const due = Math.max(total - effectivePaid, 0);
  const change = Math.max(paidValue - total, 0);

  const addToCart = (product) => {
    if (product.stockQty <= 0) {
      toast.error(`${product.name}: ${t('stock.outOfStock')}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product === product._id);
      if (existing) {
        if (existing.quantity >= product.stockQty) {
          toast.error(`${product.name}: ${t('sales.insufficientStock')} (${product.stockQty})`);
          return prev;
        }
        return prev.map((item) =>
          item.product === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product: product._id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          stockQty: product.stockQty,
          quantity: 1,
          unitPrice: product.sellPrice,
        },
      ];
    });
  };

  const updateItem = (id, key, value) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product !== id) return item;
        if (key === 'quantity') {
          const qty = Math.max(Math.min(Number(value) || 1, item.stockQty), 1);
          return { ...item, quantity: qty };
        }
        return { ...item, unitPrice: Math.max(Number(value) || 0, 0) };
      })
    );
  };

  const removeItem = (id) => setCart((prev) => prev.filter((item) => item.product !== id));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (cart.length === 0) {
      toast.error(t('sales.emptyCart'));
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/sales', {
        items: cart.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        customer,
        discount: discountValue,
        paidAmount: effectivePaid,
        paymentMethod: 'cash',
        note,
        date: new Date(`${todayInput()}T12:00:00+03:00`).toISOString(),
      });
      toast.success(t('sales.saleSuccess'));
      navigate(`/invoices/${data.sale._id}`);
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
        title={t('sales.posTitle')}
        subtitle={t('sales.posSubtitle')}
        actions={
          isAdmin && (
            <Link to="/sales" className="btn-secondary">
              {t('sales.list')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <div className="card p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('products.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100"
                  onClick={() => setSearch('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategory('')}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  !category ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('common.all')}
              </button>
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    category === item ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((product) => {
              const inCart = cart.find((item) => item.product === product._id);
              const disabled = product.stockQty <= 0;
              return (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={disabled}
                  className={`group relative flex flex-col rounded-2xl border p-3.5 text-left transition ${
                    disabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-soft'
                  }`}
                >
                  {inCart && (
                    <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                      {inCart.quantity}
                    </span>
                  )}
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <ShoppingBag className="h-4 w-4" />
                  </span>
                  <p className="line-clamp-2 min-h-[36px] text-sm font-semibold leading-tight text-slate-800">
                    {product.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{product.sku}</p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-sm font-bold text-brand-700">{formatMoney(product.sellPrice)}</p>
                    <span className={`text-[10px] font-semibold ${product.stockQty <= product.lowStockThreshold ? 'text-amber-600' : 'text-slate-400'}`}>
                      {formatNumber(product.stockQty)} {product.unit}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && (
            <div className="card mt-3">
              <EmptyState icon={ShoppingBag} title={t('products.empty')} />
            </div>
          )}
        </div>

        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="card overflow-hidden xl:sticky xl:top-20">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand-600" />
                <h2 className="section-title">{t('sales.cart')}</h2>
              </div>
              <span className="badge-slate">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t('sales.itemCount')}
              </span>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <ShoppingCart className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs text-slate-400">{t('sales.noItems')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.product} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {formatNumber(item.stockQty)} {item.unit} {t('sales.stockAvailable')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            className="px-2 py-1 text-slate-500 hover:text-slate-800"
                            onClick={() => updateItem(item.product, 'quantity', item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stockQty}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.product, 'quantity', e.target.value)}
                            className="w-10 border-x border-slate-200 py-1 text-center text-xs font-semibold outline-none"
                          />
                          <button
                            type="button"
                            className="px-2 py-1 text-slate-500 hover:text-slate-800"
                            onClick={() => updateItem(item.product, 'quantity', item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex flex-1 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-semibold text-slate-400">SAR</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.product, 'unitPrice', e.target.value)}
                            className="w-full min-w-0 border-0 bg-transparent text-xs font-semibold outline-none"
                          />
                        </div>
                        <p className="w-20 shrink-0 text-right text-sm font-bold text-slate-900">
                          {formatMoney(item.quantity * item.unitPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowCustomer((prev) => !prev)}
                className="flex w-full items-center justify-between text-xs font-semibold text-slate-600"
              >
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {t('sales.customerInfo')}
                </span>
                <ChevronRight className={`h-4 w-4 transition ${showCustomer ? 'rotate-90' : ''}`} />
              </button>
              {showCustomer && (
                <div className="mt-2.5 space-y-2">
                  <input
                    className="input py-2 text-xs"
                    placeholder={t('sales.customerName')}
                    value={customer.name}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="input py-2 text-xs"
                      placeholder={t('sales.customerPhone')}
                      value={customer.phone}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <input
                      className="input py-2 text-xs"
                      placeholder={t('common.address')}
                      value={customer.address}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-4 py-3 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('sales.subtotal')}</span>
                <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">{t('sales.discount')}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-semibold outline-none focus:border-brand-500"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">{t('sales.grandTotal')}</span>
                <span className="text-xl font-extrabold text-brand-700">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-500">{t('sales.paymentMethod')}</span>
                <span className="font-semibold text-slate-700">{paymentLabel('cash')}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="label">{t('sales.amountReceived')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input py-2 text-sm font-semibold"
                    value={paidInput}
                    onChange={(e) => setPaidInput(e.target.value)}
                    placeholder={total.toString()}
                  />
                </div>
                <div>
                  <label className="label">{t('sales.dueAmount')}</label>
                  <div className={`input flex items-center py-2 text-sm font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatMoney(due)}
                  </div>
                </div>
              </div>
              {change > 0 && (
                <p className="mt-1.5 text-right text-[11px] font-semibold text-amber-600">
                  {t('sales.changeDue')}: {formatMoney(change)}
                </p>
              )}
              <input
                className="input mt-2 py-2 text-xs"
                placeholder={t('common.note')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="border-t border-slate-100 p-4">
              <button type="submit" className="btn-primary w-full py-3" disabled={saving || cart.length === 0}>
                <CheckCircle2 className="h-4 w-4" />
                {saving ? t('common.saving') : t('sales.completeSale')}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <Wallet className="h-3 w-3" />
                {t('sales.stockAvailable')} • {t('sales.paidAmount')} {formatMoney(effectivePaid)}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
