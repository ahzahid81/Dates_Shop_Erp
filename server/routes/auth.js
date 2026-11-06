const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { login, me, changePassword, listUsers, createUser, updateUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

router.post(
  '/login',
  loginLimiter,
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
  login
);

router.get('/me', protect, me);
router.put(
  '/password',
  protect,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  validate,
  changePassword
);

router.get('/users', protect, authorize('admin'), listUsers);
router.post(
  '/users',
  protect,
  authorize('admin'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'employee']).withMessage('Invalid role'),
  validate,
  createUser
);
router.put('/users/:id', protect, authorize('admin'), updateUser);

module.exports = router;
