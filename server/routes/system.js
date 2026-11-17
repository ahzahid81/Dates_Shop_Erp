const express = require('express');
const { resetPreview, resetDatabase } = require('../controllers/systemController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/reset-preview', resetPreview);
router.post('/reset', resetDatabase);

module.exports = router;
