const express = require('express');
const router = express.Router();
const { getDashboardStats, getYearlyStats, getNotifications, markNotificationRead, markAllRead } = require('../controllers/statsController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', getDashboardStats);
router.get('/yearly', getYearlyStats);
router.get('/notifications', getNotifications);
router.patch('/notifications/:id/read', markNotificationRead);
router.patch('/notifications/read-all', markAllRead);

module.exports = router;
