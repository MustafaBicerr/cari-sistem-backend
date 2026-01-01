// backend/src/middlewares/uploadMiddleware.js
const multer = require('multer');

// Dosyaları disk yerine memory'de (RAM) buffer olarak tutar.
// Bu, dosyayı bir storage service'e (S3, GCS veya Local) göndermeden önce
// işlemek için en esnek yöntemdir.
const storage = multer.memoryStorage();

// Multer'ı yapılandır. Dosya boyutu limiti gibi ayarlar burada kalabilir.
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Max 10MB
});

module.exports = upload;