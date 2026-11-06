const express = require('express');
const { body } = require('express-validator');
const {
  dailySummary,
  monthlySummary,
  dashboard,
  cashSummary,
  addCashAdjustment,
  profitReport,
  getStatement,
} = require('../controllers/summaryController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/dashboard', dashboard);
router.get('/daily', dailySummary);
router.get('/monthly', monthlySummary);
router.get('/cash', cashSummary);
router.get('/profit', profitReport);
router.get('/statement', getStatement);
router.post(
  '/cash/adjustment',
  body('type').isIn(['in', 'out']).withMessage('Invalid adjustment type'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  validate,
  addCashAdjustment
);

module.exports = router;
