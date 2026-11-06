const AuditLog = require('../models/AuditLog');

const writeAudit = async (req, { action, entity, entityId, description, meta }) => {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name,
      role: req.user?.role,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      description,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      meta,
    });
  } catch (error) {
    console.error('Audit log failed:', error.message);
  }
};

module.exports = { writeAudit };
