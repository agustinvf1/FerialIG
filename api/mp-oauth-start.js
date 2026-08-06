export default function handler(req, res) {
  const { seller } = req.query;
  if (!seller) {
    res.status(400).send('Falta el usuario del vendedor');
    return;
  }
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const redirectUri = `${origin}/api/mp-oauth-callback`;
  const url =
    `https://auth.mercadopago.com/authorization` +
    `?client_id=${process.env.MP_CLIENT_ID}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(seller)}`;

  res.writeHead(302, { Location: url });
  res.end();
}
