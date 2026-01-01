// backend/src/services/storage/local.js
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // Benzersiz isimler için

// Projenin root'unda bir 'uploads' klasörü hedefliyoruz.
// __dirname: .../backend/src/services/storage
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

/**
 * Dosyayı local diske kaydeder.
 * @param {object} file - Multer'dan gelen dosya nesnesi (memoryStorage'dan)
 * @param {string} destination - Hedef klasör (örn: tenant_id)
 * @returns {Promise<string>} - Kaydedilen dosyanın relative path'i
 */
const upload = async (file, destination) => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  try {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const filename = `img_${uniqueSuffix}${ext}`;
    
    const tenantUploadPath = path.join(UPLOAD_DIR, destination);

    // Klasör yoksa oluştur
    if (!fs.existsSync(tenantUploadPath)) {
      fs.mkdirSync(tenantUploadPath, { recursive: true });
    }

    const fullPath = path.join(tenantUploadPath, filename);
    
    // Buffer'ı diske yaz
    await fs.promises.writeFile(fullPath, file.buffer);

    // Veritabanına kaydedilecek relative path'i döndür
    // Örn: uploads/101/img_12345.jpg
    const relativePath = path.join('uploads', destination, filename).replace(/\\/g, '/');
    
    return relativePath;
  } catch (error) {
    console.error('Error saving file to local storage:', error);
    // Hata durumunda null veya hata fırlatılabilir. Uygulama geneli error handling'e bağlı.
    throw new Error('Failed to save file.');
  }
};

/**
 * Dosya yolu için tam URL oluşturur.
 * @param {string} filePath - Veritabanında saklanan relative path
 * @returns {string} - Erişilebilir tam URL
 */
const getURL = (filePath) => {
    if (!filePath) return null;

    // Ortam değişkeninden base URL'i al, yoksa localhost fallback yap
    const baseUrl = process.env.ASSET_BASE_URL || 'http://localhost:3000';

    // Emin olmak için path'deki başlangıç slash'ını kaldıralım
    const cleanFilePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

    return `${baseUrl}/${cleanFilePath}`;
};

/**
 * Dosyayı fiziksel olarak siler (Silent Fail).
 * @param {string} filePath - Silinecek dosyanın relative path'i (örn: uploads/tenant/img.jpg)
 */
const deleteFile = async (filePath) => {
  if (!filePath) return;

  try {
    // __dirname: .../src/services/storage -> root: .../backend
    // filePath: uploads/...
    const fullPath = path.join(__dirname, '../../../', filePath);
    
    await fs.promises.unlink(fullPath);
  } catch (error) {
    console.error(`Error deleting file (${filePath}):`, error.message);
  }
};

module.exports = {
    upload,
    getURL,
    deleteFile,
};
