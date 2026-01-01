const db = require('../config/db');

const createTables = async () => {
  try {
    console.log('⏳ Tablolar oluşturuluyor...');

    // 1. UUID Eklentisi (Olmazsa olmaz)
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // ---------------------------------------------------------
    // CORE MODULE (Yönetim)
    // ---------------------------------------------------------

    // 2. TENANTS (İşletmeler)
    await db.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        subscription_end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_exempt_payment BOOLEAN DEFAULT false, -- Amca/Dayı modu
        module_type VARCHAR(50) DEFAULT 'VET',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. BRANCHES (Şubeler)
    await db.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. USERS (Kullanıcılar)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
        full_name VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'CASHIER', -- 'ADMIN', 'VET', 'CASHIER'
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, username)
      );
    `);

    // ---------------------------------------------------------
    // PRODUCT MODULE (Ürün ve Stok)
    // ---------------------------------------------------------

    // 5. PRODUCTS (Ürünler)
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        barcode VARCHAR(100),
        image_url TEXT, -- Cloudflare R2 Linki
        buy_price DECIMAL(10, 2) DEFAULT 0,
        sell_price DECIMAL(10, 2) DEFAULT 0,
        tax_rate INT DEFAULT 0,
        current_stock DECIMAL(10, 2) DEFAULT 0,
        unit_type VARCHAR(50) DEFAULT 'PIECE', -- BOX, ML, KG
        low_stock_limit INT DEFAULT 10,
        attributes JSONB, -- { expiration_date: "...", type: "antibiotic" }
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---------------------------------------------------------
    // CRM MODULE (Müşteri İlişkileri)
    // ---------------------------------------------------------

    // 6. CUSTOMERS (Müşteriler - İnsanlar)
    await db.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(100),
        tax_number VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. PATIENTS (Hastalar - Hayvanlar)
    await db.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        chip_number VARCHAR(100),
        type VARCHAR(50), -- CAT, DOG
        breed VARCHAR(100), -- Golden, Tekir
        birth_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---------------------------------------------------------
    // FINANCE & SALES MODULE (Satış ve Borç)
    // ---------------------------------------------------------

    // 8. TRANSACTIONS (İşlem Başlığı)
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        total_amount DECIMAL(10, 2) DEFAULT 0,
        discount_amount DECIMAL(10, 2) DEFAULT 0,
        final_amount DECIMAL(10, 2) DEFAULT 0,
        payment_status VARCHAR(50) DEFAULT 'UNPAID', -- PAID, UNPAID, PARTIAL
        payment_method VARCHAR(50), -- CASH, CARD
        proof_image_url TEXT, -- Masadaki ürünlerin fotosu
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. TRANSACTION ITEMS (İşlem Detayları)
    await db.query(`
      CREATE TABLE IF NOT EXISTS transaction_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        snapshot_price DECIMAL(10, 2) NOT NULL, -- O anki fiyat (Değişmez)
        total_row_price DECIMAL(10, 2) NOT NULL
      );
    `);

    // 10. DEBTS (Borçlar)
    await db.query(`
      CREATE TABLE IF NOT EXISTS debts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        initial_amount DECIMAL(10, 2) NOT NULL,
        remaining_amount DECIMAL(10, 2) NOT NULL,
        is_inflation_protected BOOLEAN DEFAULT false, -- Senin istediğin özellik
        due_date DATE,
        status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, OVERDUE
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. DEBT HISTORY LOGS (Dinamik Borç Tarihçesi)
    await db.query(`
      CREATE TABLE IF NOT EXISTS debt_history_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
        change_amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(100), -- 'INITIAL', 'PAYMENT', 'PRICE_HIKE_UPDATE'
        related_product_id UUID, -- Hangi üründen zam yedi?
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ---------------------------------------------------------
    // LOGGING MODULE
    // ---------------------------------------------------------

    // 12. STOCK LOGS (Stok Hareketleri)
    await db.query(`
      CREATE TABLE IF NOT EXISTS stock_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        change_amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(50), -- 'SALE', 'PURCHASE', 'WASTE'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 13. AUDIT LOGS (Güvenlik Logları)
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50), -- 'DELETE', 'UPDATE'
        table_name VARCHAR(50),
        record_id UUID,
        old_data JSONB,
        new_data JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅✅ Mükemmel! BÜTÜN Tablolar (Core, CRM, Finance, Logs) Başarıyla Oluşturuldu.');
  } catch (error) {
    console.error('❌ Tablo oluşturma hatası:', error);
  } finally {
      // Bağlantıyı kapatmıyoruz çünkü pool kullanıyoruz, process bitecek zaten.
  }
};

createTables();