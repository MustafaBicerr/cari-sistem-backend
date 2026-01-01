
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - Yeni kullanıcı ve şirket kaydı
router.post('/register', authController.register);

// POST /api/auth/login - Kullanıcı girişi
router.post('/login', authController.login);

module.exports = router;
