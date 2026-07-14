const { pool, ensureTablesExist } = require('../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Auth Validation
    const cookieHeader = req.headers.cookie || '';
    if (!cookieHeader.includes('adminUser=')) {
        res.status(401).json({ error: 'Não autorizado.' });
        return;
    }

    try {
        await ensureTablesExist();

        // 1. GET: Fetch settings
        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM site_settings');
            const settings = {};
            rows.forEach(r => {
                settings[r.setting_key] = r.setting_value;
            });
            res.status(200).json(settings);
            return;
        }

        // 2. POST: Save/Update settings
        if (req.method === 'POST') {
            const { promo_active, promo_text } = req.body;

            const promoActiveValue = promo_active ? '1' : '0';
            const promoTextValue = promo_text || '';

            // Update database using REPLACE or INSERT ... ON DUPLICATE KEY UPDATE
            await pool.query(
                `INSERT INTO site_settings (setting_key, setting_value) 
                 VALUES ('promo_active', ?), ('promo_text', ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
                [promoActiveValue, promoTextValue]
            );

            res.status(200).json({ message: 'Configurações salvas com sucesso.' });
            return;
        }

        res.status(405).json({ error: 'Método não permitido.' });
    } catch (err) {
        console.error('Erro ao gerenciar configurações do admin:', err);
        res.status(500).json({ error: 'Erro interno ao salvar configurações.' });
    }
};
