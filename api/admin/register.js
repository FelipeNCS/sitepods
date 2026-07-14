const { pool, ensureTablesExist } = require('../db');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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

        if (req.method === 'POST') {
            const { username, password } = req.body;

            if (!username || !password || username.trim() === '' || password.trim() === '') {
                res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
                return;
            }

            // Verifica se o usuário já existe
            const [existing] = await pool.query('SELECT * FROM admins WHERE username = ?', [username.trim()]);
            if (existing.length > 0) {
                res.status(409).json({ error: 'Nome de usuário já cadastrado.' });
                return;
            }

            await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', [username.trim(), password]);
            res.status(201).json({ message: 'Novo administrador cadastrado com sucesso.' });
        } else {
            res.status(405).json({ error: 'Método não permitido.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor ao registrar administrador.' });
    }
};
