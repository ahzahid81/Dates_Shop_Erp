import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Boxes, PackagePlus, Plus, Snowflake, Wallet, Warehouse } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../lib/api';
import { formatDate, formatMoney, formatNumber, monthInput, todayInput } from '../lib/format';
import PageHeader from '../components/PageHeader';
import PrintHeader from '../components/PrintHeader';
import StatCard from '../components/StatCard';
import { EmptyState, SkeletonRows } from '../components/States';

const TABS = [
  { key: 'stock', label: 'Stock List' },
  { key: 'add', label: 'Stock (Added)' },
  { key: 'transfer', label: 'Transfer to Shop' },
  { key: 'monthly', label: 'Monthly Report' },
  { key: 'yearly', label: 'Yearly Report' },
];

export default function ColdStorage() {
  const [tab, setTab] = useState('stock');
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState(monthInput());
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const [addForm, setAddForm] = useState({
    product: '',
    quantity: '',
    cartons: '',
    unitCost: '',
    totalCost: '',
    supplier: '',
    note: '',
    date: todayInput(),
  });
  const [costMode, setCostMode] = useState('unit');
  const [transferForm, setTransferForm] = useState({
    product: '',
    quantity: '',
    cartons: '',
    note: '',
    date: todayInput(),
  });

  const loadBase = async () => {
    try {
      const [pRes, sRes, eRes, tRes] = await Promise.all([
        api.get('/products', { params: { limit: 500 } }),
        api.get('/cold-storage/stock'),
        api.get('/cold-storage/entries', { params: { limit: 50 } }),
        api.get('/cold-storage/transfers', { params: { limit: 50 } }),
      ]);
      setProducts(pRes.data.products || []);
      setStock(sRes.data.items || []);
      setEntries(eRes.data.entries || []);
      setTransfers(tRes.data.transfers || []);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const loadMonthly = async (m = month) => {
    try {
      const { data } = await api.get('/cold-storage/reports/monthly', { params: { month: m } });
      setMonthly(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const loadYearly = async (y = year) => {
    try {
      const { data } = await api.get('/cold-storage/reports/yearly', { params: { year: y } });
      setYearly(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadBase();
      await Promise.all([loadMonthly(), loadYearly()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadMonthly(month); }, [month]);
  useEffect(() => { loadYearly(year); }, [year]);

  const stockMap = useMemo(() => new Map(stock.map((s) => [String(s.product), s.quantity])), [stock]);
  const totals = useMemo(() => ({
    items: stock.length,
    qty: stock.reduce((sum, s) => sum + (s.quantity || 0), 0),
    cartons: stock.reduce((sum, s) => sum + (s.cartons || 0), 0),
    value: stock.reduce((sum, s) => sum + (s.value || 0), 0),
  }), [stock]);

  const selectedAdd = products.find((p) => p._id === addForm.product);
  const selectedTransfer = products.find((p) => p._id === transferForm.product);
  const availableForTransfer = stockMap.get(String(transferForm.product)) || 0;
  const transferStock = stock.find((s) => String(s.product) === String(transferForm.product));
  const availableCartonsForTransfer = transferStock?.cartons || 0;
  const transferUnitPrice = transferStock?.unitCost || 0;
  const transferValue = (Number(transferForm.quantity) || 0) * transferUnitPrice;

  const round2 = (value) => Number(value.toFixed(2));
  const updateAddQuantity = (value) => {
    setAddForm((f) => {
      const qty = Number(value) || 0;
      if (costMode === 'total') {
        const total = Number(f.totalCost) || 0;
        return { ...f, quantity: value, unitCost: qty > 0 ? String(round2(total / qty)) : '' };
      }
      const unit = Number(f.unitCost) || 0;
      return { ...f, quantity: value, totalCost: qty > 0 ? String(round2(qty * unit)) : '' };
    });
  };
  const updateAddUnitCost = (value) => {
    setCostMode('unit');
    setAddForm((f) => {
      const qty = Number(f.quantity) || 0;
      return { ...f, unitCost: value, totalCost: qty > 0 ? String(round2(qty * (Number(value) || 0))) : '' };
    });
  };
  const updateAddTotal = (value) => {
    setCostMode('total');
    setAddForm((f) => {
      const qty = Number(f.quantity) || 0;
      return { ...f, totalCost: value, unitCost: qty > 0 ? String(round2((Number(value) || 0) / qty)) : '' };
    });
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!addForm.product) return toast.error('Select a product');
    setSaving(true);
    try {
      await api.post('/cold-storage/entries', {
        ...addForm,
        quantity: Number(addForm.quantity),
        cartons: Number(addForm.cartons) || 0,
        unitCost: Number(addForm.unitCost) || 0,
        totalCost: Number(addForm.totalCost) || 0,
      });
      toast.success('Stock added to cold storage');
      setAddForm({ product: '', quantity: '', cartons: '', unitCost: '', totalCost: '', supplier: '', note: '', date: todayInput() });
      setCostMode('unit');
      await loadBase();
      await Promise.all([loadMonthly(month), loadYearly(year)]);
      setTab('stock');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.product) return toast.error('Select a product');
    setSaving(true);
    try {
      await api.post('/cold-storage/transfers', {
        ...transferForm,
        quantity: Number(transferForm.quantity),
        cartons: Number(transferForm.cartons) || 0,
      });
      toast.success('Transferred to shop: cost recorded and cash paid');
      setTransferForm({ product: '', quantity: '', cartons: '', note: '', date: todayInput() });
      await loadBase();
      await Promise.all([loadMonthly(month), loadYearly(year)]);
      setTab('stock');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="print-area">
      <PrintHeader title="Cold Storage" meta={monthly?.month || ''} />
      <PageHeader
        title="Cold Storage"
        subtitle="Manage cold storage stock, transfers to shop, and reports"
        printable
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Products in Cold Storage" value={formatNumber(totals.items)} icon={Snowflake} tone="brand" />
        <StatCard label="Total Quantity" value={formatNumber(totals.qty)} hint={`${formatNumber(totals.cartons)} cartons`} icon={Boxes} tone="emerald" />
        <StatCard label="Cost Value" value={formatMoney(totals.value)} icon={Wallet} tone="amber" />
        <StatCard label="This Month Added" value={formatNumber(monthly?.summary?.addedQty || 0)} icon={Warehouse} tone="violet" />
      </div>

      <div className="no-print mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${tab === t.key ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card"><SkeletonRows rows={6} /></div>
      ) : tab === 'stock' ? (
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="section-title">Cold Storage Stock List</h2>
            <span className="badge-slate">{stock.length} items</span>
          </div>
          {stock.length === 0 ? (
            <EmptyState icon={Snowflake} title="No stock in cold storage" />
          ) : (
            <div className="table-wrap">
              <table className="table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Cartons</th>
                    <th className="text-right">Cost Price</th>
                    <th className="text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => (
                    <tr key={String(item.product)}>
                      <td className="font-semibold text-slate-800">{item.productName}</td>
                      <td className="text-right"><span className="badge-green">{formatNumber(item.quantity)} {item.unit || 'pcs'}</span></td>
                      <td className="text-right">{formatNumber(item.cartons || 0)}</td>
                      <td className="text-right">{formatMoney(item.unitCost || 0)}</td>
                      <td className="text-right font-semibold text-emerald-600">{formatMoney(item.value || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-100 font-semibold text-slate-800">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totals.qty)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(totals.cartons)}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right text-emerald-600">{formatMoney(totals.value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : tab === 'add' ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="card card-pad xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><PackagePlus className="h-4 w-4" /></span>
              <h2 className="section-title">Stock (Added)</h2>
            </div>
            <form onSubmit={submitAdd} className="space-y-3.5">
              <div>
                <label className="label">Product</label>
                <select className="select" value={addForm.product} onChange={(e) => setAddForm(f=>({...f, product: e.target.value}))} required>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.unit || 'pcs'})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Quantity{selectedAdd ? ` (${selectedAdd.unit})` : ''}</label>
                  <input type="number" min="1" className="input" value={addForm.quantity} onChange={(e)=>updateAddQuantity(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Cartons <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="number" min="0" className="input" value={addForm.cartons} onChange={(e)=>setAddForm(f=>({...f, cartons:e.target.value}))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cost price / unit</label>
                  <input type="number" min="0" step="0.01" className="input" value={addForm.unitCost} onChange={(e)=>updateAddUnitCost(e.target.value)} placeholder="0.00" />
                  <p className="mt-1 text-[10px] text-slate-400">Cost of one {selectedAdd?.unit || 'unit'}</p>
                </div>
                <div>
                  <label className="label">Total cost</label>
                  <input type="number" min="0" step="0.01" className="input" value={addForm.totalCost} onChange={(e)=>updateAddTotal(e.target.value)} placeholder="0.00" />
                  <p className="mt-1 text-[10px] text-slate-400">Auto-calculates with quantity</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Supplier</label>
                  <input className="input" value={addForm.supplier} onChange={(e)=>setAddForm(f=>({...f, supplier:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={addForm.date} onChange={(e)=>setAddForm(f=>({...f, date:e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={addForm.note} onChange={(e)=>setAddForm(f=>({...f, note:e.target.value}))} />
              </div>
              {selectedAdd && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Cold storage after add: <strong>{formatNumber((stockMap.get(selectedAdd._id)||0) + (Number(addForm.quantity)||0))} {selectedAdd.unit || 'pcs'}</strong>
                  {' '}· Cartons: <strong>{formatNumber((stock.find((s)=>String(s.product)===String(selectedAdd._id))?.cartons||0) + (Number(addForm.cartons)||0))}</strong>
                  {' '}· Total cost: <strong>{formatMoney(Number(addForm.totalCost) || 0)}</strong>
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={saving}><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Add to Cold Storage'}</button>
            </form>
          </div>
          <div className="card xl:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="section-title">Recent Added Entries</h2>
              <span className="badge-slate">{entries.length}</span>
            </div>
            {entries.length === 0 ? <EmptyState icon={PackagePlus} title="No entries yet" /> : (
              <div className="table-wrap">
                <table className="table min-w-[640px]">
                  <thead><tr><th>Date</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Cartons</th><th className="text-right">Total Cost</th><th>Supplier</th></tr></thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e._id}>
                        <td className="text-slate-500">{formatDate(e.date)}</td>
                        <td className="font-semibold text-slate-800">{e.productName}</td>
                        <td className="text-right">{formatNumber(e.quantity)} {e.unit || e.product?.unit || 'pcs'}</td>
                        <td className="text-right">{formatNumber(e.cartons || 0)}</td>
                        <td className="text-right">{formatMoney(e.totalCost)}</td>
                        <td className="text-slate-500">{e.supplier || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'transfer' ? (
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="card card-pad xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ArrowRightLeft className="h-4 w-4" /></span>
              <h2 className="section-title">Transfer (Cold Storage to Shop)</h2>
            </div>
            <form onSubmit={submitTransfer} className="space-y-3.5">
              <div>
                <label className="label">Product</label>
                <select className="select" value={transferForm.product} onChange={(e)=>setTransferForm(f=>({...f, product:e.target.value}))} required>
                  <option value="">Select product</option>
                  {products.filter(p => (stockMap.get(String(p._id))||0) > 0).map((p) => (
                    <option key={p._id} value={p._id}>{p.name} (cold: {stockMap.get(String(p._id))||0} {p.unit || 'pcs'})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Quantity{selectedTransfer ? ` (${selectedTransfer.unit})` : ''}</label>
                  <input type="number" min="1" max={availableForTransfer || undefined} className="input" value={transferForm.quantity} onChange={(e)=>setTransferForm(f=>({...f, quantity:e.target.value}))} required />
                </div>
                <div>
                  <label className="label">Cartons <span className="font-normal text-slate-400">(optional)</span></label>
                  <input type="number" min="0" max={availableCartonsForTransfer || undefined} className="input" value={transferForm.cartons} onChange={(e)=>setTransferForm(f=>({...f, cartons:e.target.value}))} placeholder="0" />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={transferForm.date} onChange={(e)=>setTransferForm(f=>({...f, date:e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Note</label>
                <input className="input" value={transferForm.note} onChange={(e)=>setTransferForm(f=>({...f, note:e.target.value}))} />
              </div>
              {selectedTransfer && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <div>Cold storage available: <strong>{formatNumber(availableForTransfer)} {selectedTransfer.unit || 'pcs'}</strong> · Cartons: <strong>{formatNumber(availableCartonsForTransfer)}</strong></div>
                  <div>Cost price: <strong>{formatMoney(transferUnitPrice)} / {selectedTransfer.unit || 'pcs'}</strong></div>
                  <div>Transfer cost: <strong>{formatMoney(transferValue)}</strong> (paid from cash)</div>
                  <div>Shop stock now: <strong>{formatNumber(selectedTransfer.stockQty || 0)} {selectedTransfer.unit || 'pcs'}</strong> → after transfer: <strong>{formatNumber((selectedTransfer.stockQty || 0) + (Number(transferForm.quantity)||0))} {selectedTransfer.unit || 'pcs'}</strong></div>
                </div>
              )}
              <button type="submit" className="btn-primary w-full" disabled={saving || !transferForm.product}><ArrowRightLeft className="h-4 w-4" />{saving ? 'Transferring...' : 'Transfer to Shop (auto update)'}</button>
            </form>
          </div>
          <div className="card xl:col-span-3">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="section-title">Recent Transfers</h2>
              <span className="badge-slate">{transfers.length}</span>
            </div>
            {transfers.length === 0 ? <EmptyState icon={ArrowRightLeft} title="No transfers yet" /> : (
              <div className="table-wrap">
                <table className="table min-w-[520px]">
                  <thead><tr><th>Date</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Cartons</th><th className="text-right">Total Cost</th><th>By</th></tr></thead>
                  <tbody>
                    {transfers.map((t) => (
                      <tr key={t._id}>
                        <td className="text-slate-500">{formatDate(t.date)}</td>
                        <td className="font-semibold text-slate-800">{t.productName}</td>
                        <td className="text-right">{formatNumber(t.quantity)} {t.unit || t.product?.unit || 'pcs'}</td>
                        <td className="text-right">{formatNumber(t.cartons || 0)}</td>
                        <td className="text-right font-semibold text-slate-800">{formatMoney(t.totalCost || 0)}</td>
                        <td className="text-slate-500">{t.employee?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'monthly' ? (
        <div className="space-y-4">
          <div className="card card-pad flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Month</label>
            <input type="month" className="input w-auto" value={month} onChange={(e)=>setMonth(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Added Qty" value={formatNumber(monthly?.summary?.addedQty || 0)} icon={PackagePlus} tone="emerald" />
            <StatCard label="Added Cost" value={formatMoney(monthly?.summary?.addedCost || 0)} icon={Boxes} tone="brand" />
            <StatCard label="Transferred Qty" value={formatNumber(monthly?.summary?.transferredQty || 0)} hint={`${formatMoney(monthly?.summary?.transferredValue || 0)} cost`} icon={ArrowRightLeft} tone="amber" />
            <StatCard label="Entries" value={formatNumber(monthly?.summary?.addedCount || 0)} icon={Warehouse} tone="violet" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card">
              <div className="border-b border-slate-100 p-4"><h2 className="section-title">Added by Product</h2></div>
              <div className="table-wrap">
                <table className="table"><thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Cost</th></tr></thead>
                <tbody>
                  {(monthly?.addedByProduct || []).length === 0 ? <tr><td colSpan={3} className="text-center text-slate-400">No data</td></tr> :
                  monthly.addedByProduct.map((r)=> <tr key={String(r._id)}><td>{r.name}</td><td className="text-right">{formatNumber(r.quantity)} {r.unit || 'pcs'}</td><td className="text-right">{formatMoney(r.totalCost)}</td></tr>)}
                </tbody></table>
              </div>
            </div>
            <div className="card">
              <div className="border-b border-slate-100 p-4"><h2 className="section-title">Transferred by Product</h2></div>
              <div className="table-wrap">
                <table className="table"><thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Cost</th></tr></thead>
                <tbody>
                  {(monthly?.transferredByProduct || []).length === 0 ? <tr><td colSpan={3} className="text-center text-slate-400">No data</td></tr> :
                  monthly.transferredByProduct.map((r)=> <tr key={String(r._id)}><td>{r.name}</td><td className="text-right">{formatNumber(r.quantity)} {r.unit || 'pcs'}</td><td className="text-right">{formatMoney(r.totalCost || 0)}</td></tr>)}
                </tbody></table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card card-pad flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">Year</label>
            <input type="number" className="input w-28" value={year} onChange={(e)=>setYear(e.target.value)} min="2000" max="2100" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Added Qty (Year)" value={formatNumber(yearly?.summary?.addedQty || 0)} icon={PackagePlus} tone="emerald" />
            <StatCard label="Added Cost (Year)" value={formatMoney(yearly?.summary?.addedCost || 0)} icon={Boxes} tone="brand" />
            <StatCard label="Transferred Qty (Year)" value={formatNumber(yearly?.summary?.transferredQty || 0)} hint={`${formatMoney(yearly?.summary?.transferredValue || 0)} cost`} icon={ArrowRightLeft} tone="amber" />
          </div>
          <div className="card">
            <div className="border-b border-slate-100 p-4"><h2 className="section-title">Monthly Breakdown - {yearly?.year || year}</h2></div>
            <div className="table-wrap">
              <table className="table min-w-[560px]">
                <thead><tr><th>Month</th><th className="text-right">Added Qty</th><th className="text-right">Added Cost</th><th className="text-right">Transferred Qty</th><th className="text-right">Cost</th></tr></thead>
                <tbody>
                  {(yearly?.monthly || []).length === 0 ? <tr><td colSpan={5} className="text-center text-slate-400">No data</td></tr> :
                  yearly.monthly.map((m)=> <tr key={m.month}><td>{m.month}</td><td className="text-right">{formatNumber(m.addedQty)}</td><td className="text-right">{formatMoney(m.addedCost)}</td><td className="text-right">{formatNumber(m.transferredQty)}</td><td className="text-right">{formatMoney(m.transferredValue || 0)}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
