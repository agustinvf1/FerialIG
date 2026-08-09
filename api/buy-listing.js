async function getAuthedUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  const r = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const user = await getAuthedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Tenés que iniciar sesión de nuevo' });
  }
  const username = (user.user_metadata && user.user_metadata.username) || user.email.split('@')[0];

  const { listingId } = req.body || {};
  if (!listingId) {
    return res.status(400).json({ error: 'falta listingId' });
  }

  const headers = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const lr = await fetch(`${process.env.SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}&select=*`, { headers });
    const listings = await lr.json();
    if (!listings || listings.length === 0) {
      return res.status(400).json({ error: 'Esa cuenta ya no está disponible' });
    }
    const l = listings[0];
    if (l.status !== 'disponible') {
      return res.status(400).json({ error: 'Esa cuenta ya fue vendida' });
    }
    if (l.seller_id === user.id) {
      return res.status(400).json({ error: 'No podés comprar tu propia publicación' });
    }

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/listings?id=eq.${listingId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ status: 'reservada' })
    });

    const txId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const insertResp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: txId, listing_id: listingId, title: l.title, price: l.price,
        buyer: username, buyer_id: user.id,
        seller: l.seller, seller_id: l.seller_id,
        status: 'esperando_pago', created_at: Date.now()
      })
    });
    if (!insertResp.ok) {
      const t = await insertResp.text();
      return res.status(500).json({ error: 'No se pudo registrar la operación: ' + t.slice(0, 150) });
    }

    return res.status(200).json({ txId, sellerUsername: l.seller, title: l.title, price: l.price });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
