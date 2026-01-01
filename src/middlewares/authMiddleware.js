
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Header'dan 'Authorization' bilgisini al
    const authHeader = req.headers['authorization'];

    // 'Authorization' header yoksa veya 'Bearer ' ile başlamıyorsa hata dön
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // "Bearer " kısmını atarak sadece token'ı al
    const token = authHeader.split(' ')[1];

    try {
        // Token'ı doğrula
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret_key');

        // Çözülen payload'u request objesine ekle
        // Böylece sonraki middleware veya route handler'lar bu bilgiye erişebilir
        req.user = {
            id: decoded.id,
            tenant_id: decoded.tenant_id,
            role: decoded.role
        };

        // Sonraki işleme devam et
        next();
    } catch (error) {
        // Token geçersizse veya süresi dolmuşsa hata dön
        console.error('Auth Middleware Error:', error);
        return res.status(401).json({ message: 'Invalid token.' });
    }
};

module.exports = authMiddleware;
