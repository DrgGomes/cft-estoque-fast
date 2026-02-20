// Arquivo: api/auth.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { code, redirectUri } = req.body;

  try {
    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: '1435927708247216', // <-- Seu NOVO Client ID
        client_secret: 'TvRRmbzsOqTpiDw2PXscCdiNfJJnbVvf', // <-- Sua NOVA Chave Secreta
        code: code,
        redirect_uri: redirectUri
      })
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}