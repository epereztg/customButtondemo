const REVOLUT_SDK_URLS = {
  sandbox: 'https://sandbox-merchant.revolut.com/embed.js',
  prod: 'https://merchant.revolut.com/embed.js'
};

const ORDER_CURRENCY = 'EUR';
const ORDER_AMOUNT = 7499; // 74,99 EUR, in minor units

let sdkLoadPromise = null;

function loadRevolutSdk(mode) {
  if (window.RevolutCheckout) return Promise.resolve(window.RevolutCheckout);
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = REVOLUT_SDK_URLS[mode];
    script.onload = () => resolve(window.RevolutCheckout);
    script.onerror = () => reject(new Error('Could not load the Revolut Pay widget.'));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

const methods = document.querySelectorAll('.payment-method');
const payButton = document.getElementById('pay-button');
const statusBox = document.getElementById('payment-status');

function setSelectedMethod(methodName) {
  // Revolut's SDK looks for this attribute at click time and opens the
  // widget itself, so we only attach it while Revolut Pay is selected.
  if (methodName === 'revolut-pay') {
    payButton.setAttribute('data-revolutpaytrigger', '');
  } else {
    payButton.removeAttribute('data-revolutpaytrigger');
  }
}

methods.forEach((method) => {
  const header = method.querySelector('.method-header');
  header.addEventListener('click', () => {
    const alreadyOpen = method.classList.contains('open');

    methods.forEach((m) => {
      m.classList.remove('open');
      m.classList.remove('selected');
    });

    if (!alreadyOpen) {
      method.classList.add('open');
      method.classList.add('selected');
      setSelectedMethod(method.dataset.method);
    } else {
      setSelectedMethod(null);
    }

    setStatus('', null);
  });
});

payButton.addEventListener('click', () => {
  if (!payButton.hasAttribute('data-revolutpaytrigger')) {
    setStatus(
      'This demo only implements a real payment with Revolut Pay. Select "Revolut Pay" from the list to try it.',
      'info'
    );
  }
  // When the attribute IS present, Revolut's SDK handles this click and
  // opens the Revolut Pay widget itself — nothing else to do here.
});

async function initRevolutPay() {
  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();

    if (!config.publicKey) {
      console.warn('Missing REVOLUT_PUBLIC_KEY on the server: the Revolut Pay button will not be activated.');
      return;
    }

    const RevolutCheckout = await loadRevolutSdk(config.mode);
    const paymentsInstance = await RevolutCheckout.payments({ publicToken: config.publicKey });
    const revolutPay = paymentsInstance.revolutPay;

    const redirectUrls = {
      success: `${window.location.origin}/checkout.html?revolut_status=success`,
      failure: `${window.location.origin}/checkout.html?revolut_status=failure`,
      cancel: `${window.location.origin}/checkout.html?revolut_status=cancel`
    };

    revolutPay.mount(null, {
      currency: ORDER_CURRENCY,
      totalAmount: ORDER_AMOUNT,
      createOrder: async () => {
        const orderRes = await fetch('/api/orders', { method: 'POST' });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          throw new Error(orderData.error || 'Could not create the order.');
        }
        return { publicId: orderData.token };
      },
      redirectUrls,
      mobileRedirectUrls: redirectUrls,
      onSuccess() {
        setStatus('Payment completed successfully with Revolut Pay!', 'success');
      },
      onError(message) {
        setStatus(`Payment could not be completed: ${message}`, 'error');
      },
      onCancel() {
        setStatus('You cancelled the payment with Revolut Pay.', 'info');
      }
    });
  } catch (err) {
    console.error(err);
    setStatus('Could not initialize Revolut Pay.', 'error');
  }
}

function showRedirectStatus() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('revolut_status');
  if (!status) return;

  const messagesByStatus = {
    success: ['Payment completed successfully with Revolut Pay!', 'success'],
    failure: ['Payment could not be completed.', 'error'],
    cancel: ['You cancelled the payment with Revolut Pay.', 'info']
  };

  const entry = messagesByStatus[status];
  if (entry) setStatus(entry[0], entry[1]);

  params.delete('revolut_status');
  const query = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function setStatus(message, type) {
  if (!message) {
    statusBox.hidden = true;
    statusBox.textContent = '';
    return;
  }
  statusBox.hidden = false;
  statusBox.textContent = message;
  statusBox.className = `payment-status ${type}`;
}

showRedirectStatus();
initRevolutPay();
