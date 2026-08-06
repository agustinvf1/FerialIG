export default async function handler(req, res) {
  const { seller } = req.query;
  if (!seller) {
    return res.status(400).json({ error: 'falta seller' });
  }
  try {
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/seller_accounts?username=eq.${encodeURIComponent(seller)}&select=username`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    const data = await r.json();
    res.status(200).json({ connected: Array.isArray(data) && data.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
