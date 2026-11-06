const Product = require('../models/Product');
const Sale = require('../models/Sale');
const CashTransaction = require('../models/CashTransaction');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { nextInvoiceNo } = require('../utils/sequence');
const { dateRangeFromQuery } = require('../utils/dateRange');

const listSales = asyncHandler(async (req, res) => {
  const { from, to, employee, status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (from || to) {
    const { start, end } = dateRangeFromQuery(from, to);
    filter.date = { $gte: start, $lt: end };
  }
  if (req.user.role === 'employee') filter.employee = req.user._id;
  else if (employee) filter.employee = employee;
  if (status) filter.status = status;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ invoiceNo: rx }, { 'customer.name': rx }, { 'customer.phone': rx }];
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 200);

  const [sales, total, totals] = await Promise.all([
    Sale.find(filter)
      .populate('employee', 'name role')
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Sale.countDocuments(filter),
    Sale.aggregate([
      { $match: { ...filter, status: 'completed' } },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          paid: { $sum: '$paidAmount' },
          due: { $sum: '$dueAmount' },
          profit: { $sum: '$profit' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    sales,
    total,
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    summary: totals[0] || { sales: 0, paid: 0, due: 0, profit: 0, count: 0 },
  });
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id).populate('employee', 'name role');
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (req.user.role === 'employee' && String(sale.employee._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only view your own sales' });
  }
  res.json({ sale });
});

const createSale = asyncHandler(async (req, res) => {
  const { items = [], customer = {}, discount = 0, paidAmount, note, date } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(422).json({ message: 'Add at least one product to the sale' });
  }

  const ids = [...new Set(items.map((i) => String(i.product)))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true });
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const lineItems = [];
  let subtotal = 0;
  let costTotal = 0;

  for (const raw of items) {
    const product = productMap.get(String(raw.product));
    if (!product) throw Object.assign(new Error('A selected product is unavailable'), { statusCode: 404 });
    const qty = Number(raw.quantity);
    const unitPrice = Number(raw.unitPrice);
    if (!qty || qty < 1) throw Object.assign(new Error(`Invalid quantity for ${product.name}`), { statusCode: 422 });
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw Object.assign(new Error(`Invalid selling price for ${product.name}`), { statusCode: 422 });
    }
    if (qty > product.stockQty) {
      throw Object.assign(
        new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQty}`),
        { statusCode: 409 }
      );
    }
    const lineTotal = Number((qty * unitPrice).toFixed(2));
    const cost = Number((qty * product.costPrice).toFixed(2));
    subtotal += lineTotal;
    costTotal += cost;
    lineItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      quantity: qty,
      unitPrice,
      costPrice: product.costPrice,
      lineTotal,
      profit: Number((lineTotal - cost).toFixed(2)),
    });
  }

  subtotal = Number(subtotal.toFixed(2));
  costTotal = Number(costTotal.toFixed(2));
  const discountValue = Math.max(Number(discount) || 0, 0);
  if (discountValue > subtotal) {
    return res.status(422).json({ message: 'Discount cannot exceed the subtotal' });
  }
  const total = Number((subtotal - discountValue).toFixed(2));
  const paid = paidAmount === undefined || paidAmount === null || paidAmount === ''
    ? total
    : Number(paidAmount);
  if (Number.isNaN(paid) || paid < 0) {
    return res.status(422).json({ message: 'Paid amount must be a positive number' });
  }
  if (paid > total) {
    return res.status(422).json({ message: 'Paid amount cannot exceed the total' });
  }
  const due = Number((total - paid).toFixed(2));
  const profit = Number((subtotal - costTotal - discountValue).toFixed(2));
  const invoiceNo = await nextInvoiceNo();

  const applied = [];
  let sale;

  try {
    for (const line of lineItems) {
      const result = await Product.updateOne(
        { _id: line.product, stockQty: { $gte: line.quantity } },
        { $inc: { stockQty: -line.quantity } }
      );
      if (result.modifiedCount !== 1) {
        throw Object.assign(
          new Error(`Stock changed for ${line.name}. Please refresh and try again`),
          { statusCode: 409 }
        );
      }
      applied.push(line);
    }

    sale = await Sale.create({
      invoiceNo,
      customer: {
        name: customer.name?.trim() || 'Walk-in Customer',
        phone: customer.phone?.trim(),
        address: customer.address?.trim(),
      },
      items: lineItems,
      subtotal,
      discount: discountValue,
      total,
      paidAmount: paid,
      dueAmount: due,
      costTotal,
      profit,
      paymentMethod: 'cash',
      note,
      employee: req.user._id,
      date: date ? new Date(date) : new Date(),
    });

    if (paid > 0) {
      await CashTransaction.create({
        type: 'in',
        amount: paid,
        source: 'sale',
        reference: sale._id,
        referenceModel: 'Sale',
        description: `Sale ${invoiceNo}${customer.name ? ` - ${customer.name}` : ''}`,
        paymentMethod: 'cash',
        employee: req.user._id,
        date: sale.date,
      });
    }
  } catch (error) {
    if (sale) await Sale.deleteOne({ _id: sale._id });
    await Promise.all(
      applied.map((line) =>
        Product.updateOne({ _id: line.product }, { $inc: { stockQty: line.quantity } })
      )
    );
    throw error;
  }

  await writeAudit(req, {
    action: 'SALE_CREATE',
    entity: 'Sale',
    entityId: sale._id,
    description: `Sale ${invoiceNo} for ${total} (profit ${profit})`,
    meta: { items: lineItems.length, paid, due, paymentMethod: 'cash' },
  });

  const populated = await Sale.findById(sale._id).populate('employee', 'name role');
  res.status(201).json({ sale: populated });
});

const collectPayment = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status !== 'completed') return res.status(400).json({ message: 'Cannot collect payment for a void sale' });

  const value = Number(amount);
  if (!value || value <= 0) return res.status(422).json({ message: 'Payment amount must be greater than zero' });
  if (value > sale.dueAmount) {
    return res.status(422).json({ message: `Payment exceeds the due amount (${sale.dueAmount})` });
  }

  sale.paidAmount = Number((sale.paidAmount + value).toFixed(2));
  sale.dueAmount = Number((sale.dueAmount - value).toFixed(2));
  if (sale.dueAmount === 0) sale.paymentMethod = 'cash';
  await sale.save();

  await CashTransaction.create({
    type: 'in',
    amount: value,
    source: 'invoice_payment',
    reference: sale._id,
    referenceModel: 'Sale',
    description: `Due payment for ${sale.invoiceNo}`,
    paymentMethod: 'cash',
    employee: req.user._id,
    date: new Date(),
  });

  await writeAudit(req, {
    action: 'PAYMENT_COLLECT',
    entity: 'Sale',
    entityId: sale._id,
    description: `Collected ${value} due payment for ${sale.invoiceNo}`,
  });

  res.json({ sale });
});

const voidSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ message: 'Sale not found' });
  if (sale.status === 'void') return res.status(400).json({ message: 'Sale is already void' });

  await Promise.all(
    sale.items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stockQty: item.quantity - (item.returnedQty || 0) } })
    )
  );

  if (sale.paidAmount > 0) {
    await CashTransaction.create({
      type: 'out',
      amount: sale.paidAmount,
      source: 'refund',
      reference: sale._id,
      referenceModel: 'Sale',
      description: `Refund for void sale ${sale.invoiceNo}`,
      paymentMethod: 'cash',
      employee: req.user._id,
      date: new Date(),
    });
  }

  sale.status = 'void';
  await sale.save();

  await writeAudit(req, {
    action: 'SALE_VOID',
    entity: 'Sale',
    entityId: sale._id,
    description: `Voided sale ${sale.invoiceNo}`,
    meta: { total: sale.total, refunded: sale.paidAmount },
  });

  res.json({ sale });
});

module.exports = { listSales, getSale, createSale, collectPayment, voidSale };
