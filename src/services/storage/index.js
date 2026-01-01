// backend/src/services/storage/index.js
const local = require('./local');
const s3 = require('./s3');

const driver = process.env.STORAGE_DRIVER || 'local';

let storageService;

switch (driver) {
  case 's3':
    storageService = s3;
    console.log('Storage Service: Using S3');
    break;
  case 'local':
  default:
    storageService = local;
    console.log('Storage Service: Using Local');
    break;
}

module.exports = storageService;
