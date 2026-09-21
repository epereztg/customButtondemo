import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const REVOLUT_MODE = process.env.REVOLUT_MODE === 'prod' ? 'prod' : 'sandbox';
const REVOLUT_API_BASE =
  REVOLUT_MODE === 'prod'
    ? 'https://merchant.revolut.com/api'
    : 'https://sandbox-merchant.revolut.com/api';

const ORDER_AMOUNT = 7499; // 74,99 EUR, in minor units
const ORDER_CURRENCY = 'EUR';

app.get('/api/config', (_req, res) => {
  res.json({ mode: REVOLUT_MODE, publicKey: process.env.REVOLUT_PUBLIC_KEY || null });
});

app.post('/api/orders', async (_req, res) => {
  if (!process.env.REVOLUT_SECRET_KEY) {
    return res.status(500).json({
      error: 'Missing REVOLUT_SECRET_KEY in the server .env file.'
    });
  }

  try {
    const response = await fetch(`${REVOLUT_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Revolut-Api-Version': '2023-09-01'
      },
      body: JSON.stringify({
        amount: ORDER_AMOUNT,
        currency: ORDER_CURRENCY
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Revolut API error:', response.status, body);
      return res.status(502).json({ error: 'Could not create the order with Revolut.' });
    }

    const order = await response.json();
    res.json({ token: order.token, mode: REVOLUT_MODE });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unexpected error creating the payment order.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo checkout running at http://localhost:${PORT}`);
  console.log(`Revolut mode: ${REVOLUT_MODE}`);
});
