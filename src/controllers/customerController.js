
const db = require('../config/db');

// Yeni müşteri oluşturma
const createCustomer = async (req, res) => {
    const { full_name, phone, email, address, tax_number } = req.body;
    const tenant_id = req.user.tenant_id;

    if (!full_name) {
        return res.status(400).json({ message: 'Full name is required.' });
    }

    try {
        const query = `
            INSERT INTO customers (tenant_id, full_name, phone, email, address, tax_number)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [tenant_id, full_name, phone, email, address, tax_number];
        const { rows } = await db.query(query, values);
        res.status(201).json({ message: 'Customer created successfully!', customer: rows[0] });
    } catch (error) {
        console.error('Create Customer Error:', error);
        res.status(500).json({ message: 'An error occurred while creating the customer.' });
    }
};

// Müşterileri ve hastalarını listeleme
const getCustomers = async (req, res) => {
    const tenant_id = req.user.tenant_id;

    try {
        // Subquery kullanarak her müşteriye ait hastaları bir JSON array olarak birleştiriyoruz.
        const query = `
            SELECT 
                c.*, 
                (
                    SELECT COALESCE(json_agg(p.*), '[]'::json)
                    FROM patients p 
                    WHERE p.customer_id = c.id
                ) as patients
            FROM customers c
            WHERE c.tenant_id = $1
            ORDER BY c.full_name;
        `;
        const { rows } = await db.query(query, [tenant_id]);
        res.status(200).json(rows);
    } catch (error) {
        console.error('Get Customers Error:', error);
        res.status(500).json({ message: 'An error occurred while fetching customers.' });
    }
};

// Bir müşteriye yeni hasta ekleme
const addPatient = async (req, res) => {
    const { id: customerId } = req.params; // URL'den müşteri ID'sini al
    const { name, type, breed, birth_date, chip_number } = req.body;
    const tenant_id = req.user.tenant_id;

    if (!name || !type) {
        return res.status(400).json({ message: 'Patient name and type are required.' });
    }

    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        // 1. Müşterinin varlığını ve bu tenant'a ait olup olmadığını kontrol et
        const customerCheckQuery = 'SELECT id FROM customers WHERE id = $1 AND tenant_id = $2';
        const customerCheckResult = await client.query(customerCheckQuery, [customerId, tenant_id]);

        if (customerCheckResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Customer not found or access denied for this tenant.' });
        }

        // 2. Yeni hastayı ekle
        const patientQuery = `
            INSERT INTO patients (customer_id, name, type, breed, birth_date, chip_number)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const patientValues = [customerId, name, type, breed, birth_date, chip_number];
        const { rows } = await client.query(patientQuery, patientValues);
        
        await client.query('COMMIT');
        
        res.status(201).json({ message: 'Patient added successfully!', patient: rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Add Patient Error:', error);
        res.status(500).json({ message: 'An error occurred while adding the patient.' });
    } finally {
        client.release();
    }
};


module.exports = {
    createCustomer,
    getCustomers,
    addPatient,
};
