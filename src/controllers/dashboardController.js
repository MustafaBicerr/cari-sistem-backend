
const db = require('../config/db');

// Dashboard özet verilerini getiren fonksiyon
const getDashboardSummary = async (req, res) => {
    const tenant_id = req.user.tenant_id;

    try {
        // Tüm sorguları paralel olarak çalıştırmak için Promise.all kullanıyoruz.
        const [
            salesTodayResult,
            customerCountResult,
            lowStockCountResult,
            recentTransactionsResult
        ] = await Promise.all([
            // 1. Bugünün toplam satış tutarı
            db.query(
                `SELECT SUM(total_amount) as total
                 FROM transactions 
                 WHERE tenant_id = $1 AND DATE(created_at) = CURRENT_DATE`,
                [tenant_id]
            ),
            // 2. Toplam müşteri sayısı
            db.query(
                `SELECT COUNT(id) as total 
                 FROM customers 
                 WHERE tenant_id = $1`,
                [tenant_id]
            ),
            // 3. Stok seviyesi düşük ürün sayısı
            db.query(
                `SELECT COUNT(id) as total 
                 FROM products 
                 WHERE tenant_id = $1 AND current_stock < low_stock_limit`,
                [tenant_id]
            ),
            // 4. Son 5 işlem (Müşteri adıyla birlikte)
            db.query(
                `SELECT t.id, t.total_amount, t.created_at, c.full_name as customer_name
                 FROM transactions t
                 LEFT JOIN customers c ON t.customer_id = c.id
                 WHERE t.tenant_id = $1
                 ORDER BY t.created_at DESC
                 LIMIT 5`,
                [tenant_id]
            )
        ]);

        // Sonuçları tek bir JSON objesinde birleştir
        const summary = {
            total_sales_today: parseFloat(salesTodayResult.rows[0].total) || 0,
            total_customers: parseInt(customerCountResult.rows[0].total, 10),
            low_stock_count: parseInt(lowStockCountResult.rows[0].total, 10),
            recent_transactions: recentTransactionsResult.rows,
        };

        res.status(200).json(summary);

    } catch (error) {
        console.error('Get Dashboard Summary Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching dashboard summary.' });
    }
};

module.exports = {
    getDashboardSummary,
};
