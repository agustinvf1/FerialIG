export default async function handler(req, res) {
  const { code, state } = req.query;
  const origin = req.headers.origin || `https://${req.headers.host}`;

  if (!code || !state) {
    res.writeHead(302, { Location: `${origin}/?mp=error` });
    return res.end();
  }

  const redirectUri = `${origin}/api/mp-oauth-callback`;

  try {
    const tokenResp = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MP_CLIENT_ID,
        client_secret: process.env.MP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      res.writeHead(302, { Location: `${origin}/?mp=error` });
      return res.end();
    }

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/seller_accounts?on_conflict=username`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        username: state,
        mp_user_id: String(tokenData.user_id),
        mp_access_token: tokenData.access_token,
        mp_refresh_token: tokenData.refresh_token,
        connected_at: Date.now()
      })
    });

    res.writeHead(302, { Location: `${origin}/?mp=conectado` });
    res.end();
  } catch (err) {
    res.writeHead(302, { Location: `${origin}/?mp=error` });
    res.end();
  }
}
