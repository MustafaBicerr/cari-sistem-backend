const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Veritabanına bağlanılamadı:', err.stack);
  }
  console.log('✅ PostgreSQL Veritabanına Bağlandı');
  release();
});

module.exports = {
  // Basit sorgular için
  query: (text, params) => pool.query(text, params),
  
  // Transaction (BEGIN/COMMIT) işlemleri için client'ı dışarı açıyoruz
  getClient: () => pool.connect(),
};