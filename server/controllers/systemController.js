const AuditLog = require('../models/AuditLog');
const CashTransaction = require('../models/CashTransaction');
const ColdStorageEntry = require('../models/ColdStorageEntry');
const ColdStorageTransfer = require('../models/ColdStorageTransfer');
const Counter = require('../models/Counter');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const Sale = require('../models/Sale');
const StockEntry = require('../models/StockEntry');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { writeAudit } = require('../utils/audit');

const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL || 'abdulhasibzahid@gmail.com'
)
  .trim()
  .toLowerCase();

const RESET_TARGETS = [
  { key: 'sales', label: 'Sales', model: Sale },
  { key: 'quotations', label: 'Quotations', model: Quotation },
  { key: 'products', label: 'Products', model: Product },
  { key: 'stockEntries', label: 'Stock entries', model: StockEntry },
  { key: 'expenses', label: 'Expenses', model: Expense },
  { key: 'cashTransactions', label: 'Cash transactions', model: CashTransaction },
  { key: 'coldStorageEntries', label: 'Cold storage entries', model: ColdStorageEntry },
  { key: 'coldStorageTransfers', label: 'Cold storage transfers', model: ColdStorageTransfer },
  { key: 'counters', label: 'Sequence counters', model: Counter },
  { key: 'auditLogs', label: 'Audit logs', model: AuditLog },
];

const isSuperAdmin = (user) =>
  user?.role === 'admin' && String(user?.email || '').trim().toLowerCase() === SUPER_ADMIN_EMAIL;

const assertSuperAdmin = (req, res) => {
  if (isSuperAdmin(req.user)) return true;
  res.status(403).json({ message: 'Only the designated super admin can reset the database' });
  return false;
};

const resetPreview = asyncHandler(async (req, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const counts = {};
  for (const target of RESET_TARGETS) {
    counts[target.key] = await target.model.countDocuments();
  }

  res.json({
    superAdminEmail: SUPER_ADMIN_EMAIL,
    counts,
    retained: {
      users: await User.countDocuments(),
      admins: await User.countDocuments({ role: 'admin' }),
      employees: await User.countDocuments({ role: 'employee' }),
    },
  });
});

const resetDatabase = asyncHandler(async (req, res) => {
  if (!assertSuperAdmin(req, res)) return;

  const { password, confirmation } = req.body;
  if (String(confirmation || '').trim().toUpperCase() !== 'RESET DATABASE') {
    return res.status(422).json({ message: 'Type RESET DATABASE to confirm' });
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(String(password || '')))) {
    return res.status(401).json({ message: 'Your password is incorrect' });
  }

  const deleted = {};
  for (const target of RESET_TARGETS) {
    const result = await target.model.deleteMany({});
    deleted[target.key] = result.deletedCount || 0;
  }

  await writeAudit(req, {
    action: 'DATABASE_RESET',
    entity: 'System',
    description: `Full database reset by ${user.email} (employee accounts kept)`,
    meta: deleted,
  });

  res.json({
    message: 'Database reset complete. Employee and admin accounts were preserved.',
    deleted,
    retained: {
      users: await User.countDocuments(),
      employees: await User.countDocuments({ role: 'employee' }),
    },
  });
});

module.exports = { resetPreview, resetDatabase };
