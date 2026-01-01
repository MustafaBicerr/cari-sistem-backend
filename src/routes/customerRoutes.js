
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tüm müşteri rotaları için authentication middleware'ini kullan
router.use(authMiddleware);

// POST /api/customers/ - Yeni müşteri oluştur
router.post('/', customerController.createCustomer);

// GET /api/customers/ - Tenant'a ait tüm müşterileri ve hastalarını listele
router.get('/', customerController.getCustomers);

// POST /api/customers/:id/patients - Belirli bir müşteriye yeni hasta ekle
router.post('/:id/patients', customerController.addPatient);

module.exports = router;
