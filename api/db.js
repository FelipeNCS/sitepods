const mysql = require('mysql2/promise');

const connectionString = process.env.MYSQL_URL;

if (!connectionString) {
    console.error('AVISO: A variável de ambiente MYSQL_URL está ausente!');
}

const pool = mysql.createPool(connectionString || 'mysql://root:JEAjJFODqIddekpJtUmFndQSXWZELTff@localhost:3306/railway');

let initialized = false;

// Função para garantir que as tabelas existem antes de qualquer query nas APIs
async function ensureTablesExist() {
    if (initialized) return;

    try {
        const connection = await pool.getConnection();
        
        // 1. Criar tabela de administradores
        await connection.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 2. Criar tabela de vendas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id BIGINT PRIMARY KEY,
                product VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                customer VARCHAR(255) NOT NULL,
                contact VARCHAR(100),
                shipping DECIMAL(10,2) DEFAULT 0.00,
                partner VARCHAR(50) NOT NULL,
                is_credit TINYINT(1) DEFAULT 0,
                due_date VARCHAR(100),
                interest_rate DECIMAL(5,2) DEFAULT 0.00,
                is_paid TINYINT(1) DEFAULT 0,
                sale_date VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 3. Criar tabela de produtos (pods da loja)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                model VARCHAR(100),
                quantity INT DEFAULT 0,
                image_path LONGTEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 4. Criar tabela de pedidos do WhatsApp
        await connection.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_orders (
                id BIGINT PRIMARY KEY,
                items TEXT NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 5. Criar tabela de configurações do site
        await connection.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // 6. Cadastrar o administrador inicial se a tabela estiver vazia
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM admins');
        if (rows[0].count === 0) {
            await connection.query(
                'INSERT INTO admins (username, password) VALUES (?, ?)',
                ['felipencs', '01102030']
            );
            console.log('Administrador inicial felipencs cadastrado.');
        }

        // 7. Cadastrar configurações iniciais do site se vazia
        const [rowsSettings] = await connection.query('SELECT COUNT(*) as count FROM site_settings');
        if (rowsSettings[0].count === 0) {
            await connection.query(
                `INSERT INTO site_settings (setting_key, setting_value) VALUES 
                 ('promo_active', '0'),
                 ('promo_text', '🔥 PROMOÇÃO ROLANDO! Desconto especial em compras no atacado!')`
            );
            console.log('Configurações iniciais do site cadastradas.');
        }

        connection.release();
        initialized = true;
        console.log('Tabelas do MySQL garantidas e inicializadas.');
    } catch (err) {
        console.error('Falha ao conectar ou inicializar o MySQL na Railway:', err);
        throw err;
    }
}

module.exports = {
    pool,
    ensureTablesExist
};
