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
          client_id: '7037252739126028',
          client_secret: 'm0kAyEC6tiWglEGvd1dW0B4Z1ALOoIqb',
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