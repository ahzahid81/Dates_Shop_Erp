const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/', listAuditLogs);

module.exports = router;
