export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { title, price, txId, seller } = req.body || {};
  if (!title || !price || !txId || !seller) {
    return res.status(400).json({ error: 'faltan datos (title, price, txId, seller)' });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const sellerResp = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/seller_accounts?username=eq.${encodeURIComponent(seller)}&select=mp_access_token`,
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    const sellerData = await sellerResp.json();
    if (!sellerData || sellerData.length === 0) {
      return res.status(400).json({ error: 'El vendedor todavía no conectó su cuenta de Mercado Pago' });
    }
    const sellerToken = sellerData[0].mp_access_token;
    const priceNum = Number(price);
    const marketplaceFee = Math.round(priceNum * 0.10 * 100) / 100;

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sellerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ title, quantity: 1, unit_price: priceNum, currency_id: 'ARS' }],
        marketplace_fee: marketplaceFee,
        back_urls: {
          success: `${origin}/?pago=aprobado&tx=${txId}`,
          failure: `${origin}/?pago=fallido&tx=${txId}`,
          pending: `${origin}/?pago=pendiente&tx=${txId}`
        },
        auto_return: 'approved',
        external_reference: txId
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data });
    }
    return res.status(200).json({ init_point: data.init_point });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
