const { pool, ensureTablesExist } = require('../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Validação de Sessão Administrativa (Interceptor)
    const cookieHeader = req.headers.cookie || '';
    if (!cookieHeader.includes('adminUser=')) {
        res.status(401).json({ error: 'Não autorizado.' });
        return;
    }

    try {
        await ensureTablesExist();

        const { id, action } = req.query;

        // 1. POST: Criar novo produto
        if (req.method === 'POST') {
            const { name, model, price, quantity, description, imagePath } = req.body;

            if (!name || !model || price === undefined || quantity === undefined) {
                res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
                return;
            }

            const [result] = await pool.query(
                'INSERT INTO products (name, model, price, quantity, description, image_path) VALUES (?, ?, ?, ?, ?, ?)',
                [name.trim(), model.trim(), Number(price), Number(quantity), description || '', imagePath || '']
            );

            res.status(201).json({ id: result.insertId, name, model, price, quantity, description, imagePath });
            return;
        }

        // 2. PUT: Modificar estoque do produto
        if (req.method === 'PUT') {
            if (action === 'stock' && id) {
                const { quantity } = req.body;

                if (quantity === undefined || quantity < 0) {
                    res.status(400).json({ error: 'Quantidade inválida.' });
                    return;
                }

                await pool.query('UPDATE products SET quantity = ? WHERE id = ?', [Number(quantity), Number(id)]);
                res.status(200).json({ id, quantity });
                return;
            }
            res.status(400).json({ error: 'Ação inválida ou ID ausente.' });
            return;
        }

        // 3. DELETE: Remover produto do catálogo
        if (req.method === 'DELETE') {
            if (!id) {
                res.status(400).json({ error: 'ID do produto é obrigatório.' });
                return;
            }

            const [result] = await pool.query('DELETE FROM products WHERE id = ?', [Number(id)]);
            if (result.affectedRows > 0) {
                res.status(200).json({ message: 'Produto removido com sucesso.' });
            } else {
                res.status(404).json({ error: 'Produto não encontrado.' });
            }
            return;
        }

        res.status(405).json({ error: 'Método não permitido.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao processar produto.' });
    }
};
