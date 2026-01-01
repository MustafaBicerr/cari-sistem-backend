
const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Kullanıcı kaydı (Register) fonksiyonu
const register = async (req, res) => {
    const { company_name, full_name, username, password } = req.body;

    // Gerekli alanların kontrolü
    if (!company_name || !full_name || !username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    const client = await db.getClient();

    try {
        // Transaction başlat
        await client.query('BEGIN');

        // 1. Yeni bir tenant (şirket) oluştur
        const tenantQuery = 'INSERT INTO tenants (name) VALUES ($1) RETURNING id';
        const tenantResult = await client.query(tenantQuery, [company_name]);
        const tenant_id = tenantResult.rows[0].id;

        // 2. Şifreyi hashle
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 3. Yeni kullanıcıyı 'ADMIN' rolüyle oluştur
        const userQuery = `
            INSERT INTO users (tenant_id, username, password_hash, full_name, role) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, full_name, username, role
        `;
        const userValues = [tenant_id, username, password_hash, full_name, 'ADMIN'];
        await client.query(userQuery, userValues);
        
        // Transaction'ı onayla
        await client.query('COMMIT');

        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        // Hata durumunda transaction'ı geri al
        await client.query('ROLLBACK');
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'An error occurred during registration.' });
    } finally {
        // Veritabanı istemcisini serbest bırak
        client.release();
    }
};

// Kullanıcı girişi (Login) fonksiyonu
const login = async (req, res) => {
    const { username, password } = req.body;

    // Gerekli alanların kontrolü
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // 1. Kullanıcıyı veritabanında bul
        const userQuery = 'SELECT * FROM users WHERE username = $1';
        const { rows } = await db.query(userQuery, [username]);
        const user = rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 2. Şifreyi karşılaştır
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 3. JWT oluştur
        const payload = {
            id: user.id,
            tenant_id: user.tenant_id,
            role: user.role,
            full_name: user.full_name,
        };

        // Token'ı gizli bir anahtar ile imzala (Environment variables'da saklanmalı)
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret_key', {
            expiresIn: '1h' // Token geçerlilik süresi
        });

        res.status(200).json({ token });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
};

module.exports = {
    register,
    login,
};
