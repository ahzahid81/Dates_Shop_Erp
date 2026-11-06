const express = require('express');
const { body, param } = require('express-validator');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  productCategories,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(protect);

router.get('/categories/meta', productCategories);
router.get('/', listProducts);
router.get('/:id', param('id').isMongoId(), validate, getProduct);

router.post(
  '/',
  authorize('admin'),
  body('name').trim().isLength({ min: 2 }).withMessage('Product name is required'),
  body('sellPrice').isFloat({ min: 0 }).withMessage('Selling price must be valid'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be valid'),
  validate,
  createProduct
);

router.put('/:id', authorize('admin'), param('id').isMongoId(), validate, updateProduct);
router.delete('/:id', authorize('admin'), param('id').isMongoId(), validate, deleteProduct);

module.exports = router;
