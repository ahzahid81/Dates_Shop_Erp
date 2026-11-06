const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const StockEntry = require('../models/StockEntry');
const CashTransaction = require('../models/CashTransaction');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { dayRange, monthRange, dateRangeFromQuery, shiftDays } = require('../utils/dateRange');
const { localDateKey } = require('../utils/sequence');
const { toCsv } = require('../utils/csv');

const TZ = 'Asia/Riyadh';

const sumCash = async (match = {}) => {
  const rows = await CashTransaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  const inTotal = rows.find((r) => r._id === 'in')?.total || 0;
  const outTotal = rows.find((r) => r._id === 'out')?.total || 0;
  return {
    cashIn: Number(inTotal.toFixed(2)),
    cashOut: Number(outTotal.toFixed(2)),
    net: Number((inTotal - outTotal).toFixed(2)),
  };
};

const getCashBalance = async () => {
  const { net } = await sumCash();
  return net;
};

const dailySummary = asyncHandler(async (req, res) => {
  const { start, end } = dayRange(req.query.date);

  const [salesAgg, expenseAgg, stockAgg, cash, balance, sales, expenses, stockEntries] = await Promise.all([
    Sale.aggregate([
      { $match: { date: { $gte: start, $lt: end }, status: 'completed' } },
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
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    StockEntry.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    sumCash({ date: { $gte: start, $lt: end } }),
    getCashBalance(),
    Sale.find({ date: { $gte: start, $lt: end } })
      .populate('employee', 'name')
      .sort({ date: -1 })
      .lean(),
    Expense.find({ date: { $gte: start, $lt: end } }).populate('employee', 'name').sort({ date: -1 }).lean(),
    StockEntry.find({ date: { $gte: start, $lt: end } }).populate('employee', 'name').sort({ date: -1 }).lean(),
  ]);

  const s = salesAgg[0] || { sales: 0, paid: 0, due: 0, profit: 0, count: 0 };
  const e = expenseAgg[0] || { amount: 0, count: 0 };
  const st = stockAgg[0] || { amount: 0, count: 0 };

  res.json({
    date: req.query.date || localDateKey(),
    summary: {
      sales: s.sales,
      paid: s.paid,
      due: s.due,
      salesCount: s.count,
      expenses: e.amount,
      expenseCount: e.count,
      stockPurchases: st.amount,
      stockCount: st.count,
      grossProfit: s.profit,
      netProfit: Number((s.profit - e.amount).toFixed(2)),
      cashIn: cash.cashIn,
      cashOut: cash.cashOut,
      dayCashNet: cash.net,
      cashBalance: balance,
    },
    sales,
    expenses,
    stockEntries,
  });
});

const previousMonthKey = (start) => {
  const shifted = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const [y, m] = localDateKey(shifted).split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}`;
};

const monthlySummary = asyncHandler(async (req, res) => {
  const { start, end } = monthRange(req.query.month);
  const prevKey = previousMonthKey(start);
  const prev = monthRange(prevKey);

  const salesMatch = { date: { $gte: start, $lt: end }, status: 'completed' };
  const prevSalesMatch = { date: { $gte: prev.start, $lt: prev.end }, status: 'completed' };

  const [
    salesAgg,
    expenseAgg,
    stockAgg,
    cash,
    balance,
    dailySales,
    dailyExpenses,
    topProducts,
    payments,
    prevSalesAgg,
    prevExpenseAgg,
    prevStockAgg,
  ] = await Promise.all([
    Sale.aggregate([
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          sales: { $sum: '$total' },
          subtotal: { $sum: '$subtotal' },
          paid: { $sum: '$paidAmount' },
          due: { $sum: '$dueAmount' },
          profit: { $sum: '$profit' },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    StockEntry.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    sumCash({ date: { $gte: start, $lt: end } }),
    getCashBalance(),
    Sale.aggregate([
      { $match: salesMatch },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, total: { $sum: '$total' } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, total: { $sum: '$amount' } } },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
          cost: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
          profit: { $sum: '$items.profit' },
        },
      },
      { $sort: { profit: -1 } },
      { $limit: 10 },
    ]),
    Sale.aggregate([
      { $match: salesMatch },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Sale.aggregate([
      { $match: prevSalesMatch },
      { $group: { _id: null, sales: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: prev.start, $lt: prev.end } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    StockEntry.aggregate([
      { $match: { date: { $gte: prev.start, $lt: prev.end } } },
      { $group: { _id: null, amount: { $sum: '$totalCost' } } },
    ]),
  ]);

  const s = salesAgg[0] || { sales: 0, subtotal: 0, paid: 0, due: 0, profit: 0, count: 0 };
  const e = expenseAgg[0] || { amount: 0, count: 0 };
  const st = stockAgg[0] || { amount: 0, count: 0 };

  const salesMap = new Map(dailySales.map((d) => [d._id, d.total]));
  const expenseMap = new Map(dailyExpenses.map((d) => [d._id, d.total]));
  const daysInMonth = Math.round((end - start) / (24 * 60 * 60 * 1000));
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const date = localDateKey(shiftDays(start, i));
    return { date, sales: salesMap.get(date) || 0, expenses: expenseMap.get(date) || 0 };
  });

  const prevSales = prevSalesAgg[0] || { sales: 0, profit: 0, count: 0 };
  const prevExpense = prevExpenseAgg[0] || { amount: 0 };
  const prevStock = prevStockAgg[0] || { amount: 0 };
  const change = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  };

  res.json({
    month: req.query.month || localDateKey().slice(0, 7),
    summary: {
      sales: s.sales,
      subtotal: s.subtotal,
      paid: s.paid,
      due: s.due,
      salesCount: s.count,
      expenses: e.amount,
      expenseCount: e.count,
      stockPurchases: st.amount,
      stockCount: st.count,
      grossProfit: s.profit,
      netProfit: Number((s.profit - e.amount).toFixed(2)),
      margin: s.sales ? Number(((s.profit / s.sales) * 100).toFixed(2)) : 0,
      cashIn: cash.cashIn,
      cashOut: cash.cashOut,
      cashBalance: balance,
      previous: {
        sales: prevSales.sales,
        profit: prevSales.profit,
        expenses: prevExpense.amount,
        stockPurchases: prevStock.amount,
        salesCount: prevSales.count,
        netProfit: Number((prevSales.profit - prevExpense.amount).toFixed(2)),
      },
      change: {
        sales: change(s.sales, prevSales.sales),
        profit: change(s.profit, prevSales.profit),
        expenses: change(e.amount, prevExpense.amount),
        netProfit: change(s.profit - e.amount, prevSales.profit - prevExpense.amount),
      },
    },
    daily,
    topProducts,
    payments,
  });
});

const dashboard = asyncHandler(async (req, res) => {
  const today = dayRange();
  const weekStart = shiftDays(today.start, -6);
  const thisMonth = monthRange();
  const sixMonthsStart = monthRange(localDateKey(shiftDays(thisMonth.start, -150)).slice(0, 7)).start;

  const [todaySales, todayExpenses, todayCash, balance, lowStock, recentSales, weekSales, weekExpenses, monthly, topProducts, counts] =
    await Promise.all([
      Sale.aggregate([
        { $match: { date: { $gte: today.start, $lt: today.end }, status: 'completed' } },
        { $group: { _id: null, sales: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 }, due: { $sum: '$dueAmount' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: today.start, $lt: today.end } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      sumCash({ date: { $gte: today.start, $lt: today.end } }),
      getCashBalance(),
      Product.find({ isActive: true, $expr: { $lte: ['$stockQty', '$lowStockThreshold'] } })
        .select('name sku stockQty lowStockThreshold unit')
        .sort({ stockQty: 1 })
        .limit(8)
        .lean(),
      Sale.find({ status: 'completed' })
        .populate('employee', 'name')
        .sort({ date: -1 })
        .limit(6)
        .lean(),
      Sale.aggregate([
        { $match: { date: { $gte: weekStart, $lt: today.end }, status: 'completed' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, sales: { $sum: '$total' }, profit: { $sum: '$profit' } } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: weekStart, $lt: today.end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } }, expenses: { $sum: '$amount' } } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: sixMonthsStart, $lt: thisMonth.end }, status: 'completed' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date', timezone: TZ } }, sales: { $sum: '$total' }, profit: { $sum: '$profit' } } },
        { $sort: { _id: 1 } },
      ]),
      Sale.aggregate([
        { $match: { date: { $gte: thisMonth.start, $lt: thisMonth.end }, status: 'completed' } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', name: { $first: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' }, profit: { $sum: '$items.profit' } } },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),
      Promise.all([Product.countDocuments({ isActive: true }), Sale.countDocuments(), Expense.countDocuments()]),
    ]);

  const weeklySalesMap = new Map(weekSales.map((d) => [d._id, d]));
  const weeklyExpenseMap = new Map(weekExpenses.map((d) => [d._id, d.expenses]));
  const weekly = Array.from({ length: 7 }, (_, i) => {
    const date = localDateKey(shiftDays(weekStart, i));
    return {
      date,
      sales: weeklySalesMap.get(date)?.sales || 0,
      profit: weeklySalesMap.get(date)?.profit || 0,
      expenses: weeklyExpenseMap.get(date) || 0,
    };
  });

  const ts = todaySales[0] || { sales: 0, profit: 0, count: 0, due: 0 };
  const te = todayExpenses[0] || { amount: 0, count: 0 };

  res.json({
    today: {
      sales: ts.sales,
      profit: ts.profit,
      salesCount: ts.count,
      due: ts.due,
      expenses: te.amount,
      expenseCount: te.count,
      netProfit: Number((ts.profit - te.amount).toFixed(2)),
      cashIn: todayCash.cashIn,
      cashOut: todayCash.cashOut,
      cashBalance: balance,
    },
    weekly,
    monthly,
    topProducts,
    lowStock,
    recentSales,
    counts: { products: counts[0], sales: counts[1], expenses: counts[2] },
  });
});

const cashSummary = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const today = dayRange();
  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 30, 1), 200);

  const [balance, todayCash, allTime, transactions, total, seriesRaw] = await Promise.all([
    getCashBalance(),
    sumCash({ date: { $gte: today.start, $lt: today.end } }),
    sumCash(),
    CashTransaction.find()
      .populate('employee', 'name')
      .sort({ date: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    CashTransaction.countDocuments(),
    CashTransaction.aggregate([
      { $match: { date: { $gte: shiftDays(today.start, -13), $lt: today.end } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: TZ } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const seriesMap = new Map();
  seriesRaw.forEach((row) => {
    const item = seriesMap.get(row._id.date) || { date: row._id.date, in: 0, out: 0 };
    item[row._id.type] = row.total;
    seriesMap.set(row._id.date, item);
  });
  const series = Array.from({ length: 14 }, (_, i) => {
    const date = localDateKey(shiftDays(today.start, i - 13));
    return seriesMap.get(date) || { date, in: 0, out: 0 };
  });

  res.json({
    balance,
    today: todayCash,
    allTime,
    transactions,
    total,
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    series,
  });
});

const addCashAdjustment = asyncHandler(async (req, res) => {
  const { type, amount, description, date } = req.body;
  const value = Number(amount);
  if (!['in', 'out'].includes(type)) return res.status(422).json({ message: 'Type must be in or out' });
  if (!value || value <= 0) return res.status(422).json({ message: 'Amount must be greater than zero' });

  const tx = await CashTransaction.create({
    type,
    amount: value,
    source: 'adjustment',
    referenceModel: 'Manual',
    description: description || 'Manual cash adjustment',
    paymentMethod: 'cash',
    employee: req.user._id,
    date: date ? new Date(date) : new Date(),
  });

  await writeAudit(req, {
    action: 'CASH_ADJUST',
    entity: 'CashTransaction',
    entityId: tx._id,
    description: `Manual cash ${type} of ${value}`,
  });

  res.status(201).json({ transaction: tx, balance: await getCashBalance() });
});

const profitReport = asyncHandler(async (req, res) => {
  const { start, end } = dateRangeFromQuery(req.query.from, req.query.to);
  const match = { date: { $gte: start, $lt: end }, status: 'completed' };

  const [overall, products, expenseAgg] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, cost: { $sum: '$costTotal' }, profit: { $sum: '$profit' }, count: { $sum: 1 }, items: { $sum: { $size: '$items' } } } },
    ]),
    Sale.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: { product: '$items.product', name: '$items.name', sku: '$items.sku' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
          cost: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
          profit: { $sum: '$items.profit' },
        },
      },
      { $sort: { profit: -1 } },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lt: end } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
  ]);

  const o = overall[0] || { revenue: 0, cost: 0, profit: 0, count: 0, items: 0 };
  const expenses = expenseAgg[0]?.amount || 0;
  const rows = products.map((p) => ({
    productId: p._id.product,
    name: p._id.name,
    sku: p._id.sku,
    quantity: p.quantity,
    revenue: Number(p.revenue.toFixed(2)),
    cost: Number(p.cost.toFixed(2)),
    profit: Number(p.profit.toFixed(2)),
    margin: p.revenue ? Number(((p.profit / p.revenue) * 100).toFixed(2)) : 0,
  }));

  res.json({
    range: { from: req.query.from || null, to: req.query.to || null },
    overall: {
      revenue: o.revenue,
      cost: o.cost,
      grossProfit: o.profit,
      expenses,
      netProfit: Number((o.profit - expenses).toFixed(2)),
      margin: o.revenue ? Number(((o.profit / o.revenue) * 100).toFixed(2)) : 0,
      netMargin: o.revenue ? Number((((o.profit - expenses) / o.revenue) * 100).toFixed(2)) : 0,
      salesCount: o.count,
      itemsSold: o.items,
    },
    products: rows,
  });
});

const getStatement = asyncHandler(async (req, res) => {
  const { from, to, type = 'all', employee, format } = req.query;
  const { start, end } = dateRangeFromQuery(from, to);
  const rows = [];

  const wants = (t) => type === 'all' || type === t;

  const saleFilter = { date: { $gte: start, $lt: end }, status: 'completed' };
  const expenseFilter = { date: { $gte: start, $lt: end } };
  const stockFilter = { date: { $gte: start, $lt: end } };

  const [sales, expenses, stock, adjustments] = await Promise.all([
    wants('sales')
      ? Sale.find(saleFilter).populate('employee', 'name').sort({ date: 1 }).limit(5000).lean()
      : [],
    wants('expenses')
      ? Expense.find(expenseFilter).populate('employee', 'name').sort({ date: 1 }).limit(5000).lean()
      : [],
    wants('stock')
      ? StockEntry.find(stockFilter).populate('employee', 'name').sort({ date: 1 }).limit(5000).lean()
      : [],
    wants('adjustments')
      ? CashTransaction.find({ date: { $gte: start, $lt: end }, source: 'adjustment' })
          .populate('employee', 'name')
          .sort({ date: 1 })
          .limit(5000)
          .lean()
      : [],
  ]);

  sales.forEach((s) => {
    rows.push({
      date: s.date,
      category: 'Sale',
      reference: s.invoiceNo,
      description: `${s.customer?.name || 'Walk-in'}${s.dueAmount ? ` (Due ${s.dueAmount})` : ''}`,
      employee: s.employee?.name || '-',
      employeeId: s.employee?._id,
      direction: 'in',
      amount: s.total,
      method: s.paymentMethod,
      _id: s._id,
    });
  });
  expenses.forEach((e) => {
    rows.push({
      date: e.date,
      category: 'Expense',
      reference: e.receiptNo || e.category,
      description: e.title,
      employee: e.employee?.name || '-',
      employeeId: e.employee?._id,
      direction: 'out',
      amount: e.amount,
      method: e.paymentMethod,
      _id: e._id,
    });
  });
  stock.forEach((s) => {
    rows.push({
      date: s.date,
      category: 'Stock Purchase',
      reference: s.supplier || 'Supplier',
      description: `${s.productName} x ${s.quantity}`,
      employee: s.employee?.name || '-',
      employeeId: s.employee?._id,
      direction: 'out',
      amount: s.totalCost,
      method: s.paymentMethod,
      _id: s._id,
    });
  });
  adjustments.forEach((a) => {
    rows.push({
      date: a.date,
      category: 'Cash Adjustment',
      reference: 'Manual',
      description: a.description,
      employee: a.employee?.name || '-',
      employeeId: a.employee?._id,
      direction: a.type,
      amount: a.amount,
      method: a.paymentMethod,
      _id: a._id,
    });
  });

  if (employee) {
    const filtered = rows.filter((r) => String(r.employeeId) === String(employee));
    rows.length = 0;
    rows.push(...filtered);
  }

  rows.sort((a, b) => new Date(a.date) - new Date(b.date));
  const totals = rows.reduce(
    (acc, r) => {
      if (r.direction === 'in') acc.income += r.amount;
      else acc.expense += r.amount;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const payload = {
    range: { from: from || null, to: to || null },
    totals: {
      income: Number(totals.income.toFixed(2)),
      expense: Number(totals.expense.toFixed(2)),
      net: Number((totals.income - totals.expense).toFixed(2)),
      count: rows.length,
    },
    rows,
  };

  if (format === 'csv') {
    const csv = toCsv(rows, [
      { label: 'Date', value: (r) => new Date(r.date).toISOString() },
      { label: 'Category', value: (r) => r.category },
      { label: 'Reference', value: (r) => r.reference },
      { label: 'Description', value: (r) => r.description },
      { label: 'Employee', value: (r) => r.employee },
      { label: 'Direction', value: (r) => r.direction },
      { label: 'Amount', value: (r) => r.amount },
      { label: 'Method', value: (r) => r.method },
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="statement-${from || 'start'}-to-${to || 'today'}.csv"`
    );
    return res.send(csv);
  }

  res.json(payload);
});

module.exports = {
  dailySummary,
  monthlySummary,
  dashboard,
  cashSummary,
  addCashAdjustment,
  profitReport,
  getStatement,
};
