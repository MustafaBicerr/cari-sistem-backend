// backend/src/controllers/productController.js
const db = require('../config/db');
const storageService = require('../services/storage'); // Storage Abstraction
const { normalizeText } = require('../utils/textUtils');

// Yeni ürün oluşturma fonksiyonu
const createProduct = async (req, res) => {
    const tenant_id = req.user.tenant_id.toString();
    const file = req.file; 
    const { name, barcode, buy_price, sell_price, current_stock } = req.body;

    if (!name || !barcode || !buy_price || !sell_price || !current_stock) {
        return res.status(400).json({ message: 'All fields (name, barcode, buy_price, sell_price, current_stock) are required' });
    }

    let imagePath = null;
    try {
        // 1. Resim varsa, Storage Service'i kullanarak yükle
        if (file) {
            // Dosyayı tenant'a özel bir "klasöre" yükle
            // Dönen path, veritabanına kaydedilecek olan relative path'tir.
            imagePath = await storageService.upload(file, tenant_id);
        }

        const normalized_name = normalizeText(name);

        // 2. Ürün bilgilerini ve resim yolunu veritabanına kaydet
        const productQuery = `
            INSERT INTO products (tenant_id, name, normalized_name, barcode, buy_price, sell_price, current_stock, image_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;
        const values = [tenant_id, name, normalized_name, barcode, buy_price, sell_price, current_stock, imagePath];
        
        const { rows } = await db.query(productQuery, values);

        // 3. Başarılı response hazırla
        const createdProduct = rows[0];
        // Frontend'in doğrudan kullanabilmesi için tam URL'i oluştur
        createdProduct.full_image_url = storageService.getURL(createdProduct.image_url);

        res.status(201).json({ message: 'Product created successfully!', product: createdProduct });

    } catch (error) {
        console.error('Create Product Error:', error);
        if (error.code === '23505' && error.constraint && error.constraint.includes('barcode')) {
            return res.status(409).json({ message: 'A product with this barcode already exists for this tenant.' });
        }
        // Storage'dan veya DB'den gelen diğer hatalar
        res.status(500).json({ message: error.message || 'An error occurred while creating the product.' });
    }
};

// Ürünleri listeleme fonksiyonu
const getProducts = async (req, res) => {
    const tenant_id = req.user.tenant_id;

    try {
        const productQuery = 'SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC';
        const { rows } = await db.query(productQuery, [tenant_id]);

        // Veritabanındaki her ürün için 'image_url' alanını tam bir HTTP linkine dönüştürüyoruz.
        const productsWithImages = rows.map(product => {
            return {
                ...product,
                // Storage service üzerinden tam URL'i alıyoruz.
                full_image_url: storageService.getURL(product.image_url)
            };
        });

        res.status(200).json(productsWithImages);

    } catch (error) {
        console.error('Get Products Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching products.' });
    }
};

// Ürün güncelleme fonksiyonu
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id.toString();
    const file = req.file;
    
    // Dinamik güncelleme için alanları hazırla
    const updates = [];
    const values = [];
    let paramIndex = 1;

    // req.body içindeki izin verilen alanları kontrol et
    const allowedFields = ['name', 'buy_price', 'sell_price', 'current_stock', 'low_stock_limit', 'tax_rate', 'unit_type'];
    
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(req.body[field]);
            paramIndex++;

            if (field === 'name') {
                updates.push(`normalized_name = $${paramIndex}`);
                values.push(normalizeText(req.body[field]));
                paramIndex++;
            }
        }
    });

    try {
        // 1. Ürünün varlığını ve yetkiyi kontrol et
        const checkQuery = 'SELECT id, image_url FROM products WHERE id = $1 AND tenant_id = $2';
        const checkResult = await db.query(checkQuery, [id, tenant_id]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found or access denied.' });
        }

        const currentProduct = checkResult.rows[0];
        const oldImageUrl = currentProduct.image_url;

        // 2. Resim varsa yükle ve güncelleme listesine ekle
        if (file) {
            const imagePath = await storageService.upload(file, tenant_id);
            updates.push(`image_url = $${paramIndex}`);
            values.push(imagePath);
            paramIndex++;
        }

        // 3. Güncellenecek alan yoksa hata dön
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields provided for update.' });
        }

        // 4. updated_at alanını ekle
        updates.push('updated_at = CURRENT_TIMESTAMP');

        // 5. Dinamik SQL sorgusunu oluştur
        const updateQuery = `
            UPDATE products 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
            RETURNING *
        `;
        
        values.push(id, tenant_id);

        const { rows } = await db.query(updateQuery, values);
        const updatedProduct = rows[0];
        updatedProduct.full_image_url = storageService.getURL(updatedProduct.image_url);

        // Eğer yeni resim yüklendiyse ve eski resim varsa, fiziksel dosyayı sil
        if (file && oldImageUrl) {
            await storageService.deleteFile(oldImageUrl);
        }

        res.status(200).json({ message: 'Product updated successfully!', product: updatedProduct });

    } catch (error) {
        console.error('Update Product Error:', error);
        res.status(500).json({ message: 'An error occurred while updating the product.' });
    }
};

// Ürün silme fonksiyonu
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id;

    try {
        const deleteQuery = 'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING *';
        const { rowCount } = await db.query(deleteQuery, [id, tenant_id]);

        if (rowCount === 0) {
            return res.status(404).json({ message: 'Product not found or access denied.' });
        }

        res.status(200).json({ message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Delete Product Error:', error);
        res.status(500).json({ message: 'An error occurred while deleting the product.' });
    }
};

module.exports = {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
};