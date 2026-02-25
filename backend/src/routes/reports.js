const express = require('express');
const router = express.Router();
const { getExportData, getCategoryBreakdown, createBackup, restoreBackup } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/export', getExportData);
router.get('/category-breakdown', getCategoryBreakdown);
router.get('/backup', createBackup);
router.post('/restore', restoreBackup);

module.exports = router;
