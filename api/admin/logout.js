module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'POST') {
        // Remove o Cookie configurando expiração para 0
        res.setHeader('Set-Cookie', 'adminUser=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        res.status(200).json({ message: 'Sessão encerrada.' });
    } else {
        res.status(405).json({ error: 'Método não permitido.' });
    }
};
