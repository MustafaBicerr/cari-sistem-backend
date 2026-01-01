const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');


// GET /api/products/ - Tenant'a ait tüm ürünleri listele (Authentication Gerekli)
router.get('/', authMiddleware, productController.getProducts);

// POST /api/products/ - Yeni ürün oluştur (Authentication ve Resim Yükleme Gerekli)
// Resim dosyası 'image' key'i ile multipart/form-data olarak gönderilmelidir.
router.post('/', authMiddleware, upload.single('image'), productController.createProduct);

// PUT /api/products/:id - Mevcut ürünü güncelle
router.put('/:id', authMiddleware, upload.single('image'), productController.updateProduct);

// DELETE /api/products/:id - Ürünü sil
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
