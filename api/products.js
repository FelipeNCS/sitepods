const { pool, ensureTablesExist } = require('./db');

module.exports = async (req, res) => {
    // Configurações de CORS para Vercel
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await ensureTablesExist();

        if (req.method === 'GET') {
            const { action, model } = req.query;

            // Caso de obter todos os modelos únicos
            if (action === 'models') {
                const [rows] = await pool.query('SELECT DISTINCT model FROM products WHERE model IS NOT NULL AND TRIM(model) != ""');
                const models = rows.map(r => r.model);
                res.status(200).json(models);
                return;
            }

            // Caso padrão: Obter produtos
            let query = 'SELECT * FROM products';
            let params = [];

            if (model && model.toLowerCase() !== 'todos') {
                query += ' WHERE LOWER(model) LIKE ?';
                params.push(`%${model.toLowerCase().trim()}%`);
            }

            const [rows] = await pool.query(query, params);

            // Mapeia colunas para camelCase (especialmente imagePath)
            const formattedProducts = rows.map(row => ({
                id: row.id,
                name: row.name,
                description: row.description || '',
                price: Number(row.price),
                model: row.model,
                quantity: Number(row.quantity),
                imagePath: row.image_path || ''
            }));

            res.status(200).json(formattedProducts);
        } else {
            res.status(405).json({ error: 'Método não permitido.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao consultar produtos.' });
    }
};
