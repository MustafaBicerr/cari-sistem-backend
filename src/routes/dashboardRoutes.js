
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/dashboard/summary - Dashboard özet verilerini getir (Authentication Gerekli)
router.get('/summary', authMiddleware, dashboardController.getDashboardSummary);

module.exports = router;
