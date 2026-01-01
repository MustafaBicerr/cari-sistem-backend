// backend/src/services/storage/s3.js

// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const path = require('path');
// const { v4: uuidv4 } = require('uuid');

// // S3 Client'ı ortam değişkenleriyle yapılandır
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

/**
 * Dosyayı AWS S3'e yükler.
 * @param {object} file - Multer'dan gelen dosya nesnesi (memoryStorage'dan)
 * @param {string} destination - Hedef klasör (örn: tenant_id)
 * @returns {Promise<string>} - Kaydedilen S3 nesnesinin Key'i
 */
const upload = async (file, destination) => {
  // Bu kısım production'da S3 entegrasyonu yapıldığında doldurulacak.
  console.log('--- S3 Upload Logic (Placeholder) ---');
  
  /*
  ÖRNEK S3 YÜKLEME MANTIĞI:
  
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
  const ext = path.extname(file.originalname);
  const filename = `img_${uniqueSuffix}${ext}`;
  
  // S3'deki tam yol (object key)
  const objectKey = `${destination}/${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read', // Herkesin okuyabilmesi için (opsiyonel)
  });

  try {
    await s3Client.send(command);
    // Veritabanına sadece objectKey kaydedilir.
    return objectKey;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw new Error('Failed to save file to S3.');
  }
  */

  // Placeholder, şimdilik bir hata fırlatalım veya mock bir değer dönelim.
  throw new Error('S3 storage is not implemented yet.');
};

/**
 * S3 nesnesi için tam URL oluşturur.
 * @param {string} objectKey - Veritabanında saklanan S3 object key'i
 * @returns {string} - Erişilebilir tam URL
 */
const getURL = (objectKey) => {
  if (!objectKey) return null;

  // Base URL ortam değişkeninden alınır. Bu, S3 bucket URL'i veya bir CDN URL'i olabilir.
  const baseUrl = process.env.ASSET_BASE_URL;
  if (!baseUrl) {
    // S3 için base URL yoksa, manuel olarak oluşturulabilir (önerilmez)
    // const bucketName = process.env.AWS_S3_BUCKET_NAME;
    // const region = process.env.AWS_REGION;
    // return `https://${bucketName}.s3.${region}.amazonaws.com/${objectKey}`;
    console.warn('ASSET_BASE_URL is not set for S3 storage.');
    // Fallback olarak sadece key'i dönelim.
    return objectKey;
  }

  return `${baseUrl}/${objectKey}`;
};

module.exports = {
  upload,
  getURL,
};
