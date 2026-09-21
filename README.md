# Custom Button Demo — Revolut Pay checkout

Minimal demo of a Decathlon-style checkout page where the second payment
method is **Revolut Pay**. Clicking the page's own "Realizar pago" button
(not Revolut's pre-built button) creates an order on the server and opens
the Revolut Pay widget via `RevolutCheckout(token, mode).payWithPopup()`.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your Revolut **sandbox** secret API key
(from the Revolut Business sandbox dashboard → Merchant API):

```
REVOLUT_SECRET_KEY=sk_sandbox_...
REVOLUT_MODE=sandbox
PORT=3000
```

## Run

```bash
npm start
```

Open http://localhost:3000, click the "Revolut Pay" row to select it, then
click "Realizar pago" — this calls `POST /api/orders` on the local server
(which creates a 74,99 € order via the Revolut Merchant API), then opens
the Revolut Pay popup using the returned order token.

Other payment methods in the list are visual only (this demo focuses on
the Revolut Pay integration).

## Files

- `server.js` — Express server; serves `public/` and creates Revolut orders
- `public/checkout.html` — the checkout page
- `public/css/style.css` — styling
- `public/js/checkout.js` — accordion behaviour + Revolut Pay widget trigger
