const Expense = require('../models/Expense');
const CashTransaction = require('../models/CashTransaction');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');
const { dateRangeFromQuery } = require('../utils/dateRange');

const listExpenses = asyncHandler(async (req, res) => {
  const { from, to, employee, category, search, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (from || to) {
    const { start, end } = dateRangeFromQuery(from, to);
    filter.date = { $gte: start, $lt: end };
  }
  if (req.user.role === 'employee') filter.employee = req.user._id;
  else if (employee) filter.employee = employee;
  if (category) filter.category = category;
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: rx }, { note: rx }, { receiptNo: rx }];
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 500);

  const [expenses, total, totals] = await Promise.all([
    Expense.find(filter)
      .populate('employee', 'name role')
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  res.json({
    expenses,
    total,
    page: pageNum,
    pages: Math.ceil(total / pageSize),
    summary: totals[0] || { amount: 0, count: 0 },
  });
});

const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, note, receiptNo, date } = req.body;
  const value = Number(amount);
  if (!title || !String(title).trim()) return res.status(422).json({ message: 'Expense title is required' });
  if (!value || value <= 0) return res.status(422).json({ message: 'Amount must be greater than zero' });

  const expense = await Expense.create({
    title: String(title).trim(),
    category: category || 'General',
    amount: value,
    paymentMethod: 'cash',
    note,
    receiptNo,
    employee: req.user._id,
    date: date ? new Date(date) : new Date(),
  });

  await CashTransaction.create({
    type: 'out',
    amount: value,
    source: 'expense',
    reference: expense._id,
    referenceModel: 'Expense',
    description: `Expense: ${expense.title}`,
    paymentMethod: expense.paymentMethod,
    employee: req.user._id,
    date: expense.date,
  });

  await writeAudit(req, {
    action: 'EXPENSE_CREATE',
    entity: 'Expense',
    entityId: expense._id,
    description: `Recorded expense ${expense.title} of ${value}`,
    meta: { category: expense.category, paymentMethod: expense.paymentMethod },
  });

  const populated = await Expense.findById(expense._id).populate('employee', 'name role');
  res.status(201).json({ expense: populated });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: 'Expense not found' });

  await CashTransaction.deleteMany({ reference: expense._id, referenceModel: 'Expense' });
  await expense.deleteOne();

  await writeAudit(req, {
    action: 'EXPENSE_DELETE',
    entity: 'Expense',
    entityId: expense._id,
    description: `Deleted expense ${expense.title} of ${expense.amount}`,
  });

  res.json({ message: 'Expense deleted' });
});

module.exports = { listExpenses, createExpense, deleteExpense };
