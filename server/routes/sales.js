const express = require('express');
const { body, param } = require('express-validator');
const {
  listSales,
  getSale,
  createSale,
  collectPayment,
  voidSale,
} = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listSales);
router.get('/:id', param('id').isMongoId(), validate, getSale);

router.post(
  '/',
  body('items').isArray({ min: 1 }).withMessage('Add at least one product'),
  body('items.*.product').isMongoId().withMessage('Invalid product'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Selling price must be valid'),
  validate,
  createSale
);

router.post(
  '/:id/payments',
  authorize('admin'),
  param('id').isMongoId(),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than zero'),
  validate,
  collectPayment
);

router.post('/:id/void', authorize('admin'), param('id').isMongoId(), validate, voidSale);

module.exports = router;
