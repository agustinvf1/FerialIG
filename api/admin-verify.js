export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'no autenticado' });
  }

  try {
    const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    if (!userResp.ok) {
      return res.status(401).json({ error: 'no autenticado' });
    }
    const user = await userResp.json();
    const username = (user.user_metadata && user.user_metadata.username) || '';
    if (username.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'no autorizado' });
    }

    const { listingId } = req.body || {};
    if (!listingId) {
      return res.status(400).json({ error: 'falta listingId' });
    }

    const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`, {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ verified: true })
    });
    if (!resp.ok) {
      const t = await resp.text();
      return res.status(500).json({ error: t.slice(0, 150) });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
