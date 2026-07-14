const { pool, ensureTablesExist } = require('./db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        await ensureTablesExist();

        if (req.method === 'POST') {
            const { id, items, total } = req.body;

            if (!id || !items || total === undefined) {
                res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
                return;
            }

            const createdAt = new Date().toLocaleString('pt-BR');

            await pool.query(
                `INSERT INTO whatsapp_orders (id, items, total, status, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [BigInt(id), items, Number(total), 'pending', createdAt]
            );

            res.status(201).json({ id: String(id), message: 'Pedido registrado com sucesso.' });
        } else {
            res.status(405).json({ error: 'Método não permitido.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao processar pedido.' });
    }
};
