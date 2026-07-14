const { pool, ensureTablesExist } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await ensureTablesExist();

        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM site_settings');
            const settings = {};
            rows.forEach(r => {
                settings[r.setting_key] = r.setting_value;
            });
            res.status(200).json(settings);
        } else {
            res.status(405).json({ error: 'Método não permitido.' });
        }
    } catch (err) {
        console.error('Erro ao consultar configurações:', err);
        res.status(500).json({ error: 'Erro interno ao consultar configurações.' });
    }
};
