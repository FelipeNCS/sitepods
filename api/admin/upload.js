const Busboy = require('busboy');

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

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método não permitido.' });
        return;
    }

    try {
        const busboy = Busboy({ headers: req.headers });
        let base64Image = '';

        busboy.on('file', (name, file, info) => {
            const { filename, mimeType } = info;
            const chunks = [];
            file.on('data', (data) => {
                chunks.push(data);
            });
            file.on('end', () => {
                const buffer = Buffer.concat(chunks);
                base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;
            });
        });

        busboy.on('finish', () => {
            if (base64Image) {
                res.status(200).json({ imageUrl: base64Image });
            } else {
                res.status(400).json({ error: 'Nenhum arquivo enviado.' });
            }
        });

        req.pipe(busboy);
    } catch (err) {
        console.error('Erro no upload de imagem:', err);
        res.status(500).json({ error: 'Falha ao processar arquivo de imagem.' });
    }
};

module.exports.config = {
    api: {
        bodyParser: false
    }
};
