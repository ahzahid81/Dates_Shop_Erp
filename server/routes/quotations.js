const express = require('express');
const { body, param } = require('express-validator');
const {
  listQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
} = require('../controllers/quotationController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect, authorize('admin'));

router.get('/', listQuotations);
router.get('/:id', param('id').isMongoId(), validate, getQuotation);
router.post(
  '/',
  body('customer.name').trim().isLength({ min: 2 }).withMessage('Customer name is required'),
  body('items').isArray({ min: 1 }).withMessage('Add at least one item'),
  validate,
  createQuotation
);
router.put('/:id', param('id').isMongoId(), validate, updateQuotation);
router.delete('/:id', param('id').isMongoId(), validate, deleteQuotation);

module.exports = router;
