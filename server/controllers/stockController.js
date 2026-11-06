const Product = require('../models/Product');
const StockEntry = require('../models/StockEntry');
const CashTransaction = require('../models/CashTransaction');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { dateRangeFromQuery } = require('../utils/dateRange');

const listStock = asyncHandler(async (req, res) => {
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
    StockEntry.find(filter)
      .populate('employee', 'name role')
      .sort({ date: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    StockEntry.countDocuments(filter),
  ]);

  res.json({ entries, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

const addStock = asyncHandler(async (req, res) => {
  const { product: productId, quantity, unitCost, supplier, note, paid, date } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) return res.status(404).json({ message: 'Active product not found' });

  const qty = Number(quantity);
  const cost = Number(unitCost);
  if (!qty || qty < 1) return res.status(422).json({ message: 'Quantity must be at least 1' });
  if (cost < 0) return res.status(422).json({ message: 'Unit cost cannot be negative' });

  const previousQty = product.stockQty;
  const previousCost = product.costPrice;
  const newQty = previousQty + qty;
  const totalCost = Number((qty * cost).toFixed(2));
  product.stockQty = newQty;
  product.costPrice = newQty > 0
    ? Number(((previousQty * previousCost + qty * cost) / newQty).toFixed(2))
    : cost;
  await product.save();

  let entry;
  try {
    entry = await StockEntry.create({
      product: product._id,
      productName: product.name,
      quantity: qty,
      unitCost: cost,
      totalCost,
      supplier,
      note,
      paid: paid !== false,
      paymentMethod: 'cash',
      employee: req.user._id,
      date: date ? new Date(date) : new Date(),
    });

    if (paid !== false && totalCost > 0) {
      await CashTransaction.create({
        type: 'out',
        amount: totalCost,
        source: 'stock',
        reference: entry._id,
        referenceModel: 'StockEntry',
        description: `Stock purchase: ${product.name} x ${qty}`,
        paymentMethod: 'cash',
        employee: req.user._id,
        date: entry.date,
      });
    }
  } catch (error) {
    product.stockQty = previousQty;
    product.costPrice = previousCost;
    await product.save();
    throw error;
  }

  await writeAudit(req, {
    action: 'STOCK_IN',
    entity: 'StockEntry',
    entityId: entry._id,
    description: `Added ${qty} ${product.unit} of ${product.name} at ${cost} each`,
    meta: { supplier, totalCost, paid: paid !== false },
  });

  res.status(201).json({ entry, product });
});

module.exports = { listStock, addStock };
