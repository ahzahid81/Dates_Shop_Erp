const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

const listAuditLogs = asyncHandler(async (req, res) => {
  const { search, action, entity, user, from, to, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ description: rx }, { userName: rx }, { entity: rx }, { action: rx }];
  }
  if (action) filter.action = action;
  if (entity) filter.entity = entity;
  if (user) filter.user = user;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      filter.createdAt.$lt = end;
    }
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 300);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page: pageNum, pages: Math.ceil(total / pageSize) });
});

module.exports = { listAuditLogs };
