module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        const cookieHeader = req.headers.cookie || '';
        const match = cookieHeader.match(/adminUser=([^;]+)/);
        
        if (match) {
            const username = decodeURIComponent(match[1]);
            res.status(200).json({ loggedIn: true, username });
        } else {
            res.status(401).json({ loggedIn: false });
        }
    } else {
        res.status(405).json({ error: 'Método não permitido.' });
    }
};
