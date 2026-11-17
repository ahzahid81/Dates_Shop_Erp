const express = require('express');
const { body } = require('express-validator');
const {
  getStockList,
  listEntries,
  addEntry,
  listTransfers,
  createTransfer,
  monthlyReport,
  yearlyReport,
} = require('../controllers/coldStorageController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/stock', getStockList);
router.get('/entries', listEntries);
router.post(
  '/entries',
  body('product').isMongoId().withMessage('Select a product'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unitCost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be valid'),
  validate,
  addEntry
);
router.get('/transfers', listTransfers);
router.post(
  '/transfers',
  body('product').isMongoId().withMessage('Select a product'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate,
  createTransfer
);
router.get('/reports/monthly', monthlyReport);
router.get('/reports/yearly', yearlyReport);

module.exports = router;
