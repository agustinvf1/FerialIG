export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'no autenticado' });
  }

  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${token}` }
    });
    if (!userResp.ok) return res.status(401).json({ error: 'no autenticado' });
    const user = await userResp.json();
    const username = (user.user_metadata && user.user_metadata.username) || '';
    if (username.toLowerCase() !== 'admin') {
      return res.status(403).json({ error: 'no autorizado' });
    }

    const cutoff = Date.now() - 30 * 60 * 1000; // 30 minutos
    const staleResp = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/transactions?status=eq.esperando_pago&created_at=lt.${cutoff}&select=*`,
      { headers }
    );
    const stale = await staleResp.json();

    let released = 0;
    for (const t of (stale || [])) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/transactions?id=eq.${t.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'expirada' })
      });
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/listings?id=eq.${t.listing_id}&status=eq.reservada`, {
        method: 'PATCH', headers, body: JSON.stringify({ status: 'disponible' })
      });
      released++;
    }

    return res.status(200).json({ released });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
