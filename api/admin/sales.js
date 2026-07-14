const { pool, ensureTablesExist } = require('../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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

        const { id } = req.query;

        // 1. GET: Obter todas as vendas ordenadas por ID decrescente
        if (req.method === 'GET') {
            const [rows] = await pool.query('SELECT * FROM sales ORDER BY id DESC');
            
            // Transforma campos do MySQL para camelCase esperado pelo frontend
            const formattedSales = rows.map(r => ({
                id: Number(r.id),
                product: r.product,
                price: Number(r.price),
                customer: r.customer,
                contact: r.contact || '',
                shipping: Number(r.shipping),
                partner: r.partner,
                isCredit: Boolean(r.is_credit),
                dueDate: r.due_date || '',
                interestRate: Number(r.interest_rate),
                isPaid: Boolean(r.is_paid),
                saleDate: r.sale_date
            }));

            res.status(200).json(formattedSales);
            return;
        }

        // 2. POST: Criar nova venda e deduzir estoque
        if (req.method === 'POST') {
            const { id: saleId, product, price, customer, contact, shipping, partner, isCredit, dueDate, interestRate, isPaid, saleDate } = req.body;

            if (!saleId || !product || price === undefined || !customer || !partner || !saleDate) {
                res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
                return;
            }

            await pool.query(
                `INSERT INTO sales (id, product, price, customer, contact, shipping, partner, is_credit, due_date, interest_rate, is_paid, sale_date)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    BigInt(saleId),
                    product.trim(),
                    Number(price),
                    customer.trim(),
                    contact ? contact.trim() : '',
                    Number(shipping || 0),
                    partner,
                    isCredit ? 1 : 0,
                    dueDate || '',
                    Number(interestRate || 0),
                    isPaid ? 1 : 0,
                    saleDate
                ]
            );

            // LOGICA DE DEDUÇÃO DE ESTOQUE AUTOMÁTICA
            try {
                const [products] = await pool.query('SELECT * FROM products');
                for (const p of products) {
                    let fullName = p.name;
                    if (p.model && p.model.trim() !== '') {
                        fullName = `${p.model} ${p.name}`;
                    }

                    const productQueryLower = product.toLowerCase();
                    const match1 = productQueryLower === p.name.toLowerCase();
                    const match2 = productQueryLower === fullName.toLowerCase();
                    const match3 = productQueryLower.includes(p.name.toLowerCase());

                    if (match1 || match2 || match3) {
                        if (p.quantity > 0) {
                            const newQty = p.quantity - 1;
                            await pool.query('UPDATE products SET quantity = ? WHERE id = ?', [newQty, p.id]);
                            console.log(`Dedução automática efetuada: ${p.name} -> Novo estoque: ${newQty}`);
                            break;
                        }
                    }
                }
            } catch (errEstoque) {
                console.error('Erro ao efetuar dedução automática de estoque:', errEstoque);
            }

            // Retorna JSON serializável (converte BigInt para Number/String)
            res.status(201).json({ id: String(saleId), product, price, customer, contact, shipping, partner, isCredit, dueDate, interestRate, isPaid, saleDate });
            return;
        }

        // 3. PUT: Atualizar venda (ex: baixar como paga ou editar)
        if (req.method === 'PUT') {
            if (!id) {
                res.status(400).json({ error: 'ID da venda é obrigatório.' });
                return;
            }

            const { product, price, customer, contact, shipping, partner, isCredit, dueDate, interestRate, isPaid, saleDate } = req.body;

            await pool.query(
                `UPDATE sales SET 
                    product = ?, 
                    price = ?, 
                    customer = ?, 
                    contact = ?, 
                    shipping = ?, 
                    partner = ?, 
                    is_credit = ?, 
                    due_date = ?, 
                    interest_rate = ?, 
                    is_paid = ?, 
                    sale_date = ?
                 WHERE id = ?`,
                [
                    product.trim(),
                    Number(price),
                    customer.trim(),
                    contact ? contact.trim() : '',
                    Number(shipping || 0),
                    partner,
                    isCredit ? 1 : 0,
                    dueDate || '',
                    Number(interestRate || 0),
                    isPaid ? 1 : 0,
                    saleDate,
                    BigInt(id)
                ]
            );

            res.status(200).json({ id, message: 'Venda atualizada com sucesso.' });
            return;
        }

        // 4. DELETE: Excluir venda
        if (req.method === 'DELETE') {
            if (!id) {
                res.status(400).json({ error: 'ID da venda é obrigatório.' });
                return;
            }

            const [result] = await pool.query('DELETE FROM sales WHERE id = ?', [BigInt(id)]);
            if (result.affectedRows > 0) {
                res.status(200).json({ message: 'Venda excluída com sucesso.' });
            } else {
                res.status(404).json({ error: 'Venda não encontrada.' });
            }
            return;
        }

        res.status(405).json({ error: 'Método não permitido.' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno ao processar vendas.' });
    }
};
