require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Stripe = require('stripe');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const DEFAULT_CURRENCY = (process.env.CURRENCY || 'USD').toUpperCase();
const publicDir = path.join(__dirname, '..', 'public');
const allowedCurrencies = new Set(['USD', 'GBP', 'EUR']);
const stripe = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('replace_me')
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'https://images.unsplash.com', 'data:'],
      connectSrc: ["'self'"],
      formAction: ["'self'", 'https://checkout.stripe.com', 'https://www.paypal.com', 'https://www.sandbox.paypal.com'],
      frameAncestors: ["'none'"],
      ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {})
    }
  },
  crossOriginEmbedderPolicy: false
}));
const donationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many payment attempts. Please wait and try again.' } });

// Stripe webhooks require the unparsed raw request body for signature verification.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET.includes('replace_me')) {
    return res.status(503).send('Stripe webhook is not configured.');
  }
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET); }
  catch (err) { return res.status(400).send(`Webhook signature verification failed: ${err.message}`); }
  // TODO: persist verified events in a database and make processing idempotent before launch.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Verified Stripe donation checkout completed:', session.id, session.currency, session.amount_total);
  }
  res.json({ received: true });
});
app.use(express.json({ limit: '20kb' }));
app.use(express.static(publicDir, { extensions: ['html'], maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

function validateDonation(body) {
  const amount = Number(body.amount);
  const currency = String(body.currency || DEFAULT_CURRENCY).toUpperCase();
  const email = String(body.email || '').trim();
  const name = String(body.name || '').trim().slice(0, 120);
  if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return { error: 'Donation amount must be between 1 and 10,000.' };
  if (!allowedCurrencies.has(currency)) return { error: 'Unsupported currency. Choose USD, GBP or EUR.' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'A valid email address is required.' };
  return { amount: Math.round(amount * 100) / 100, currency, email, name };
}
function minorUnits(amount, currency) {
  // Stripe uses zero-decimal minor units for certain currencies; supported currencies here use 2 decimals.
  return Math.round(amount * 100);
}
function paypalBase() {
  return process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}
async function paypalAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret || id.includes('replace_me') || secret.includes('replace_me')) throw new Error('PayPal is not configured yet.');
  const response = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error('Could not authenticate with PayPal.');
  return data.access_token;
}

app.post('/api/donations/stripe/create', donationLimiter, async (req, res) => {
  const donation = validateDonation(req.body || {});
  if (donation.error) return res.status(400).json({ error: donation.error });
  if (!stripe) return res.status(503).json({ error: 'Stripe checkout is not configured. Add approved Stripe test credentials to the server environment first.' });
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', payment_method_types: ['card'], customer_email: donation.email,
      client_reference_id: `aide-donation-${Date.now()}`,
      metadata: { donor_name: donation.name, purpose: 'Donation to AIDE Africa, the brand name of Step and Steppers Foundation Africa Co. Limited' },
      line_items: [{ price_data: { currency: donation.currency.toLowerCase(), unit_amount: minorUnits(donation.amount, donation.currency), product_data: { name: 'Donation to AIDE Africa, the brand name of Step and Steppers Foundation Africa Co. Limited', description: 'Support education, community development and HIV/AIDS response.' } }, quantity: 1 }],
      success_url: `${BASE_URL}/success.html?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel.html`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout creation failed:', err.message);
    res.status(502).json({ error: 'Stripe could not start checkout. Please try again later.' });
  }
});

app.post('/api/donations/paypal/create', donationLimiter, async (req, res) => {
  const donation = validateDonation(req.body || {});
  if (donation.error) return res.status(400).json({ error: donation.error });
  try {
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `aide-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` },
      body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [{ description: 'Donation to AIDE Africa, the brand name of Step and Steppers Foundation Africa Co. Limited', custom_id: 'aide-africa-donation', amount: { currency_code: donation.currency, value: donation.amount.toFixed(2) }, ...(donation.name ? { shipping: undefined } : {}) }], application_context: { brand_name: 'AIDE Africa', user_action: 'PAY_NOW', return_url: `${BASE_URL}/success.html?provider=paypal`, cancel_url: `${BASE_URL}/cancel.html`, shipping_preference: 'NO_SHIPPING' } })
    });
    const data = await response.json();
    const approval = data.links?.find(link => link.rel === 'approve')?.href;
    if (!response.ok || !approval) { console.error('PayPal order error:', JSON.stringify(data)); return res.status(502).json({ error: 'PayPal could not start checkout. Please try again later.' }); }
    res.json({ url: approval, orderId: data.id });
  } catch (err) {
    console.error('PayPal checkout creation failed:', err.message);
    res.status(503).json({ error: err.message.includes('not configured') ? err.message : 'PayPal checkout is temporarily unavailable.' });
  }
});

app.get('/api/donations/stripe/session', async (req, res) => {
  const sessionId = String(req.query.session_id || '').trim();
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid checkout session reference.' });
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(409).json({ error: 'Payment has not been confirmed as paid.' });
    res.json({ status: 'paid', amountTotal: session.amount_total, currency: session.currency, email: session.customer_details?.email || session.customer_email });
  } catch (err) {
    res.status(502).json({ error: 'Unable to verify the payment with Stripe.' });
  }
});

app.post('/api/donations/paypal/capture', donationLimiter, async (req, res) => {
  const orderId = String(req.body?.orderId || '').trim();
  if (!/^[A-Z0-9-]{8,100}$/i.test(orderId)) return res.status(400).json({ error: 'Invalid PayPal order reference.' });
  try {
    const token = await paypalAccessToken();
    const response = await fetch(`${paypalBase()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `capture-${orderId}` } });
    const data = await response.json();
    if (!response.ok || data.status !== 'COMPLETED') return res.status(502).json({ error: 'PayPal has not confirmed this donation as completed.' });
    // TODO: persist verified capture and send a receipt using a database/email provider before launch.
    res.json({ status: data.status, orderId: data.id });
  } catch (err) {
    console.error('PayPal capture failed:', err.message);
    res.status(502).json({ error: 'Could not verify the PayPal payment. Contact the foundation before retrying.' });
  }
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', payments: { stripeConfigured: Boolean(stripe), paypalConfigured: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && !String(process.env.PAYPAL_CLIENT_ID).includes('replace_me')) } }));
app.use((req, res) => { if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' }); res.status(404).sendFile(path.join(publicDir, '404.html')); });
app.listen(PORT, () => console.log(`AIDE Africa website running on ${BASE_URL} (payment setup must be verified before launch).`));
