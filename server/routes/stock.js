const express = require('express');
const { body } = require('express-validator');
const { listStock, addStock } = require('../controllers/stockController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/', listStock);
router.post(
  '/',
  body('product').isMongoId().withMessage('Select a product'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be valid'),
  validate,
  addStock
);

module.exports = router;
