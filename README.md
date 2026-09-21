# Custom Button Demo — Revolut Pay checkout

Minimal demo of a Decathlon-style checkout page where one of the payment
methods is **Revolut Pay**. Clicking the page's own "Pay now" button (not
Revolut's pre-built button) opens the Revolut Pay widget, using the Revolut
Checkout Web SDK's external trigger pattern (`data-revolutpaytrigger`).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set your Revolut **sandbox** API keys (both found in the
Revolut Business sandbox dashboard → Merchant API settings):

```
REVOLUT_SECRET_KEY=sk_sandbox_...
REVOLUT_PUBLIC_KEY=pk_sandbox_...
REVOLUT_MODE=sandbox
PORT=3000
```

- `REVOLUT_SECRET_KEY` — used server-side only, to create orders via the
  Revolut Merchant API. Never expose this in the browser.
- `REVOLUT_PUBLIC_KEY` — a publishable key, safe to send to the browser;
  it's what initializes the Revolut Pay widget client-side.

## Run

```bash
npm start
```

Open http://localhost:3000, click the "Revolut Pay" row to select it, then
click "Pay now". While Revolut Pay is selected, that button carries the
`data-revolutpaytrigger` attribute, so Revolut's SDK intercepts the click
and opens its widget; clicking "Pay now" with another method selected just
shows a demo-only message instead.

Under the hood: `revolutPay.mount(null, paymentOptions)` is called once on
page load (mounting to `null` means no pre-built button is rendered), and
`paymentOptions.createOrder` calls `POST /api/orders` on the local server,
which creates a 74,99 € order via the Revolut Merchant API using the secret
key and returns its token.

Other payment methods in the list are visual only (this demo focuses on
the Revolut Pay integration).

## How the custom pay button works

The whole point of this demo is that Revolut Pay is triggered from the
site's own **"Pay now"** button — not from a button Revolut renders for
you. Three pieces make that work, all in
[`public/checkout.html`](public/checkout.html) and
[`public/js/checkout.js`](public/js/checkout.js).

### 1. The button is completely ordinary

```html
<!-- public/checkout.html:143 -->
<button id="pay-button" class="pay-button" type="button">Pay now</button>
```

There's nothing Revolut-specific about it in the HTML. Revolut's SDK finds
it later through an attribute added at runtime — not through its `id`.

### 2. Revolut Pay is mounted with `null` as its target

```js
// public/js/checkout.js:73-120 (initRevolutPay, called once on page load)
const paymentsInstance = await RevolutCheckout.payments({ publicToken: config.publicKey });
const revolutPay = paymentsInstance.revolutPay;

revolutPay.mount(null, {
  currency: ORDER_CURRENCY,
  totalAmount: ORDER_AMOUNT,
  createOrder: async () => {
    const orderRes = await fetch('/api/orders', { method: 'POST' });
    const orderData = await orderRes.json();
    return { publicId: orderData.token };
  },
  redirectUrls,
  mobileRedirectUrls,
  onSuccess() { /* show success message */ },
  onError(message) { /* show error message */ },
  onCancel() { /* show cancelled message */ }
});
```

Passing `null` instead of a DOM element tells the SDK "don't render your
own button — I'll trigger you myself." This runs once when the page loads,
regardless of which payment method is currently selected. `createOrder`
is what actually creates the order: it calls our own backend
(`POST /api/orders`), which uses the secret key to create the order with
Revolut and returns its token.

### 3. The trigger attribute is toggled based on the selected method

```js
// public/js/checkout.js:30-38
function setSelectedMethod(methodName) {
  if (methodName === 'revolut-pay') {
    payButton.setAttribute('data-revolutpaytrigger', '');
  } else {
    payButton.removeAttribute('data-revolutpaytrigger');
  }
}
```

This runs every time a row in the payment methods list is opened or
closed. Revolut's SDK listens globally for clicks on any element carrying
`data-revolutpaytrigger`, and opens its widget when one is clicked. So the
same "Pay now" button only becomes a Revolut Pay trigger while the Revolut
Pay row is selected. When another payment method is selected, the
attribute is removed, and a separate, plain click handler
(`public/js/checkout.js:62-71`) takes over instead — in this demo it just
shows a "demo only" message, since no other method is wired up to a real
payment provider.

## Files

- `server.js` — Express server; serves `public/` and creates Revolut orders
- `public/checkout.html` — the checkout page
- `public/css/style.css` — styling
- `public/js/checkout.js` — accordion behaviour + Revolut Pay widget trigger
- `public/images/` — payment method logos
