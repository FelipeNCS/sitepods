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

    try {
        await ensureTablesExist();

        if (req.method === 'POST') {
            const { username, password, rememberMe } = req.body;

            if (!username || !password) {
                res.status(400).json({ error: 'Preencha usuário e senha.' });
                return;
            }

            const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username.trim()]);

            if (rows.length > 0 && rows[0].password === password) {
                // Configura o Cookie de sessão HTTP-Only seguro para a Vercel
                const maxAge = rememberMe ? 2592000 : 86400; // 30 dias ou 1 dia
                res.setHeader('Set-Cookie', `adminUser=${username.trim()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`);
                res.status(200).json({ message: 'Login realizado com sucesso.' });
            } else {
                res.status(401).json({ error: 'Usuário ou senha incorretos.' });
            }
        } else {
            res.status(405).json({ error: 'Método não permitido.' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor durante o login.' });
    }
};
