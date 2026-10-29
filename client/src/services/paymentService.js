const CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let checkoutPromise;

export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutPromise) return checkoutPromise;
  checkoutPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-razorpay-checkout]');
    if (script?.dataset.loadFailed === 'true') {
      script.remove();
      script = null;
    }
    const onLoad = () => window.Razorpay ? resolve(window.Razorpay) : reject(new Error('Razorpay Checkout did not initialize.'));
    const onError = () => {
      if (script) { script.dataset.loadFailed = 'true'; script.remove(); }
      reject(new Error('Could not load Razorpay Checkout. Check your internet connection and try again.'));
    };
    if (!script) {
      script = document.createElement('script');
      script.src = CHECKOUT_URL;
      script.async = true;
      script.dataset.razorpayCheckout = 'true';
    }
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    const timeout = window.setTimeout(() => {
      if (!window.Razorpay) onError();
    }, 15000);
    Promise.resolve().then(() => {
      if (window.Razorpay) { window.clearTimeout(timeout); resolve(window.Razorpay); }
    });
    const clear = () => window.clearTimeout(timeout);
    script.addEventListener('load', clear, { once: true });
    script.addEventListener('error', clear, { once: true });
    if (!script.isConnected) document.body.appendChild(script);
  }).finally(() => { checkoutPromise = null; });
  return checkoutPromise;
};
