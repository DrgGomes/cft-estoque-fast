// Arquivo: api/auth.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { code, redirectUri } = req.body;

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', '1435927708247216');
    params.append('client_secret', 'TvRRmbzs0qTpiDw2PXscCdiNfJJnbVvf');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const response = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString() // Formatação forçada
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}