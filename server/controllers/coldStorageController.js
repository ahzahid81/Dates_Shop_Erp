const Product = require('../models/Product');
const StockEntry = require('../models/StockEntry');
const CashTransaction = require('../models/CashTransaction');
const ColdStorageEntry = require('../models/ColdStorageEntry');
const ColdStorageTransfer = require('../models/ColdStorageTransfer');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { dateRangeFromQuery, monthRange } = require('../utils/dateRange');
const { localDateKey } = require('../utils/sequence');

const TZ = 'Asia/Riyadh';

const getStockList = asyncHandler(async (req, res) => {
  const [added, transferred, products] = await Promise.all([
    ColdStorageEntry.aggregate([
      { $group: { _id: '$product', productName: { $first: '$productName' }, unit: { $first: '$unit' }, quantity: { $sum: '$quantity' }, cartons: { $sum: '$cartons' }, totalCost: { $sum: '$totalCost' } } },
    ]),
    ColdStorageTransfer.aggregate([
      { $group: { _id: '$product', quantity: { $sum: '$quantity' }, cartons: { $sum: '$cartons' } } },
    ]),
    Product.find({}, 'unit').lean(),
  ]);
  const unitMap = new Map(products.map((p) => [String(p._id), p.unit]));
  const outMap = new Map(transferred.map((t) => [String(t._id), t.quantity]));
  const outCartonsMap = new Map(transferred.map((t) => [String(t._id), t.cartons || 0]));
  const round = (value) => Number(value.toFixed(2));
  const items = added
    .map((a) => {
      const out = outMap.get(String(a._id)) || 0;
      const outCartons = outCartonsMap.get(String(a._id)) || 0;
      const qty = a.quantity - out;
      const cartons = (a.cartons || 0) - outCartons;
      const unitCost = a.quantity > 0 ? a.totalCost / a.quantity : 0;
      return {
        product: a._id,
        productName: a.productName,
        unit: unitMap.get(String(a._id)) || a.unit || 'pcs',
        quantity: qty,
        cartons,
        unitCost: round(unitCost),
        value: round(qty * unitCost),
        totalCost: a.totalCost,
      };
    })
    .filter((i) => i.quantity > 0 || i.cartons > 0)
    .sort((a, b) => a.productName.localeCompare(b.productName));
  const summary = items.reduce(
    (acc, item) => ({
      items: acc.items + 1,
      quantity: acc.quantity + item.quantity,
      cartons: acc.cartons + item.cartons,
      value: acc.value + item.value,
    }),
    { items: 0, quantity: 0, cartons: 0, value: 0 }
  );
  summary.value = round(summary.value);
  res.json({ items, summary });
});

const listEntries = asyncHandler(async (req, res) => {
  const { from, to, product, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (from || to) {
    const { start, end } = dateRangeFromQuery(from, to);
    filter.date = { $gte: start, $lt: end };
  }
  if (product) filter.product = product;
  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [entries, total] = await Promise.all([
    ColdStorageEntry.find(filter)
      .populate('employee', 'name role')
      .populate('product', 'unit')
      .sort({ date: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ColdStorageEntry.countDocuments(filter),
  ]);
  res.json({ entries, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

const addEntry = asyncHandler(async (req, res) => {
  const { product: productId, quantity, cartons, unitCost, totalCost, supplier, note, date } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) return res.status(404).json({ message: 'Active product not found' });
  const qty = Number(quantity);
  const cartonCount = Number(cartons) || 0;
  const cost = Number(unitCost) || 0;
  if (!qty || qty < 1) return res.status(422).json({ message: 'Quantity must be at least 1' });
  if (cartonCount < 0) return res.status(422).json({ message: 'Cartons cannot be negative' });
  if (cost < 0) return res.status(422).json({ message: 'Unit cost cannot be negative' });
  const hasTotal = totalCost !== undefined && totalCost !== null && totalCost !== '';
  const providedTotal = hasTotal ? Number(totalCost) : null;
  if (hasTotal && (Number.isNaN(providedTotal) || providedTotal < 0)) {
    return res.status(422).json({ message: 'Total cost cannot be negative' });
  }
  const total = hasTotal ? Number(providedTotal.toFixed(2)) : Number((qty * cost).toFixed(2));
  const unit = cost > 0 ? cost : Number((total / qty).toFixed(2));
  const entry = await ColdStorageEntry.create({
    product: product._id,
    productName: product.name,
    unit: product.unit || 'pcs',
    quantity: qty,
    cartons: cartonCount,
    unitCost: unit,
    totalCost: total,
    supplier,
    note,
    date: date ? new Date(date) : new Date(),
    employee: req.user._id,
  });
  await writeAudit(req, {
    action: 'COLD_STORAGE_IN',
    entity: 'ColdStorageEntry',
    entityId: entry._id,
    description: `Added ${qty} ${product.unit || 'pcs'} ${product.name} to cold storage`,
    meta: { totalCost: total, cartons: cartonCount },
  });
  res.status(201).json({ entry });
});

const listTransfers = asyncHandler(async (req, res) => {
  const { from, to, product, page = 1, limit = 100 } = req.query;
  const filter = {};
  if (from || to) {
    const { start, end } = dateRangeFromQuery(from, to);
    filter.date = { $gte: start, $lt: end };
  }
  if (product) filter.product = product;
  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const [transfers, total] = await Promise.all([
    ColdStorageTransfer.find(filter)
      .populate('employee', 'name role')
      .populate('product', 'unit')
      .sort({ date: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    ColdStorageTransfer.countDocuments(filter),
  ]);
  res.json({ transfers, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

const createTransfer = asyncHandler(async (req, res) => {
  const { product: productId, quantity, cartons, note, date } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) return res.status(404).json({ message: 'Active product not found' });
  const qty = Number(quantity);
  const cartonCount = Number(cartons) || 0;
  if (!qty || qty < 1) return res.status(422).json({ message: 'Quantity must be at least 1' });
  if (cartonCount < 0) return res.status(422).json({ message: 'Cartons cannot be negative' });

  const [addedAgg, transferredAgg] = await Promise.all([
    ColdStorageEntry.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, qty: { $sum: '$quantity' }, cartons: { $sum: '$cartons' }, totalCost: { $sum: '$totalCost' } } },
    ]),
    ColdStorageTransfer.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, qty: { $sum: '$quantity' }, cartons: { $sum: '$cartons' } } },
    ]),
  ]);
  const addedQty = addedAgg[0]?.qty || 0;
  const addedCost = addedAgg[0]?.totalCost || 0;
  const addedCartons = addedAgg[0]?.cartons || 0;
  const available = addedQty - (transferredAgg[0]?.qty || 0);
  const availableCartons = addedCartons - (transferredAgg[0]?.cartons || 0);
  if (qty > available) {
    return res.status(409).json({ message: `Insufficient cold storage stock. Available: ${available}` });
  }
  if (cartonCount > availableCartons) {
    return res.status(409).json({ message: `Insufficient cartons in cold storage. Available: ${availableCartons}` });
  }

  const previousQty = product.stockQty || 0;
  const previousCost = product.costPrice || 0;
  const round = (value) => Number(value.toFixed(2));
  const coldUnitCost = addedQty > 0 ? round(addedCost / addedQty) : round(previousCost);
  const transferCost = round(qty * coldUnitCost);
  const transferDate = date ? new Date(date) : new Date();
  const newQty = previousQty + qty;
  product.stockQty = newQty;
  product.costPrice = newQty > 0
    ? round((previousQty * previousCost + qty * coldUnitCost) / newQty)
    : round(coldUnitCost);
  await product.save();

  let transfer;
  let stockEntry;
  let cashTransaction;
  try {
    transfer = await ColdStorageTransfer.create({
      product: product._id,
      productName: product.name,
      unit: product.unit || 'pcs',
      quantity: qty,
      cartons: cartonCount,
      unitCost: coldUnitCost,
      totalCost: transferCost,
      note,
      date: transferDate,
      employee: req.user._id,
    });

    stockEntry = await StockEntry.create({
      product: product._id,
      productName: product.name,
      unit: product.unit || 'pcs',
      quantity: qty,
      unitCost: coldUnitCost,
      totalCost: transferCost,
      supplier: 'Cold Storage',
      note: note || 'Transferred from cold storage',
      paid: true,
      paymentMethod: 'cash',
      employee: req.user._id,
      date: transferDate,
    });

    if (transferCost > 0) {
      cashTransaction = await CashTransaction.create({
        type: 'out',
        amount: transferCost,
        source: 'stock',
        reference: stockEntry._id,
        referenceModel: 'StockEntry',
        description: `Cold storage purchase: ${product.name} x ${qty}`,
        paymentMethod: 'cash',
        employee: req.user._id,
        date: transferDate,
      });
    }
  } catch (error) {
    if (cashTransaction) await CashTransaction.findByIdAndDelete(cashTransaction._id);
    if (stockEntry) await StockEntry.findByIdAndDelete(stockEntry._id);
    if (transfer) await ColdStorageTransfer.findByIdAndDelete(transfer._id);
    product.stockQty = previousQty;
    product.costPrice = previousCost;
    await product.save();
    throw error;
  }

  await writeAudit(req, {
    action: 'COLD_STORAGE_TRANSFER',
    entity: 'ColdStorageTransfer',
    entityId: transfer._id,
    description: `Transferred ${qty} ${product.unit || 'pcs'} ${product.name} from cold storage to shop at ${coldUnitCost} each (cash paid)`,
    meta: { unitCost: coldUnitCost, totalCost: transferCost, cartons: cartonCount, stockEntryId: stockEntry._id },
  });

  res.status(201).json({ transfer, product, stockEntry, cashTransaction });
});

const monthlyReport = asyncHandler(async (req, res) => {
  const month = req.query.month || localDateKey().slice(0, 7);
  const { start, end } = monthRange(month);

  const [added, transferred, addedByProduct, transferredByProduct] = await Promise.all([
    ColdStorageEntry.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    ColdStorageTransfer.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    ColdStorageEntry.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: '$product', name: { $first: '$productName' }, unit: { $first: '$unit' }, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
      { $sort: { quantity: -1 } },
    ]),
    ColdStorageTransfer.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: '$product', name: { $first: '$productName' }, unit: { $first: '$unit' }, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } },
      { $sort: { quantity: -1 } },
    ]),
  ]);

  res.json({
    month,
    summary: {
      addedQty: added[0]?.quantity || 0,
      addedCost: added[0]?.totalCost || 0,
      addedCount: added[0]?.count || 0,
      transferredQty: transferred[0]?.quantity || 0,
      transferredValue: transferred[0]?.totalCost || 0,
      transferredCount: transferred[0]?.count || 0,
    },
    addedByProduct,
    transferredByProduct,
  });
});

const yearlyReport = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || Number(localDateKey().slice(0, 4));
  const start = new Date(`${year}-01-01T00:00:00+03:00`);
  const end = new Date(`${year + 1}-01-01T00:00:00+03:00`);

  const [monthly, summaryAdded, summaryTransferred] = await Promise.all([
    ColdStorageEntry.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: TZ } }, addedQty: { $sum: '$quantity' }, addedCost: { $sum: '$totalCost' } } },
      { $sort: { _id: 1 } },
    ]),
    ColdStorageEntry.aggregate([{ $match: { date: { $gte: start, $lt: end } } }, { $group: { _id: null, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } }]),
    ColdStorageTransfer.aggregate([{ $match: { date: { $gte: start, $lt: end } } }, { $group: { _id: null, quantity: { $sum: '$quantity' }, totalCost: { $sum: '$totalCost' } } }]),
  ]);

  const transferMonthly = await ColdStorageTransfer.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: TZ } }, transferredQty: { $sum: '$quantity' }, transferredValue: { $sum: '$totalCost' } } },
  ]);
  const aMap = new Map(monthly.map((m) => [m._id, m]));
  const tMap = new Map(transferMonthly.map((t) => [t._id, t]));
  const months = Array.from(new Set([...aMap.keys(), ...tMap.keys()])).sort();
  const merged = months.map((key) => {
    const added = aMap.get(key);
    const transferred = tMap.get(key);
    return {
      month: key,
      addedQty: added?.addedQty || 0,
      addedCost: added?.addedCost || 0,
      transferredQty: transferred?.transferredQty || 0,
      transferredValue: transferred?.transferredValue || 0,
    };
  });

  res.json({
    year,
    summary: {
      addedQty: summaryAdded[0]?.quantity || 0,
      addedCost: summaryAdded[0]?.totalCost || 0,
      transferredQty: summaryTransferred[0]?.quantity || 0,
      transferredValue: summaryTransferred[0]?.totalCost || 0,
    },
    monthly: merged,
  });
});

module.exports = {
  getStockList,
  listEntries,
  addEntry,
  listTransfers,
  createTransfer,
  monthlyReport,
  yearlyReport,
};
