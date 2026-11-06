const express = require('express');
const { body, param } = require('express-validator');
const { listExpenses, createExpense, deleteExpense } = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/', listExpenses);
router.post(
  '/',
  body('title').trim().isLength({ min: 2 }).withMessage('Expense title is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
  validate,
  createExpense
);
router.delete('/:id', authorize('admin'), param('id').isMongoId(), validate, deleteExpense);

module.exports = router;
