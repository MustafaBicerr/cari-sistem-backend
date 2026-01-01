const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
// Rotaları içe aktar
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');


const path = require('path');

// Environment değişkenlerini yükle
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// JSON verilerini okuyabilmesi için middleware
app.use(express.json());

// Uploads klasörünü public yapmak
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// Test Rotası (Health Check)
app.get('/', (req, res) => {
  res.json({
    message: 'Cari Sistem API çalışıyor! 🚀',
    timestamp: new Date(),
    status: 'OK'
  });
});

// Auth Rotaları
app.use('/api/auth', authRoutes);

// Product Rotaları
app.use('/api/products', productRoutes);

// Customer Rotaları
app.use('/api/customers', customerRoutes);

// Dashboard Rotaları
app.use('/api/dashboard', dashboardRoutes);

// Sunucuyu Başlat
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda başarıyla çalışıyor...`);
});
