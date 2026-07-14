const { pool, ensureTablesExist } = require('../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Validation of Admin Session
    const cookieHeader = req.headers.cookie || '';
    if (!cookieHeader.includes('adminUser=')) {
        res.status(401).json({ error: 'Não autorizado.' });
        return;
    }

    try {
        await ensureTablesExist();

        const { id } = req.query;

        // 1. GET: Fetch pending orders
        if (req.method === 'GET') {
            const [rows] = await pool.query("SELECT * FROM whatsapp_orders WHERE status = 'pending' ORDER BY id DESC");
            const formattedOrders = rows.map(r => ({
                id: String(r.id),
                items: r.items,
                total: Number(r.total),
                status: r.status,
                createdAt: r.created_at
            }));
            res.status(200).json(formattedOrders);
            return;
        }

        // 2. DELETE: Dismiss/Remove order (using ID from URL query)
        if (req.method === 'DELETE') {
            if (!id) {
                res.status(400).json({ error: 'ID do pedido é obrigatório.' });
                return;
            }

            const [result] = await pool.query('DELETE FROM whatsapp_orders WHERE id = ?', [BigInt(id)]);
            if (result.affectedRows > 0) {
                res.status(200).json({ message: 'Pedido removido com sucesso.' });
            } else {
                res.status(404).json({ error: 'Pedido não encontrado.' });
            }
            return;
        }

        res.status(405).json({ error: 'Método não permitido.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao processar pedidos.' });
    }
};
